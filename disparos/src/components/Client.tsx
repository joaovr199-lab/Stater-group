"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import type { State } from "@/lib/actions";

/** Atualiza o painel a cada 20 s (novas aberturas aparecem sem recarregar). */
export function AutoRefresh() {
  const router = useRouter();
  const [at, setAt] = useState<string>("");
  useEffect(() => {
    setAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    const t = setInterval(() => {
      router.refresh();
      setAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 20000);
    return () => clearInterval(t);
  }, [router]);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className="h-2 w-2 rounded-full bg-good" /> Atualiza a cada 20 s{at ? ` · ${at}` : ""}
    </span>
  );
}

export function Submit({ children, className = "btn btn-primary" }: { children: React.ReactNode; className?: string }) {
  const s = useFormStatus();
  return (
    <button className={className} disabled={s.pending}>
      {s.pending ? "Aguarde…" : children}
    </button>
  );
}

export function ActionForm({ action, children, className }: { action: (s: State, f: FormData) => Promise<State>; children: React.ReactNode; className?: string }) {
  const [state, run] = useActionState(action, null);
  return (
    <form action={run} className={className}>
      {children}
      {state?.error && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{state.error}</p>}
      {state?.message && <p role="status" className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good">{state.message}</p>}
    </form>
  );
}

export function Copy({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        })
      }
    >
      {ok ? "Copiado ✓" : label}
    </button>
  );
}
