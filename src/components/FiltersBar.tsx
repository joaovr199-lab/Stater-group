"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Opt = { id: string; name: string; agency_id?: string };

export function FiltersBar({
  campaigns,
  agencies,
  brokers,
  showAgency = true,
  showBroker = true,
}: {
  campaigns: Opt[];
  agencies?: Opt[];
  brokers?: Opt[];
  showAgency?: boolean;
  showBroker?: boolean;
}) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const set = (k: string, v: string) => {
    const q = new URLSearchParams(sp.toString());
    if (v) q.set(k, v);
    else q.delete(k);
    if (k === "imobiliaria") q.delete("corretor");
    router.push(`${path}${q.toString() ? `?${q}` : ""}`);
  };
  const agency = sp.get("imobiliaria") ?? "";
  const brokerOpts = (brokers ?? []).filter((b) => !agency || b.agency_id === agency);
  return (
    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-3" aria-label="Filtros">
      <label className="min-w-[9rem] flex-1 sm:flex-none">
        <span className="label">Período</span>
        <select className="field" value={sp.get("periodo") ?? "30d"} onChange={(e) => set("periodo", e.target.value === "30d" ? "" : e.target.value)}>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
          <option value="365d">Últimos 12 meses</option>
          <option value="all">Todo o período</option>
        </select>
      </label>
      <label className="min-w-[10rem] flex-1 sm:flex-none">
        <span className="label">Campanha</span>
        <select className="field" value={sp.get("campanha") ?? ""} onChange={(e) => set("campanha", e.target.value)}>
          <option value="">Todas</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      {showAgency && agencies && (
        <label className="min-w-[11rem] flex-1 sm:flex-none">
          <span className="label">Imobiliária</span>
          <select className="field" value={agency} onChange={(e) => set("imobiliaria", e.target.value)}>
            <option value="">Todas</option>
            {agencies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      )}
      {showBroker && brokers && (
        <label className="min-w-[11rem] flex-1 sm:flex-none">
          <span className="label">Corretor</span>
          <select className="field" value={sp.get("corretor") ?? ""} onChange={(e) => set("corretor", e.target.value)}>
            <option value="">Todos</option>
            {brokerOpts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
