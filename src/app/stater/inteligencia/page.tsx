import Link from "next/link";
import { asUser, requireUser } from "@/lib/auth";
import { filterQuery, parseFilters } from "@/lib/filters";
import { fmtHours, fmtInt, fmtPct } from "@/lib/format";
import { alerts, filterOptions, getSettings, performance, type PerfRow } from "@/lib/queries";
import { FiltersBar } from "@/components/FiltersBar";
import { AlertsCard, PerfTable } from "@/components/views";
import { Card, PageHeader } from "@/components/ui";

type P = { searchParams: Promise<Record<string, string | string[] | undefined>> };

type Rank = { key: string; title: string; value: (r: PerfRow) => number; fmt: (r: PerfRow) => string; asc?: boolean; eligible: (r: PerfRow) => boolean };

const RANKS: Rank[] = [
  { key: "visitors", title: "Mais acessos", value: (r) => r.visitors, fmt: (r) => `${fmtInt(r.visitors)} visitantes`, eligible: (r) => r.visitors > 0 },
  {
    key: "interest",
    title: "Mais interesse despertado",
    value: (r) => r.prolog / r.visitors,
    fmt: (r) => `${fmtPct(r.prolog / r.visitors)} chegam ao PROLOG`,
    eligible: (r) => r.visitors >= 3,
  },
  { key: "leads", title: "Mais leads captados", value: (r) => r.leads, fmt: (r) => `${fmtInt(r.leads)} leads`, eligible: (r) => r.leads > 0 },
  {
    key: "speed",
    title: "Atendimento mais rápido",
    value: (r) => r.avg_response_h ?? Infinity,
    fmt: (r) => `${fmtHours(r.avg_response_h)} até o 1º contato`,
    asc: true,
    eligible: (r) => r.avg_response_h != null,
  },
  { key: "meetings", title: "Mais reuniões", value: (r) => r.meetings, fmt: (r) => `${fmtInt(r.meetings)} reuniões`, eligible: (r) => r.meetings > 0 },
  {
    key: "conv",
    title: "Maior conversão",
    value: (r) => r.converted / r.leads,
    fmt: (r) => `${fmtPct(r.converted / r.leads)} (${fmtInt(r.converted)})`,
    eligible: (r) => r.leads > 0 && r.converted > 0,
  },
];

function Ranking({ rows, label }: { rows: PerfRow[]; label: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {RANKS.map((rk) => {
        const list = rows
          .filter(rk.eligible)
          .sort((a, b) => (rk.asc ? rk.value(a) - rk.value(b) : rk.value(b) - rk.value(a)))
          .slice(0, 5);
        return (
          <Card key={rk.key} title={`${rk.title} · ${label}`}>
            {list.length === 0 ? (
              <p className="text-sm text-muted">Sem dados suficientes.</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {list.map((r, i) => (
                  <li key={r.id} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">
                      <span className="tabular mr-2 text-muted">{i + 1}.</span>
                      {r.name}
                    </span>
                    <span className="tabular shrink-0 text-xs text-ink-2">{rk.fmt(r)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export default async function Page({ searchParams }: P) {
  const user = await requireUser(["stater_admin"]);
  const f = parseFilters(await searchParams);
  const d = await asUser(user, async (c) => {
    const s = await getSettings(c);
    const thr = s.scoring.thresholds.alta_intencao;
    const [byAgency, byBroker, opts, al] = await Promise.all([
      performance(c, f, "agency", thr),
      performance(c, f, "broker", thr),
      filterOptions(c),
      alerts(c, s, f),
    ]);
    return { byAgency, byBroker, opts, al };
  });
  return (
    <>
      <PageHeader
        title="Inteligência comercial"
        subtitle="Desempenho por imobiliária e por corretor, do link distribuído à conversão."
        actions={<Link className="btn btn-secondary" href={`/stater/relatorios${filterQuery(f)}`}>Relatórios</Link>}
      />
      <FiltersBar campaigns={d.opts.campaigns} agencies={d.opts.agencies} brokers={d.opts.brokers} />
      <Card title="Funil por imobiliária" pad={false}>
        <PerfTable rows={d.byAgency} by="agency" />
      </Card>
      <h2 className="mb-3 mt-8 text-lg font-semibold">Ranking de imobiliárias</h2>
      <Ranking rows={d.byAgency} label="imobiliárias" />
      <h2 className="mb-3 mt-8 text-lg font-semibold">Ranking de corretores</h2>
      <Ranking rows={d.byBroker} label="corretores" />
      <Card title="Funil por corretor" className="mt-5" pad={false}>
        <PerfTable rows={d.byBroker} by="broker" />
      </Card>
      <div className="mt-5">
        <AlertsCard rows={d.al} base="/stater" />
      </div>
    </>
  );
}
