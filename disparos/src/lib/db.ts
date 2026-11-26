import "server-only";
import { Pool } from "pg";

const g = globalThis as unknown as { __pool?: Pool; __schema?: Promise<void> };

export const pool: Pool =
  g.__pool ??
  (g.__pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  }));

/** Cria as tabelas na primeira execução. Nenhum passo manual de migração. */
const SCHEMA = `
create table if not exists contacts (
  id serial primary key,
  token text not null unique,
  name text not null,
  phone text,
  tag text,
  source text not null default 'lista',   -- lista | organico
  created_at timestamptz not null default now()
);
create unique index if not exists contacts_phone_uq on contacts(phone) where phone is not null;

create table if not exists visits (
  id uuid primary key,
  page text not null check (page in ('brasil','sc','garuva')),
  contact_id int references contacts(id) on delete cascade,
  visitor text not null,
  device text,
  referrer text,
  started_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  duration_ms int not null default 0,
  max_scroll int not null default 0,
  cta_at timestamptz
);
create index if not exists visits_contact_idx on visits(contact_id);
create index if not exists visits_page_idx on visits(page, started_at);

create table if not exists settings (key text primary key, value text not null);
`;

export function ensureSchema() {
  if (!g.__schema) {
    g.__schema = pool
      .query(SCHEMA)
      .then(() => undefined)
      .catch((e) => {
        g.__schema = undefined;
        throw e;
      });
  }
  return g.__schema;
}

export async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  await ensureSchema();
  return (await pool.query(sql, params)).rows as T[];
}
