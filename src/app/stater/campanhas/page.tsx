import { asUser, requireUser } from "@/lib/auth";
import { createCampaignAction, setCampaignAgencyAction, toggleCampaignAction } from "@/lib/actions";
import { ActionForm, Submit } from "@/components/forms";
import { Card, Empty, PageHeader } from "@/components/ui";
import { fmtDate, fmtInt } from "@/lib/format";

export default async function Page() {
  const user = await requireUser(["stater_admin"]);
  const d = await asUser(user, async (c) => {
    const camps = await c.query(
      `select c.*, (select count(*) from app.tracking_links t where t.campaign_id=c.id and t.active) links,
              (select count(distinct s.visitor_id) from app.web_sessions s where s.campaign_id=c.id) visitors,
              (select count(*) from app.leads l where l.campaign_id=c.id) leads
       from app.campaigns c order by c.created_at`
    );
    const agencies = await c.query("select id, name, active from app.agencies order by name");
    const ca = await c.query("select campaign_id, agency_id from app.campaign_agencies");
    return { camps: camps.rows, agencies: agencies.rows, ca: new Set(ca.rows.map((x) => `${x.campaign_id}:${x.agency_id}`)) };
  });
  return (
    <>
      <PageHeader title="Campanhas" subtitle="Ative imobiliárias em cada campanha. Ao ativar, os links da imobiliária e de todos os seus corretores são gerados." />
      <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
        <Card title="Nova campanha">
          <ActionForm action={createCampaignAction}>
            <label className="block"><span className="label">Nome</span><input name="name" className="field" required /></label>
            <label className="block"><span className="label">Descrição</span><textarea name="description" className="field" rows={3} /></label>
            <label className="block"><span className="label">Página de destino</span><input name="landing_path" className="field" defaultValue="/radar" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="label">Início</span><input type="date" name="starts_at" className="field" /></label>
              <label><span className="label">Fim</span><input type="date" name="ends_at" className="field" /></label>
            </div>
            <Submit>Criar campanha</Submit>
          </ActionForm>
        </Card>
        <div className="space-y-5">
          {d.camps.map((c) => (
            <Card
              key={c.id}
              title={c.name}
              actions={
                <form action={toggleCampaignAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className={`btn btn-sm ${c.active ? "btn-secondary" : "btn-primary"}`}>{c.active ? "Pausar" : "Ativar"}</button>
                </form>
              }
            >
              <p className="text-sm text-ink-2">{c.description}</p>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                <span>Status: <strong className={c.active ? "text-good" : "text-muted"}>{c.active ? "ativa" : "pausada"}</strong></span>
                <span>Destino: <code>{c.landing_path}</code></span>
                <span>Período: {fmtDate(c.starts_at)} – {fmtDate(c.ends_at)}</span>
                <span className="tabular">{fmtInt(Number(c.links))} links · {fmtInt(Number(c.visitors))} visitantes · {fmtInt(Number(c.leads))} leads</span>
              </div>
              <div className="mt-4">
                <div className="label">Imobiliárias participantes</div>
                {d.agencies.length === 0 ? (
                  <Empty>Cadastre imobiliárias primeiro.</Empty>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {d.agencies.map((a) => {
                      const on = d.ca.has(`${c.id}:${a.id}`);
                      return (
                        <form key={a.id} action={setCampaignAgencyAction}>
                          <input type="hidden" name="campaign_id" value={c.id} />
                          <input type="hidden" name="agency_id" value={a.id} />
                          <input type="hidden" name="on" value={on ? "0" : "1"} />
                          <button
                            className={`rounded-full border px-3 py-1 text-sm ${on ? "border-ink bg-ink text-white" : "border-line-2 bg-white text-ink-2 hover:border-ink-2"}`}
                            title={on ? "Clique para remover" : "Clique para incluir"}
                          >
                            {on ? "✓ " : "+ "}
                            {a.name}
                          </button>
                        </form>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
