"use client";

/**
 * Rastreamento no navegador:
 * 1) banco próprio (registro comercial, atribuição por corretor);
 * 2) dataLayer do Google Tag Manager / GA4 (sem dados pessoais).
 */
type Ev =
  | "page_view"
  | "brasil_view"
  | "santa_catarina_view"
  | "garuva_view"
  | "prolog_view"
  | "cta_click"
  | "lead_form_start"
  | "whatsapp_click"
  | "lead_submit";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

let ready: Promise<void> | null = null;
let ctx: { ref: string | null } = { ref: null };
const sent = new Set<string>();

export function startSession(ref: string | null) {
  if (ready) return ready;
  try {
    if (ref) sessionStorage.setItem("pi_ref", ref);
    else ref = sessionStorage.getItem("pi_ref");
  } catch {}
  ctx = { ref };
  const q = new URLSearchParams(location.search);
  ready = fetch("/api/track/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      ref,
      utm_source: q.get("utm_source"),
      utm_medium: q.get("utm_medium"),
      utm_campaign: q.get("utm_campaign"),
      referrer: document.referrer || null,
    }),
  })
    .then(() => undefined)
    .catch(() => undefined);
  return ready;
}

function pushDataLayer(event: string, extra: Record<string, unknown> = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, campaign: "radar_logistico", ref_code: ctx.ref ?? "direto", ...extra });
}

/** Registra o evento. Eventos de visualização são enviados uma vez por página. */
export async function track(event: Ev, extra: { duration_ms?: number; section?: string; label?: string } = {}) {
  const once = event !== "cta_click" && event !== "whatsapp_click";
  if (once && extra.duration_ms == null) {
    if (sent.has(event)) return;
    sent.add(event);
  }
  if (extra.duration_ms == null) pushDataLayer(event, { section: extra.section });
  if (event === "lead_submit") return; // registrado pelo servidor no envio do formulário
  await (ready ?? Promise.resolve());
  const body = JSON.stringify({ event, ...extra });
  if (extra.duration_ms != null && navigator.sendBeacon) {
    navigator.sendBeacon("/api/track/event", new Blob([body], { type: "text/plain" }));
    return;
  }
  fetch("/api/track/event", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true, credentials: "same-origin" }).catch(() => {});
}

export const currentRef = () => ctx.ref;
