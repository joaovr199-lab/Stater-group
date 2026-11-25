import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { PoolClient } from "pg";
import { pool, tx } from "./db";
import { ipHash, newToken, sha256 } from "./security";

export type Role = "stater_admin" | "agency_manager" | "broker";
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  agency_id: string | null;
  agency_name: string | null;
  must_change_password: boolean;
  sessionHash: string;
};

export const SESSION_COOKIE = "pi_session";

export const HOME: Record<Role, string> = {
  stater_admin: "/stater",
  agency_manager: "/imobiliaria",
  broker: "/corretor",
};

export async function login(email: string, password: string, userAgent: string) {
  const r = await pool.query("select * from app.auth_lookup($1)", [email]);
  const row = r.rows[0];
  // Compara sempre (mesmo sem usuário) para reduzir diferença de tempo.
  const ok = await bcrypt.compare(password, row?.password_hash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
  if (!row || !ok || !row.active) return null;
  const token = newToken();
  const hours = 12;
  await pool.query("select app.auth_create_session($1,$2,$3,$4,$5)", [row.id, sha256(token), hours, await ipHash(), userAgent]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: hours * 3600,
  });
  return row.id as string;
}

export async function logout() {
  const jar = await cookies();
  const t = jar.get(SESSION_COOKIE)?.value;
  if (t) await pool.query("select app.auth_destroy($1)", [sha256(t)]);
  jar.delete(SESSION_COOKIE);
}

export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const t = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!t) return null;
  const h = sha256(t);
  const r = await pool.query("select * from app.auth_resolve($1)", [h]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], sessionHash: h };
});

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (roles && !roles.includes(u.role)) redirect(HOME[u.role]);
  return u;
}

/** Transação com o contexto do usuário logado (RLS). */
export async function asUser<T>(u: SessionUser, fn: (c: PoolClient) => Promise<T>, note?: string) {
  return tx({ userId: u.id, sessionHash: u.sessionHash, ipHash: await ipHash(), note }, fn);
}

export function hashPassword(p: string) {
  return bcrypt.hash(p, 12);
}

export function validatePassword(p: string) {
  if (p.length < 10) return "A senha deve ter pelo menos 10 caracteres.";
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return "Use letras e números.";
  return null;
}
