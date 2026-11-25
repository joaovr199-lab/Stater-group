"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copiar link", className = "btn btn-secondary btn-sm" }: { text: string; label?: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1800);
        })
      }
    >
      {ok ? "Copiado ✓" : label}
    </button>
  );
}

export function whatsappShare(url: string) {
  const msg = `Separei uma reportagem sobre o mercado logístico em Santa Catarina e uma oportunidade em Garuva que pode interessar a você: ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

/** Cartão do link de campanha: copiar, WhatsApp, QR Code (mobile-first). */
export function LinkCard({ url, code, title, compact = false }: { url: string; code: string; title: string; compact?: boolean }) {
  const [qr, setQr] = useState(!compact);
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.07em] text-muted">{title}</div>
      <div className="mt-1.5 break-all font-mono text-sm text-ink">{url}</div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <a className="btn btn-primary col-span-2 sm:col-span-1" href={whatsappShare(url)} target="_blank" rel="noopener noreferrer">
          Compartilhar no WhatsApp
        </a>
        <CopyButton text={url} className="btn btn-secondary" />
        <button type="button" className="btn btn-secondary" onClick={() => setQr((v) => !v)}>
          {qr ? "Ocultar QR" : "QR Code"}
        </button>
      </div>
      {qr && (
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:items-end">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/qr/${code}`} alt={`QR Code do link ${code}`} width={168} height={168} className="rounded-lg border border-line bg-white p-2" />
          <a className="btn btn-ghost btn-sm" href={`/api/qr/${code}?format=png`}>Baixar PNG em alta resolução</a>
        </div>
      )}
    </div>
  );
}
