"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useState } from "react";

const GTM = process.env.NEXT_PUBLIC_GTM_ID;
const GA4 = process.env.NEXT_PUBLIC_GA4_ID;

/**
 * Google Tag Manager / GA4 com Consent Mode v2: tudo começa negado e só é
 * liberado após o aceite do visitante. Sem IDs configurados, nada é carregado.
 */
export function Analytics() {
  const [choice, setChoice] = useState<"granted" | "denied" | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    try {
      const c = localStorage.getItem("pi_consent");
      if (c === "granted" || c === "denied") setChoice(c);
    } catch {}
  }, []);
  const decide = (c: "granted" | "denied") => {
    setChoice(c);
    try {
      localStorage.setItem("pi_consent", c);
    } catch {}
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    w.gtag?.("consent", "update", { analytics_storage: c, ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  };
  if (!GTM && !GA4) return null;
  const stored = mounted ? choice : null;
  return (
    <>
      <Script id="consent-default" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;
        gtag('consent','default',{analytics_storage:${JSON.stringify(stored ?? "denied")},ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});
      `}</Script>
      {GTM ? (
        <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(GTM)});`}</Script>
      ) : (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`gtag('js', new Date()); gtag('config', ${JSON.stringify(GA4)}, { anonymize_ip: true });`}</Script>
        </>
      )}
      {mounted && !choice && (
        <div role="dialog" aria-label="Preferências de cookies" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-line bg-white p-4 shadow-xl sm:p-5">
          <p className="text-sm leading-relaxed text-ink-2">
            Usamos cookies de medição (Google Analytics) para entender o uso da reportagem. Cookies essenciais e o registro de origem do link continuam ativos para o funcionamento do atendimento.{" "}
            <Link href="/privacidade" className="underline">Saiba mais</Link>.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => decide("granted")} className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white">Aceitar</button>
            <button onClick={() => decide("denied")} className="rounded-full border border-line-2 px-5 py-2 text-sm font-semibold">Somente essenciais</button>
          </div>
        </div>
      )}
    </>
  );
}
