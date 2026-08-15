// eslint-disable-next-line @typescript-eslint/no-require-imports -- runs directly via `node`, not bundled, so it must stay CommonJS
const { execSync } = require("node:child_process");

// Only apply pending migrations for the actual Production deployment - never
// for a preview/branch build, even if it happens to share the same
// DATABASE_URL. Locally, VERCEL_ENV is unset, so this is skipped and `npm
// run build` behaves exactly as it always has.
if (process.env.VERCEL_ENV === "production") {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
}

execSync("npx next build", { stdio: "inherit" });
