// Teste ponta a ponta do painel de disparos. Requer o servidor rodando em APP_URL.
//   APP_URL=http://localhost:3100 ADMIN_PASSWORD=... DATABASE_URL=... node scripts/e2e.mjs
import { createRequire } from "node:module";
import pg from "pg";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const APP = process.env.APP_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS_DIR ?? "test-results";
const run = Date.now().toString(36).slice(-4);
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
let pass = 0, fail = 0;
const check = (c, m) => (c ? (pass++, console.log("✔", m)) : (fail++, console.log("✘", m)));

const b = await chromium.launch();
const admin = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
await admin.goto(`${APP}/entrar`);
await admin.fill("#password", "senha-errada");
await admin.click("button");
await admin.locator("text=Senha incorreta").waitFor();
check(true, "Senha errada é recusada");
await admin.fill("#password", process.env.ADMIN_PASSWORD);
await admin.click("button");
await admin.waitForURL("**/painel", { waitUntil: "commit" });
check(true, "Login no painel");

await admin.goto(`${APP}/painel/contatos`);
const phones = [1, 2, 3].map((i) => `4799${String(Date.now() + i).slice(-7)}`);
await admin.fill("#lines", `nome; telefone; etiqueta\nAna Teste ${run}; ${phones[0]}; Lista ${run}\nBruno Teste ${run}; ${phones[1]}\nlinha inválida\nCarla Teste ${run}\t${phones[2]}\tLista ${run}`);
await admin.fill("#tag", `Padrão ${run}`);
await admin.click("button:has-text('Importar')");
const msg = await admin.locator('[role="status"]').textContent();
check(/3 contatos novos/.test(msg) && /1 linhas ignoradas/.test(msg), `Importação: ${msg}`);
const contacts = (await db.query("select name, token, tag from contacts where name like $1 order by name", [`%${run}`])).rows;
check(contacts.length === 3 && contacts[1].tag === `Padrão ${run}`, "Contatos com token e etiqueta padrão");

// Robô de pré-visualização do WhatsApp não conta como abertura
const before = +(await db.query("select count(*) from visits")).rows[0].count;
await fetch(`${APP}/brasil/${contacts[0].token}`, { headers: { "User-Agent": "WhatsApp/2.23 facebookexternalhit/1.1" } });
const after = +(await db.query("select count(*) from visits")).rows[0].count;
check(before === after, "Pré-visualização do link no WhatsApp não conta como clique");

// Ana abre o capítulo 1 no celular e lê até o fim
const ana = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
await ana.goto(`${APP}/brasil/${contacts[0].token}`);
await ana.waitForTimeout(1200);
await ana.screenshot({ path: `${SHOTS}/d-cap1-mobile.png` });
await ana.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await ana.waitForTimeout(1500);
await ana.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
await ana.close();
await new Promise((r) => setTimeout(r, 800));

// Bruno abre o capítulo 2 e clica em interesse
const bruno = await (await b.newContext()).newPage();
await bruno.goto(`${APP}/sc/${contacts[1].token}`);
await bruno.waitForTimeout(800);
await bruno.click("button:has-text('Tenho interesse')");
await bruno.locator("text=Interesse registrado").waitFor();
check(true, "Bruno clicou em interesse no capítulo 2 (sem formulário, já identificado)");

// Visitante pelo link geral do capítulo 3 se identifica no formulário
const anon = await (await b.newContext()).newPage();
await anon.goto(`${APP}/garuva`);
await anon.waitForTimeout(800);
await anon.screenshot({ path: `${SHOTS}/d-cap3.png`, fullPage: true });
await anon.click("button:has-text('Quero conhecer')");
await anon.locator("#cta-name").waitFor();
await anon.fill("#cta-name", `Diego Orgânico ${run}`);
await anon.fill("#cta-phone", `4198${String(Date.now()).slice(-7)}`);
await anon.check("#cta-consent");
await anon.click("button:has-text('Quero ser contatado')");
await anon.locator("text=Interesse registrado").waitFor();
const diego = (await db.query("select source, tag from contacts where name=$1", [`Diego Orgânico ${run}`])).rows[0];
check(diego?.source === "organico", "Visitante do link geral virou contato identificado (orgânico)");

const v = (await db.query(
  `select c.name, v.page, v.duration_ms, v.max_scroll, v.cta_at is not null cta from visits v join contacts c on c.id=v.contact_id where c.name like $1 order by c.name`,
  [`%${run}`]
)).rows;
const a = v.find((x) => x.name.startsWith("Ana"));
check(a && a.page === "brasil" && a.max_scroll >= 90 && a.duration_ms >= 2000, `Ana: cap. 1, ${a?.duration_ms} ms, ${a?.max_scroll}% lido`);
check(v.find((x) => x.name.startsWith("Bruno"))?.cta === true, "Bruno: interesse registrado");

await admin.goto(`${APP}/painel`);
const html = await admin.content();
check(html.includes(`Ana Teste ${run}`) && html.includes("Leu tudo") && html.includes(`Diego Orgânico ${run}`), "Painel mostra quem abriu, quanto leu e quem tem interesse");
await admin.screenshot({ path: `${SHOTS}/d-painel.png`, fullPage: true });
await admin.goto(`${APP}/painel?status=interessados`);
const rowsInt = await admin.locator("tbody tr").count();
check(rowsInt >= 2, `Filtro "clicaram em interesse": ${rowsInt} linhas`);

const csv = await (await admin.request.get(`${APP}/api/export/disparo?etiqueta=${encodeURIComponent(`Lista ${run}`)}`)).text();
check(csv.includes(`/brasil/${contacts[0].token}`) && csv.includes("Olá, Ana!") && !csv.includes("Bruno"), "Planilha de disparo com links pessoais e mensagens (filtrada por etiqueta)");
const res = await (await admin.request.get(`${APP}/api/export/resultados`)).text();
check(res.includes(`Ana Teste ${run}`), "CSV de resultados");
const noauth = await fetch(`${APP}/api/export/resultados`);
check(noauth.status === 401, "Exportação bloqueada sem login");

await b.close();
await db.query("delete from contacts where name like $1", [`%${run}`]);
await db.end();
console.log(`\n${pass}/${pass + fail} verificações aprovadas.`);
process.exit(fail ? 1 : 0);
