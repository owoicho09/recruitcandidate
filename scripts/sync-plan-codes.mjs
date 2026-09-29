// Points each paid row in the `plans` table at a Paystack Plan that actually
// exists in the Paystack account of PAYSTACK_SECRET_KEY (live or test) and
// matches its price and interval. Checkout reads plans.paystack_plan_code, so
// a code from the other Paystack mode (or a deleted plan) makes every
// checkout fail with "plan not found".
//
//   node --env-file=<env file> scripts/sync-plan-codes.mjs                  # report only, changes nothing
//   node --env-file=<env file> scripts/sync-plan-codes.mjs --create-missing # also create missing Paystack plans (report only)
//   node --env-file=<env file> scripts/sync-plan-codes.mjs --create-missing --apply
//
// Code resolution per plan: PAYSTACK_<SLUG>_<INTERVAL>_PLAN_CODE if set, else
// the code already in the DB, else an existing Paystack plan with the same
// amount + interval, else (with --create-missing) a newly created one.
// Nothing is written to the DB without --apply. Safe to rerun.
import { Client } from "pg";

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const CREATE = args.has("--create-missing");
const { SUPABASE_DATABASE_URL, PAYSTACK_SECRET_KEY, PAYSTACK_BASE_URL = "https://api.paystack.co" } = process.env;

if (!SUPABASE_DATABASE_URL || !PAYSTACK_SECRET_KEY) {
  console.error("Set SUPABASE_DATABASE_URL and PAYSTACK_SECRET_KEY (e.g. node --env-file=.env.production scripts/sync-plan-codes.mjs).");
  process.exit(1);
}
const mode = PAYSTACK_SECRET_KEY.startsWith("sk_live_") ? "LIVE" : PAYSTACK_SECRET_KEY.startsWith("sk_test_") ? "TEST" : "UNKNOWN";
console.log(`Paystack mode: ${mode}${APPLY ? "" : "   (report only — pass --apply to write)"}\n`);

async function paystack(path, body) {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.status !== false, json };
}

const PAYSTACK_INTERVAL = { monthly: "monthly", annual: "annually" };

const accountPlans = [];
for (let page = 1; ; page++) {
  const { ok, json } = await paystack(`/plan?perPage=100&page=${page}`);
  if (!ok) {
    console.error(`Couldn't list Paystack plans: ${json.message}`);
    process.exit(1);
  }
  accountPlans.push(...json.data.filter((p) => !p.is_deleted && !p.is_archived));
  if (json.data.length < 100) break;
}

const client = new Client({ connectionString: SUPABASE_DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const { rows: plans } = await client.query(
  "select id, name, slug, interval, amount, currency, paystack_plan_code from plans where active and amount > 0 and slug <> 'enterprise' order by amount",
);

let problems = 0;
for (const plan of plans) {
  const label = `${plan.name} (${plan.interval}, ${plan.currency} ${Number(plan.amount).toLocaleString()})`;
  const wantAmount = Math.round(Number(plan.amount) * 100);
  const wantInterval = PAYSTACK_INTERVAL[plan.interval];
  const matches = (p) => p && p.amount === wantAmount && p.interval === wantInterval && p.currency === plan.currency;

  const envCode = process.env[`PAYSTACK_${plan.slug.toUpperCase()}_${plan.interval.toUpperCase()}_PLAN_CODE`];
  const candidates = [envCode, plan.paystack_plan_code].filter(Boolean);
  let code = candidates.find((c) => matches(accountPlans.find((p) => p.plan_code === c)));
  let source = code ? (code === envCode ? "env" : "db") : null;

  if (!code) {
    const existing = accountPlans.find(matches);
    if (existing) [code, source] = [existing.plan_code, `existing Paystack plan "${existing.name}"`];
  }
  if (!code && CREATE) {
    const name = `RecruitCandidates ${plan.name} (${plan.interval === "annual" ? "Annual" : "Monthly"})`;
    if (APPLY) {
      const { ok, json } = await paystack("/plan", { name, amount: wantAmount, interval: wantInterval, currency: plan.currency });
      if (!ok) {
        console.log(`✗ ${label}: couldn't create Paystack plan — ${json.message}`);
        problems++;
        continue;
      }
      [code, source] = [json.data.plan_code, "created"];
    } else {
      console.log(`+ ${label}: would create Paystack plan "${name}"`);
      continue;
    }
  }
  if (!code) {
    const bad = candidates.length ? ` (${candidates.join(", ")} not found in this ${mode} account or price/interval mismatch)` : "";
    console.log(`✗ ${label}: no matching Paystack plan${bad} — rerun with --create-missing`);
    problems++;
    continue;
  }

  if (code === plan.paystack_plan_code) {
    console.log(`✓ ${label}: ${code} (already set)`);
  } else if (APPLY) {
    await client.query("update plans set paystack_plan_code = $1 where id = $2", [code, plan.id]);
    console.log(`✓ ${label}: ${plan.paystack_plan_code || "(empty)"} → ${code} [${source}] — updated`);
  } else {
    console.log(`~ ${label}: ${plan.paystack_plan_code || "(empty)"} → ${code} [${source}] — would update`);
  }
}

await client.end();
console.log(problems ? `\n${problems} plan(s) still not purchasable.` : "\nDone.");
process.exit(problems ? 1 : 0);
