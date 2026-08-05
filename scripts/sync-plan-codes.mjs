// Syncs PAYSTACK_*_PLAN_CODE env vars into the `plans` table's paystack_plan_code
// column — the DB row is what checkout actually reads; these env vars are just
// the operational input. Safe to rerun any time a code changes.
import { Client } from "pg";

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Set SUPABASE_DB_URL first.");
  process.exit(1);
}

const MAPPINGS = [
  { slug: "starter", interval: "monthly", envVar: "PAYSTACK_STARTER_MONTHLY_PLAN_CODE" },
  { slug: "starter", interval: "annual", envVar: "PAYSTACK_STARTER_ANNUAL_PLAN_CODE" },
  { slug: "growth", interval: "monthly", envVar: "PAYSTACK_GROWTH_MONTHLY_PLAN_CODE" },
  { slug: "growth", interval: "annual", envVar: "PAYSTACK_GROWTH_ANNUAL_PLAN_CODE" },
  { slug: "scale", interval: "monthly", envVar: "PAYSTACK_SCALE_MONTHLY_PLAN_CODE" },
  { slug: "scale", interval: "annual", envVar: "PAYSTACK_SCALE_ANNUAL_PLAN_CODE" },
];

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

for (const { slug, interval, envVar } of MAPPINGS) {
  const code = process.env[envVar] ?? "";
  const { rowCount } = await client.query(
    "update plans set paystack_plan_code = $1 where slug = $2 and interval = $3",
    [code, slug, interval],
  );
  console.log(`${slug} (${interval}): ${code ? code : "(empty)"} — ${rowCount} row updated`);
}

await client.end();
console.log("Done.");
