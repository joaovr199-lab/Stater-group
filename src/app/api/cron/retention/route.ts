import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Política de retenção (agendar diariamente). Exige Authorization: Bearer CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
  const r = await pool.query("select app.apply_retention() as r");
  return Response.json(r.rows[0].r);
}
