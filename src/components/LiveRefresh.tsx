"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Atualiza a tela quando o servidor avisa (SSE). Fallback: polling a cada 30 s. */
export function LiveRefresh() {
  const router = useRouter();
  const [status, setStatus] = useState<"on" | "off">("off");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 800);
    };
    try {
      es = new EventSource("/api/stream");
      es.onopen = () => {
        setStatus("on");
        if (poll) {
          clearInterval(poll);
          poll = null;
        }
      };
      es.onmessage = refresh;
      es.onerror = () => {
        setStatus("off");
        if (!poll) poll = setInterval(() => router.refresh(), 30000);
      };
    } catch {
      poll = setInterval(() => router.refresh(), 30000);
    }
    return () => {
      es?.close();
      if (poll) clearInterval(poll);
    };
  }, [router]);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" title={status === "on" ? "Atualização em tempo real ativa" : "Reconectando…"}>
      <span className={`h-2 w-2 rounded-full ${status === "on" ? "bg-good" : "bg-line-2"}`} />
      {status === "on" ? "Ao vivo" : "Offline"}
    </span>
  );
}
