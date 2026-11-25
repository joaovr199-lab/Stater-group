import "server-only";
import type { PoolClient } from "pg";
import { INTEREST_EVENTS } from "./constants";
import { where, type Filters } from "./filters";

export type Settings = {
  scoring: { weights: Record<string, number>; thresholds: { interessado: number; alta_intencao: number }; max: number };
  attribution: { rule: "first_touch" | "last_touch"; window_days: number };
  alerts: { no_contact_hours: number; high_intent_idle_hours: number };
  retention: { anonymous_days: number; lost_lead_days: number; auth_session_hours: number };
  privacy: { controller_name: string; controller_cnpj: string; dpo_name: string; dpo_email: string; notice_version: string };
  contact: { whatsapp_number: string };
};

export async function getSettings(c: PoolClient): Promise<Settings> {
  const r = await c.query("select key, value from app.settings");
  return Object.fromEntries(r.rows.map((x) => [x.key, x.value])) as Settings;
}

/** Leitura pública de configurações não sensíveis (usada pela reportagem). */
export async function getPublicSettings(c: PoolClient) {
  const r = await c.query(
    "select app.setting('privacy') as privacy, app.setting('contact') as contact"
  );
  return r.rows[0] as { privacy: Settings["privacy"]; contact: Settings["contact"] };
}

const n = (v: unknown) => Number(v ?? 0);

export async function overviewKpis(c: PoolClient, f: Filters, thr: number) {
  const p: unknown[] = [INTEREST_EVENTS, thr];
  const ws = where(f, "s", "started_at", p);
  const we = where(f, "e", "occurred_at", p);
  const wl = where(f, "l", "created_at", p);
  const wlNoDate = where(f, "l", "created_at", p, { date: false });
  const wm = where({ ...f, from: null }, "l", "created_at", p);
  const mFrom = f.from ? `and m.created_at >= $${p.push(f.from)}` : "";
  const agencyFilter = f.agency ? `and a.id = $${p.push(f.agency)}` : "";
  const brokerAgency = f.agency ? `and u.agency_id = $${p.push(f.agency)}` : "";
  const r = await c.query(
    `select
      (select count(*) from app.agencies a where a.active ${agencyFilter}) as agencies,
      (select count(*) from app.users u where u.role = 'broker' and u.active ${brokerAgency}) as brokers,
      (select count(distinct s.visitor_id) from app.web_sessions s where ${ws}) as visitors,
      (select count(*) from app.web_sessions s where ${ws}) as sessions,
      (select count(*) from app.events e where e.event_name = any($1) and ${we}) as interest_events,
      (select count(*) from app.leads l where ${wl}) as leads,
      (select count(*) from app.leads l where ${wl} and l.score >= $2) as high_intent,
      (select count(*) from app.leads l where ${wlNoDate} and l.first_contact_at is null
          and l.stage = 'novo' and l.anonymized_at is null) as unattended,
      (select count(*) from app.meetings m join app.leads l on l.id = m.lead_id
          where m.status <> 'cancelada' and ${wm} ${mFrom}) as meetings,
      (select count(*) from app.leads l where ${wl} and l.stage = 'convertido') as converted,
      (select count(*) from app.v_anonymous_interests a where true
          ${f.from ? `and a.last_at >= $${p.push(f.from)}` : ""}
          ${f.agency ? `and a.agency_id = $${p.push(f.agency)}` : ""}
          ${f.broker ? `and a.broker_id = $${p.push(f.broker)}` : ""}
          ${f.campaign ? `and a.campaign_id = $${p.push(f.campaign)}` : ""}) as anonymous_interests`,
    p
  );
  const x = r.rows[0];
  const out = Object.fromEntries(Object.entries(x).map(([k, v]) => [k, n(v)])) as Record<string, number>;
  out.conversion = out.leads ? out.converted / out.leads : 0;
  return out;
}

export type PerfRow = {
  id: string;
  name: string;
  agency_name?: string;
  links: number;
  visitors: number;
  brasil: number;
  sc: number;
  garuva: number;
  prolog: number;
  cta: number;
  leads: number;
  contacted: number;
  meetings: number;
  converted: number;
  high_intent: number;
  avg_response_h: number | null;
};

/** Funil de desempenho agrupado por imobiliária ou por corretor. */
export async function performance(c: PoolClient, f: Filters, by: "agency" | "broker", thr: number): Promise<PerfRow[]> {
  const key = by === "agency" ? "agency_id" : "broker_id";
  const p: unknown[] = [thr];
  const ws = where(f, "s", "started_at", p);
  const we = where(f, "e", "occurred_at", p);
  const wl = where(f, "l", "created_at", p);
  const wt = where(f, "t", "created_at", p, { date: false });
  const wm = where({ ...f, from: null }, "l", "created_at", p);
  const mFrom = f.from ? `and m.created_at >= $${p.push(f.from)}` : "";
  const base =
    by === "agency"
      ? `select a.id, a.name, null::text as agency_name from app.agencies a where true ${f.agency ? `and a.id = $${p.push(f.agency)}` : ""}`
      : `select u.id, u.name, ag.name as agency_name from app.users u left join app.agencies ag on ag.id = u.agency_id
         where u.role = 'broker' ${f.agency ? `and u.agency_id = $${p.push(f.agency)}` : ""} ${f.broker ? `and u.id = $${p.push(f.broker)}` : ""}`;
  const r = await c.query(
    `with b as (${base}),
     lk as (select t.${key} k, count(*) links from app.tracking_links t where t.active and ${wt} group by 1),
     s as (select s.${key} k, count(distinct s.visitor_id) visitors from app.web_sessions s where ${ws} group by 1),
     ev as (select e.${key} k,
              count(distinct e.visitor_id) filter (where e.event_name = 'brasil_view') brasil,
              count(distinct e.visitor_id) filter (where e.event_name = 'santa_catarina_view') sc,
              count(distinct e.visitor_id) filter (where e.event_name = 'garuva_view') garuva,
              count(distinct e.visitor_id) filter (where e.event_name = 'prolog_view') prolog,
              count(distinct e.visitor_id) filter (where e.event_name = 'cta_click') cta
            from app.events e where ${we} group by 1),
     ld as (select l.${key} k, count(*) leads,
              count(*) filter (where l.first_contact_at is not null) contacted,
              count(*) filter (where l.stage = 'convertido') converted,
              count(*) filter (where l.score >= $1) high_intent,
              avg(extract(epoch from (l.first_contact_at - l.created_at)) / 3600.0)
                filter (where l.first_contact_at is not null) avg_response_h
            from app.leads l where ${wl} group by 1),
     mt as (select l.${key} k, count(distinct m.lead_id) meetings from app.meetings m
              join app.leads l on l.id = m.lead_id where m.status <> 'cancelada' and ${wm} ${mFrom} group by 1)
     select b.id, b.name, b.agency_name,
       coalesce(lk.links,0) links, coalesce(s.visitors,0) visitors, coalesce(ev.brasil,0) brasil, coalesce(ev.sc,0) sc,
       coalesce(ev.garuva,0) garuva, coalesce(ev.prolog,0) prolog, coalesce(ev.cta,0) cta, coalesce(ld.leads,0) leads,
       coalesce(ld.contacted,0) contacted, coalesce(mt.meetings,0) meetings, coalesce(ld.converted,0) converted,
       coalesce(ld.high_intent,0) high_intent, ld.avg_response_h
     from b left join lk on lk.k = b.id left join s on s.k = b.id left join ev on ev.k = b.id
       left join ld on ld.k = b.id left join mt on mt.k = b.id
     order by visitors desc, leads desc, b.name`,
    p
  );
  return r.rows.map((x) => ({
    ...x,
    ...Object.fromEntries(
      ["links", "visitors", "brasil", "sc", "garuva", "prolog", "cta", "leads", "contacted", "meetings", "converted", "high_intent"].map(
        (k) => [k, n(x[k])]
      )
    ),
    avg_response_h: x.avg_response_h == null ? null : Number(x.avg_response_h),
  }));
}

export async function timeseries(c: PoolClient, f: Filters) {
  const days = f.from ? Math.min(90, Math.ceil((Date.now() - f.from.getTime()) / 86400000)) : 30;
  const p: unknown[] = [days];
  const ws = where({ ...f, from: null }, "s", "started_at", p);
  const wl = where({ ...f, from: null }, "l", "created_at", p);
  const r = await c.query(
    `with d as (select generate_series((now() at time zone 'America/Sao_Paulo')::date - ($1::int - 1),
                                        (now() at time zone 'America/Sao_Paulo')::date, '1 day')::date as day)
     select to_char(d.day, 'DD/MM') as day,
       (select count(distinct s.visitor_id) from app.web_sessions s
         where (s.started_at at time zone 'America/Sao_Paulo')::date = d.day and ${ws}) as visitors,
       (select count(*) from app.leads l
         where (l.created_at at time zone 'America/Sao_Paulo')::date = d.day and ${wl}) as leads
     from d order by d.day`,
    p
  );
  return r.rows.map((x) => ({ day: x.day as string, visitors: n(x.visitors), leads: n(x.leads) }));
}

export type LeadRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  interest: string | null;
  agency_id: string | null;
  agency_name: string | null;
  broker_id: string | null;
  broker_name: string | null;
  campaign_name: string;
  created_at: Date;
  score: number;
  classification: string;
  last_event: string | null;
  stage: string;
  hours_waiting: number;
  first_contact_at: Date | null;
  last_activity_at: Date;
  anonymized_at: Date | null;
};

export async function leadsList(
  c: PoolClient,
  f: Filters,
  o: { q?: string | null; stage?: string | null; cls?: string | null; limit?: number; alerts?: boolean } = {}
): Promise<LeadRow[]> {
  const p: unknown[] = [];
  const parts = [where(f, "l", "created_at", p)];
  if (o.q) {
    p.push(`%${o.q}%`);
    parts.push(`(l.name ilike $${p.length} or l.phone ilike $${p.length} or l.email ilike $${p.length})`);
  }
  if (o.stage) parts.push(`l.stage = $${p.push(o.stage)}`);
  if (o.cls) parts.push(`l.classification = $${p.push(o.cls)}`);
  const r = await c.query(
    `select l.* from app.v_leads l where ${parts.join(" and ")}
     order by (l.stage = 'novo' and l.first_contact_at is null) desc, l.score desc, l.created_at desc
     limit ${Math.min(o.limit ?? 200, 1000)}`,
    p
  );
  return r.rows.map((x) => ({ ...x, hours_waiting: Number(x.hours_waiting) }));
}

export async function anonymousList(c: PoolClient, f: Filters, limit = 200) {
  const p: unknown[] = [];
  const parts = ["true"];
  if (f.from) parts.push(`a.last_at >= $${p.push(f.from)}`);
  if (f.agency) parts.push(`a.agency_id = $${p.push(f.agency)}`);
  if (f.broker) parts.push(`a.broker_id = $${p.push(f.broker)}`);
  if (f.campaign) parts.push(`a.campaign_id = $${p.push(f.campaign)}`);
  const r = await c.query(
    `select a.*, ag.name as agency_name, app.user_name(a.broker_id) as broker_name, c.name as campaign_name
     from app.v_anonymous_interests a
     left join app.agencies ag on ag.id = a.agency_id
     left join app.campaigns c on c.id = a.campaign_id
     where ${parts.join(" and ")} order by a.score desc, a.last_at desc limit ${limit}`,
    p
  );
  return r.rows.map((x) => ({ ...x, events: n(x.events), score: n(x.score) }));
}

export async function leadDetail(c: PoolClient, id: string) {
  const l = await c.query("select * from app.v_leads where id = $1", [id]);
  const lead = l.rows[0] as (LeadRow & { visitor_id: string | null; attribution_rule: string | null; link_id: string | null }) | undefined;
  if (!lead) return null;
  const [events, touches, history, meetings, consents, link] = await Promise.all([
    c.query(
      `select e.event_name, e.occurred_at, e.duration_ms, e.origin, app.user_name(e.broker_id) as broker_name
       from app.events e where e.lead_id = $1 or ($2::uuid is not null and e.visitor_id = $2)
       order by e.occurred_at`,
      [id, lead.visitor_id]
    ),
    c.query(
      `select t.touched_at, ag.name as agency_name, app.user_name(t.broker_id) as broker_name, tl.code
       from app.visitor_touches t left join app.agencies ag on ag.id = t.agency_id
       left join app.tracking_links tl on tl.id = t.link_id
       where t.visitor_id = $1 order by t.touched_at`,
      [lead.visitor_id]
    ),
    c.query(
      `select h.*, app.user_name(h.user_id) as user_name from app.lead_history h where h.lead_id = $1 order by h.created_at desc`,
      [id]
    ),
    c.query(`select m.*, app.user_name(m.created_by) as user_name from app.meetings m where m.lead_id = $1 order by m.scheduled_for desc`, [id]),
    c.query(`select purpose, granted, text_version, granted_at, revoked_at from app.consents where lead_id = $1 order by id`, [id]),
    c.query(`select code from app.tracking_links where id = $1`, [lead.link_id]),
  ]);
  return {
    lead,
    events: events.rows,
    touches: touches.rows,
    history: history.rows,
    meetings: meetings.rows,
    consents: consents.rows,
    linkCode: (link.rows[0]?.code as string | undefined) ?? null,
  };
}

export async function alerts(c: PoolClient, s: Settings, f?: Filters) {
  const p: unknown[] = [s.alerts.no_contact_hours, s.scoring.thresholds.alta_intencao, s.alerts.high_intent_idle_hours];
  const w = f ? where({ ...f, from: null }, "l", "created_at", p) : "true";
  const r = await c.query(
    `select l.id, l.name, l.score, l.classification, l.stage, l.agency_name, l.broker_name, l.hours_waiting,
            l.last_activity_at,
            case when l.first_contact_at is null and l.stage = 'novo' and l.hours_waiting >= $1 then 'sem_atendimento'
                 else 'alta_intencao_parada' end as kind
     from app.v_leads l
     where ${w} and l.anonymized_at is null and l.stage not in ('convertido','perdido') and (
       (l.first_contact_at is null and l.stage = 'novo' and l.hours_waiting >= $1)
       or (l.score >= $2 and l.last_activity_at < now() - make_interval(hours => $3::int)))
     order by l.score desc limit 50`,
    p
  );
  return r.rows.map((x) => ({ ...x, hours_waiting: Number(x.hours_waiting) }));
}

export async function stageCounts(c: PoolClient, f: Filters) {
  const p: unknown[] = [];
  const w = where(f, "l", "created_at", p);
  const r = await c.query(`select l.stage, count(*) n from app.leads l where ${w} group by 1`, p);
  return Object.fromEntries(r.rows.map((x) => [x.stage, n(x.n)])) as Record<string, number>;
}

export async function filterOptions(c: PoolClient) {
  const [campaigns, agencies, brokers] = await Promise.all([
    c.query("select id, name from app.campaigns order by created_at"),
    c.query("select id, name from app.agencies order by name"),
    c.query("select id, name, agency_id from app.users where role = 'broker' order by name"),
  ]);
  return { campaigns: campaigns.rows, agencies: agencies.rows, brokers: brokers.rows } as {
    campaigns: { id: string; name: string }[];
    agencies: { id: string; name: string }[];
    brokers: { id: string; name: string; agency_id: string }[];
  };
}

export async function notifications(c: PoolClient, limit = 15) {
  const r = await c.query(
    `select id, lead_id, kind, title, body, read_at, created_at from app.notifications order by created_at desc limit $1`,
    [limit]
  );
  const unread = await c.query(`select count(*) n from app.notifications where read_at is null`);
  return { items: r.rows, unread: n(unread.rows[0].n) };
}

export async function linksFor(c: PoolClient, opts: { agency?: string | null; broker?: string | null } = {}) {
  const p: unknown[] = [];
  const parts = ["true"];
  if (opts.agency) parts.push(`t.agency_id = $${p.push(opts.agency)}`);
  if (opts.broker) parts.push(`t.broker_id = $${p.push(opts.broker)}`);
  const r = await c.query(
    `select t.id, t.code, t.label, t.active, t.created_at, t.broker_id, c.name as campaign_name, c.landing_path,
            ag.name as agency_name, app.user_name(t.broker_id) as broker_name,
            (select count(distinct s.visitor_id) from app.web_sessions s where s.link_id = t.id) as visitors,
            (select count(*) from app.events e where e.link_id = t.id and e.event_name = any($${p.push(INTEREST_EVENTS)})) as interest,
            (select count(*) from app.leads l where l.link_id = t.id) as leads
     from app.tracking_links t join app.campaigns c on c.id = t.campaign_id
     join app.agencies ag on ag.id = t.agency_id
     where ${parts.join(" and ")} order by ag.name, broker_name nulls first, t.created_at`,
    p
  );
  return r.rows.map((x) => ({ ...x, visitors: n(x.visitors), interest: n(x.interest), leads: n(x.leads) }));
}
