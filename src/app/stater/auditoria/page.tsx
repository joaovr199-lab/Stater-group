import { asUser, requireUser } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { Card, PageHeader } from "@/components/ui";

export default async function Page() {
  const user = await requireUser(["stater_admin"]);
  const rows = await asUser(user, async (c) =>
    (await c.query(`select a.*, app.user_name(a.user_id) as user_name from app.audit_log a order by a.created_at desc limit 300`)).rows
  );
  return (
    <>
      <PageHeader title="Histórico de auditoria" subtitle="Acessos, alterações, exportações e operações de privacidade. A aplicação não altera nem apaga estes registros." />
      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>Detalhes</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="tabular whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
                  <td className="whitespace-nowrap">{r.user_name ?? "Sistema"}</td>
                  <td className="font-mono text-xs">{r.action}</td>
                  <td className="whitespace-nowrap text-xs text-ink-2">{r.entity}{r.entity_id ? ` · ${String(r.entity_id).slice(0, 8)}` : ""}</td>
                  <td className="max-w-md truncate font-mono text-xs text-muted">{Object.keys(r.data ?? {}).length ? JSON.stringify(r.data) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
