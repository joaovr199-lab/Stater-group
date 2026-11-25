-- Funções auxiliares expostas ao papel da aplicação.

-- Nome de exibição de um usuário (sem e-mail/telefone). Permite que o corretor
-- veja quem atualizou o lead sem ganhar acesso à tabela de usuários.
create or replace function app.user_name(p_user uuid) returns text
language sql stable security definer set search_path = app, public as $$
  select name from app.users where id = p_user
$$;

-- Destinatários de notificação externa de um lead (uso exclusivo do servidor
-- logo após o cadastro; não é chamada a partir do navegador).
create or replace function app.lead_recipients(p_lead uuid)
returns table(user_id uuid, name text, email text, role app.user_role)
language sql stable security definer set search_path = app, public as $$
  select u.id, u.name, u.email, u.role
  from app.leads l
  join app.users u on u.active and (u.role = 'stater_admin'
       or (u.role = 'agency_manager' and u.agency_id = l.agency_id)
       or (u.role = 'broker' and u.id = l.broker_id))
  where l.id = p_lead
$$;

-- Resumo mínimo do lead para notificações (sem telefone/e-mail).
create or replace function app.lead_brief(p_lead uuid)
returns table(id uuid, name text, score int, agency_name text, broker_name text)
language sql stable security definer set search_path = app, public as $$
  select l.id, l.name, l.score, a.name, u.name
  from app.leads l left join app.agencies a on a.id = l.agency_id left join app.users u on u.id = l.broker_id
  where l.id = p_lead
$$;

-- Dados públicos de um link (para a reportagem exibir "convite de <imobiliária>").
create or replace function app.link_public(p_code text)
returns table(code text, agency_name text, broker_name text, campaign_slug text)
language sql stable security definer set search_path = app, public as $$
  select l.code, a.name, u.name, c.slug
  from app.tracking_links l
  join app.agencies a on a.id = l.agency_id and a.active
  join app.campaigns c on c.id = l.campaign_id and c.active
  left join app.users u on u.id = l.broker_id
  where l.code = upper(p_code) and l.active
$$;

revoke all on function app.user_name(uuid), app.lead_recipients(uuid), app.lead_brief(uuid), app.link_public(text) from public;
grant execute on function app.user_name(uuid), app.lead_recipients(uuid), app.lead_brief(uuid), app.link_public(text) to prolog_app;
