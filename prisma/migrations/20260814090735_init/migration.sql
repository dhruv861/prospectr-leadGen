-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'partner');

-- CreateEnum
CREATE TYPE "WebsiteStatus" AS ENUM ('none', 'instagram_only', 'has_website');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'interested', 'quoted', 'won', 'lost');

-- CreateEnum
CREATE TYPE "ScrapeRunStatus" AS ENUM ('running', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "ApifyAccountStatus" AS ENUM ('active', 'exhausted');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apify_accounts" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "token_env_var" TEXT NOT NULL,
    "monthly_budget_usd" DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    "used_this_cycle_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cycle_reset_date" DATE NOT NULL,
    "status" "ApifyAccountStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apify_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrape_runs" (
    "id" TEXT NOT NULL,
    "search_term" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "apify_account_id" TEXT NOT NULL,
    "apify_run_id" TEXT NOT NULL,
    "places_returned" INTEGER,
    "estimated_cost_usd" DECIMAL(10,4),
    "status" "ScrapeRunStatus" NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "scrape_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "category" TEXT,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "website_status" "WebsiteStatus" NOT NULL DEFAULT 'none',
    "website_url" TEXT,
    "rating" DOUBLE PRECISION,
    "review_count" INTEGER,
    "maps_url" TEXT NOT NULL,
    "source_run_id" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "last_contacted_at" TIMESTAMP(3),
    "raw_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "apify_accounts_token_env_var_key" ON "apify_accounts"("token_env_var");

-- CreateIndex
CREATE INDEX "idx_scraperun_cooldown" ON "scrape_runs"("search_term", "locality", "status", "finished_at");

-- CreateIndex
CREATE UNIQUE INDEX "leads_place_id_key" ON "leads"("place_id");

-- CreateIndex
CREATE INDEX "idx_lead_filter" ON "leads"("locality", "category", "status");

-- CreateIndex
CREATE INDEX "idx_lead_website_status" ON "leads"("website_status");

-- AddForeignKey
ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_apify_account_id_fkey" FOREIGN KEY ("apify_account_id") REFERENCES "apify_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_source_run_id_fkey" FOREIGN KEY ("source_run_id") REFERENCES "scrape_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
