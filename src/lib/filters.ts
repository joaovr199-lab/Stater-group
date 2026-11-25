// Filtros comuns dos painéis (período, campanha, imobiliária, corretor).
// O escopo de segurança NÃO depende destes filtros: ele é imposto pela RLS.

export type Filters = {
  period: string; // 7d | 30d | 90d | 365d | all
  from: Date | null;
  campaign: string | null;
  agency: string | null;
  broker: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.length ? s : null;
  };
  const period = one("periodo") ?? "30d";
  const days = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 }[period];
  const uuid = (k: string) => {
    const v = one(k);
    return v && UUID.test(v) ? v : null;
  };
  return {
    period,
    from: days ? new Date(Date.now() - days * 86400000) : null,
    campaign: uuid("campanha"),
    agency: uuid("imobiliaria"),
    broker: uuid("corretor"),
  };
}

/** Monta cláusulas WHERE parametrizadas para uma tabela com colunas padrão. */
export function where(f: Filters, alias: string, dateCol: string, params: unknown[], opts: { date?: boolean } = {}) {
  const parts: string[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  if (opts.date !== false && f.from) parts.push(`${alias}.${dateCol} >= ${p(f.from)}`);
  if (f.campaign) parts.push(`${alias}.campaign_id = ${p(f.campaign)}`);
  if (f.agency) parts.push(`${alias}.agency_id = ${p(f.agency)}`);
  if (f.broker) parts.push(`${alias}.broker_id = ${p(f.broker)}`);
  return parts.length ? parts.join(" and ") : "true";
}

export function filterQuery(f: Filters, extra: Record<string, string | undefined> = {}) {
  const q = new URLSearchParams();
  if (f.period !== "30d") q.set("periodo", f.period);
  if (f.campaign) q.set("campanha", f.campaign);
  if (f.agency) q.set("imobiliaria", f.agency);
  if (f.broker) q.set("corretor", f.broker);
  for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}
