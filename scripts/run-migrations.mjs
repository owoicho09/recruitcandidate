import { Client } from "pg";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "supabase", "migrations");

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Set SUPABASE_DB_URL first.");
  process.exit(1);
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

await client.query(`
  create table if not exists public.schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )
`);

const { rows: applied } = await client.query("select filename from public.schema_migrations");
const appliedSet = new Set(applied.map((r) => r.filename));

for (const file of files) {
  if (appliedSet.has(file)) {
    console.log(`Skipping ${file} (already applied)`);
    continue;
  }
  const sql = readFileSync(join(migrationsDir, file), "utf8");
  process.stdout.write(`Running ${file} ... `);
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("insert into public.schema_migrations (filename) values ($1)", [file]);
    await client.query("COMMIT");
    console.log("OK");
  } catch (err) {
    await client.query("ROLLBACK");
    console.log("FAILED");
    console.error(err.message);
    await client.end();
    process.exit(1);
  }
}

console.log("All migrations applied successfully.");
await client.end();
