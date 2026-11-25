import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";

export function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

export function newToken() {
  return randomBytes(32).toString("base64url");
}

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "0.0.0.0").trim();
}

/** IP nunca é armazenado em claro: apenas hash com sal (pseudonimização). */
export async function ipHash() {
  return sha256(`${process.env.IP_HASH_SALT ?? "prolog"}:${await clientIp()}`).slice(0, 32);
}

const buckets = new Map<string, { n: number; reset: number }>();
/** Limitação simples em memória por processo (proteção contra força bruta/spam). */
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  b.n += 1;
  return b.n <= max;
}

/** Verifica sem contar (para contar apenas falhas, ex.: login). */
export function isLimited(key: string, max: number) {
  const b = buckets.get(key);
  return Boolean(b && b.reset > Date.now() && b.n >= max);
}

export function randomCode(len = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(len);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function randomPassword() {
  return randomBytes(9).toString("base64url") + "a9";
}
