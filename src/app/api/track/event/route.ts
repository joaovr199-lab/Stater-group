import { NextResponse, type NextRequest } from "next/server";
import { CLIENT_EVENTS, type EventName } from "@/lib/constants";
import { publicTx } from "@/lib/db";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

/** Registra um evento de comportamento. Aceita JSON ou sendBeacon (text/plain). */
export async function POST(req: NextRequest) {
  const sid = req.cookies.get("pi_sid")?.value;
  if (!sid || !/^[0-9a-f-]{36}$/i.test(sid)) return NextResponse.json({ ok: false }, { status: 400 });
  if (!rateLimit(`ev:${sid}`, 120, 60_000)) return NextResponse.json({ ok: false }, { status: 429 });
  let body: Record<string, unknown> & { event?: string; duration_ms?: number; section?: string; label?: string } = {};
  try {
    body = JSON.parse((await req.text()) || "{}");
  } catch {}
  const event = String(body?.event ?? "") as EventName;
  if (!CLIENT_EVENTS.includes(event)) return NextResponse.json({ ok: false }, { status: 400 });
  const duration = typeof body.duration_ms === "number" && Number.isFinite(body.duration_ms) ? Math.round(body.duration_ms) : null;
  const meta: Record<string, string> = {};
  if (typeof body?.section === "string") meta.section = body.section.slice(0, 40);
  if (typeof body?.label === "string") meta.label = body.label.slice(0, 60);
  const r = await publicTx((c) => c.query("select app.track_event($1,$2,$3,$4) as ok", [sid, event, duration, meta]));
  return NextResponse.json({ ok: r.rows[0].ok });
}
