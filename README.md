# Prospectr

An internal lead-generation portal for a small IT/web agency. It scrapes Google Maps for local businesses that have **no website** (or only an Instagram page), stores them as leads, and gives a non-technical partner a CRM-style dashboard to browse, filter, shortlist, and work them through a sales pipeline — all without touching a terminal or a scraping tool directly.

Built as a two-user internal tool (admin + partner), designed to run entirely on free-tier infrastructure.

## Features

- **Automated lead discovery** — kicks off a Google Maps scrape (via Apify) for a given industry + locality, filtered server-side to businesses without a website. Async job pattern with client-side polling, so a slow scrape never blocks a request.
- **Cost controls** — a cooldown window avoids re-scraping the same search, and a rotating pool of Apify accounts with budget tracking automatically fails over when one account's free credit runs out.
- **Leads dashboard** — searchable/filterable table (rating, review count, phone/notes presence, contact staleness, sort order) with a mobile-friendly card view, click-to-call and WhatsApp deep links, inline status editing, and a notes/last-contacted editor.
- **Shortlist + Kanban pipeline** — star a lead to add it to your working pipeline, then drag it through New → Contacted → Interested → Quoted → Won/Lost on a Kanban board (with a touch-friendly status dropdown fallback, since native drag-and-drop doesn't work on mobile).
- **Follow-up scheduling** — set a follow-up date on any lead past "New" status; a dedicated Follow-ups panel on the dashboard surfaces overdue/due-today/upcoming items sorted by urgency.
- **Admin panel** — Apify account balances with budget progress bars, scrape run history, and a manual cooldown-bypass to force an early refresh.
- **Responsive, mobile-first UI** — collapsible desktop sidebar / mobile drawer nav, since this is used mostly from a phone in the field.

## Tech stack

- **Next.js** (App Router) + **TypeScript**, Route Handlers as the API layer — no separate backend
- **PostgreSQL** via **Neon** (serverless, free tier) + **Prisma** ORM
- **NextAuth v5** (Auth.js), credentials-based, JWT sessions — no OAuth, no self-registration
- **Tailwind CSS v4** + **lucide-react**, hosted on **Vercel** (free Hobby tier — personal/non-commercial use only; its Fluid Compute default allows functions to run up to 300s, needed for the web-search-grounded AI opportunity finder)
- **Apify** (`compass/crawler-google-places` actor) for the underlying Google Maps data

## Getting started

```bash
npm install
cp .env.example .env   # fill in real values — see below
npx prisma migrate dev
npm run seed            # creates the two user accounts + Apify account pool
npm run dev
```

### Environment variables

See [`.env.example`](.env.example) for the full list. You'll need:

- A [Neon](https://neon.tech) Postgres project — pooled connection for `DATABASE_URL`, direct connection for `DIRECT_URL`
- An `AUTH_SECRET` (`npx auth secret` or `openssl rand -base64 32`)
- Credentials for the two seed accounts (admin + partner)
- One or more [Apify](https://apify.com) API tokens (`APIFY_TOKEN_1`, `APIFY_TOKEN_2`, …) — the account pool grows automatically with however many `APIFY_TOKEN_n` vars are set

### Verifying the ingestion pipeline

```bash
npm run smoke
```

Runs a real, cheap Apify search (5 places) end-to-end and asserts the cooldown check, account rotation, and upsert logic all behave correctly — in particular, that a re-scrape never overwrites partner-entered fields (status, notes, shortlist, follow-up date) on an existing lead.

## Deployment

Configured for Vercel — zero-config Next.js support, no adapter needed. Prisma's `binaryTargets` (`native` + `rhel-openssl-3.0.x`) already match Vercel's Lambda-based runtime. Deployment itself (project creation, env var setup) is left to whoever owns the target Vercel/Neon accounts.

Note: Vercel's free Hobby plan is restricted to personal/non-commercial use per its Terms of Service — fine for this project as currently scoped, but revisit (Vercel Pro, or move back to Netlify's free tier) if it's ever put to commercial use.

**Migrations run automatically** — the `build` script (`scripts/vercel-build.js`) runs `prisma migrate deploy` before `next build`, but only when `VERCEL_ENV === "production"`, so a preview/branch deploy never touches the real database even if it shares the same `DATABASE_URL`. Locally, `VERCEL_ENV` is unset, so `npm run build` behaves exactly as before (just `next build`).

**Seeding is deliberately manual**, not part of the build — `npm run seed` upserts by email/Apify-token, so it's safe to re-run, but auto-running it on every deploy would silently overwrite any user/account edits made directly in the database since the last run. Run it once after the first deploy, and again only when adding a new teammate or Apify token:

```bash
DATABASE_URL="<prod pooled url>" DIRECT_URL="<prod direct url>" ADMIN_NAME="..." ADMIN_EMAIL="..." ADMIN_PASSWORD="..." PARTNER_NAME="..." PARTNER_EMAIL="..." PARTNER_PASSWORD="..." APIFY_TOKEN_1="..." npm run seed
```
