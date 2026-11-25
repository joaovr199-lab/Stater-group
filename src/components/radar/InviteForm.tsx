"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { INTERESTS } from "@/lib/constants";
import { CONSENT_CONTACT_TEXT, CONSENT_PRIVACY_TEXT } from "./consent-text";
import { currentRef, track } from "@/lib/tracker-client";

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function InviteForm({ cta, whatsapp }: { cta: string; whatsapp: string | null }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const onCta = () => {
    void track("cta_click", { label: "conhecer_investimento" });
    setOpen(true);
    setTimeout(() => formRef.current?.querySelector<HTMLInputElement>("input[name=name]")?.focus(), 60);
  };
  const onStart = () => {
    if (started.current) return;
    started.current = true;
    void track("lead_form_start");
  };
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    setState("sending");
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        name: f.get("name"),
        phone: f.get("phone"),
        email: f.get("email") ?? "",
        interest: f.get("interest"),
        consent_privacy: f.get("consent_privacy") === "on",
        consent_contact: f.get("consent_contact") === "on",
        website: f.get("website") ?? "",
      }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      setState("idle");
      setError(data.error ?? "Não foi possível enviar agora. Tente novamente.");
      return;
    }
    void track("lead_submit");
    setState("done");
  };

  const waHref = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Li a reportagem Radar Logístico e quero conhecer o PROLOG.${currentRef() ? ` (ref ${currentRef()})` : ""}`)}`
    : null;

  if (state === "done")
    return (
      <div role="status" className="rounded-2xl border border-brand/40 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-black text-brand">✓</div>
        <h3 className="mt-4 font-display text-2xl">Recebemos seu contato.</h3>
        <p className="mx-auto mt-2 max-w-md text-[0.95rem] leading-relaxed text-ink-2">
          Um especialista vai falar com você pelo WhatsApp informado para apresentar o PROLOG. Você pode revogar a autorização de contato a qualquer momento.
        </p>
      </div>
    );

  return (
    <div>
      {!open && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={onCta} className="inline-flex items-center justify-center rounded-full bg-black px-8 py-4 text-base font-semibold text-white transition hover:bg-[#222]">
            {cta}
            <span className="ml-2 text-brand" aria-hidden>→</span>
          </button>
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => void track("whatsapp_click")}
              className="inline-flex items-center justify-center rounded-full border border-ink/20 px-8 py-4 text-base font-semibold text-ink hover:border-ink"
            >
              Falar pelo WhatsApp
            </a>
          )}
        </div>
      )}
      {open && (
        <form ref={formRef} onSubmit={onSubmit} onFocus={onStart} className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-7" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="label">Nome</span>
              <input name="name" className="field" autoComplete="name" required maxLength={120} />
            </label>
            <label>
              <span className="label">WhatsApp</span>
              <input name="phone" className="field" inputMode="tel" autoComplete="tel-national" required value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(47) 99999-9999" />
            </label>
            <label>
              <span className="label">E-mail <span className="font-normal text-muted">(opcional)</span></span>
              <input name="email" type="email" className="field" autoComplete="email" maxLength={160} />
            </label>
            <label className="sm:col-span-2">
              <span className="label">Interesse principal</span>
              <select name="interest" className="field" required defaultValue="">
                <option value="" disabled>Selecione</option>
                {INTERESTS.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </label>
          </div>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          <label className="flex gap-3 text-sm leading-snug text-ink-2">
            <input type="checkbox" name="consent_privacy" required className="mt-0.5 h-4 w-4 shrink-0 accent-black" />
            <span>
              {CONSENT_PRIVACY_TEXT.split("Aviso de Privacidade")[0]}
              <Link href="/privacidade" target="_blank" className="font-medium text-ink underline underline-offset-2">Aviso de Privacidade</Link>
              {CONSENT_PRIVACY_TEXT.split("Aviso de Privacidade")[1]}
            </span>
          </label>
          <label className="flex gap-3 text-sm leading-snug text-ink-2">
            <input type="checkbox" name="consent_contact" required className="mt-0.5 h-4 w-4 shrink-0 accent-black" />
            <span>{CONSENT_CONTACT_TEXT}</span>
          </label>
          {error && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
          <button disabled={state === "sending"} className="w-full rounded-full bg-black px-6 py-3.5 font-semibold text-white hover:bg-[#222] disabled:opacity-60">
            {state === "sending" ? "Enviando…" : "Enviar e receber contato"}
          </button>
          <p className="text-xs text-muted">Seus dados são usados apenas para o atendimento sobre o PROLOG. Não compartilhamos com terceiros fora da cadeia de atendimento (Stater, imobiliária e corretor responsáveis).</p>
        </form>
      )}
    </div>
  );
}
