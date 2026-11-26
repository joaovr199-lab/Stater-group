import { NextResponse, type NextRequest } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Atualiza tempo de leitura e rolagem máxima. Aceita sendBeacon (text/plain). */
export async function POST(req: NextRequest) {
  let b: { id?: string; d?: number; s?: number } = {};
  try {
    b = JSON.parse((await req.text()) || "{}");
  } catch {}
  if (!b.id || !/^[0-9a-f-]{36}$/.test(b.id)) return NextResponse.json({}, { status: 400 });
  const d = Math.max(0, Math.min(Math.round(Number(b.d) || 0), 4 * 3600_000));
  const s = Math.max(0, Math.min(Math.round(Number(b.s) || 0), 100));
  await q(
    `update visits set duration_ms = greatest(duration_ms, $2), max_scroll = greatest(max_scroll, $3), last_at = now()
     where id = $1 and started_at > now() - interval '6 hours'`,
    [b.id, d, s]
  );
  return NextResponse.json({ ok: true });
}
