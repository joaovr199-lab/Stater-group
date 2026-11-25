import Link from "next/link";
import { notFound } from "next/navigation";
import { asUser, type SessionUser } from "@/lib/auth";
import {
  addInteractionAction,
  anonymizeLeadAction,
  meetingStatusAction,
  reassignLeadAction,
  scheduleMeetingAction,
  updateStageAction,
} from "@/lib/actions";
import { EVENT_LABEL, HISTORY_KIND, STAGES, stageLabel } from "@/lib/constants";
import { fmtDateTime, fmtDuration, fmtHours, fmtPhone } from "@/lib/format";
import { getSettings, leadDetail } from "@/lib/queries";
import { ActionForm, Submit, SyncSelect } from "./forms";
import { Card, ScoreBadge, StageBadge } from "./ui";

export async function LeadDetail({ user, id, base }: { user: SessionUser; id: string; base: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await asUser(user, async (c) => {
    const d = await leadDetail(c, id);
    if (!d) return null;
    const s = await getSettings(c);
    const brokers =
      user.role === "broker"
        ? []
        : (await c.query("select id, name, agency_id from app.users where role='broker' and active order by name")).rows;
    const agencies = user.role === "stater_admin" ? (await c.query("select id, name from app.agencies where active order by name")).rows : [];
    await c.query("select app.audit('lead.view','lead',$1,'{}'::jsonb)", [id]);
    return { ...d, s, brokers, agencies };
  });
  if (!data) notFound();
  const { lead, events, touches, history, meetings, consents, s } = data;
  const weights = s.scoring.weights;
  const seen = new Set(events.map((e) => e.event_name));
  seen.add("lead_submit");
  const anonymized = Boolean(lead.anonymized_at);
  const wa = lead.phone ? `https://wa.me/${lead.phone}?text=${encodeURIComponent(`Olá, ${lead.name.split(" ")[0]}! Aqui é ${user.name}${user.agency_name ? `, da ${user.agency_name}` : ""}. Recebi seu interesse no PROLOG, em Garuva/SC.`)}` : null;

  return (
    <div className="space-y-5">
      <Link href={`${base}/leads`} className="text-sm text-muted hover:text-ink">← Voltar para leads</Link>
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
            <ScoreBadge score={lead.score} cls={lead.classification} />
            <StageBadge stage={lead.stage} />
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Info k="WhatsApp" v={fmtPhone(lead.phone)} />
            <Info k="E-mail" v={lead.email ?? "—"} />
            <Info k="Interesse" v={lead.interest ?? "—"} />
            <Info k="Imobiliária" v={lead.agency_name ?? "Sem imobiliária (acesso direto)"} />
            <Info k="Corretor" v={lead.broker_name ?? "—"} />
            <Info k="Campanha" v={`${lead.campaign_name}${data.linkCode ? ` · ref ${data.linkCode}` : ""}`} />
            <Info k="Entrada" v={fmtDateTime(lead.created_at)} />
            <Info k="Primeiro atendimento" v={lead.first_contact_at ? `${fmtDateTime(lead.first_contact_at)}` : `aguardando há ${fmtHours(lead.hours_waiting)}`} />
            <Info k="Regra de atribuição" v={lead.attribution_rule === "last_touch" ? "Último toque" : lead.attribution_rule === "first_touch" ? "Primeiro toque" : "Sessão"} />
          </dl>
        </div>
        {wa && !anonymized && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary shrink-0">Chamar no WhatsApp</a>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <div className="space-y-5">
          <Card title="Atualizar atendimento">
            <ActionForm action={updateStageAction} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
              <input type="hidden" name="lead_id" value={lead.id} />
              <label>
                <span className="label">Etapa do pipeline</span>
                <SyncSelect name="stage" value={lead.stage} options={STAGES.map((st) => ({ value: st.id, label: st.label }))} />
              </label>
              <label>
                <span className="label">Observação</span>
                <input name="note" className="field" placeholder="Ex.: conversa inicial, enviar material" maxLength={2000} />
              </label>
              <Submit>Salvar</Submit>
            </ActionForm>
            <div className="mt-5 border-t border-line pt-4">
              <ActionForm action={addInteractionAction} className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
                <input type="hidden" name="lead_id" value={lead.id} />
                <label>
                  <span className="label">Registro</span>
                  <select name="kind" className="field" defaultValue="whatsapp">
                    <option value="whatsapp">WhatsApp</option>
                    <option value="call">Ligação</option>
                    <option value="email">E-mail</option>
                    <option value="note">Observação</option>
                  </select>
                </label>
                <label>
                  <span className="label">Descrição</span>
                  <input name="note" className="field" required maxLength={2000} placeholder="O que foi conversado" />
                </label>
                <Submit className="btn btn-secondary">Registrar</Submit>
              </ActionForm>
            </div>
          </Card>

          <Card title="Reuniões">
            <ActionForm action={scheduleMeetingAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
              <input type="hidden" name="lead_id" value={lead.id} />
              <label>
                <span className="label">Data e hora (Brasília)</span>
                <input type="datetime-local" name="scheduled_for" className="field" required />
              </label>
              <label>
                <span className="label">Formato</span>
                <select name="mode" className="field">
                  <option value="presencial">Presencial</option>
                  <option value="video">Videochamada</option>
                  <option value="telefone">Telefone</option>
                </select>
              </label>
              <label>
                <span className="label">Local / link</span>
                <input name="location" className="field" maxLength={300} />
              </label>
              <Submit className="btn btn-secondary">Agendar</Submit>
            </ActionForm>
            {meetings.length > 0 && (
              <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
                {meetings.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                    <div>
                      <span className="font-medium">{fmtDateTime(m.scheduled_for)}</span>
                      <span className="text-muted"> · {m.mode}{m.location ? ` · ${m.location}` : ""} · por {m.user_name ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-ink-2">{m.status}</span>
                      {m.status === "agendada" && (
                        <>
                          <form action={meetingStatusAction}>
                            <input type="hidden" name="id" value={m.id} />
                            <input type="hidden" name="status" value="realizada" />
                            <button className="btn btn-secondary btn-sm">Realizada</button>
                          </form>
                          <form action={meetingStatusAction}>
                            <input type="hidden" name="id" value={m.id} />
                            <input type="hidden" name="status" value="cancelada" />
                            <button className="btn btn-ghost btn-sm">Cancelar</button>
                          </form>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Histórico de atendimento" pad={false}>
            <ol className="divide-y divide-line">
              {history.map((h) => (
                <li key={h.id} className="px-5 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span className="font-semibold uppercase tracking-wide text-ink-2">{HISTORY_KIND[h.kind] ?? h.kind}</span>
                    <span>{fmtDateTime(h.created_at)}</span>
                    <span>· {h.user_name ?? "Sistema"}</span>
                  </div>
                  {h.kind === "stage" && (
                    <div className="mt-0.5">{h.from_stage ? `${stageLabel(h.from_stage)} → ` : ""}<strong>{stageLabel(h.to_stage)}</strong></div>
                  )}
                  {h.note && <div className="mt-0.5 text-ink-2">{h.note}</div>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Score de intenção digital">
            <p className="mb-3 text-xs text-muted">Mede o engajamento com a reportagem. Não representa capacidade financeira.</p>
            <ul className="space-y-1.5 text-sm">
              {Object.entries(weights).map(([k, w]) => (
                <li key={k} className="flex items-center justify-between">
                  <span className={seen.has(k) ? "text-ink" : "text-muted line-through decoration-line-2"}>{EVENT_LABEL[k]}</span>
                  <span className={`tabular ${seen.has(k) ? "font-semibold" : "text-muted"}`}>{seen.has(k) ? `+${w}` : w}</span>
                </li>
              ))}
              <li className="flex items-center justify-between border-t border-line pt-2 font-semibold">
                <span>Total (máx. 100)</span>
                <span className="tabular">{lead.score}</span>
              </li>
            </ul>
          </Card>

          <Card title="Jornada na reportagem" pad={false}>
            {events.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">Sem eventos associados.</p>
            ) : (
              <ol className="relative px-5 py-4">
                {events.map((e, i) => (
                  <li key={i} className="relative border-l border-line pb-3 pl-4 last:pb-0">
                    <span className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-navy" />
                    <div className="text-sm">{EVENT_LABEL[e.event_name] ?? e.event_name}</div>
                    <div className="text-xs text-muted">
                      {fmtDateTime(e.occurred_at)}
                      {e.duration_ms ? ` · ${fmtDuration(e.duration_ms)} de leitura` : ""}
                      {e.broker_name ? ` · via ${e.broker_name}` : ""}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {touches.length > 0 && (
            <Card title="Origens registradas">
              <p className="mb-2 text-xs text-muted">Todos os links acessados por este visitante. O histórico original é preservado.</p>
              <ul className="space-y-1 text-sm">
                {touches.map((t, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{t.agency_name} · {t.broker_name ?? "link da imobiliária"} <span className="font-mono text-xs text-muted">{t.code}</span></span>
                    <span className="tabular text-xs text-muted">{fmtDateTime(t.touched_at)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {user.role !== "broker" && (
            <Card title="Responsável">
              <ActionForm action={reassignLeadAction} className="space-y-3" resetOnSuccess={false}>
                <input type="hidden" name="lead_id" value={lead.id} />
                {user.role === "stater_admin" && (
                  <label className="block">
                    <span className="label">Imobiliária</span>
                    <SyncSelect name="agency_id" value={lead.agency_id ?? ""} options={[{ value: "", label: "—" }, ...data.agencies.map((a: { id: string; name: string }) => ({ value: a.id, label: a.name }))]} />
                  </label>
                )}
                <label className="block">
                  <span className="label">Corretor</span>
                  <SyncSelect name="broker_id" value={lead.broker_id ?? ""} options={[{ value: "", label: "Sem corretor" }, ...data.brokers.map((b: { id: string; name: string }) => ({ value: b.id, label: b.name }))]} />
                </label>
                <Submit className="btn btn-secondary">Redistribuir</Submit>
              </ActionForm>
            </Card>
          )}

          <Card title="Privacidade (LGPD)">
            <ul className="space-y-1 text-sm">
              {consents.map((c, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>{c.purpose === "privacy_notice" ? "Ciência do aviso de privacidade" : "Autorização de contato"}</span>
                  <span className="text-xs text-muted">{c.revoked_at ? "revogado" : `v${c.text_version} · ${fmtDateTime(c.granted_at)}`}</span>
                </li>
              ))}
            </ul>
            {user.role === "stater_admin" && !anonymized && (
              <form action={anonymizeLeadAction} className="mt-4 border-t border-line pt-3">
                <input type="hidden" name="lead_id" value={lead.id} />
                <p className="mb-2 text-xs text-muted">Atende pedido de eliminação do titular: remove nome, telefone, e-mail e anotações. Irreversível.</p>
                <button className="btn btn-danger btn-sm">Eliminar dados pessoais</button>
              </form>
            )}
            {anonymized && <p className="mt-3 text-xs text-muted">Dados pessoais eliminados em {fmtDateTime(lead.anonymized_at)}.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted">{k}:</dt>
      <dd className="min-w-0 truncate text-ink">{v}</dd>
    </div>
  );
}
