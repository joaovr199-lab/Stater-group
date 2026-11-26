import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "rd_admin";
const DAYS = 14;

function sign(value: string) {
  const secret = process.env.ADMIN_PASSWORD ?? "";
  return createHmac("sha256", `rd:${secret}`).update(value).digest("base64url");
}

export function checkPassword(input: string) {
  const real = process.env.ADMIN_PASSWORD ?? "";
  if (!real) return false;
  const a = Buffer.from(sign(input));
  const b = Buffer.from(sign(real));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function startSession() {
  const exp = String(Date.now() + DAYS * 86400000);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DAYS * 86400,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v || !process.env.ADMIN_PASSWORD) return false;
  const [exp, sig] = v.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/entrar");
}
