import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isPage } from "@/content/capitulos";
import { q } from "@/lib/db";
import { ipOf, rateLimit } from "@/lib/rate";

export const dynamic = "force-dynamic";

/** Registra a abertura de um capítulo (só roda no navegador: robôs de pré-visualização do WhatsApp não contam). */
export async function POST(req: NextRequest) {
  if (!rateLimit(`v:${ipOf(req.headers)}`, 60, 60_000)) return NextResponse.json({}, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const page = String(body.page ?? "");
  if (!isPage(page)) return NextResponse.json({}, { status: 400 });
  const token = typeof body.token === "string" ? body.token.replace(/[^A-Za-z0-9]/g, "").slice(0, 16).toUpperCase() : "";
  const contact = token ? (await q<{ id: number }>("select id from contacts where token=$1", [token]))[0] : undefined;
  let visitor = req.cookies.get("rd_vid")?.value;
  if (!visitor || !/^[0-9a-f-]{36}$/.test(visitor)) visitor = randomUUID();
  // Contato anônimo que já se identificou antes neste navegador continua identificado.
  const known = !contact
    ? (await q<{ contact_id: number }>("select contact_id from visits where visitor=$1 and contact_id is not null order by started_at desc limit 1", [visitor]))[0]
    : undefined;
  const ua = req.headers.get("user-agent") ?? "";
  const id = randomUUID();
  await q("insert into visits(id, page, contact_id, visitor, device, referrer) values ($1,$2,$3,$4,$5,$6)", [
    id,
    page,
    contact?.id ?? known?.contact_id ?? null,
    visitor,
    /mobile|android|iphone/i.test(ua) ? "celular" : "computador",
    typeof body.referrer === "string" ? body.referrer.slice(0, 300) : null,
  ]);
  const res = NextResponse.json({ id, identified: Boolean(contact ?? known) });
  res.cookies.set("rd_vid", visitor, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 180 * 86400, path: "/" });
  return res;
}
