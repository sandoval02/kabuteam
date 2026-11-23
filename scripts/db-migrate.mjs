// Applies supabase/migrations/*.sql in order, once each. Usage: npm run db:migrate
// Needs SUPABASE_DB_URL in .env.local (Supabase → Connect → Direct → Session pooler URI).
import { readFileSync, readdirSync } from "node:fs";
import pg from "pg";

process.loadEnvFile(".env.local");
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query("create table if not exists public._migrations (name text primary key, applied_at timestamptz default now()); alter table public._migrations enable row level security");
const done = new Set((await client.query("select name from public._migrations")).rows.map((r) => r.name));
for (const file of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(file)) continue;
  console.log("applying", file);
  await client.query("begin");
  try {
    await client.query(readFileSync(`supabase/migrations/${file}`, "utf8"));
    await client.query("insert into public._migrations (name) values ($1)", [file]);
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    console.error(`failed: ${file}\n${err.message}`);
    process.exit(1);
  }
}
console.log("up to date");
await client.end();
