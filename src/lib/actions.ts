"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { asUser, hashPassword, HOME, login, logout, requireUser, validatePassword, type SessionUser } from "./auth";
import { STAGE_IDS } from "./constants";
import { ipHash, isLimited, randomCode, randomPassword, rateLimit } from "./security";

export type ActionState = { ok?: boolean; error?: string; message?: string; secret?: string } | null;

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/row-level security|permission denied|forbidden/i.test(msg)) return "Acesso negado para esta operação.";
  if (/users_email_key/.test(msg)) return "Já existe um usuário com este e-mail.";
  if (/agencies_slug_key/.test(msg)) return "Já existe uma imobiliária com este identificador.";
  if (/campaigns_slug_key/.test(msg)) return "Já existe uma campanha com este identificador.";
  if (/corretor não pertence|apenas/.test(msg)) return msg.replace(/^.*?ERROR:\s*/, "");
  console.error("[action]", e);
  return "Não foi possível concluir a operação.";
}

function done(message?: string, secret?: string): ActionState {
  revalidatePath("/", "layout");
  return { ok: true, message, secret };
}

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v === "" || (v.length >= 10 && v.length <= 13), "Telefone inválido.");

const fd = (f: FormData, k: string) => (f.get(k)?.toString() ?? "").trim();

// ---------------------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------------------
export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  const email = fd(form, "email").toLowerCase();
  const password = form.get("password")?.toString() ?? "";
  // Conta apenas tentativas que falharam: escritórios com muitos corretores
  // atrás do mesmo IP não são bloqueados por logins legítimos.
  const ipKey = `login:${await ipHash()}`;
  const emailKey = `login:${email}`;
  if (isLimited(ipKey, 30) || isLimited(emailKey, 8)) return { error: "Muitas tentativas. Aguarde alguns minutos." };
  const ua = (await headers()).get("user-agent") ?? "";
  const id = await login(email, password, ua);
  if (!id) {
    rateLimit(ipKey, 30, 15 * 60_000);
    rateLimit(emailKey, 8, 15 * 60_000);
    return { error: "E-mail ou senha inválidos." };
  }
  redirect("/entrar");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}

export async function changePasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  const u = await requireUser();
  const p1 = form.get("password")?.toString() ?? "";
  const p2 = form.get("confirm")?.toString() ?? "";
  if (p1 !== p2) return { error: "As senhas não conferem." };
  const err = validatePassword(p1);
  if (err) return { error: err };
  const hash = await hashPassword(p1);
  await asUser(u, (c) => c.query("select app.auth_set_password($1)", [hash]));
  revalidatePath("/", "layout");
  redirect(HOME[u.role]);
}

// ---------------------------------------------------------------------------
// Imobiliárias, gestores e corretores
// ---------------------------------------------------------------------------
async function createLinksForBroker(c: import("pg").PoolClient, u: SessionUser, agencyId: string, brokerId: string | null) {
  const camps = await c.query(
    `select ca.campaign_id from app.campaign_agencies ca join app.campaigns c on c.id = ca.campaign_id
     where ca.agency_id = $1 and c.active`,
    [agencyId]
  );
  for (const row of camps.rows) {
    const exists = await c.query(
      "select 1 from app.tracking_links where campaign_id=$1 and agency_id=$2 and broker_id is not distinct from $3 and active",
      [row.campaign_id, agencyId, brokerId]
    );
    if (exists.rowCount) continue;
    await c.query(
      `insert into app.tracking_links(code, campaign_id, agency_id, broker_id, created_by, label)
       values ($1,$2,$3,$4,$5,$6)`,
      [randomCode(8), row.campaign_id, agencyId, brokerId, u.id, brokerId ? "Link do corretor" : "Link da imobiliária"]
    );
  }
}

const agencySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da imobiliária."),
  cnpj: z.string().trim().max(20).optional(),
  city: z.string().trim().max(80).optional(),
  manager_name: z.string().trim().min(2, "Informe o nome do gestor."),
  manager_email: z.string().trim().toLowerCase().email("E-mail do gestor inválido."),
  manager_phone: phone,
});

export async function createAgencyAction(_: ActionState, form: FormData): Promise<ActionState> {
  const u = await requireUser(["stater_admin"]);
  const parsed = agencySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const password = randomPassword();
  const hash = await hashPassword(password);
  const campaigns = form.getAll("campaigns").map(String);
  try {
    await asUser(u, async (c) => {
      let slug = slugify(d.name) || randomCode(6).toLowerCase();
      const clash = await c.query("select 1 from app.agencies where slug = $1", [slug]);
      if (clash.rowCount) slug = `${slug}-${randomCode(4).toLowerCase()}`;
      const a = await c.query(
        "insert into app.agencies(name, slug, cnpj, city) values ($1,$2,$3,$4) returning id",
        [d.name, slug, d.cnpj || null, d.city || null]
      );
      const id = a.rows[0].id as string;
      await c.query(
        `insert into app.users(email, name, phone, password_hash, role, agency_id) values ($1,$2,$3,$4,'agency_manager',$5)`,
        [d.manager_email, d.manager_name, d.manager_phone || null, hash, id]
      );
      for (const cid of campaigns)
        await c.query("insert into app.campaign_agencies(campaign_id, agency_id) values ($1,$2) on conflict do nothing", [cid, id]);
      await createLinksForBroker(c, u, id, null);
      await c.query("select app.audit('agency.create','agency',$1,$2)", [id, { name: d.name, manager: d.manager_email }]);
      return id;
    });
    return done(`Imobiliária criada. Gestor: ${d.manager_email}. Repasse a senha provisória por canal seguro.`, password);
  } catch (e) {
    return { error: friendly(e) };
  }
}

export async function updateAgencyAction(_: ActionState, form: FormData): Promise<ActionState> {
  const u = await requireUser(["stater_admin"]);
  const id = fd(form, "id");
  try {
    await asUser(u, async (c) => {
      await c.query("update app.agencies set name=$2, cnpj=$3, city=$4, active=$5 where id=$1", [
        id,
        fd(form, "name"),
        fd(form, "cnpj") || null,
        fd(form, "city") || null,
        form.get("active") === "on",
      ]);
      await c.query("select app.audit('agency.update','agency',$1,'{}'::jsonb)", [id]);
    });
    return done("Imobiliária atualizada.");
  } catch (e) {
    return { error: friendly(e) };
  }
}

const brokerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  phone,
  creci: z.string().trim().max(30).optional(),
  role: z.enum(["broker", "agency_manager"]).default("broker"),
});

export async function createUserAction(_: ActionState, form: FormData): Promise<ActionState> {
  const u = await requireUser(["stater_admin", "agency_manager"]);
  const parsed = brokerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const agencyId = u.role === "stater_admin" ? fd(form, "agency_id") : u.agency_id!;
  if (!agencyId) return { error: "Selecione a imobiliária." };
  const role = u.role === "stater_admin" ? d.role : "broker";
  const password = randomPassword();
  const hash = await hashPassword(password);
  try {
    await asUser(u, async (c) => {
      const r = await c.query(
        `insert into app.users(email, name, phone, password_hash, role, agency_id, creci) values ($1,$2,$3,$4,$5,$6,$7) returning id`,
        [d.email, d.name, d.phone || null, hash, role, agencyId, d.creci || null]
      );
      const id = r.rows[0].id as string;
      if (role === "broker") await createLinksForBroker(c, u, agencyId, id);
      await c.query("select app.audit('user.create','user',$1,$2)", [id, { email: d.email, role, agency_id: agencyId }]);
    });
    return done(`${role === "broker" ? "Corretor" : "Gestor"} cadastrado: ${d.email}. Repasse a senha provisória por canal seguro.`, password);
  } catch (e) {
    return { error: friendly(e) };
  }
}

export async function toggleUserAction(form: FormData) {
  const u = await requireUser(["stater_admin", "agency_manager"]);
  const id = fd(form, "id");
  await asUser(u, async (c) => {
    const r = await c.query("update app.users set active = not active where id = $1 and id <> $2 returning active", [id, u.id]);
    if (!r.rowCount) throw new Error("forbidden");
    await c.query("select app.audit('user.toggle','user',$1,$2)", [id, { active: r.rows[0].active }]);
  });
  revalidatePath("/", "layout");
}

export async function resetPasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  const u = await requireUser(["stater_admin", "agency_manager"]);
  const id = fd(form, "id");
  const password = randomPassword();
  const hash = await hashPassword(password);
  try {
    await asUser(u, async (c) => {
      const r = await c.query("update app.users set password_hash=$2, must_change_password=true where id=$1 and id <> $3", [id, hash, u.id]);
      if (!r.rowCount) throw new Error("forbidden");
      await c.query("select app.audit('user.reset_password','user',$1,'{}'::jsonb)", [id]);
    });
    return done("Senha provisória gerada. Repasse por canal seguro.", password);
  } catch (e) {
    return { error: friendly(e) };
  }
}

// ---------------------------------------------------------------------------
// Campanhas e links
// ---------------------------------------------------------------------------
export async function createCampaignAction(_: ActionState, form: FormData): Promise<ActionState> {
  const u = await requireUser(["stater_admin"]);
  const name = fd(form, "name");
  if (name.length < 3) return { error: "Informe o nome da campanha." };
  try {
    await asUser(u, async (c) => {
      const r = await c.query(
        `insert into app.campaigns(slug, name, description, landing_path, starts_at, ends_at) values ($1,$2,$3,$4,$5,$6) returning id`,
        [slugify(name), name, fd(form, "description") || null, fd(form, "landing_path") || "/radar", fd(form, "starts_at") || null, fd(form, "ends_at") || null]
      );
      await c.query("select app.audit('campaign.create','campaign',$1,$2)", [r.rows[0].id, { name }]);
    });
    return done("Campanha criada.");
  } catch (e) {
    return { error: friendly(e) };
  }
}

export async function toggleCampaignAction(form: FormData) {
  const u = await requireUser(["stater_admin"]);
  const id = fd(form, "id");
  await asUser(u, async (c) => {
    await c.query("update app.campaigns set active = not active where id = $1", [id]);
    await c.query("select app.audit('campaign.toggle','campaign',$1,'{}'::jsonb)", [id]);
  });
  revalidatePath("/", "layout");
}

/** Vincula/desvincula imobiliária à campanha e gera os links de toda a equipe. */
export async function setCampaignAgencyAction(form: FormData) {
  const u = await requireUser(["stater_admin"]);
  const campaign = fd(form, "campaign_id");
  const agency = fd(form, "agency_id");
  const on = fd(form, "on") === "1";
  await asUser(u, async (c) => {
    if (on) {
      await c.query("insert into app.campaign_agencies(campaign_id, agency_id) values ($1,$2) on conflict do nothing", [campaign, agency]);
      await createLinksForBroker(c, u, agency, null);
      const brokers = await c.query("select id from app.users where agency_id=$1 and role='broker' and active", [agency]);
      for (const b of brokers.rows) await createLinksForBroker(c, u, agency, b.id);
    } else {
      await c.query("delete from app.campaign_agencies where campaign_id=$1 and agency_id=$2", [campaign, agency]);
    }
    await c.query("select app.audit('campaign.agency','campaign',$1,$2)", [campaign, { agency, on }]);
  });
  revalidatePath("/", "layout");
}

export async function createLinkAction(_: ActionState, form: FormData): Promise<ActionState> {
  const u = await requireUser(["stater_admin", "agency_manager"]);
  const campaign = fd(form, "campaign_id");
  const broker = fd(form, "broker_id") || null;
  const label = fd(form, "label") || null;
  try {
    await asUser(u, async (c) => {
      let agency = u.agency_id;
      if (u.role === "stater_admin") {
        agency = fd(form, "agency_id") || null;
        if (broker) agency = (await c.query("select agency_id from app.users where id=$1", [broker])).rows[0]?.agency_id ?? agency;
      }
      if (!agency) throw new Error("Selecione a imobiliária.");
      const r = await c.query(
        `insert into app.tracking_links(code, campaign_id, agency_id, broker_id, label, created_by) values ($1,$2,$3,$4,$5,$6) returning id`,
        [randomCode(8), campaign, agency, broker, label, u.id]
      );
      await c.query("select app.audit('link.create','link',$1,'{}'::jsonb)", [r.rows[0].id]);
    });
    return done("Link criado.");
  } catch (e) {
    return { error: e instanceof Error && e.message.startsWith("Selecione") ? e.message : friendly(e) };
  }
}

export async function toggleLinkAction(form: FormData) {
  const u = await requireUser(["stater_admin", "agency_manager"]);
  const id = fd(form, "id");
  await asUser(u, async (c) => {
    await c.query("update app.tracking_links set active = not active where id=$1", [id]);
    await c.query("select app.audit('link.toggle','link',$1,'{}'::jsonb)", [id]);
  });
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Atendimento comercial
// ---------------------------------------------------------------------------
export async function updateStageAction(_: ActionState, form: FormData): Promise<ActionState> {
  const u = await requireUser();
  const id = fd(form, "lead_id");
  const stage = fd(form, "stage");
  const note = fd(form, "note").slice(0, 2000);
  if (!STAGE_IDS.includes(stage as never)) return { error: "Etapa inválida." };
  try {
    await asUser(
      u,
      async (c) => {
        const r = await c.query("update app.leads set stage = $2 where id = $1 and stage <> $2", [id, stage]);
        if (!r.rowCount) {
          const vis = await c.query("select 1 from app.leads where id=$1", [id]);
          if (!vis.rowCount) throw new Error("forbidden");
          if (note) await c.query("insert into app.lead_history(lead_id, kind, note, user_id) values ($1,'note',$2,$3)", [id, note, u.id]);
        }
        await c.query("select app.audit('lead.stage','lead',$1,$2)", [id, { stage }]);
      },
      note
    );
    return done("Atendimento atualizado.");
  } catch (e) {
    return { error: friendly(e) };
  }
}

export async function addInteractionAction(_: ActionState, form: FormData): Promise<ActionState> {
  const u = await requireUser();
  const id = fd(form, "lead_id");
  const kind = fd(form, "kind");
  const note = fd(form, "note").slice(0, 2000);
  if (!["note", "call", "whatsapp", "email"].includes(kind)) return { error: "Tipo inválido." };
  if (!note) return { error: "Descreva o atendimento." };
  try {
    await asUser(u, async (c) => {
      await c.query("insert into app.lead_history(lead_id, kind, note, user_id) values ($1,$2,$3,$4)", [id, kind, note, u.id]);
      const r = await c.query("select stage from app.leads where id=$1", [id]);
      if (r.rows[0]?.stage === "novo" && kind !== "note") await c.query("update app.leads set stage='primeiro_contato' where id=$1", [id]);
      await c.query("select app.audit('lead.interaction','lead',$1,$2)", [id, { kind }]);
    });
    return done("Registro adicionado.");
  } catch (e) {
    return { error: friendly(e) };
  }
}

export async function scheduleMeetingAction(_: ActionState, form: FormData): Promise<ActionState> {
  const u = await requireUser();
  const id = fd(form, "lead_id");
  const when = fd(form, "scheduled_for");
  if (!when) return { error: "Informe data e horário." };
  // Entrada do formulário em horário de Brasília (UTC-3, sem horário de verão desde 2019).
  const date = new Date(`${when}:00-03:00`);
  if (isNaN(date.getTime())) return { error: "Data inválida." };
  try {
    await asUser(u, async (c) => {
      const r = await c.query(
        `insert into app.meetings(lead_id, scheduled_for, mode, location, notes, created_by) values ($1,$2,$3,$4,$5,$6) returning id`,
        [id, date, fd(form, "mode") || "presencial", fd(form, "location") || null, fd(form, "notes") || null, u.id]
      );
      await c.query("select app.audit('meeting.create','meeting',$1,$2)", [r.rows[0].id, { lead: id }]);
    });
    return done("Reunião agendada.");
  } catch (e) {
    return { error: friendly(e) };
  }
}

export async function meetingStatusAction(form: FormData) {
  const u = await requireUser();
  const id = fd(form, "id");
  const status = fd(form, "status");
  if (!["realizada", "cancelada", "agendada"].includes(status)) return;
  await asUser(u, async (c) => {
    const r = await c.query("update app.meetings set status=$2 where id=$1 returning lead_id", [id, status]);
    const leadId = r.rows[0]?.lead_id;
    if (leadId && status === "realizada")
      await c.query(
        "update app.leads set stage='reuniao_realizada' where id=$1 and stage in ('novo','primeiro_contato','em_qualificacao','interessado','reuniao_agendada')",
        [leadId]
      );
    if (leadId)
      await c.query("insert into app.lead_history(lead_id, kind, note, user_id) values ($1,'meeting',$2,$3)", [leadId, `Reunião marcada como ${status}.`, u.id]);
    await c.query("select app.audit('meeting.status','meeting',$1,$2)", [id, { status }]);
  });
  revalidatePath("/", "layout");
}

export async function reassignLeadAction(_: ActionState, form: FormData): Promise<ActionState> {
  const u = await requireUser(["stater_admin", "agency_manager"]);
  const id = fd(form, "lead_id");
  const broker = fd(form, "broker_id") || null;
  try {
    await asUser(u, async (c) => {
      if (u.role === "stater_admin" && fd(form, "agency_id")) {
        await c.query("update app.leads set agency_id=$2, broker_id=$3 where id=$1", [id, fd(form, "agency_id"), broker]);
      } else {
        const r = await c.query("update app.leads set broker_id=$2 where id=$1", [id, broker]);
        if (!r.rowCount) throw new Error("forbidden");
      }
      await c.query("select app.audit('lead.reassign','lead',$1,$2)", [id, { broker }]);
    });
    return done("Responsável atualizado.");
  } catch (e) {
    return { error: friendly(e) };
  }
}

export async function anonymizeLeadAction(form: FormData) {
  const u = await requireUser(["stater_admin"]);
  const id = fd(form, "lead_id");
  await asUser(u, (c) => c.query("select app.anonymize_lead($1)", [id]));
  revalidatePath("/", "layout");
}

export async function markNotificationsReadAction() {
  const u = await requireUser();
  await asUser(u, (c) => c.query("update app.notifications set read_at = now() where read_at is null"));
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Configurações (somente Stater)
// ---------------------------------------------------------------------------
const intIn = (v: string, min: number, max: number, def: number) => {
  const x = parseInt(v, 10);
  return Number.isFinite(x) ? Math.max(min, Math.min(max, x)) : def;
};

export async function updateSettingsAction(_: ActionState, form: FormData): Promise<ActionState> {
  const u = await requireUser(["stater_admin"]);
  const section = fd(form, "section");
  let value: unknown;
  if (section === "scoring") {
    const keys = ["page_view", "brasil_view", "santa_catarina_view", "garuva_view", "prolog_view", "cta_click", "lead_submit"];
    value = {
      weights: Object.fromEntries(keys.map((k) => [k, intIn(fd(form, `w_${k}`), 0, 100, 0)])),
      thresholds: { interessado: intIn(fd(form, "t_interessado"), 1, 100, 30), alta_intencao: intIn(fd(form, "t_alta"), 1, 100, 60) },
      max: 100,
    };
  } else if (section === "attribution") {
    value = {
      rule: fd(form, "rule") === "last_touch" ? "last_touch" : "first_touch",
      window_days: intIn(fd(form, "window_days"), 1, 365, 90),
    };
  } else if (section === "alerts") {
    value = { no_contact_hours: intIn(fd(form, "no_contact_hours"), 1, 720, 4), high_intent_idle_hours: intIn(fd(form, "high_intent_idle_hours"), 1, 720, 24) };
  } else if (section === "retention") {
    value = { anonymous_days: intIn(fd(form, "anonymous_days"), 30, 3650, 365), lost_lead_days: intIn(fd(form, "lost_lead_days"), 30, 3650, 730), auth_session_hours: 12 };
  } else if (section === "privacy") {
    value = {
      controller_name: fd(form, "controller_name"),
      controller_cnpj: fd(form, "controller_cnpj"),
      dpo_name: fd(form, "dpo_name"),
      dpo_email: fd(form, "dpo_email"),
      notice_version: fd(form, "notice_version") || "2026-11-v1",
    };
  } else if (section === "contact") {
    value = { whatsapp_number: fd(form, "whatsapp_number").replace(/\D/g, "") };
  } else return { error: "Seção inválida." };
  try {
    await asUser(u, async (c) => {
      await c.query("update app.settings set value=$2, updated_by=$3, updated_at=now() where key=$1", [section, value, u.id]);
      if (section === "scoring") await c.query("select app.recompute_scores()");
      await c.query("select app.audit('settings.update','settings',$1,$2)", [section, value]);
    });
    return done("Configuração salva.");
  } catch (e) {
    return { error: friendly(e) };
  }
}

export async function runRetentionAction(): Promise<ActionState> {
  const u = await requireUser(["stater_admin"]);
  try {
    const r = await asUser(u, (c) => c.query("select app.apply_retention() as r"));
    const x = r.rows[0].r;
    return done(`Retenção aplicada: ${x.visitors_deleted} visitantes anônimos eliminados, ${x.leads_anonymized} leads anonimizados.`);
  } catch (e) {
    return { error: friendly(e) };
  }
}
