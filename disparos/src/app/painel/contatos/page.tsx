import { CHAPTERS, PAGES } from "@/content/capitulos";
import { deleteContactAction, importAction } from "@/lib/actions";
import { ActionForm, Copy, Submit } from "@/components/Client";
import { fmtInt, fmtPhone } from "@/lib/format";
import { MESSAGES } from "@/lib/messages";
import { contactRows, tags } from "@/lib/stats";

type P = { searchParams: Promise<Record<string, string | undefined>> };

export default async function Contatos({ searchParams }: P) {
  const sp = await searchParams;
  const tag = sp.etiqueta || null;
  const [rows, tagList] = await Promise.all([contactRows({ tag, status: null, search: sp.q?.slice(0, 60) || null }), tags()]);
  const base = process.env.APP_URL ?? "";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contatos e links</h1>
        <p className="mt-1 text-sm text-muted">Cada contato recebe um link pessoal por capítulo. Assim o painel mostra exatamente quem abriu.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[24rem_1fr]">
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Importar contatos</h2>
          <p className="mt-1 text-sm text-muted">
            Cole da planilha, uma pessoa por linha: <code className="text-ink">nome; telefone; etiqueta</code>. A etiqueta é opcional (ex.: corretor, imobiliária ou lista).
          </p>
          <ActionForm action={importAction} className="mt-4 space-y-3">
            <textarea id="lines" name="lines" rows={8} className="field font-mono text-xs" placeholder={"Maria Souza; 47 99999-0000; Carteira João\nCarlos Lima; (41) 98888-1111"} required />
            <label className="block">
              <span className="label">Etiqueta para linhas sem etiqueta (opcional)</span>
              <input id="tag" name="tag" className="field" placeholder="ex.: Lista novembro" />
            </label>
            <Submit>Importar</Submit>
          </ActionForm>
        </section>

        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Disparo</h2>
          <p className="mt-1 text-sm text-muted">
            Baixe a planilha com nome, telefone, os 3 links pessoais e a mensagem pronta de cada capítulo. Use no seu WhatsApp Business ou na ferramenta de disparo.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="btn btn-primary" href={`/api/export/disparo${tag ? `?etiqueta=${encodeURIComponent(tag)}` : ""}`}>Baixar planilha de disparo (CSV)</a>
          </div>
          <div className="mt-5 space-y-3">
            {PAGES.map((p) => (
              <div key={p} className="rounded-lg bg-canvas p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gold">Capítulo {CHAPTERS[p].n} · {CHAPTERS[p].label}</span>
                  <Copy text={`${base}/${p}`} label="Copiar link geral" />
                </div>
                <p className="mt-1.5 text-sm text-ink-2">{MESSAGES[p]}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">O link geral (sem código) serve para grupos, status e redes sociais: conta aberturas, mas não identifica a pessoa.</p>
        </section>
      </div>

      <section className="rounded-xl border border-line bg-surface">
        <form method="get" className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          <label className="min-w-[12rem] flex-1">
            <span className="label">Buscar</span>
            <input id="cq" name="q" defaultValue={sp.q ?? ""} className="field" placeholder="Nome ou telefone" />
          </label>
          <label>
            <span className="label">Etiqueta</span>
            <select id="cetiqueta" name="etiqueta" defaultValue={tag ?? ""} className="field">
              <option value="">Todas</option>
              {tagList.map((t) => (
                <option key={t.tag} value={t.tag}>{t.tag} ({t.n})</option>
              ))}
            </select>
          </label>
          <button className="btn btn-secondary">Filtrar</button>
          <span className="ml-auto text-xs text-muted">{fmtInt(rows.length)} contatos</span>
        </form>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Contato</th>
                <th>Etiqueta</th>
                <th>Links pessoais</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="font-semibold">{r.name}</div>
                    <div className="tabular text-xs text-muted">{fmtPhone(r.phone)}{r.source === "organico" ? " · veio pelo link geral" : ""}</div>
                  </td>
                  <td className="text-ink-2">{r.tag ?? "—"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      {PAGES.map((p) => (
                        <Copy key={p} text={`${base}/${p}/${r.token}`} label={`Cap. ${CHAPTERS[p].n}`} />
                      ))}
                      <code className="self-center pl-1 text-xs text-muted">/{r.token}</code>
                    </div>
                  </td>
                  <td className="text-right">
                    <form action={deleteContactAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="text-xs text-muted hover:text-bad">Excluir</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
