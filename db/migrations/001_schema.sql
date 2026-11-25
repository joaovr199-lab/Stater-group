-- PROLOG INTELLIGENCE — schema, permissões e Row Level Security
-- Compatível com PostgreSQL 15+ (incluindo Supabase).
-- A aplicação conecta com o papel `prolog_app` (sem BYPASSRLS). Toda leitura
-- e escrita passa pelas políticas abaixo; a identidade do usuário é injetada
-- por transação via set_config('app.user_id', ..., true).

create extension if not exists pgcrypto;

create schema if not exists app;

-- ---------------------------------------------------------------------------
-- Papel da aplicação
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'prolog_app') then
    create role prolog_app login nobypassrls;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
do $$ begin
  create type app.user_role as enum ('stater_admin', 'agency_manager', 'broker');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.lead_stage as enum (
    'novo', 'primeiro_contato', 'em_qualificacao', 'interessado',
    'reuniao_agendada', 'reuniao_realizada', 'em_negociacao', 'convertido', 'perdido');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------
create table if not exists app.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  cnpj text,
  city text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists app.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  phone text,
  password_hash text not null,
  role app.user_role not null,
  agency_id uuid references app.agencies(id) on delete restrict,
  creci text,
  active boolean not null default true,
  must_change_password boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  constraint users_agency_required check (role = 'stater_admin' or agency_id is not null)
);
create index if not exists users_agency_idx on app.users(agency_id);

create table if not exists app.auth_sessions (
  token_hash text primary key,
  user_id uuid not null references app.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ip_hash text,
  user_agent text
);
create index if not exists auth_sessions_user_idx on app.auth_sessions(user_id);

create table if not exists app.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  landing_path text not null default '/radar',
  active boolean not null default true,
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now()
);

create table if not exists app.campaign_agencies (
  campaign_id uuid not null references app.campaigns(id) on delete cascade,
  agency_id uuid not null references app.agencies(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign_id, agency_id)
);

create table if not exists app.tracking_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  campaign_id uuid not null references app.campaigns(id),
  agency_id uuid not null references app.agencies(id),
  broker_id uuid references app.users(id),
  label text,
  active boolean not null default true,
  created_by uuid references app.users(id),
  created_at timestamptz not null default now()
);
create index if not exists tracking_links_agency_idx on app.tracking_links(agency_id);
create index if not exists tracking_links_broker_idx on app.tracking_links(broker_id);

-- Visitante pseudônimo (cookie first-party). Não contém dado pessoal.
create table if not exists app.visitors (
  id uuid primary key default gen_random_uuid(),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- Cada acesso por um link (ref) é um "touch". Histórico nunca é apagado
-- quando o visitante acessa links de corretores diferentes.
create table if not exists app.visitor_touches (
  id bigserial primary key,
  visitor_id uuid not null references app.visitors(id) on delete cascade,
  link_id uuid not null references app.tracking_links(id),
  campaign_id uuid not null references app.campaigns(id),
  agency_id uuid not null references app.agencies(id),
  broker_id uuid references app.users(id),
  touched_at timestamptz not null default now()
);
create index if not exists visitor_touches_visitor_idx on app.visitor_touches(visitor_id, touched_at);

create table if not exists app.web_sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references app.visitors(id) on delete cascade,
  link_id uuid references app.tracking_links(id),
  campaign_id uuid references app.campaigns(id),
  agency_id uuid references app.agencies(id),
  broker_id uuid references app.users(id),
  origin text,              -- ref | herdado | direto
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  device text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists web_sessions_visitor_idx on app.web_sessions(visitor_id);
create index if not exists web_sessions_agency_idx on app.web_sessions(agency_id, started_at);

create table if not exists app.leads (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references app.visitors(id) on delete set null,
  session_id uuid references app.web_sessions(id) on delete set null,
  campaign_id uuid not null references app.campaigns(id),
  agency_id uuid references app.agencies(id),
  broker_id uuid references app.users(id),
  link_id uuid references app.tracking_links(id),
  attribution_rule text,
  name text not null,
  phone text,
  email text,
  interest text,
  score int not null default 0,
  stage app.lead_stage not null default 'novo',
  first_contact_at timestamptz,
  last_activity_at timestamptz not null default now(),
  last_event text,
  anonymized_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists leads_agency_idx on app.leads(agency_id, created_at);
create index if not exists leads_broker_idx on app.leads(broker_id, created_at);
create index if not exists leads_visitor_idx on app.leads(visitor_id);

create table if not exists app.events (
  id bigserial primary key,
  event_name text not null,
  session_id uuid not null references app.web_sessions(id) on delete cascade,
  visitor_id uuid not null references app.visitors(id) on delete cascade,
  lead_id uuid references app.leads(id) on delete set null,
  campaign_id uuid references app.campaigns(id),
  agency_id uuid references app.agencies(id),
  broker_id uuid references app.users(id),
  link_id uuid references app.tracking_links(id),
  origin text,
  duration_ms int,
  meta jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint events_name_check check (event_name in (
    'page_view','brasil_view','santa_catarina_view','garuva_view','prolog_view',
    'cta_click','lead_form_start','lead_submit','whatsapp_click','meeting_scheduled'))
);
-- Evita duplicações: eventos de visualização e de formulário são únicos por sessão.
create unique index if not exists events_once_per_session
  on app.events(session_id, event_name)
  where event_name in ('page_view','brasil_view','santa_catarina_view','garuva_view',
                       'prolog_view','lead_form_start','lead_submit');
create index if not exists events_visitor_idx on app.events(visitor_id);
create index if not exists events_agency_idx on app.events(agency_id, occurred_at);
create index if not exists events_broker_idx on app.events(broker_id, occurred_at);
create index if not exists events_lead_idx on app.events(lead_id);

create table if not exists app.consents (
  id bigserial primary key,
  lead_id uuid not null references app.leads(id) on delete cascade,
  purpose text not null,       -- privacy_notice | contact
  granted boolean not null,
  text_version text not null,
  text_hash text not null,
  ip_hash text,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists app.lead_history (
  id bigserial primary key,
  lead_id uuid not null references app.leads(id) on delete cascade,
  from_stage app.lead_stage,
  to_stage app.lead_stage,
  kind text not null default 'stage',   -- stage | note | call | whatsapp | email | meeting | system
  note text,
  user_id uuid references app.users(id),
  created_at timestamptz not null default now()
);
create index if not exists lead_history_lead_idx on app.lead_history(lead_id, created_at);

create table if not exists app.meetings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references app.leads(id) on delete cascade,
  scheduled_for timestamptz not null,
  mode text not null default 'presencial', -- presencial | video | telefone
  location text,
  status text not null default 'agendada', -- agendada | realizada | cancelada
  notes text,
  created_by uuid references app.users(id),
  created_at timestamptz not null default now()
);
create index if not exists meetings_lead_idx on app.meetings(lead_id);

create table if not exists app.notifications (
  id bigserial primary key,
  user_id uuid not null references app.users(id) on delete cascade,
  lead_id uuid references app.leads(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on app.notifications(user_id, created_at desc);

create table if not exists app.settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references app.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists app.audit_log (
  id bigserial primary key,
  user_id uuid references app.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  agency_id uuid,
  data jsonb not null default '{}'::jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on app.audit_log(created_at desc);

-- ---------------------------------------------------------------------------
-- Configurações padrão (regras de negócio configuráveis pela Stater)
-- ---------------------------------------------------------------------------
insert into app.settings(key, value) values
  ('scoring', '{"weights":{"page_view":5,"brasil_view":5,"santa_catarina_view":10,"garuva_view":15,"prolog_view":25,"cta_click":20,"lead_submit":20},"thresholds":{"interessado":30,"alta_intencao":60},"max":100}'),
  ('attribution', '{"rule":"first_touch","window_days":90}'),
  ('alerts', '{"no_contact_hours":4,"high_intent_idle_hours":24}'),
  ('retention', '{"anonymous_days":365,"lost_lead_days":730,"auth_session_hours":12}'),
  ('privacy', '{"controller_name":"","controller_cnpj":"","dpo_name":"","dpo_email":"","notice_version":"2026-11-v1"}'),
  ('contact', '{"whatsapp_number":""}')
on conflict (key) do nothing;

insert into app.campaigns(slug, name, description, landing_path, active)
values ('radar-logistico', 'Radar Logístico',
        'Reportagem editorial sobre o mercado logístico brasileiro, Santa Catarina, Garuva e o PROLOG.',
        '/radar', true)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Contexto do usuário (injetado por transação pela aplicação)
-- ---------------------------------------------------------------------------
create or replace function app.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create or replace function app.me_role() returns app.user_role
language sql stable security definer set search_path = app, public as $$
  select role from app.users where id = app.uid() and active
$$;

create or replace function app.me_agency() returns uuid
language sql stable security definer set search_path = app, public as $$
  select agency_id from app.users where id = app.uid() and active
$$;

create or replace function app.is_admin() returns boolean
language sql stable as $$ select coalesce(app.me_role() = 'stater_admin', false) $$;

create or replace function app.is_manager() returns boolean
language sql stable as $$ select coalesce(app.me_role() = 'agency_manager', false) $$;

create or replace function app.is_broker() returns boolean
language sql stable as $$ select coalesce(app.me_role() = 'broker', false) $$;

-- Regra única de escopo comercial: Stater vê tudo; gestor vê sua imobiliária;
-- corretor vê apenas o que está atribuído a ele.
create or replace function app.can_see(p_agency uuid, p_broker uuid) returns boolean
language sql stable as $$
  select app.is_admin()
      or (app.is_manager() and p_agency is not null and p_agency = app.me_agency())
      or (app.is_broker() and p_broker is not null and p_broker = app.uid())
$$;

create or replace function app.setting(p_key text) returns jsonb
language sql stable security definer set search_path = app, public as $$
  select value from app.settings where key = p_key
$$;

-- ---------------------------------------------------------------------------
-- Autenticação (funções SECURITY DEFINER: a aplicação nunca lê a tabela
-- de usuários sem contexto, e o hash de senha só sai por aqui)
-- ---------------------------------------------------------------------------
create or replace function app.auth_lookup(p_email text)
returns table(id uuid, password_hash text, active boolean)
language sql stable security definer set search_path = app, public as $$
  select id, password_hash, active from app.users where lower(email) = lower(trim(p_email))
$$;

create or replace function app.auth_create_session(p_user uuid, p_token_hash text, p_hours int, p_ip_hash text, p_ua text)
returns void language plpgsql security definer set search_path = app, public as $$
begin
  insert into app.auth_sessions(token_hash, user_id, expires_at, ip_hash, user_agent)
  values (p_token_hash, p_user, now() + make_interval(hours => p_hours), p_ip_hash, left(p_ua, 300));
  update app.users set last_login_at = now() where id = p_user;
  delete from app.auth_sessions where expires_at < now();
  insert into app.audit_log(user_id, action, entity, entity_id, ip_hash)
  values (p_user, 'auth.login', 'user', p_user::text, p_ip_hash);
end $$;

create or replace function app.auth_resolve(p_token_hash text)
returns table(id uuid, email text, name text, role app.user_role, agency_id uuid, agency_name text, must_change_password boolean)
language sql stable security definer set search_path = app, public as $$
  select u.id, u.email, u.name, u.role, u.agency_id, a.name, u.must_change_password
  from app.auth_sessions s
  join app.users u on u.id = s.user_id and u.active
  left join app.agencies a on a.id = u.agency_id
  where s.token_hash = p_token_hash and s.expires_at > now()
    and (u.agency_id is null or a.active)
$$;

create or replace function app.auth_destroy(p_token_hash text) returns void
language sql security definer set search_path = app, public as $$
  delete from app.auth_sessions where token_hash = p_token_hash
$$;

create or replace function app.auth_set_password(p_hash text) returns void
language plpgsql security definer set search_path = app, public as $$
begin
  if app.uid() is null then raise exception 'not authenticated'; end if;
  update app.users set password_hash = p_hash, must_change_password = false where id = app.uid();
  delete from app.auth_sessions where user_id = app.uid()
    and token_hash <> coalesce(current_setting('app.session_hash', true), '');
  insert into app.audit_log(user_id, action, entity, entity_id) values (app.uid(), 'auth.password_change', 'user', app.uid()::text);
end $$;

create or replace function app.audit(p_action text, p_entity text, p_entity_id text, p_data jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = app, public as $$
  insert into app.audit_log(user_id, action, entity, entity_id, agency_id, data, ip_hash)
  values (app.uid(), p_action, p_entity, p_entity_id, app.me_agency(), coalesce(p_data, '{}'::jsonb),
          nullif(current_setting('app.ip_hash', true), ''))
$$;

-- ---------------------------------------------------------------------------
-- Score de intenção digital (não mede capacidade financeira)
-- Cada tipo de evento pontua uma única vez por visitante.
-- ---------------------------------------------------------------------------
create or replace function app.visitor_score(p_visitor uuid) returns int
language sql stable security definer set search_path = app, public as $$
  with cfg as (select app.setting('scoring') as s),
  kinds as (
    select distinct e.event_name from app.events e where e.visitor_id = p_visitor
    union
    select 'lead_submit' from app.leads l where l.visitor_id = p_visitor
  )
  select least(coalesce((cfg.s->>'max')::int, 100),
               coalesce((select sum(coalesce((cfg.s->'weights'->>k.event_name)::int, 0)) from kinds k), 0))::int
  from cfg
$$;

create or replace function app.visitor_has_lead(p_visitor uuid) returns boolean
language sql stable security definer set search_path = app, public as $$
  select exists (select 1 from app.leads where visitor_id = p_visitor)
$$;

create or replace function app.classify(p_score int) returns text
language sql stable security definer set search_path = app, public as $$
  select case
    when p_score >= coalesce((app.setting('scoring')->'thresholds'->>'alta_intencao')::int, 60) then 'alta_intencao'
    when p_score >= coalesce((app.setting('scoring')->'thresholds'->>'interessado')::int, 30) then 'interessado'
    else 'exploratorio' end
$$;

-- ---------------------------------------------------------------------------
-- Rastreamento público (sem login). A aplicação chama estas funções;
-- o papel não tem INSERT direto nas tabelas de rastreamento.
-- ---------------------------------------------------------------------------
create or replace function app.resolve_attribution(p_visitor uuid)
returns table(link_id uuid, campaign_id uuid, agency_id uuid, broker_id uuid, rule text)
language plpgsql stable security definer set search_path = app, public as $$
declare
  v_rule text := coalesce(app.setting('attribution')->>'rule', 'first_touch');
  v_days int := coalesce((app.setting('attribution')->>'window_days')::int, 90);
begin
  return query
    select t.link_id, t.campaign_id, t.agency_id, t.broker_id, v_rule
    from app.visitor_touches t
    join app.tracking_links l on l.id = t.link_id
    where t.visitor_id = p_visitor
      and t.touched_at >= now() - make_interval(days => v_days)
    order by case when v_rule = 'last_touch' then -extract(epoch from t.touched_at)
                  else extract(epoch from t.touched_at) end
    limit 1;
end $$;

create or replace function app.start_session(
  p_visitor uuid, p_ref text, p_utm_source text, p_utm_medium text, p_utm_campaign text,
  p_referrer text, p_device text)
returns table(visitor_id uuid, session_id uuid, campaign_id uuid, agency_id uuid, broker_id uuid, origin text)
language plpgsql security definer set search_path = app, public as $$
declare
  v_visitor uuid := p_visitor;
  v_link app.tracking_links%rowtype;
  v_attr record;
  v_origin text := 'direto';
  v_session uuid;
  v_campaign uuid; v_agency uuid; v_broker uuid; v_link_id uuid;
begin
  if v_visitor is null or not exists (select 1 from app.visitors where id = v_visitor) then
    insert into app.visitors default values returning id into v_visitor;
  else
    update app.visitors set last_seen_at = now() where id = v_visitor;
  end if;

  if p_ref is not null and p_ref <> '' then
    select l.* into v_link from app.tracking_links l
      join app.agencies a on a.id = l.agency_id and a.active
      join app.campaigns c on c.id = l.campaign_id and c.active
      where l.code = upper(p_ref) and l.active;
    if found then
      insert into app.visitor_touches(visitor_id, link_id, campaign_id, agency_id, broker_id)
      values (v_visitor, v_link.id, v_link.campaign_id, v_link.agency_id, v_link.broker_id);
      v_origin := 'ref';
      v_link_id := v_link.id; v_campaign := v_link.campaign_id; v_agency := v_link.agency_id; v_broker := v_link.broker_id;
    end if;
  end if;

  if v_link_id is null then
    select * into v_attr from app.resolve_attribution(v_visitor);
    if found and v_attr.link_id is not null then
      v_origin := 'herdado';
      v_link_id := v_attr.link_id; v_campaign := v_attr.campaign_id; v_agency := v_attr.agency_id; v_broker := v_attr.broker_id;
    else
      select id into v_campaign from app.campaigns where slug = 'radar-logistico';
    end if;
  end if;

  insert into app.web_sessions(visitor_id, link_id, campaign_id, agency_id, broker_id, origin,
                               utm_source, utm_medium, utm_campaign, referrer, device)
  values (v_visitor, v_link_id, v_campaign, v_agency, v_broker, v_origin,
          left(p_utm_source, 120), left(p_utm_medium, 120), left(p_utm_campaign, 120),
          left(p_referrer, 500), left(p_device, 40))
  returning id into v_session;

  return query select v_visitor, v_session, v_campaign, v_agency, v_broker, v_origin;
end $$;

create or replace function app.track_event(p_session uuid, p_event text, p_duration_ms int, p_meta jsonb)
returns boolean language plpgsql security definer set search_path = app, public as $$
declare
  s app.web_sessions%rowtype;
  v_lead uuid;
begin
  select * into s from app.web_sessions where id = p_session;
  if not found then return false; end if;
  if p_event in ('lead_submit', 'meeting_scheduled') then
    return false; -- gerados apenas pelo servidor
  end if;
  if s.last_seen_at < now() - interval '12 hours' then return false; end if;

  select id into v_lead from app.leads where visitor_id = s.visitor_id order by created_at limit 1;

  insert into app.events(event_name, session_id, visitor_id, lead_id, campaign_id, agency_id, broker_id,
                         link_id, origin, duration_ms, meta)
  values (p_event, s.id, s.visitor_id, v_lead, s.campaign_id, s.agency_id, s.broker_id, s.link_id, s.origin,
          case when p_duration_ms between 0 and 86400000 then p_duration_ms end,
          coalesce(p_meta, '{}'::jsonb))
  on conflict (session_id, event_name) where event_name in ('page_view','brasil_view','santa_catarina_view',
      'garuva_view','prolog_view','lead_form_start','lead_submit')
  do update set duration_ms = greatest(coalesce(app.events.duration_ms, 0), coalesce(excluded.duration_ms, 0));

  update app.web_sessions set last_seen_at = now() where id = s.id;

  if v_lead is not null then
    update app.leads set score = app.visitor_score(s.visitor_id), last_event = p_event
    where id = v_lead;
  end if;
  return true;
end $$;

-- Cadastro de investidor: cria o lead, atribui origem, vincula eventos da
-- sessão/visitante, registra consentimentos, calcula score e notifica.
create or replace function app.submit_lead(
  p_session uuid, p_name text, p_phone text, p_email text, p_interest text,
  p_notice_version text, p_notice_hash text, p_contact_hash text, p_ip_hash text)
returns uuid language plpgsql security definer set search_path = app, public as $$
declare
  s app.web_sessions%rowtype;
  v_attr record;
  v_lead uuid;
  v_link uuid; v_campaign uuid; v_agency uuid; v_broker uuid; v_rule text;
  v_existing uuid;
begin
  select * into s from app.web_sessions where id = p_session;
  if not found then raise exception 'invalid session'; end if;

  select * into v_attr from app.resolve_attribution(s.visitor_id);
  if found and v_attr.link_id is not null then
    v_link := v_attr.link_id; v_campaign := v_attr.campaign_id; v_agency := v_attr.agency_id;
    v_broker := v_attr.broker_id; v_rule := v_attr.rule;
  else
    v_link := s.link_id; v_campaign := s.campaign_id; v_agency := s.agency_id; v_broker := s.broker_id;
    v_rule := 'sessao';
  end if;
  if v_campaign is null then
    select id into v_campaign from app.campaigns where slug = 'radar-logistico';
  end if;

  -- Mesmo visitante reenviando o formulário: atualiza em vez de duplicar.
  select id into v_existing from app.leads
   where (visitor_id = s.visitor_id or (phone = p_phone and campaign_id = v_campaign))
     and anonymized_at is null
   order by created_at limit 1;

  if v_existing is not null then
    v_lead := v_existing;
    update app.leads set name = p_name, email = coalesce(nullif(p_email, ''), email),
           interest = coalesce(nullif(p_interest, ''), interest), last_activity_at = now(),
           visitor_id = coalesce(visitor_id, s.visitor_id)
     where id = v_lead;
    insert into app.lead_history(lead_id, kind, note) values (v_lead, 'system', 'Novo envio do formulário de cadastro.');
  else
    insert into app.leads(visitor_id, session_id, campaign_id, agency_id, broker_id, link_id, attribution_rule,
                          name, phone, email, interest, last_event)
    values (s.visitor_id, s.id, v_campaign, v_agency, v_broker, v_link, v_rule,
            p_name, p_phone, nullif(p_email, ''), nullif(p_interest, ''), 'lead_submit')
    returning id into v_lead;
    insert into app.lead_history(lead_id, to_stage, kind, note)
    values (v_lead, 'novo', 'system', 'Lead criado pelo formulário da campanha.');
  end if;

  insert into app.events(event_name, session_id, visitor_id, lead_id, campaign_id, agency_id, broker_id, link_id, origin)
  values ('lead_submit', s.id, s.visitor_id, v_lead, s.campaign_id, s.agency_id, s.broker_id, s.link_id, s.origin)
  on conflict do nothing;

  -- Associa os eventos anteriores do mesmo visitante pseudônimo ao lead.
  update app.events set lead_id = v_lead where visitor_id = s.visitor_id and lead_id is null;

  insert into app.consents(lead_id, purpose, granted, text_version, text_hash, ip_hash) values
    (v_lead, 'privacy_notice', true, p_notice_version, p_notice_hash, p_ip_hash),
    (v_lead, 'contact', true, p_notice_version, p_contact_hash, p_ip_hash);

  update app.leads set score = app.visitor_score(s.visitor_id) where id = v_lead;

  if v_existing is null then
    insert into app.notifications(user_id, lead_id, kind, title, body)
    select u.id, v_lead, 'new_lead', 'Novo lead: ' || p_name,
           'Campanha Radar Logístico. Score ' || (select score from app.leads where id = v_lead) || '.'
    from app.users u
    where u.active and (u.role = 'stater_admin'
       or (u.role = 'agency_manager' and u.agency_id = v_agency)
       or (u.role = 'broker' and u.id = v_broker));
  end if;

  return v_lead;
end $$;

-- ---------------------------------------------------------------------------
-- Triggers de pipeline: histórico, primeiro atendimento e tempo real
-- ---------------------------------------------------------------------------
create or replace function app.tg_lead_stage() returns trigger
language plpgsql security definer set search_path = app, public as $$
begin
  if new.stage is distinct from old.stage then
    insert into app.lead_history(lead_id, from_stage, to_stage, kind, note, user_id)
    values (new.id, old.stage, new.stage, 'stage', nullif(current_setting('app.note', true), ''), app.uid());
    if old.stage = 'novo' and new.first_contact_at is null then
      new.first_contact_at := now();
    end if;
    new.last_activity_at := now();
  end if;
  return new;
end $$;

drop trigger if exists lead_stage_change on app.leads;
create trigger lead_stage_change before update of stage on app.leads
  for each row execute function app.tg_lead_stage();

create or replace function app.tg_notify_lead() returns trigger
language plpgsql security definer set search_path = app, public as $$
declare r record;
begin
  if tg_table_name = 'leads' then
    r := coalesce(new, old);
    perform pg_notify('prolog_live', json_build_object('t','lead','id',r.id,'a',r.agency_id,'b',r.broker_id)::text);
  else
    select l.id, l.agency_id, l.broker_id into r from app.leads l where l.id = coalesce(new.lead_id, old.lead_id);
    if found then
      perform pg_notify('prolog_live', json_build_object('t',tg_table_name,'id',r.id,'a',r.agency_id,'b',r.broker_id)::text);
    end if;
  end if;
  return null;
end $$;

drop trigger if exists leads_live on app.leads;
create trigger leads_live after insert or update on app.leads for each row execute function app.tg_notify_lead();
drop trigger if exists history_live on app.lead_history;
create trigger history_live after insert on app.lead_history for each row execute function app.tg_notify_lead();
drop trigger if exists meetings_live on app.meetings;
create trigger meetings_live after insert or update on app.meetings for each row execute function app.tg_notify_lead();

create or replace function app.tg_event_live() returns trigger
language plpgsql security definer set search_path = app, public as $$
begin
  if new.event_name in ('cta_click','whatsapp_click','prolog_view','lead_form_start') then
    perform pg_notify('prolog_live', json_build_object('t','event','e',new.event_name,'a',new.agency_id,'b',new.broker_id)::text);
  end if;
  return null;
end $$;
drop trigger if exists events_live on app.events;
create trigger events_live after insert on app.events for each row execute function app.tg_event_live();

-- Reunião agendada: gera evento meeting_scheduled e move o pipeline.
create or replace function app.tg_meeting_created() returns trigger
language plpgsql security definer set search_path = app, public as $$
declare l app.leads%rowtype; v_session uuid;
begin
  select * into l from app.leads where id = new.lead_id;
  if l.visitor_id is not null then
    select id into v_session from app.web_sessions where visitor_id = l.visitor_id order by started_at desc limit 1;
    if v_session is not null then
      insert into app.events(event_name, session_id, visitor_id, lead_id, campaign_id, agency_id, broker_id, link_id, origin, meta)
      values ('meeting_scheduled', v_session, l.visitor_id, l.id, l.campaign_id, l.agency_id, l.broker_id, l.link_id, 'crm',
              jsonb_build_object('meeting_id', new.id));
    end if;
  end if;
  insert into app.lead_history(lead_id, kind, note, user_id)
  values (l.id, 'meeting', 'Reunião agendada para ' || to_char(new.scheduled_for at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'), app.uid());
  if l.stage in ('novo','primeiro_contato','em_qualificacao','interessado') then
    update app.leads set stage = 'reuniao_agendada', last_event = 'meeting_scheduled' where id = l.id;
  else
    update app.leads set last_event = 'meeting_scheduled', last_activity_at = now() where id = l.id;
  end if;
  return null;
end $$;
drop trigger if exists meeting_created on app.meetings;
create trigger meeting_created after insert on app.meetings for each row execute function app.tg_meeting_created();

-- Garante integridade de atribuição: só a Stater muda a imobiliária; só
-- Stater/gestor redistribuem o corretor, e sempre dentro da mesma imobiliária.
create or replace function app.tg_lead_guard() returns trigger
language plpgsql security definer set search_path = app, public as $$
begin
  if app.uid() is not null then
    if new.agency_id is distinct from old.agency_id and not app.is_admin() then
      raise exception 'apenas a Stater pode alterar a imobiliária do lead';
    end if;
    if new.broker_id is distinct from old.broker_id and not (app.is_admin() or app.is_manager()) then
      raise exception 'apenas gestores podem redistribuir leads';
    end if;
  end if;
  if new.broker_id is not null and not exists (
      select 1 from app.users u where u.id = new.broker_id and u.role = 'broker' and u.agency_id = new.agency_id) then
    raise exception 'corretor não pertence à imobiliária do lead';
  end if;
  if new.broker_id is distinct from old.broker_id or new.agency_id is distinct from old.agency_id then
    insert into app.lead_history(lead_id, kind, note, user_id)
    values (new.id, 'system', 'Responsável alterado.', app.uid());
  end if;
  return new;
end $$;
drop trigger if exists lead_guard on app.leads;
create trigger lead_guard before update of agency_id, broker_id on app.leads
  for each row execute function app.tg_lead_guard();

create or replace function app.tg_history_touch() returns trigger
language plpgsql security definer set search_path = app, public as $$
begin
  if new.kind in ('note','call','whatsapp','email') then
    update app.leads set last_activity_at = now(),
      first_contact_at = case when new.kind in ('call','whatsapp','email') then coalesce(first_contact_at, now()) else first_contact_at end
    where id = new.lead_id;
  end if;
  return null;
end $$;
drop trigger if exists history_touch on app.lead_history;
create trigger history_touch after insert on app.lead_history for each row execute function app.tg_history_touch();

-- ---------------------------------------------------------------------------
-- Visões (security_invoker: respeitam RLS de quem consulta)
-- ---------------------------------------------------------------------------
create or replace view app.v_leads with (security_invoker = true) as
select l.*, app.classify(l.score) as classification,
       a.name as agency_name, u.name as broker_name, c.name as campaign_name,
       extract(epoch from (now() - coalesce(l.first_contact_at, l.created_at))) / 3600.0 as hours_waiting
from app.leads l
left join app.agencies a on a.id = l.agency_id
left join app.users u on u.id = l.broker_id
left join app.campaigns c on c.id = l.campaign_id;

create or replace view app.v_anonymous_interests with (security_invoker = true) as
select e.visitor_id,
       (array_agg(e.agency_id order by e.occurred_at))[1] as agency_id,
       (array_agg(e.broker_id order by e.occurred_at))[1] as broker_id,
       (array_agg(e.campaign_id order by e.occurred_at))[1] as campaign_id,
       min(e.occurred_at) as first_at, max(e.occurred_at) as last_at,
       (array_agg(e.event_name order by e.occurred_at desc))[1] as last_event,
       count(*) as events,
       array_agg(distinct e.event_name) as event_names,
       app.visitor_score(e.visitor_id) as score
from app.events e
where not app.visitor_has_lead(e.visitor_id)
group by e.visitor_id
having bool_or(e.event_name in ('cta_click','whatsapp_click','lead_form_start','prolog_view'));

-- ---------------------------------------------------------------------------
-- Retenção (LGPD): elimina rastros anônimos antigos e anonimiza leads perdidos
-- ---------------------------------------------------------------------------
create or replace function app.apply_retention() returns jsonb
language plpgsql security definer set search_path = app, public as $$
declare
  v_anon int := coalesce((app.setting('retention')->>'anonymous_days')::int, 365);
  v_lost int := coalesce((app.setting('retention')->>'lost_lead_days')::int, 730);
  n_visitors int; n_leads int;
begin
  if app.uid() is not null and not app.is_admin() then raise exception 'forbidden'; end if;
  with del as (
    delete from app.visitors v
    where v.last_seen_at < now() - make_interval(days => v_anon)
      and not exists (select 1 from app.leads l where l.visitor_id = v.id)
    returning 1)
  select count(*) into n_visitors from del;

  with upd as (
    update app.leads set name = '[dados eliminados]', phone = null, email = null, anonymized_at = now()
    where stage = 'perdido' and anonymized_at is null
      and last_activity_at < now() - make_interval(days => v_lost)
    returning 1)
  select count(*) into n_leads from upd;
  delete from app.auth_sessions where expires_at < now();

  insert into app.audit_log(user_id, action, entity, data)
  values (app.uid(), 'lgpd.retention', 'system', jsonb_build_object('visitors_deleted', n_visitors, 'leads_anonymized', n_leads));
  return jsonb_build_object('visitors_deleted', n_visitors, 'leads_anonymized', n_leads);
end $$;

-- Eliminação a pedido do titular (art. 18 LGPD)
create or replace function app.anonymize_lead(p_lead uuid) returns void
language plpgsql security definer set search_path = app, public as $$
begin
  if not app.is_admin() then raise exception 'forbidden'; end if;
  update app.leads set name = '[dados eliminados]', phone = null, email = null, interest = null, anonymized_at = now()
  where id = p_lead;
  update app.consents set revoked_at = now() where lead_id = p_lead and revoked_at is null;
  delete from app.lead_history where lead_id = p_lead and kind in ('note','call','whatsapp','email');
  insert into app.audit_log(user_id, action, entity, entity_id) values (app.uid(), 'lgpd.anonymize', 'lead', p_lead::text);
end $$;

-- ---------------------------------------------------------------------------
-- Privilégios
-- ---------------------------------------------------------------------------
revoke all on all tables in schema app from public;
revoke all on all functions in schema app from public;
grant usage on schema app to prolog_app;
grant usage on type app.user_role, app.lead_stage to prolog_app;

grant select, insert, update on app.agencies to prolog_app;
grant select, insert, update on app.users to prolog_app;
grant select, insert, update on app.campaigns to prolog_app;
grant select, insert, delete on app.campaign_agencies to prolog_app;
grant select, insert, update on app.tracking_links to prolog_app;
grant select on app.visitors, app.visitor_touches, app.web_sessions, app.events, app.consents to prolog_app;
grant select on app.leads to prolog_app;
grant update (stage, agency_id, broker_id, name, phone, email, interest) on app.leads to prolog_app;
grant select, insert on app.lead_history to prolog_app;
grant select, insert, update on app.meetings to prolog_app;
grant select, update on app.notifications to prolog_app;
grant select, update on app.settings to prolog_app;
grant select on app.audit_log to prolog_app;
grant select on app.v_leads, app.v_anonymous_interests to prolog_app;
grant usage on all sequences in schema app to prolog_app;
-- Coluna sensível: o papel da aplicação não lê hashes de senha diretamente.
revoke select on app.users from prolog_app;
grant select (id, email, name, phone, role, agency_id, creci, active, must_change_password, last_login_at, created_at)
  on app.users to prolog_app;
grant execute on all functions in schema app to prolog_app;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['agencies','users','auth_sessions','campaigns','campaign_agencies','tracking_links',
    'visitors','visitor_touches','web_sessions','leads','events','consents','lead_history','meetings',
    'notifications','settings','audit_log']
  loop
    execute format('alter table app.%I enable row level security', t);
    execute format('alter table app.%I force row level security', t);
  end loop;
end $$;

-- Remove políticas anteriores (migração idempotente)
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'app' loop
    execute format('drop policy %I on app.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- O dono das tabelas (migrações / funções SECURITY DEFINER) não é afetado
-- quando é superusuário; em Supabase o papel `postgres` tem BYPASSRLS.
-- Para donos sem bypass, as políticas abaixo liberam o próprio dono:
create or replace function app.is_owner() returns boolean
language sql stable as $$ select current_user <> 'prolog_app' $$;

do $$
declare t text;
begin
  foreach t in array array['agencies','users','auth_sessions','campaigns','campaign_agencies','tracking_links',
    'visitors','visitor_touches','web_sessions','leads','events','consents','lead_history','meetings',
    'notifications','settings','audit_log']
  loop
    execute format('create policy owner_all on app.%I for all using (app.is_owner()) with check (app.is_owner())', t);
  end loop;
end $$;

-- Imobiliárias
create policy agencies_select on app.agencies for select using (app.is_admin() or id = app.me_agency());
create policy agencies_admin_ins on app.agencies for insert with check (app.is_admin());
create policy agencies_admin_upd on app.agencies for update using (app.is_admin()) with check (app.is_admin());

-- Usuários
create policy users_select on app.users for select using (
  app.is_admin() or id = app.uid() or (app.is_manager() and agency_id = app.me_agency()));
create policy users_insert on app.users for insert with check (
  app.is_admin() or (app.is_manager() and agency_id = app.me_agency() and role = 'broker'));
create policy users_update on app.users for update
  using (app.is_admin() or (app.is_manager() and agency_id = app.me_agency() and role = 'broker'))
  with check (app.is_admin() or (app.is_manager() and agency_id = app.me_agency() and role = 'broker'));

-- Campanhas
create policy campaigns_select on app.campaigns for select using (app.uid() is not null);
create policy campaigns_admin_ins on app.campaigns for insert with check (app.is_admin());
create policy campaigns_admin_upd on app.campaigns for update using (app.is_admin()) with check (app.is_admin());
create policy ca_select on app.campaign_agencies for select using (app.is_admin() or agency_id = app.me_agency());
create policy ca_admin_ins on app.campaign_agencies for insert with check (app.is_admin());
create policy ca_admin_del on app.campaign_agencies for delete using (app.is_admin());

-- Links
create policy links_select on app.tracking_links for select using (app.can_see(agency_id, broker_id));
create policy links_insert on app.tracking_links for insert with check (
  app.is_admin() or (app.is_manager() and agency_id = app.me_agency()
    and (broker_id is null or exists (select 1 from app.users u where u.id = broker_id and u.agency_id = app.me_agency()))));
create policy links_update on app.tracking_links for update
  using (app.is_admin() or (app.is_manager() and agency_id = app.me_agency()))
  with check (app.is_admin() or (app.is_manager() and agency_id = app.me_agency()));

-- Rastreamento (somente leitura, escopado)
create policy visitors_select on app.visitors for select using (
  app.is_admin() or exists (select 1 from app.web_sessions s where s.visitor_id = id and app.can_see(s.agency_id, s.broker_id)));
create policy touches_select on app.visitor_touches for select using (app.can_see(agency_id, broker_id));
create policy sessions_select on app.web_sessions for select using (app.can_see(agency_id, broker_id));
create policy events_select on app.events for select using (app.can_see(agency_id, broker_id));

-- Leads
create policy leads_select on app.leads for select using (app.can_see(agency_id, broker_id));
create policy leads_update on app.leads for update
  using (app.can_see(agency_id, broker_id))
  with check (app.can_see(agency_id, broker_id));
create policy consents_select on app.consents for select using (
  exists (select 1 from app.leads l where l.id = lead_id and app.can_see(l.agency_id, l.broker_id)));
create policy history_select on app.lead_history for select using (
  exists (select 1 from app.leads l where l.id = lead_id and app.can_see(l.agency_id, l.broker_id)));
create policy history_insert on app.lead_history for insert with check (
  user_id = app.uid() and exists (select 1 from app.leads l where l.id = lead_id and app.can_see(l.agency_id, l.broker_id)));
create policy meetings_select on app.meetings for select using (
  exists (select 1 from app.leads l where l.id = lead_id and app.can_see(l.agency_id, l.broker_id)));
create policy meetings_insert on app.meetings for insert with check (
  created_by = app.uid() and exists (select 1 from app.leads l where l.id = lead_id and app.can_see(l.agency_id, l.broker_id)));
create policy meetings_update on app.meetings for update using (
  exists (select 1 from app.leads l where l.id = lead_id and app.can_see(l.agency_id, l.broker_id)));

-- Notificações: cada usuário vê apenas as suas
create policy notifications_select on app.notifications for select using (user_id = app.uid());
create policy notifications_update on app.notifications for update using (user_id = app.uid()) with check (user_id = app.uid());

-- Configurações: leitura autenticada, escrita só Stater
create policy settings_select on app.settings for select using (app.uid() is not null);
create policy settings_update on app.settings for update using (app.is_admin()) with check (app.is_admin());

-- Auditoria: apenas Stater
create policy audit_select on app.audit_log for select using (app.is_admin());
