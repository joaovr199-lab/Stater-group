import { NextResponse, type NextRequest } from "next/server";
import { publicTx } from "@/lib/db";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;
const VID = "pi_vid";
const SID = "pi_sid";

/** Inicia (ou retoma) a sessão de navegação na reportagem e registra a origem. */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit(`sess:${ip}`, 60, 60_000)) return NextResponse.json({ error: "rate" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const ref = typeof body.ref === "string" ? body.ref.replace(/[^A-Za-z0-9]/g, "").slice(0, 24) : "";
  const vid = req.cookies.get(VID)?.value;
  const sid = req.cookies.get(SID)?.value;
  const ua = req.headers.get("user-agent") ?? "";
  const device = /mobile|android|iphone/i.test(ua) ? "mobile" : "desktop";

  // Retoma a sessão existente (sem novo ref) para preservar a origem na navegação.
  if (sid && UUID.test(sid) && !ref) {
    const r = await publicTx((c) =>
      c.query("select id, visitor_id from app.web_sessions where id=$1 and last_seen_at > now() - interval '30 minutes'", [sid])
    ).catch(() => null);
    if (r?.rows[0]) return NextResponse.json({ sid, resumed: true });
  }

  const r = await publicTx((c) =>
    c.query("select * from app.start_session($1,$2,$3,$4,$5,$6,$7)", [
      vid && UUID.test(vid) ? vid : null,
      ref || null,
      str(body.utm_source),
      str(body.utm_medium),
      str(body.utm_campaign),
      str(body.referrer),
      device,
    ])
  );
  const s = r.rows[0];
  const res = NextResponse.json({ sid: s.session_id, origin: s.origin, attributed: Boolean(s.agency_id) });
  const secure = process.env.NODE_ENV === "production";
  // Identificador pseudônimo first-party (sem dado pessoal). Validade de 180 dias.
  res.cookies.set(VID, s.visitor_id, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 180 * 86400 });
  res.cookies.set(SID, s.session_id, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 12 * 3600 });
  return res;
}

function str(v: unknown) {
  return typeof v === "string" && v ? v.slice(0, 300) : null;
}
