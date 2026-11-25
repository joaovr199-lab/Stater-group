"use client";

import { useEffect, useState } from "react";
import { startSession, track } from "@/lib/tracker-client";

type Tracked = "brasil_view" | "santa_catarina_view" | "garuva_view" | "prolog_view";

/**
 * Inicia a sessão (preservando o ?ref), envia page_view e observa as seções
 * marcadas com data-track. Mede o tempo de permanência visível por seção e o
 * envia ao sair da página (sendBeacon).
 */
export function RadarTracker({ refCode }: { refCode: string | null }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    void startSession(refCode).then(() => track("page_view"));
    const started = performance.now();
    const visibleSince = new Map<Element, number>();
    const total = new Map<string, number>();

    const io = new IntersectionObserver(
      (entries) => {
        const now = performance.now();
        for (const e of entries) {
          const ev = (e.target as HTMLElement).dataset.track as Tracked;
          if (e.isIntersecting) {
            visibleSince.set(e.target, now);
            void track(ev, { section: e.target.id });
          } else if (visibleSince.has(e.target)) {
            total.set(ev, (total.get(ev) ?? 0) + now - visibleSince.get(e.target)!);
            visibleSince.delete(e.target);
          }
        }
      },
      { threshold: 0.35 }
    );
    document.querySelectorAll("[data-track]").forEach((el) => io.observe(el));

    const reveal = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => reveal.observe(el));

    let flushed = false;
    const flush = () => {
      if (flushed) return;
      flushed = true;
      const now = performance.now();
      visibleSince.forEach((t, el) => {
        const ev = (el as HTMLElement).dataset.track!;
        total.set(ev, (total.get(ev) ?? 0) + now - t);
      });
      void track("page_view", { duration_ms: Math.round(now - started) });
      total.forEach((ms, ev) => void track(ev as Tracked, { duration_ms: Math.round(ms) }));
    };
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);

    const onScroll = () => {
      const h = document.documentElement;
      setProgress(Math.min(1, h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      reveal.disconnect();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("scroll", onScroll);
    };
  }, [refCode]);

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent" aria-hidden>
      <div className="h-full bg-brand transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
    </div>
  );
}
