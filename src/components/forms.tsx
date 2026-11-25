"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/actions";

export function Submit({ children, className = "btn btn-primary", pending }: { children: React.ReactNode; className?: string; pending?: string }) {
  const s = useFormStatus();
  return (
    <button type="submit" className={className} disabled={s.pending}>
      {s.pending ? pending ?? "Salvando…" : children}
    </button>
  );
}

/** Formulário ligado a uma server action com retorno de estado. */
export function ActionForm({
  action,
  children,
  className = "space-y-4",
  resetOnSuccess = true,
}: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <FormMessage state={state} />
    </form>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  const [copied, setCopied] = useState(false);
  if (!state) return null;
  if (state.error) return <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{state.error}</p>;
  return (
    <div role="status" className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good">
      {state.message}
      {state.secret && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-ink">
          <span className="text-xs text-ink-2">Senha provisória (exibida uma única vez):</span>
          <code className="rounded bg-white px-2 py-1 font-mono text-sm ring-1 ring-line">{state.secret}</code>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigator.clipboard.writeText(state.secret!).then(() => setCopied(true))}
          >
            {copied ? "Copiada" : "Copiar"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Select não controlado que acompanha o valor do servidor após atualizações ao vivo. */
export function SyncSelect({ name, value, options, className = "field" }: { name: string; value: string; options: { value: string; label: string }[]; className?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <select name={name} className={className} value={v} onChange={(e) => setV(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
