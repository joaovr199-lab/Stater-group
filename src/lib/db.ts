import "server-only";
import { Pool, type PoolClient } from "pg";

const g = globalThis as unknown as { __prologPool?: Pool };

export const pool: Pool =
  g.__prologPool ??
  (g.__prologPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  }));

export type DbCtx = {
  userId?: string | null;
  ipHash?: string | null;
  sessionHash?: string | null;
  note?: string | null;
};

/**
 * Executa `fn` numa transação com a identidade do usuário injetada.
 * Todas as políticas de RLS do banco usam esse contexto — o isolamento
 * entre imobiliárias é garantido no PostgreSQL, não apenas na interface.
 */
export async function tx<T>(ctx: DbCtx, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  // Serializa consultas da transação (permite Promise.all sem enfileirar no driver).
  const original = c.query;
  let chain: Promise<unknown> = Promise.resolve();
  c.query = ((...args: Parameters<PoolClient["query"]>) => {
    const p = chain.then(() => (original as (...a: unknown[]) => Promise<unknown>).apply(c, args));
    chain = p.catch(() => undefined);
    return p;
  }) as PoolClient["query"];
  try {
    await c.query("begin");
    await c.query(
      `select set_config('app.user_id', $1, true), set_config('app.ip_hash', $2, true),
              set_config('app.session_hash', $3, true), set_config('app.note', $4, true)`,
      [ctx.userId ?? "", ctx.ipHash ?? "", ctx.sessionHash ?? "", ctx.note ?? ""]
    );
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.query = original;
    c.release();
  }
}

/** Contexto público (visitante da reportagem): sem usuário; só funções SECURITY DEFINER. */
export function publicTx<T>(fn: (c: PoolClient) => Promise<T>) {
  return tx({}, fn);
}
