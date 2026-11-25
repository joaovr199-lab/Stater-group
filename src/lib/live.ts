import "server-only";
import { EventEmitter } from "node:events";
import { Client } from "pg";

/** Um único LISTEN por processo; cada conexão SSE assina o emissor. */
type LiveMsg = { t: string; id?: string; a?: string | null; b?: string | null; e?: string };
const g = globalThis as unknown as { __prologLive?: { em: EventEmitter; ready: Promise<void> | null } };

function connect(state: { em: EventEmitter; ready: Promise<void> | null }) {
  const client = new Client({ connectionString: process.env.DATABASE_LISTEN_URL ?? process.env.DATABASE_URL });
  state.ready = client
    .connect()
    .then(() => client.query("listen prolog_live"))
    .then(() => {
      client.on("notification", (n) => {
        try {
          state.em.emit("msg", JSON.parse(n.payload ?? "{}") as LiveMsg);
        } catch {}
      });
      const retry = () => {
        state.ready = null;
        setTimeout(() => connect(state), 3000);
      };
      client.on("error", retry);
      client.on("end", retry);
    })
    .catch((e) => {
      console.error("[live]", e.message);
      state.ready = null;
      setTimeout(() => connect(state), 5000);
    });
}

export function liveBus() {
  if (!g.__prologLive) {
    g.__prologLive = { em: new EventEmitter(), ready: null };
    g.__prologLive.em.setMaxListeners(1000);
    connect(g.__prologLive);
  }
  return g.__prologLive.em;
}
export type { LiveMsg };
