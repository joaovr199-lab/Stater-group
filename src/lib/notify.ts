import "server-only";
import { pool } from "./db";

/**
 * Notificações externas após um novo lead. As notificações internas
 * (sino nos painéis) já são criadas no banco por app.submit_lead.
 * Integrações opcionais, ativadas por variáveis de ambiente:
 *  - RESEND_API_KEY + NOTIFY_FROM_EMAIL: e-mail aos responsáveis
 *  - NOTIFY_WEBHOOK_URL (+ NOTIFY_WEBHOOK_SECRET): POST JSON (n8n, Make, WhatsApp Business API...)
 * Nenhum telefone ou e-mail do investidor é enviado: apenas o link do painel.
 */
export async function notifyNewLead(leadId: string) {
  const app = process.env.APP_URL ?? "";
  try {
    const [brief, rec] = await Promise.all([
      pool.query("select * from app.lead_brief($1)", [leadId]),
      pool.query("select * from app.lead_recipients($1)", [leadId]),
    ]);
    const b = brief.rows[0];
    if (!b) return;
    const path = (role: string) =>
      role === "stater_admin" ? `/stater/leads/${leadId}` : role === "agency_manager" ? `/imobiliaria/leads/${leadId}` : `/corretor/leads/${leadId}`;

    if (process.env.RESEND_API_KEY && process.env.NOTIFY_FROM_EMAIL) {
      await Promise.allSettled(
        rec.rows.map((r) =>
          fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: process.env.NOTIFY_FROM_EMAIL,
              to: r.email,
              subject: `PROLOG Intelligence · novo lead (score ${b.score})`,
              text: `Olá, ${r.name}.\n\nUm novo investidor se cadastrou na campanha Radar Logístico.\nImobiliária: ${b.agency_name ?? "—"}\nCorretor: ${b.broker_name ?? "—"}\nScore de intenção digital: ${b.score}\n\nAcesse: ${app}${path(r.role)}\n`,
            }),
          })
        )
      );
    }
    if (process.env.NOTIFY_WEBHOOK_URL) {
      await fetch(process.env.NOTIFY_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Prolog-Secret": process.env.NOTIFY_WEBHOOK_SECRET ?? "" },
        body: JSON.stringify({
          type: "lead.created",
          lead_id: leadId,
          score: b.score,
          agency: b.agency_name,
          broker: b.broker_name,
          recipients: rec.rows.map((r) => ({ user_id: r.user_id, role: r.role, url: `${app}${path(r.role)}` })),
        }),
      });
    }
  } catch (e) {
    console.error("[notify]", e);
  }
}
