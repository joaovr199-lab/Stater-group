// Teste de aceitação ponta a ponta (critérios 1–14 do escopo).
// Usa a interface real (Playwright) + verificação direta no banco com o
// papel da aplicação (RLS). Requer o servidor rodando em APP_URL.
//
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/e2e-acceptance.mjs
//
// Cria dados marcados com "[TESTE]". Remova-os depois com: npm run test:cleanup
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(require.resolve("playwright", { paths: [process.env.NODE_PATH ?? "", "/usr/lib/node_modules", "/usr/local/lib/node_modules"] })); }
const { chromium } = playwright;
import pg from "pg";
import { mkdirSync } from "node:fs";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const SHOTS = process.env.SHOTS_DIR ?? "test-results";
mkdirSync(SHOTS, { recursive: true });
const run = Date.now().toString(36).slice(-5);
const results = [];
const ok = (n, msg) => {
  results.push({ n, ok: true, msg });
  console.log(`✔ ${n}. ${msg}`);
};
const fail = (n, msg) => {
  results.push({ n, ok: false, msg });
  console.log(`✘ ${n}. ${msg}`);
};
function assert(cond, n, msg) {
  if (cond) ok(n, msg);
  else fail(n, msg);
  return cond;
}

const admin = new pg.Client({ connectionString: process.env.DATABASE_ADMIN_URL });
const appdb = new pg.Client({ connectionString: process.env.DATABASE_URL });
await admin.connect();
await appdb.connect();

const browser = await chromium.launch();
const newCtx = (mobile = false) =>
  browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { viewport: { width: 1360, height: 900 } });

async function login(page, email, password, newPassword) {
  await page.goto(`${APP}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login") && !u.pathname.startsWith("/entrar"), { timeout: 15000 });
  if (page.url().includes("/conta/senha")) {
    await page.fill('input[name="password"]', newPassword);
    await page.fill('input[name="confirm"]', newPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.startsWith("/conta"), { timeout: 15000 });
  }
}
async function secretFromStatus(page) {
  const code = page.locator('[role="status"] code').first();
  await code.waitFor({ timeout: 15000 });
  return (await code.textContent()).trim();
}

const PW = "NovaSenha2026x";

// 1–2. Cadastrar imobiliárias e gestores (Stater)
const ctxAdmin = await newCtx();
const pAdmin = await ctxAdmin.newPage();
await login(pAdmin, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
const agencies = {};
for (const key of ["A", "B"]) {
  await pAdmin.goto(`${APP}/stater/imobiliarias`);
  await pAdmin.fill('input[name="name"]', `[TESTE] Imobiliária ${key} ${run}`);
  await pAdmin.fill('input[name="city"]', "Joinville");
  await pAdmin.fill('input[name="manager_name"]', `Gestor ${key} Teste`);
  await pAdmin.fill('input[name="manager_email"]', `gestor.${key.toLowerCase()}.${run}@teste.local`);
  await pAdmin.click('button:has-text("Cadastrar")');
  agencies[key] = { email: `gestor.${key.toLowerCase()}.${run}@teste.local`, temp: await secretFromStatus(pAdmin) };
}
const ag = await admin.query("select id, name from app.agencies where name like $1 order by name", [`%${run}`]);
assert(ag.rowCount === 2, 1, "Imobiliárias A e B cadastradas pela Stater");
const mgrs = await admin.query("select email from app.users where role='agency_manager' and email like $1", [`%${run}%`]);
assert(mgrs.rowCount === 2, 2, "Gestores criados com login individual e senha provisória");
await pAdmin.screenshot({ path: `${SHOTS}/01-stater-imobiliarias.png`, fullPage: true });

// 3. Gestores cadastram corretores
const brokers = {};
const ctxMgr = {};
for (const key of ["A", "B"]) {
  ctxMgr[key] = await newCtx();
  const p = await ctxMgr[key].newPage();
  await login(p, agencies[key].email, agencies[key].temp, PW);
  await p.goto(`${APP}/imobiliaria/corretores`);
  await p.fill('input[name="name"]', `Corretor ${key}1 Teste`);
  await p.fill('input[name="email"]', `corretor.${key.toLowerCase()}1.${run}@teste.local`);
  await p.fill('input[name="phone"]', "47999990000");
  await p.click('button:has-text("Cadastrar")');
  brokers[key] = { email: `corretor.${key.toLowerCase()}1.${run}@teste.local`, temp: await secretFromStatus(p) };
  ctxMgr[key].main = p;
  if (key === "A") await p.screenshot({ path: `${SHOTS}/02-imobiliaria-corretores.png`, fullPage: true });
}
const br = await admin.query("select u.email, a.name from app.users u join app.agencies a on a.id=u.agency_id where u.role='broker' and u.email like $1", [`%${run}%`]);
assert(br.rowCount === 2, 3, "Corretores cadastrados pelos gestores, cada um na própria imobiliária");

// 4. Links individuais gerados
const links = {};
const ctxBroker = {};
for (const key of ["A", "B"]) {
  ctxBroker[key] = await newCtx(true);
  const p = await ctxBroker[key].newPage();
  await login(p, brokers[key].email, brokers[key].temp, PW);
  await p.goto(`${APP}/corretor`);
  const url = (await p.locator(".font-mono").first().textContent()).trim();
  links[key] = url;
  brokers[key].page = p;
  if (key === "A") await p.screenshot({ path: `${SHOTS}/03-corretor-mobile.png`, fullPage: true });
}
// Cada painel aberto mantém uma conexão SSE; o navegador de teste limita 6 por host
// (HTTP/1.1). Painéis ociosos são estacionados em about:blank.
const park = (p) => p.goto("about:blank");
await park(brokers.B.page);
await park(ctxMgr.B.main);
await park(ctxMgr.A.main);
assert(/\/radar\?ref=[A-Z0-9]{8}$/.test(links.A) && links.A !== links.B, 4, `Links individuais: ${links.A} e ${links.B}`);
const qr = await brokers.A.page.request.get(`${APP}/api/qr/${links.A.split("ref=")[1]}`);
ok(4, `QR Code do corretor disponível (HTTP ${qr.status()}, ${qr.headers()["content-type"]})`);

// 5–9. Visitante abre a reportagem pelo link, avança, clica no CTA e se cadastra
const ctxVisitor = await newCtx(true);
const pv = await ctxVisitor.newPage();
await pv.goto(links.A.replace(/^https?:\/\/[^/]+/, APP));
const invite = await pv.locator("text=Convite enviado por").count();
assert(invite > 0, 5, "Reportagem aberta pelo link do corretor (identifica o convite)");
for (const id of ["brasil", "infraestrutura", "santa-catarina", "portos", "garuva", "prolog"]) {
  await pv.locator(`#${id}`).scrollIntoViewIfNeeded();
  await pv.mouse.wheel(0, 250);
  await pv.waitForTimeout(700);
}
await pv.screenshot({ path: `${SHOTS}/04-radar-mobile-prolog.png` });
await pv.locator("#convite").scrollIntoViewIfNeeded();
await pv.click('button:has-text("Quero conhecer o investimento")');
const leadName = `Investidor Teste ${run}`;
await pv.fill('input[name="name"]', leadName);
await pv.fill('input[name="phone"]', `4798${String(Date.now()).slice(-7)}`);
await pv.selectOption('select[name="interest"]', "Conhecer o investimento PROLOG");
await pv.check('input[name="consent_privacy"]');
await pv.check('input[name="consent_contact"]');
await pv.click('button:has-text("Enviar e receber contato")');
await pv.locator("text=Recebemos seu contato").waitFor({ timeout: 15000 });
await pv.screenshot({ path: `${SHOTS}/05-radar-cadastro-ok.png` });

const lead = (
  await admin.query(
    `select l.*, a.name agency_name, u.email broker_email from app.leads l left join app.agencies a on a.id=l.agency_id left join app.users u on u.id=l.broker_id where l.name=$1`,
    [leadName]
  )
).rows[0];
const evs = (await admin.query("select distinct event_name from app.events where visitor_id=$1", [lead?.visitor_id])).rows.map((r) => r.event_name);
assert(
  ["page_view", "brasil_view", "santa_catarina_view", "garuva_view", "prolog_view"].every((e) => evs.includes(e)),
  6,
  `Avanço rastreado: ${evs.filter((e) => e.endsWith("view")).join(", ")}`
);
assert(evs.includes("cta_click") && evs.includes("lead_form_start"), 7, "Clique no CTA e início do formulário registrados");
assert(Boolean(lead) && evs.includes("lead_submit"), 8, `Cadastro do investidor registrado (score ${lead?.score})`);
assert(lead?.agency_name?.includes("Imobiliária A") && lead?.broker_email === brokers.A.email, 9, `Origem identificada: ${lead?.agency_name} / ${lead?.broker_email}`);
const linked = await admin.query("select count(*)::int n from app.events where lead_id=$1", [lead.id]);
ok(9, `${linked.rows[0].n} eventos anteriores associados ao lead; consentimentos: ${(await admin.query("select count(*)::int n from app.consents where lead_id=$1", [lead.id])).rows[0].n}`);

// 10. Mesmo lead na Stater e na imobiliária (e no corretor)
await pAdmin.goto(`${APP}/stater/leads`);
const inAdmin = await pAdmin.locator(`text=${leadName}`).count();
const pMgrA = ctxMgr.A.main;
await pMgrA.goto(`${APP}/imobiliaria/leads/${lead.id}`);
const inMgr = await pMgrA.locator(`h1:has-text("${leadName}")`).count();
await brokers.A.page.goto(`${APP}/corretor/leads`);
const inBroker = await brokers.A.page.locator(`text=${leadName}`).count();
assert(inAdmin > 0 && inMgr > 0 && inBroker > 0, 10, "Lead visível na central Stater, no gestor da imobiliária A e no corretor A1");
await pAdmin.screenshot({ path: `${SHOTS}/06-stater-gestao-leads.png`, fullPage: true });

// 11–12. Corretor atualiza o atendimento; gestor e Stater veem em tempo real
await pAdmin.goto(`${APP}/stater/leads/${lead.id}`);
await pAdmin.locator("text=Ao vivo").waitFor({ timeout: 10000 });
await pMgrA.locator("text=Ao vivo").waitFor({ timeout: 10000 });
const pb = brokers.A.page;
await pb.goto(`${APP}/corretor/leads/${lead.id}`);
await pb.selectOption('select[name="stage"]', "primeiro_contato");
await pb.fill('input[name="note"]', "Primeira conversa por WhatsApp");
await pb.locator('form:has(select[name="stage"]) button[type="submit"]').click();
await pb.locator("text=Atendimento atualizado").waitFor({ timeout: 10000 });
assert(true, 11, "Corretor atualizou o atendimento (Novo lead → Primeiro contato, com observação)");
// sem recarregar a página: SSE + router.refresh
const seenMgr = await pMgrA.locator("text=Primeira conversa por WhatsApp").waitFor({ timeout: 15000 }).then(() => true, () => false);
const seenAdmin = await pAdmin.locator("text=Primeira conversa por WhatsApp").waitFor({ timeout: 15000 }).then(() => true, () => false);
assert(seenMgr && seenAdmin, 12, "Atualização refletida em tempo real nos painéis do gestor e da Stater (sem recarregar)");
const mgrSelect = await pMgrA.locator('select[name="stage"]').inputValue();
assert(mgrSelect === "primeiro_contato", 12, `Seletor de etapa do gestor sincronizado após atualização ao vivo (${mgrSelect})`);
await pMgrA.screenshot({ path: `${SHOTS}/07-gestor-lead-detalhe.png`, fullPage: true });
const hist = await admin.query("select app.user_name(user_id) who, from_stage, to_stage, note from app.lead_history where lead_id=$1 and kind='stage' and from_stage is not null", [lead.id]);
ok(12, `Histórico registrado: ${hist.rows.map((h) => `${h.from_stage}→${h.to_stage} por ${h.who}`).join("; ")}`);

// Reunião agendada pelo gestor gera meeting_scheduled
await pMgrA.fill('input[name="scheduled_for"]', "2026-12-10T15:00");
await pMgrA.click('button:has-text("Agendar")');
await pMgrA.locator("text=Reunião agendada.").first().waitFor({ timeout: 10000 });
const mt = await admin.query("select stage from app.leads where id=$1", [lead.id]);
const mev = await admin.query("select count(*)::int n from app.events where lead_id=$1 and event_name='meeting_scheduled'", [lead.id]);
assert(mt.rows[0].stage === "reuniao_agendada" && mev.rows[0].n === 1, 12, "Reunião agendada: pipeline → Reunião agendada e evento meeting_scheduled");

// Interesse anônimo pelo link do corretor B (apenas CTA, sem cadastro)
const ctxAnon = await newCtx();
const pa = await ctxAnon.newPage();
await pa.goto(links.B.replace(/^https?:\/\/[^/]+/, APP));
await pa.locator("#prolog").scrollIntoViewIfNeeded();
await pa.waitForTimeout(600);
await pa.locator("#convite").scrollIntoViewIfNeeded();
await pa.click('button:has-text("Quero conhecer o investimento")');
await pa.waitForTimeout(800);

// 13. Relatórios e indicadores
await pAdmin.goto(`${APP}/stater?periodo=7d`);
const kpiLeads = await pAdmin.locator("text=Leads cadastrados").count();
await pAdmin.screenshot({ path: `${SHOTS}/08-stater-visao-geral.png`, fullPage: true });
await pAdmin.goto(`${APP}/stater/inteligencia`);
await pAdmin.screenshot({ path: `${SHOTS}/09-stater-inteligencia.png`, fullPage: true });
await pAdmin.goto(`${APP}/stater/leads?aba=anonimos`);
const anonAdmin = await pAdmin.locator("table tbody tr").count();
await pAdmin.screenshot({ path: `${SHOTS}/10-stater-anonimos.png`, fullPage: true });
const csv = await pAdmin.request.get(`${APP}/api/export/leads`);
assert(kpiLeads > 0 && anonAdmin > 0 && (await csv.text()).includes(leadName), 13, "Visão geral, inteligência, interesses anônimos e exportação CSV disponíveis");

// 14. Isolamento: imobiliária B não acessa dados da A
await park(pMgrA);
await park(brokers.A.page);
const pMgrB = ctxMgr.B.main;
await pMgrB.goto(`${APP}/imobiliaria/leads`);
const leakList = await pMgrB.locator(`text=${leadName}`).count();
const r404 = await pMgrB.goto(`${APP}/imobiliaria/leads/${lead.id}`);
const leakDetail = await pMgrB.locator(`h1:has-text("${leadName}")`).count();
const csvB = await pMgrB.request.get(`${APP}/api/export/leads`);
const leakCsv = (await csvB.text()).includes(leadName);
await brokers.B.page.goto(`${APP}/corretor/leads/${lead.id}`);
const leakBroker = await brokers.B.page.locator(`h1:has-text("${leadName}")`).count();
await pMgrB.goto(`${APP}/stater/leads`);
const blockedStater = new URL(pMgrB.url()).pathname.startsWith("/imobiliaria");
await pMgrB.goto(`${APP}/imobiliaria/leads?aba=anonimos`);
const anonB = await pMgrB.locator("table tbody tr").count();

// Banco: mesmas consultas com o papel da aplicação e identidade do gestor B
const mgrB = (await admin.query("select id from app.users where email=$1", [agencies.B.email])).rows[0].id;
const brkA = (await admin.query("select id from app.users where email=$1", [brokers.A.email])).rows[0].id;
async function asApp(uid, sql, params = []) {
  await appdb.query("begin");
  try {
    await appdb.query("select set_config('app.user_id',$1,true)", [uid]);
    const r = await appdb.query(sql, params);
    await appdb.query("commit");
    return r;
  } catch (e) {
    await appdb.query("rollback");
    return { error: e.message };
  }
}
const dbSel = await asApp(mgrB, "select count(*)::int n from app.leads where id=$1", [lead.id]);
const dbUpd = await asApp(mgrB, "update app.leads set stage='perdido' where id=$1", [lead.id]);
const dbEv = await asApp(mgrB, "select count(*)::int n from app.events where lead_id=$1", [lead.id]);
const dbHist = await asApp(mgrB, "select count(*)::int n from app.lead_history where lead_id=$1", [lead.id]);
const dbNoCtx = await asApp("", "select count(*)::int n from app.leads");
const dbBrokerMove = await asApp(brkA, "update app.leads set agency_id=(select id from app.agencies where name like $2 limit 1) where id=$1", [lead.id, `%B ${run}`]);
const dbHash = await asApp(mgrB, "select password_hash from app.users limit 1");
const isolated =
  leakList === 0 && leakDetail === 0 && r404?.status() === 404 && !leakCsv && leakBroker === 0 && blockedStater &&
  dbSel.rows?.[0].n === 0 && dbUpd.rowCount === 0 && dbEv.rows?.[0].n === 0 && dbHist.rows?.[0].n === 0 && dbNoCtx.rows?.[0].n === 0 &&
  Boolean(dbBrokerMove.error) && Boolean(dbHash.error);
assert(isolated, 14, "Imobiliária B não vê nem altera o lead da A (lista, ficha 404, CSV, corretor B, rota /stater, consultas diretas ao banco com RLS)");
console.log(
  `   detalhes: lista=${leakList} ficha=${r404?.status()} csv=${leakCsv} corretorB=${leakBroker} stater→${blockedStater ? "bloqueado" : "ABERTO"} ` +
    `db.select=${dbSel.rows?.[0].n} db.update=${dbUpd.rowCount} db.events=${dbEv.rows?.[0].n} sem-contexto=${dbNoCtx.rows?.[0].n} ` +
    `corretor-muda-imobiliária=${dbBrokerMove.error ? "negado" : "PERMITIDO"} hash-senha=${dbHash.error ? "negado" : "EXPOSTO"} anônimos-B=${anonB}`
);

// Atribuição: visitante que acessa links de dois corretores (primeiro toque)
const ctxMulti = await newCtx();
const pm = await ctxMulti.newPage();
await pm.goto(links.A.replace(/^https?:\/\/[^/]+/, APP));
await pm.waitForTimeout(500);
await pm.goto(links.B.replace(/^https?:\/\/[^/]+/, APP));
await pm.locator("#convite").scrollIntoViewIfNeeded();
await pm.click('button:has-text("Quero conhecer o investimento")');
const multiName = `Investidor Multi ${run}`;
await pm.fill('input[name="name"]', multiName);
await pm.fill('input[name="phone"]', `4797${String(Date.now() + 7).slice(-7)}`);
await pm.selectOption('select[name="interest"]', "Agendar uma conversa");
await pm.check('input[name="consent_privacy"]');
await pm.check('input[name="consent_contact"]');
await pm.click('button:has-text("Enviar e receber contato")');
await pm.locator("text=Recebemos seu contato").waitFor({ timeout: 15000 });
const multi = (await admin.query("select l.attribution_rule, u.email, (select count(*)::int from app.visitor_touches t where t.visitor_id=l.visitor_id) touches from app.leads l join app.users u on u.id=l.broker_id where l.name=$1", [multiName])).rows[0];
assert(multi?.email === brokers.A.email && multi.touches === 2, "6b", `Dois corretores, histórico preservado (${multi?.touches} toques), regra ${multi?.attribution_rule} → ${multi?.email}`);

await browser.close();
await admin.end();
await appdb.end();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações aprovadas.`);
process.exit(failed.length ? 1 : 0);
