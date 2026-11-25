import Link from "next/link";
import { asUser, requireUser } from "@/lib/auth";
import { createAgencyAction, updateAgencyAction } from "@/lib/actions";
import { ActionForm, Submit } from "@/components/forms";
import { Card, Empty, PageHeader } from "@/components/ui";
import { fmtDate, fmtInt } from "@/lib/format";

export default async function Page() {
  const user = await requireUser(["stater_admin"]);
  const d = await asUser(user, async (c) => {
    const agencies = await c.query(
      `select a.*,
        (select string_agg(u.name || ' <' || u.email || '>', ', ') from app.users u where u.agency_id=a.id and u.role='agency_manager') managers,
        (select count(*) from app.users u where u.agency_id=a.id and u.role='broker' and u.active) brokers,
        (select count(*) from app.tracking_links t where t.agency_id=a.id and t.active) links,
        (select count(distinct s.visitor_id) from app.web_sessions s where s.agency_id=a.id) visitors,
        (select count(*) from app.leads l where l.agency_id=a.id) leads
       from app.agencies a order by a.name`
    );
    const camps = await c.query("select id, name from app.campaigns where active order by created_at");
    return { agencies: agencies.rows, camps: camps.rows };
  });
  return (
    <>
      <PageHeader title="Imobiliárias parceiras" subtitle="Cada imobiliária tem um ambiente isolado: gestores e corretores veem apenas a própria operação." />
      <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
        <Card title="Cadastrar imobiliária e gestor">
          <ActionForm action={createAgencyAction}>
            <label className="block"><span className="label">Nome da imobiliária</span><input name="name" className="field" required /></label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="label">CNPJ</span><input name="cnpj" className="field" /></label>
              <label><span className="label">Cidade</span><input name="city" className="field" /></label>
            </div>
            <div className="border-t border-line pt-3 text-xs font-semibold uppercase tracking-wide text-muted">Gestor responsável</div>
            <label className="block"><span className="label">Nome</span><input name="manager_name" className="field" required /></label>
            <label className="block"><span className="label">E-mail (login)</span><input name="manager_email" type="email" className="field" required /></label>
            <label className="block"><span className="label">WhatsApp</span><input name="manager_phone" className="field" inputMode="tel" /></label>
            {d.camps.length > 0 && (
              <fieldset>
                <legend className="label">Participar das campanhas</legend>
                {d.camps.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="campaigns" value={c.id} defaultChecked /> {c.name}
                  </label>
                ))}
              </fieldset>
            )}
            <Submit>Cadastrar</Submit>
          </ActionForm>
        </Card>
        <div className="space-y-4">
          {d.agencies.length === 0 && <Empty>Nenhuma imobiliária cadastrada.</Empty>}
          {d.agencies.map((a) => (
            <Card key={a.id} title={a.name} actions={<Link href={`/stater?imobiliaria=${a.id}`} className="text-xs font-medium text-navy hover:underline">Ver painel →</Link>}>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className={a.active ? "text-good" : "text-bad"}>{a.active ? "Ativa" : "Inativa"}</span>
                <span className="tabular text-ink-2">
                  {fmtInt(Number(a.brokers))} corretores · {fmtInt(Number(a.links))} links · {fmtInt(Number(a.visitors))} visitantes · {fmtInt(Number(a.leads))} leads
                </span>
                <span className="text-muted">desde {fmtDate(a.created_at)}</span>
              </div>
              <div className="mt-1 text-xs text-muted">Gestores: {a.managers ?? "—"}</div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-ink-2">Editar dados</summary>
                <ActionForm action={updateAgencyAction} className="mt-3 grid gap-3 sm:grid-cols-4 sm:items-end" resetOnSuccess={false}>
                  <input type="hidden" name="id" value={a.id} />
                  <label><span className="label">Nome</span><input name="name" defaultValue={a.name} className="field" /></label>
                  <label><span className="label">CNPJ</span><input name="cnpj" defaultValue={a.cnpj ?? ""} className="field" /></label>
                  <label><span className="label">Cidade</span><input name="city" defaultValue={a.city ?? ""} className="field" /></label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={a.active} /> Ativa</label>
                  <Submit className="btn btn-secondary btn-sm">Salvar</Submit>
                </ActionForm>
              </details>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
