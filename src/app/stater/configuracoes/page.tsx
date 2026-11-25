import { asUser, requireUser } from "@/lib/auth";
import { runRetentionAction, updateSettingsAction } from "@/lib/actions";
import { EVENT_LABEL } from "@/lib/constants";
import { getSettings } from "@/lib/queries";
import { ActionForm, Submit } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";

const WEIGHT_KEYS = ["page_view", "brasil_view", "santa_catarina_view", "garuva_view", "prolog_view", "cta_click", "lead_submit"];

export default async function Page() {
  const user = await requireUser(["stater_admin"]);
  const s = await asUser(user, (c) => getSettings(c));
  const env = {
    gtm: Boolean(process.env.NEXT_PUBLIC_GTM_ID),
    ga4: Boolean(process.env.NEXT_PUBLIC_GA4_ID),
    email: Boolean(process.env.RESEND_API_KEY && process.env.NOTIFY_FROM_EMAIL),
    webhook: Boolean(process.env.NOTIFY_WEBHOOK_URL),
    cron: Boolean(process.env.CRON_SECRET),
  };
  return (
    <>
      <PageHeader title="Configurações" subtitle="Regras de negócio da operação. Alterações ficam registradas na auditoria." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Lead scoring">
          <ActionForm action={updateSettingsAction} resetOnSuccess={false}>
            <input type="hidden" name="section" value="scoring" />
            <div className="grid grid-cols-2 gap-3">
              {WEIGHT_KEYS.map((k) => (
                <label key={k}>
                  <span className="label">{EVENT_LABEL[k]}</span>
                  <input type="number" min={0} max={100} name={`w_${k}`} defaultValue={s.scoring.weights[k] ?? 0} className="field tabular" />
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-line pt-3">
              <label><span className="label">“Interessado” a partir de</span><input type="number" name="t_interessado" defaultValue={s.scoring.thresholds.interessado} className="field" /></label>
              <label><span className="label">“Alta intenção” a partir de</span><input type="number" name="t_alta" defaultValue={s.scoring.thresholds.alta_intencao} className="field" /></label>
            </div>
            <p className="text-xs text-muted">Cada tipo de evento pontua uma única vez por visitante. O total é limitado a 100. O score mede intenção digital, não capacidade financeira. Ao salvar, os scores existentes são recalculados.</p>
            <Submit>Salvar pontuação</Submit>
          </ActionForm>
        </Card>

        <div className="space-y-5">
          <Card title="Regra de atribuição">
            <ActionForm action={updateSettingsAction} resetOnSuccess={false}>
              <input type="hidden" name="section" value="attribution" />
              <label className="block">
                <span className="label">Quando o visitante acessa links de corretores diferentes</span>
                <select name="rule" defaultValue={s.attribution.rule} className="field">
                  <option value="first_touch">Primeiro toque: o lead fica com quem enviou o primeiro link</option>
                  <option value="last_touch">Último toque: o lead fica com o link mais recente</option>
                </select>
              </label>
              <label className="block">
                <span className="label">Janela de atribuição (dias)</span>
                <input type="number" name="window_days" min={1} max={365} defaultValue={s.attribution.window_days} className="field" />
              </label>
              <p className="text-xs text-muted">Todos os acessos continuam registrados no histórico do visitante. A regra define apenas o responsável pelo lead.</p>
              <Submit>Salvar regra</Submit>
            </ActionForm>
          </Card>

          <Card title="Alertas comerciais">
            <ActionForm action={updateSettingsAction} resetOnSuccess={false} className="grid grid-cols-2 gap-3">
              <input type="hidden" name="section" value="alerts" />
              <label><span className="label">Sem atendimento após (horas)</span><input type="number" name="no_contact_hours" defaultValue={s.alerts.no_contact_hours} className="field" /></label>
              <label><span className="label">Alta intenção parada após (horas)</span><input type="number" name="high_intent_idle_hours" defaultValue={s.alerts.high_intent_idle_hours} className="field" /></label>
              <div className="col-span-2"><Submit>Salvar alertas</Submit></div>
            </ActionForm>
          </Card>

          <Card title="Contato da campanha">
            <ActionForm action={updateSettingsAction} resetOnSuccess={false}>
              <input type="hidden" name="section" value="contact" />
              <label className="block">
                <span className="label">WhatsApp exibido na reportagem (com DDI e DDD)</span>
                <input name="whatsapp_number" defaultValue={s.contact.whatsapp_number} className="field" placeholder="5547999999999" />
              </label>
              <p className="text-xs text-muted">Se vazio, o botão de WhatsApp não aparece. A mensagem leva o código do link para manter a atribuição.</p>
              <Submit>Salvar contato</Submit>
            </ActionForm>
          </Card>
        </div>

        <Card title="Privacidade e LGPD">
          <ActionForm action={updateSettingsAction} resetOnSuccess={false}>
            <input type="hidden" name="section" value="privacy" />
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2"><span className="label">Controlador (razão social)</span><input name="controller_name" defaultValue={s.privacy.controller_name} className="field" /></label>
              <label><span className="label">CNPJ</span><input name="controller_cnpj" defaultValue={s.privacy.controller_cnpj} className="field" /></label>
              <label><span className="label">Versão do aviso</span><input name="notice_version" defaultValue={s.privacy.notice_version} className="field" /></label>
              <label><span className="label">Encarregado (DPO)</span><input name="dpo_name" defaultValue={s.privacy.dpo_name} className="field" /></label>
              <label><span className="label">E-mail do encarregado</span><input name="dpo_email" defaultValue={s.privacy.dpo_email} className="field" /></label>
            </div>
            <p className="text-xs text-muted">Esses dados aparecem no Aviso de Privacidade público (/privacidade). O texto do aviso deve passar por revisão jurídica antes da publicação.</p>
            <Submit>Salvar</Submit>
          </ActionForm>
        </Card>

        <Card title="Retenção de dados">
          <ActionForm action={updateSettingsAction} resetOnSuccess={false} className="grid grid-cols-2 gap-3">
            <input type="hidden" name="section" value="retention" />
            <label><span className="label">Rastros anônimos (dias)</span><input type="number" name="anonymous_days" defaultValue={s.retention.anonymous_days} className="field" /></label>
            <label><span className="label">Leads perdidos inativos (dias)</span><input type="number" name="lost_lead_days" defaultValue={s.retention.lost_lead_days} className="field" /></label>
            <p className="col-span-2 text-xs text-muted">Visitantes anônimos sem cadastro são eliminados após o prazo. Leads “perdidos” sem atividade no prazo têm nome, telefone e e-mail eliminados. Agende /api/cron/retention diariamente{env.cron ? "" : " (defina CRON_SECRET)"}.</p>
            <div className="col-span-2"><Submit>Salvar prazos</Submit></div>
          </ActionForm>
          <div className="mt-4 border-t border-line pt-4">
            <ActionForm action={runRetentionAction} resetOnSuccess={false}>
              <Submit className="btn btn-secondary" pending="Aplicando…">Aplicar política agora</Submit>
            </ActionForm>
          </div>
        </Card>

        <Card title="Integrações">
          <ul className="space-y-2 text-sm">
            {[
              ["Google Tag Manager (NEXT_PUBLIC_GTM_ID)", env.gtm],
              ["Google Analytics 4 direto (NEXT_PUBLIC_GA4_ID)", env.ga4],
              ["E-mail de novo lead (RESEND_API_KEY, NOTIFY_FROM_EMAIL)", env.email],
              ["Webhook de novo lead (NOTIFY_WEBHOOK_URL)", env.webhook],
              ["Rotina de retenção (CRON_SECRET)", env.cron],
            ].map(([k, v]) => (
              <li key={String(k)} className="flex items-center justify-between gap-3">
                <span>{k}</span>
                <span className={`text-xs font-semibold ${v ? "text-good" : "text-muted"}`}>{v ? "Configurado" : "Não configurado"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">As credenciais ficam em variáveis de ambiente do servidor e não são exibidas aqui.</p>
        </Card>
      </div>
    </>
  );
}
