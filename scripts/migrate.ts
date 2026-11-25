// Aplica as migrações SQL em ordem usando DATABASE_ADMIN_URL (papel dono do schema).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_ADMIN_URL;
  if (!url) throw new Error("DATABASE_ADMIN_URL não definido");
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query(`create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz default now())`);
  const dir = join(process.cwd(), "db", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(dir, file), "utf8");
    const done = await client.query("select 1 from public.schema_migrations where name=$1", [file]);
    if (done.rowCount && !process.argv.includes("--reapply")) { console.log(`= ${file}`); continue; }
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into public.schema_migrations(name) values ($1) on conflict do nothing", [file]);
      await client.query("commit");
      console.log(`+ ${file}`);
    } catch (e) { await client.query("rollback"); throw e; }
  }
  const pw = process.env.APP_DB_PASSWORD;
  if (pw) {
    await client.query(`alter role prolog_app password ${client.escapeLiteral(pw)}`);
    console.log("senha do papel prolog_app atualizada");
  }
  await client.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
