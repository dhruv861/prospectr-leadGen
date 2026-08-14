import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

function nextMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

async function seedUser(nameEnv: string, emailEnv: string, passwordEnv: string, role: "admin" | "partner") {
  const name = process.env[nameEnv];
  const email = process.env[emailEnv];
  const password = process.env[passwordEnv];
  if (!name || !email || !password) {
    throw new Error(`Missing ${nameEnv}/${emailEnv}/${passwordEnv} in .env`);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    create: { name, email, passwordHash, role },
    update: { name, passwordHash, role },
  });
  console.log(`  seeded user ${user.email} (${user.role})`);
}

async function seedApifyAccounts() {
  const tokenVarNames = Object.keys(process.env)
    .filter((k) => /^APIFY_TOKEN_\d+$/.test(k))
    .filter((k) => process.env[k] && process.env[k]!.trim() !== "")
    .sort((a, b) => {
      const na = Number(a.match(/\d+$/)![0]);
      const nb = Number(b.match(/\d+$/)![0]);
      return na - nb;
    });

  if (tokenVarNames.length === 0) {
    console.warn("  no APIFY_TOKEN_n vars with values found — skipping Apify account seeding");
    return;
  }

  for (const tokenEnvVar of tokenVarNames) {
    const n = tokenEnvVar.match(/\d+$/)![0];
    const account = await prisma.apifyAccount.upsert({
      where: { tokenEnvVar },
      create: {
        label: `account-${n}`,
        tokenEnvVar,
        monthlyBudgetUsd: 5.0,
        usedThisCycleUsd: 0,
        cycleResetDate: nextMonthStart(),
        status: "active",
      },
      update: {},
    });
    console.log(`  seeded apify account ${account.label} (env: ${tokenEnvVar})`);
  }
}

async function main() {
  console.log("Seeding users...");
  await seedUser("ADMIN_NAME", "ADMIN_EMAIL", "ADMIN_PASSWORD", "admin");
  await seedUser("PARTNER_NAME", "PARTNER_EMAIL", "PARTNER_PASSWORD", "partner");

  console.log("Seeding Apify accounts...");
  await seedApifyAccounts();

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
