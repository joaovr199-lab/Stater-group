import Link from "next/link";
import { asUser, requireUser } from "@/lib/auth";
import { parseFilters } from "@/lib/filters";
import { fmtInt } from "@/lib/format";
import { alerts, getSettings, leadsList, linksFor, overviewKpis } from "@/lib/queries";
import { LeadCardMobile } from "@/components/leads";
import { LinkCard } from "@/components/LinkCard";
import { Empty, Kpi } from "@/components/ui";

/** Ambiente do corretor: mobile-first, foco em compartilhar e atender. */
export default async function Page() {
  const user = await requireUser(["broker"]);
  const f = parseFilters({ periodo: "all" });
  const d = await asUser(user, async (c) => {
    const s = await getSettings(c);
    const [k, links, leads, al] = await Promise.all([
      overviewKpis(c, f, s.scoring.thresholds.alta_intencao),
      linksFor(c, { broker: user.id }),
      leadsList(c, f, { limit: 8 }),
      alerts(c, s),
    ]);
    return { k, links: links.filter((l) => l.active), leads, al, s };
  });
  const app = process.env.APP_URL ?? "";
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted">{user.agency_name} · compartilhe seu link e acompanhe seus contatos.</p>
      </div>

      {d.links.length === 0 ? (
        <Empty>Seu link ainda não foi gerado. Peça ao gestor para incluir a imobiliária na campanha.</Empty>
      ) : (
        d.links.map((l) => <LinkCard key={l.id} url={`${app}${l.landing_path}?ref=${l.code}`} code={l.code} title={`Seu link · ${l.campaign_name}`} compact />)
      )}

      <div className="grid grid-cols-2 gap-3">
        <Kpi label="Acessos" value={fmtInt(d.k.visitors)} />
        <Kpi label="Eventos de interesse" value={fmtInt(d.k.interest_events)} />
        <Kpi label="Leads" value={fmtInt(d.k.leads)} />
        <Kpi label="Alta intenção" value={fmtInt(d.k.high_intent)} />
      </div>

      {d.al.length > 0 && (
        <section className="rounded-xl border border-bad/25 bg-bad-soft/50 p-4">
          <h2 className="text-sm font-semibold text-bad">Atenção: {d.al.length} {d.al.length === 1 ? "lead aguarda" : "leads aguardam"} você</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {d.al.slice(0, 5).map((a) => (
              <li key={a.id}>
                <Link className="font-medium underline-offset-2 hover:underline" href={`/corretor/leads/${a.id}`}>{a.name}</Link>
                <span className="text-ink-2"> · score {a.score}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-semibold">Leads recentes</h2>
          <Link href="/corretor/leads" className="text-sm text-navy hover:underline">Ver todos</Link>
        </div>
        {d.leads.length === 0 ? (
          <Empty>Quando alguém se cadastrar pelo seu link, o contato aparece aqui na hora.</Empty>
        ) : (
          <ul className="space-y-2">{d.leads.map((l) => <LeadCardMobile key={l.id} l={l} base="/corretor" noContactHours={d.s.alerts.no_contact_hours} />)}</ul>
        )}
      </section>
    </div>
  );
}
