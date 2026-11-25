import Link from "next/link";
import { asUser, type SessionUser } from "@/lib/auth";
import { createLinkAction, createUserAction, resetPasswordAction, toggleLinkAction, toggleUserAction } from "@/lib/actions";
import { CLASS_LABEL, STAGES } from "@/lib/constants";
import { filterQuery, parseFilters } from "@/lib/filters";
import { fmtDateTime, fmtHours, fmtInt, fmtPct } from "@/lib/format";
import {
  alerts,
  anonymousList,
  filterOptions,
  getSettings,
  leadsList,
  linksFor,
  overviewKpis,
  performance,
  stageCounts,
  timeseries,
  type PerfRow,
} from "@/lib/queries";
import { DailyBars, Funnel } from "./charts";
import { FiltersBar } from "./FiltersBar";
import { ActionForm, Submit } from "./forms";
import { AnonTable, LeadTable } from "./leads";
import { CopyButton, LinkCard } from "./LinkCard";
import { Card, Empty, Kpi, PageHeader, ScoreBadge, StageBadge, Tabs } from "./ui";

type SP = Record<string, string | string[] | undefined>;
const appUrl = () => process.env.APP_URL ?? "";

// ---------------------------------------------------------------------------
// Visão geral
// ---------------------------------------------------------------------------
export async function OverviewView({ user, sp, base }: { user: SessionUser; sp: SP; base: string }) {
  const f = parseFilters(sp);
  const isAdmin = user.role === "stater_admin";
  const d = await asUser(user, async (c) => {
    const s = await getSettings(c);
    const thr = s.scoring.thresholds.alta_intencao;
    const [k, ts, opts, al, perf] = await Promise.all([
      overviewKpis(c, f, thr),
      timeseries(c, f),
      filterOptions(c),
      alerts(c, s, f),
      performance(c, f, isAdmin ? "agency" : "broker", thr),
    ]);
    return { k, ts, opts, al, perf, s };
  });
  const { k, ts, opts, al, perf } = d;
  const agg = perf.reduce(
    (a, r) => ({ visitors: a.visitors + r.visitors, brasil: a.brasil + r.brasil, sc: a.sc + r.sc, garuva: a.garuva + r.garuva, prolog: a.prolog + r.prolog, cta: a.cta + r.cta, leads: a.leads + r.leads, meetings: a.meetings + r.meetings, converted: a.converted + r.converted }),
    { visitors: 0, brasil: 0, sc: 0, garuva: 0, prolog: 0, cta: 0, leads: 0, meetings: 0, converted: 0 }
  );
  return (
    <>
      <PageHeader
        title={isAdmin ? "Visão geral da operação" : `Visão geral · ${user.agency_name}`}
        subtitle={isAdmin ? "Todas as imobiliárias, corretores e campanhas da Stater." : "Desempenho da sua equipe nas campanhas Stater."}
        actions={<Link className="btn btn-secondary" href={`${base}/leads${filterQuery(f)}`}>Abrir gestão de leads</Link>}
      />
      <FiltersBar campaigns={opts.campaigns} agencies={opts.agencies} brokers={opts.brokers} showAgency={isAdmin} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {isAdmin && <Kpi label="Imobiliárias participantes" value={fmtInt(k.agencies)} />}
        <Kpi label="Corretores cadastrados" value={fmtInt(k.brokers)} />
        <Kpi label="Visitantes únicos" value={fmtInt(k.visitors)} hint={`${fmtInt(k.sessions)} sessões`} />
        <Kpi label="Eventos de interesse" value={fmtInt(k.interest_events)} hint={`${fmtInt(k.anonymous_interests)} interesses anônimos`} />
        <Kpi label="Leads cadastrados" value={fmtInt(k.leads)} />
        <Kpi label="Leads de alta intenção" value={fmtInt(k.high_intent)} />
        <Kpi label="Leads sem atendimento" value={fmtInt(k.unattended)} tone={k.unattended ? "bad" : undefined} />
        <Kpi label="Reuniões agendadas" value={fmtInt(k.meetings)} />
        <Kpi label="Convertidos" value={fmtInt(k.converted)} />
        <Kpi label="Conversão comercial" value={fmtPct(k.conversion)} hint="convertidos ÷ leads" tone={k.conversion ? "good" : undefined} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Visitantes únicos por dia">
          <DailyBars data={ts.map((x) => ({ day: x.day, value: x.visitors }))} label="Visitantes" />
        </Card>
        <Card title="Leads cadastrados por dia">
          <DailyBars data={ts.map((x) => ({ day: x.day, value: x.leads }))} label="Leads" />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Card title="Avanço na reportagem (visitantes únicos)">
          <Funnel
            steps={[
              { label: "Acessaram", value: agg.visitors },
              { label: "Brasil", value: agg.brasil },
              { label: "Santa Catarina", value: agg.sc },
              { label: "Garuva", value: agg.garuva },
              { label: "PROLOG", value: agg.prolog },
              { label: "Clicaram no CTA", value: agg.cta },
              { label: "Cadastraram", value: agg.leads },
              { label: "Reuniões", value: agg.meetings },
              { label: "Convertidos", value: agg.converted },
            ]}
          />
          {!isAdmin && <p className="mt-3 text-xs text-muted">Inclui apenas os acessos atribuídos a corretores. Acessos pelo link da imobiliária aparecem nos relatórios.</p>}
        </Card>
        <AlertsCard rows={al} base={base} />
      </div>

      <Card title={isAdmin ? "Desempenho por imobiliária" : "Desempenho por corretor"} className="mt-5" pad={false}
        actions={<Link href={isAdmin ? `/stater/inteligencia${filterQuery(f)}` : `${base}/relatorios${filterQuery(f)}`} className="text-xs font-medium text-navy hover:underline">Ver ranking completo →</Link>}>
        <PerfTable rows={perf.slice(0, 8)} by={isAdmin ? "agency" : "broker"} />
      </Card>
    </>
  );
}

export function AlertsCard({ rows, base }: { rows: Awaited<ReturnType<typeof alerts>>; base: string }) {
  return (
    <Card title={`Alertas comerciais${rows.length ? ` (${rows.length})` : ""}`} pad={false}>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">Nenhuma oportunidade sem acompanhamento.</p>
      ) : (
        <ul className="max-h-[22rem] divide-y divide-line overflow-y-auto">
          {rows.map((a) => (
            <li key={a.id}>
              <Link href={`${base}/leads/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-[#fafafa]">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{a.name}</div>
                  <div className="truncate text-xs text-muted">
                    {a.kind === "sem_atendimento" ? (
                      <span className="font-semibold text-bad">Sem atendimento há {fmtHours(a.hours_waiting)}</span>
                    ) : (
                      <span className="font-semibold text-warn">Alta intenção sem movimentação desde {fmtDateTime(a.last_activity_at)}</span>
                    )}
                    {` · ${a.agency_name ?? "—"} · ${a.broker_name ?? "sem corretor"}`}
                  </div>
                </div>
                <ScoreBadge score={a.score} cls={a.classification} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function PerfTable({ rows, by }: { rows: PerfRow[]; by: "agency" | "broker" }) {
  if (!rows.length) return <div className="p-5"><Empty>Sem dados no período.</Empty></div>;
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>{by === "agency" ? "Imobiliária" : "Corretor"}</th>
            <th className="text-right">Links</th>
            <th className="text-right">Acessos</th>
            <th className="text-right">Brasil</th>
            <th className="text-right">SC</th>
            <th className="text-right">Garuva</th>
            <th className="text-right">PROLOG</th>
            <th className="text-right">CTA</th>
            <th className="text-right">Leads</th>
            <th className="text-right">Contatados</th>
            <th className="text-right">Reuniões</th>
            <th className="text-right">Conversões</th>
            <th className="text-right">1º atendimento</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap font-medium">
                {r.name}
                {r.agency_name && <div className="text-xs font-normal text-muted">{r.agency_name}</div>}
              </td>
              {[r.links, r.visitors, r.brasil, r.sc, r.garuva, r.prolog, r.cta, r.leads, r.contacted, r.meetings, r.converted].map((v, i) => (
                <td key={i} className="tabular text-right">{fmtInt(v)}</td>
              ))}
              <td className="tabular text-right">{fmtHours(r.avg_response_h)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gestão de leads (identificados × anônimos)
// ---------------------------------------------------------------------------
export async function LeadsView({ user, sp, base }: { user: SessionUser; sp: SP; base: string }) {
  const f = parseFilters(sp);
  const tab = sp.aba === "anonimos" ? "anonimos" : "identificados";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : null;
  const stage = typeof sp.etapa === "string" && sp.etapa ? sp.etapa : null;
  const cls = typeof sp.classe === "string" && sp.classe ? sp.classe : null;
  const isAdmin = user.role === "stater_admin";
  const isBroker = user.role === "broker";
  const d = await asUser(user, async (c) => {
    const [s, opts, leads, anon] = await Promise.all([
      getSettings(c),
      filterOptions(c),
      leadsList(c, f, { q, stage, cls }),
      anonymousList(c, f),
    ]);
    return { s, opts, leads, anon };
  });
  const tabs = [
    { href: `${base}/leads${filterQuery(f)}`, label: "Leads identificados", count: d.leads.length },
    { href: `${base}/leads${filterQuery(f, { aba: "anonimos" })}`, label: "Interesses anônimos", count: d.anon.length },
  ];
  return (
    <>
      <PageHeader
        title={isAdmin ? "Gestão de leads" : isBroker ? "Meus leads" : "Leads da imobiliária"}
        subtitle={isAdmin ? "Visão centralizada de todos os leads e interesses de todas as imobiliárias." : "Atualizações aparecem em tempo real para Stater, gestor e corretor."}
        actions={<a className="btn btn-secondary" href={`/api/export/leads${filterQuery(f)}`}>Exportar CSV</a>}
      />
      {!isBroker && <FiltersBar campaigns={d.opts.campaigns} agencies={d.opts.agencies} brokers={d.opts.brokers} showAgency={isAdmin} />}
      <Tabs items={tabs} active={tab === "anonimos" ? "Interesses anônimos" : "Leads identificados"} />
      {tab === "identificados" ? (
        <>
          <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
            {Object.entries(sp).filter(([k]) => ["periodo", "campanha", "imobiliaria", "corretor"].includes(k)).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={String(v)} />
            ))}
            <label className="min-w-[12rem] flex-1">
              <span className="label">Buscar</span>
              <input name="q" defaultValue={q ?? ""} className="field" placeholder="Nome, telefone ou e-mail" />
            </label>
            <label>
              <span className="label">Status comercial</span>
              <select name="etapa" defaultValue={stage ?? ""} className="field">
                <option value="">Todos</option>
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Classificação</span>
              <select name="classe" defaultValue={cls ?? ""} className="field">
                <option value="">Todas</option>
                {Object.entries(CLASS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <button className="btn btn-secondary">Filtrar</button>
          </form>
          <div className="rounded-xl border border-line bg-surface md:overflow-hidden">
            <LeadTable leads={d.leads} base={base} showAgency={isAdmin} showBroker={!isBroker} noContactHours={d.s.alerts.no_contact_hours} />
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            Visitantes que demonstraram interesse (visualizaram o PROLOG, clicaram no CTA ou no WhatsApp, ou iniciaram o cadastro) sem fornecer dados pessoais.
            São identificados apenas por um código pseudônimo.
          </p>
          <div className="rounded-xl border border-line bg-surface">
            <AnonTable rows={d.anon} showAgency={isAdmin} showBroker={!isBroker} />
          </div>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Corretores (Stater e gestor)
// ---------------------------------------------------------------------------
export async function UsersView({ user }: { user: SessionUser }) {
  const isAdmin = user.role === "stater_admin";
  const d = await asUser(user, async (c) => {
    const users = await c.query(
      `select u.id, u.name, u.email, u.phone, u.role, u.creci, u.active, u.last_login_at, u.created_at, a.name as agency_name,
              (select count(*) from app.leads l where l.broker_id = u.id) as leads,
              (select count(distinct s.visitor_id) from app.web_sessions s where s.broker_id = u.id) as visitors,
              (select code from app.tracking_links t where t.broker_id = u.id and t.active order by created_at limit 1) as code
       from app.users u left join app.agencies a on a.id = u.agency_id
       where u.role in ('broker','agency_manager') order by a.name, u.role desc, u.name`
    );
    const agencies = isAdmin ? (await c.query("select id, name from app.agencies where active order by name")).rows : [];
    return { users: users.rows, agencies };
  });
  return (
    <>
      <PageHeader title="Corretores" subtitle={isAdmin ? "Equipes de todas as imobiliárias parceiras." : "Cadastre sua equipe. Cada corretor recebe automaticamente um link e um QR Code próprios."} />
      <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
        <Card title={isAdmin ? "Novo usuário de imobiliária" : "Novo corretor"}>
          <ActionForm action={createUserAction}>
            {isAdmin && (
              <>
                <label className="block">
                  <span className="label">Imobiliária</span>
                  <select name="agency_id" className="field" required>
                    <option value="">Selecione</option>
                    {d.agencies.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="label">Perfil</span>
                  <select name="role" className="field">
                    <option value="broker">Corretor</option>
                    <option value="agency_manager">Gestor da imobiliária</option>
                  </select>
                </label>
              </>
            )}
            <label className="block"><span className="label">Nome</span><input name="name" className="field" required /></label>
            <label className="block"><span className="label">E-mail (login)</span><input name="email" type="email" className="field" required /></label>
            <label className="block"><span className="label">WhatsApp</span><input name="phone" className="field" inputMode="tel" /></label>
            <label className="block"><span className="label">CRECI</span><input name="creci" className="field" /></label>
            <Submit>Cadastrar</Submit>
          </ActionForm>
        </Card>
        <Card title={`Equipe (${d.users.length})`} pad={false}>
          {d.users.length === 0 ? (
            <div className="p-5"><Empty>Nenhum corretor cadastrado.</Empty></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    {isAdmin && <th>Imobiliária</th>}
                    <th>Perfil</th>
                    <th>Link</th>
                    <th className="text-right">Acessos</th>
                    <th className="text-right">Leads</th>
                    <th>Último acesso</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {d.users.map((u) => (
                    <tr key={u.id} className={u.active ? "" : "opacity-55"}>
                      <td>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted">{u.email}{u.creci ? ` · CRECI ${u.creci}` : ""}</div>
                      </td>
                      {isAdmin && <td className="whitespace-nowrap">{u.agency_name}</td>}
                      <td className="whitespace-nowrap text-ink-2">{u.role === "broker" ? "Corretor" : "Gestor"}</td>
                      <td>{u.code ? <CopyButton text={`${appUrl()}/radar?ref=${u.code}`} label={u.code} className="btn btn-ghost btn-sm font-mono" /> : "—"}</td>
                      <td className="tabular text-right">{fmtInt(Number(u.visitors))}</td>
                      <td className="tabular text-right">{fmtInt(Number(u.leads))}</td>
                      <td className="tabular whitespace-nowrap text-ink-2">{u.last_login_at ? fmtDateTime(u.last_login_at) : "nunca"}</td>
                      <td className="whitespace-nowrap text-right">
                        {(isAdmin || u.role === "broker") && (
                          <div className="flex justify-end gap-1">
                            <ActionForm action={resetPasswordAction} className="inline" resetOnSuccess={false}>
                              <input type="hidden" name="id" value={u.id} />
                              <Submit className="btn btn-ghost btn-sm" pending="…">Nova senha</Submit>
                            </ActionForm>
                            <form action={toggleUserAction}>
                              <input type="hidden" name="id" value={u.id} />
                              <button className="btn btn-ghost btn-sm">{u.active ? "Desativar" : "Reativar"}</button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Links e QR Codes
// ---------------------------------------------------------------------------
export async function LinksView({ user }: { user: SessionUser }) {
  const isAdmin = user.role === "stater_admin";
  const d = await asUser(user, async (c) => {
    const [links, opts, camps] = await Promise.all([
      linksFor(c),
      filterOptions(c),
      c.query(
        isAdmin
          ? "select id, name from app.campaigns where active order by created_at"
          : "select c.id, c.name from app.campaigns c join app.campaign_agencies ca on ca.campaign_id = c.id where c.active order by c.created_at"
      ),
    ]);
    return { links, opts, camps: camps.rows };
  });
  return (
    <>
      <PageHeader title="Links e QR Codes" subtitle="Cada link identifica campanha, imobiliária e corretor. A origem é preservada durante toda a navegação." />
      <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
        <Card title="Gerar link adicional">
          <ActionForm action={createLinkAction}>
            <label className="block">
              <span className="label">Campanha</span>
              <select name="campaign_id" className="field" required>
                {d.camps.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            {isAdmin && (
              <label className="block">
                <span className="label">Imobiliária</span>
                <select name="agency_id" className="field">
                  <option value="">Selecione</option>
                  {d.opts.agencies.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="label">Corretor</span>
              <select name="broker_id" className="field">
                <option value="">Link da imobiliária (sem corretor)</option>
                {d.opts.brokers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Identificação (opcional)</span>
              <input name="label" className="field" placeholder="Ex.: Evento, Instagram, panfleto" maxLength={60} />
            </label>
            <Submit>Gerar link</Submit>
          </ActionForm>
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          {d.links.length === 0 && <Empty>Nenhum link. Vincule a imobiliária a uma campanha para gerar os links.</Empty>}
          {d.links.map((l) => (
            <div key={l.id} className={l.active ? "" : "opacity-55"}>
              <LinkCard
                compact
                url={`${appUrl()}${l.landing_path}?ref=${l.code}`}
                code={l.code}
                title={`${l.campaign_name} · ${l.broker_name ?? "Imobiliária"}${isAdmin ? ` · ${l.agency_name}` : ""}${l.label ? ` · ${l.label}` : ""}`}
              />
              <div className="mt-1.5 flex items-center justify-between px-1 text-xs text-muted">
                <span className="tabular">{fmtInt(l.visitors)} acessos · {fmtInt(l.interest)} eventos de interesse · {fmtInt(l.leads)} leads</span>
                <form action={toggleLinkAction}>
                  <input type="hidden" name="id" value={l.id} />
                  <button className="hover:text-ink">{l.active ? "Desativar" : "Reativar"}</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Reuniões
// ---------------------------------------------------------------------------
export async function MeetingsView({ user, base }: { user: SessionUser; base: string }) {
  const rows = await asUser(user, async (c) =>
    (
      await c.query(
        `select m.id, m.scheduled_for, m.mode, m.location, m.status, l.id as lead_id, l.name, l.stage, app.user_name(l.broker_id) broker_name
         from app.meetings m join app.leads l on l.id = m.lead_id
         order by (m.status = 'agendada' and m.scheduled_for >= now() - interval '2 hours') desc, m.scheduled_for desc limit 300`
      )
    ).rows
  );
  return (
    <>
      <PageHeader title="Reuniões" subtitle="Agendadas a partir da ficha do lead. Cada agendamento gera o evento meeting_scheduled." />
      <Card pad={false}>
        {rows.length === 0 ? (
          <div className="p-5"><Empty>Nenhuma reunião registrada.</Empty></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr><th>Data</th><th>Investidor</th><th>Corretor</th><th>Formato</th><th>Status</th><th>Etapa</th></tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td className="tabular whitespace-nowrap font-medium">{fmtDateTime(m.scheduled_for)}</td>
                    <td><Link className="hover:underline" href={`${base}/leads/${m.lead_id}`}>{m.name}</Link></td>
                    <td>{m.broker_name ?? "—"}</td>
                    <td className="text-ink-2">{m.mode}{m.location ? ` · ${m.location}` : ""}</td>
                    <td className="text-xs font-semibold uppercase tracking-wide text-ink-2">{m.status}</td>
                    <td><StageBadge stage={m.stage} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Relatórios
// ---------------------------------------------------------------------------
export async function ReportsView({ user, sp, base }: { user: SessionUser; sp: SP }  & { base: string }) {
  const f = parseFilters(sp);
  const isAdmin = user.role === "stater_admin";
  const d = await asUser(user, async (c) => {
    const s = await getSettings(c);
    const thr = s.scoring.thresholds.alta_intencao;
    const [k, stages, byAgency, byBroker, opts] = await Promise.all([
      overviewKpis(c, f, thr),
      stageCounts(c, f),
      isAdmin ? performance(c, f, "agency", thr) : Promise.resolve([]),
      performance(c, f, "broker", thr),
      filterOptions(c),
    ]);
    return { k, stages, byAgency, byBroker, opts };
  });
  const totalLeads = Object.values(d.stages).reduce((a, b) => a + b, 0);
  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Indicadores consolidados do período. Use os filtros e exporte os dados quando necessário."
        actions={<a className="btn btn-secondary" href={`/api/export/leads${filterQuery(f)}`}>Exportar leads (CSV)</a>}
      />
      <FiltersBar campaigns={d.opts.campaigns} agencies={d.opts.agencies} brokers={d.opts.brokers} showAgency={isAdmin} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Visitantes únicos" value={fmtInt(d.k.visitors)} />
        <Kpi label="Leads" value={fmtInt(d.k.leads)} hint={d.k.visitors ? `${fmtPct(d.k.leads / d.k.visitors)} dos visitantes` : undefined} />
        <Kpi label="Reuniões" value={fmtInt(d.k.meetings)} />
        <Kpi label="Conversão" value={fmtPct(d.k.conversion)} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card title="Pipeline comercial">
          <Funnel steps={STAGES.map((s) => ({ label: s.label, value: d.stages[s.id] ?? 0 }))} />
          <p className="mt-3 text-xs text-muted">{fmtInt(totalLeads)} leads criados no período, pela etapa atual.</p>
        </Card>
        {isAdmin ? (
          <Card title="Por imobiliária" pad={false}><PerfTable rows={d.byAgency} by="agency" /></Card>
        ) : (
          <Card title="Por corretor" pad={false}><PerfTable rows={d.byBroker} by="broker" /></Card>
        )}
      </div>
      {isAdmin && (
        <Card title="Por corretor" className="mt-5" pad={false}>
          <PerfTable rows={d.byBroker} by="broker" />
        </Card>
      )}
      <p className="mt-4 text-xs text-muted">
        Acessos, avanço e cliques contam visitantes únicos. Leads, contatos e conversões contam leads criados no período. 1º atendimento = tempo médio entre o cadastro e o primeiro contato registrado.
        <Link href={`${base}/leads`} className="ml-1 text-navy hover:underline">Ir para leads</Link>
      </p>
    </>
  );
}
