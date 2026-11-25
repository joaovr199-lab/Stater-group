import { currentUser } from "@/lib/auth";
import { liveBus, type LiveMsg } from "@/lib/live";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Server-Sent Events: avisa o painel quando algo do seu escopo muda. */
export async function GET(req: Request) {
  const u = await currentUser();
  if (!u) return new Response("unauthorized", { status: 401 });
  const visible = (m: LiveMsg) =>
    u.role === "stater_admin" || (u.role === "agency_manager" && m.a === u.agency_id) || (u.role === "broker" && m.b === u.id);
  const bus = liveBus();
  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(ctrl) {
      const send = (s: string) => {
        try {
          ctrl.enqueue(enc.encode(s));
        } catch {}
      };
      send(": connected\n\nretry: 5000\n\n");
      const onMsg = (m: LiveMsg) => {
        if (visible(m)) send(`data: ${JSON.stringify({ t: m.t, id: m.id ?? null, e: m.e ?? null })}\n\n`);
      };
      bus.on("msg", onMsg);
      const hb = setInterval(() => send(": hb\n\n"), 25000);
      cleanup = () => {
        clearInterval(hb);
        bus.off("msg", onMsg);
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          ctrl.close();
        } catch {}
      });
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
  });
}
