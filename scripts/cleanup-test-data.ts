// Remove os dados criados pelo teste de aceitação (marcados com "[TESTE]").
// Uso: npm run test:cleanup   (requer DATABASE_ADMIN_URL)
import { Client } from "pg";

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_ADMIN_URL });
  await c.connect();
  await c.query("begin");
  const ag = await c.query("select id from app.agencies where name like '[TESTE]%'");
  const ids = ag.rows.map((r) => r.id);
  if (ids.length) {
    const users = (await c.query("select id from app.users where agency_id = any($1)", [ids])).rows.map((r) => r.id);
    const visitors = (
      await c.query(
        "select distinct visitor_id from app.web_sessions where agency_id = any($1) union select visitor_id from app.leads where agency_id = any($1) and visitor_id is not null",
        [ids]
      )
    ).rows.map((r) => r.visitor_id);
    await c.query("delete from app.leads where agency_id = any($1) or visitor_id = any($2)", [ids, visitors]);
    await c.query("delete from app.visitors where id = any($1)", [visitors]);
    await c.query("delete from app.web_sessions where agency_id = any($1)", [ids]);
    await c.query("delete from app.visitor_touches where agency_id = any($1)", [ids]);
    await c.query("delete from app.events where agency_id = any($1)", [ids]);
    await c.query("delete from app.notifications where user_id = any($1)", [users]);
    await c.query("update app.audit_log set user_id = null where user_id = any($1)", [users]);
    await c.query("delete from app.tracking_links where agency_id = any($1)", [ids]);
    await c.query("delete from app.campaign_agencies where agency_id = any($1)", [ids]);
    await c.query("delete from app.users where id = any($1)", [users]);
    await c.query("delete from app.agencies where id = any($1)", [ids]);
  }
  // Notificações órfãs de leads removidos ficam apagadas por cascade.
  await c.query("commit");
  console.log(`Removidas ${ids.length} imobiliárias de teste e seus dados.`);
  await c.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
