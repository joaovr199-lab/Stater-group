import QRCode from "qrcode";
import { asUser, currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** QR Code do link (somente para quem pode ver o link — RLS). */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const u = await currentUser();
  if (!u) return new Response("unauthorized", { status: 401 });
  const { code } = await params;
  const r = await asUser(u, (c) =>
    c.query("select t.code, c.landing_path from app.tracking_links t join app.campaigns c on c.id=t.campaign_id where t.code=$1", [code.toUpperCase()])
  );
  if (!r.rows[0]) return new Response("not found", { status: 404 });
  const url = `${process.env.APP_URL ?? new URL(req.url).origin}${r.rows[0].landing_path}?ref=${r.rows[0].code}`;
  const format = new URL(req.url).searchParams.get("format");
  if (format === "png") {
    const buf = await QRCode.toBuffer(url, { width: 1024, margin: 2, color: { dark: "#0f1b2d", light: "#ffffff" } });
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="prolog-${r.rows[0].code}.png"` },
    });
  }
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0f1b2d", light: "#ffffff" } });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, max-age=3600" } });
}
