"use client";

import { useEffect, useState } from "react";

let visitId: string | null = null;
let flushNow: () => void = () => {};
/** Envia imediatamente tempo e rolagem (usado antes do clique em interesse). */
export const flushReading = () => flushNow();
const listeners = new Set<(id: string, identified: boolean) => void>();

/** Registra a abertura, o tempo visível e a rolagem máxima do capítulo. */
export function Tracker({ page, token }: { page: string; token: string | null }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let visible = document.visibilityState === "visible" ? performance.now() : 0;
    let total = 0;
    let maxScroll = 0;
    const elapsed = () => total + (visible ? performance.now() - visible : 0);
    const send = (beacon = false) => {
      if (!visitId) return;
      const body = JSON.stringify({ id: visitId, d: Math.round(elapsed()), s: maxScroll });
      if (beacon && navigator.sendBeacon) navigator.sendBeacon("/api/v/ping", new Blob([body], { type: "text/plain" }));
      else fetch("/api/v/ping", { method: "POST", body, keepalive: true }).catch(() => {});
    };
    fetch("/api/v", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page, token, referrer: document.referrer || null }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.id) return;
        visitId = d.id;
        listeners.forEach((fn) => fn(d.id, Boolean(d.identified)));
      })
      .catch(() => {});
    flushNow = () => send();
    const onScroll = () => {
      const h = document.documentElement;
      const pct = Math.min(100, Math.round(((h.scrollTop + h.clientHeight) / Math.max(1, h.scrollHeight)) * 100));
      if (pct > maxScroll) maxScroll = pct;
      setProgress(Math.min(1, h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)));
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        if (visible) total += performance.now() - visible;
        visible = 0;
        send(true);
      } else if (!visible) visible = performance.now();
    };
    const timer = setInterval(() => document.visibilityState === "visible" && send(), 15000);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", () => send(true));
    onScroll();
    return () => {
      clearInterval(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [page, token]);
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-[3px]" aria-hidden>
      <div className="h-full bg-brand transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
    </div>
  );
}

export function useVisit() {
  const [state, setState] = useState<{ id: string | null; identified: boolean }>({ id: visitId, identified: false });
  useEffect(() => {
    const fn = (id: string, identified: boolean) => setState({ id, identified });
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return state;
}
