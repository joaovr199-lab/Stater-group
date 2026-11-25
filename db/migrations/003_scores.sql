-- Recalcula o score de todos os leads após mudança nas regras de pontuação.
create or replace function app.recompute_scores() returns int
language plpgsql security definer set search_path = app, public as $$
declare n int;
begin
  if not app.is_admin() then raise exception 'forbidden'; end if;
  update app.leads set score = app.visitor_score(visitor_id) where visitor_id is not null;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function app.recompute_scores() from public;
grant execute on function app.recompute_scores() to prolog_app;
