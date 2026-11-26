"use client";

import Link from "next/link";
import { useState } from "react";
import { flushReading, useVisit } from "./Tracker";

export function InterestButton({ label, whatsapp, chapter }: { label: string; whatsapp: string | null; chapter: string }) {
  const { id } = useVisit();
  const [state, setState] = useState<"idle" | "form" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const send = async (extra: Record<string, unknown> = {}) => {
    if (!id) return;
    flushReading();
    setError(null);
    setState("sending");
    const r = await fetch("/api/v/cta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...extra }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) return setState("done");
    if (d.needsForm && !extra.name) {
      setFormOpen(true);
      return setState("form");
    }
    setError(d.error ?? "Não foi possível registrar agora. Tente novamente.");
    setState(extra.name ? "form" : "idle");
  };

  const wa = whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Li o capítulo "${chapter}" do Radar Logístico e quero saber mais sobre a oportunidade em Garuva.`)}` : null;

  if (state === "done")
    return (
      <div role="status" className="rounded-2xl border border-brand/50 bg-white p-6">
        <div className="font-display text-2xl">Interesse registrado.</div>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-2">Um especialista da Stater Group vai falar com você pelo WhatsApp.</p>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex rounded-full bg-black px-6 py-3 font-semibold text-white">
            Prefiro chamar agora no WhatsApp
          </a>
        )}
      </div>
    );

  if (formOpen)
    return (
      <form
        className="space-y-3 rounded-2xl border border-line bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void send({ name: f.get("name"), phone: f.get("phone"), consent: f.get("consent") === "on" });
        }}
      >
        <p className="text-sm text-ink-2">Deixe seu nome e WhatsApp para um especialista falar com você.</p>
        <label className="block">
          <span className="label">Nome</span>
          <input id="cta-name" name="name" className="field" autoComplete="name" required />
        </label>
        <label className="block">
          <span className="label">WhatsApp com DDD</span>
          <input id="cta-phone" name="phone" className="field" inputMode="tel" autoComplete="tel-national" placeholder="(47) 99999-9999" required />
        </label>
        <label className="flex gap-2.5 text-sm leading-snug text-ink-2">
          <input id="cta-consent" type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 accent-black" />
          <span>
            Autorizo a Stater Group a entrar em contato comigo sobre esta oportunidade e li o <Link href="/privacidade" target="_blank" className="underline">Aviso de Privacidade</Link>.
          </span>
        </label>
        {error && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
        <button disabled={state === "sending"} className="w-full rounded-full bg-black px-6 py-3.5 font-semibold text-white disabled:opacity-60">
          {state === "sending" ? "Enviando…" : "Quero ser contatado"}
        </button>
      </form>
    );

  return (
    <div>
      <button
        onClick={() => void send()}
        disabled={!id || state === "sending"}
        className="inline-flex items-center justify-center rounded-full bg-black px-8 py-4 text-base font-semibold text-white transition hover:bg-[#222] disabled:opacity-60"
      >
        {state === "sending" ? "Registrando…" : label}
        <span className="ml-2 text-brand" aria-hidden>→</span>
      </button>
      {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
    </div>
  );
}
