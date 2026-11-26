import Link from "next/link";
import { CHAPTERS, PAGES } from "@/content/capitulos";
import { AutoRefresh, Copy } from "@/components/Client";
import { fmtDT, fmtInt, fmtMs, fmtPct, fmtPhone } from "@/lib/format";
import { contactRows, pageStats, recentActivity, tags, type Touch } from "@/lib/stats";

type P = { searchParams: Promise<Record<string, string | undefined>> };

function Cell({ t }: { t: Touch }) {
  if (!t) return <span className="text-line-2">—</span>;
  const done = t.scroll >= 90;
  return (
    <div className="leading-tight">
      <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${done ? "bg-good-soft text-good" : "bg-gold-soft text-gold"}`}>
        {done ? "Leu tudo" : t.scroll > 0 ? `Leu ${t.scroll}%` : "Abriu"}
      </span>
      <div className="tabular mt-1 text-[0.72rem] text-muted">
        {fmtDT(t.at)} · {fmtMs(t.ms)}
        {t.visits > 1 ? ` · ${t.visits}×` : ""}
      </div>
    </div>
  );
}

export default async function Painel({ searchParams }: P) {
  const sp = await searchParams;
  const tag = sp.etiqueta || null;
  const status = sp.status || null;
  const search = sp.q?.slice(0, 60) || null;
  const [stats, rows, tagList, feed] = await Promise.all([
    pageStats(tag),
    contactRows({ tag, status, search }),
    tags(),
    recentActivity(),
  ]);
  const base = process.env.APP_URL ?? "";
  const interessados = rows.filter((r) => r.cta_at).length;
  const qs = new URLSearchParams(Object.entries({ etiqueta: tag ?? "", status: status ?? "" }).filter(([, v]) => v)).toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quem clicou</h1>
          <p className="mt-1 text-sm text-muted">Aberturas dos links pessoais e gerais da série Radar Logístico.</p>
        </div>
        <div className="flex items-center gap-3">
          <AutoRefresh />
          <a className="btn btn-secondary" href={`/api/export/resultados${qs ? `?${qs}` : ""}`}>Baixar resultados (CSV)</a>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s) => {
          const c = CHAPTERS[s.page];
          return (
            <section key={s.page} className="rounded-xl border border-line bg-surface p-5">
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-gold">Capítulo {c.n}</div>
              <h2 className="mt-0.5 font-semibold">{c.label}</h2>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="tabular text-3xl font-semibold tracking-tight">{fmtInt(s.opened)}</span>
                <span className="text-sm text-muted">de {fmtInt(s.contacts)} contatos abriram {s.contacts ? `(${fmtPct(s.opened / s.contacts)})` : ""}</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted">Pelo link geral</dt>
                <dd className="tabular text-right font-medium">{fmtInt(s.anon)}</dd>
                <dt className="text-muted">Tempo médio</dt>
                <dd className="tabular text-right font-medium">{fmtMs(s.avgMs)}</dd>
                <dt className="text-muted">Leram até o fim</dt>
                <dd className="tabular text-right font-medium">{fmtInt(s.finished)}</dd>
                <dt className="text-muted">Clicaram em interesse</dt>
                <dd className="tabular text-right font-semibold text-good">{fmtInt(s.cta)}</dd>
              </dl>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
                <code className="min-w-0 truncate text-xs text-ink-2">{base}/{s.page}</code>
                <Copy text={`${base}/${s.page}`} label="Link geral" />
              </div>
            </section>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <section className="min-w-0 rounded-xl border border-line bg-surface">
          <form className="flex flex-wrap items-end gap-3 border-b border-line p-4" method="get">
            <label className="min-w-[12rem] flex-1">
              <span className="label">Buscar</span>
              <input id="q" name="q" defaultValue={search ?? ""} className="field" placeholder="Nome ou telefone" />
            </label>
            <label>
              <span className="label">Situação</span>
              <select id="status" name="status" defaultValue={status ?? ""} className="field">
                <option value="">Todos</option>
                <option value="quentes">Quentes (interesse ou leu os 3)</option>
                <option value="interessados">Clicaram em interesse</option>
                <option value="abriram">Abriram algum capítulo</option>
                <option value="nao-abriram">Ainda não abriram</option>
              </select>
            </label>
            <label>
              <span className="label">Etiqueta</span>
              <select id="etiqueta" name="etiqueta" defaultValue={tag ?? ""} className="field">
                <option value="">Todas</option>
                {tagList.map((t) => (
                  <option key={t.tag} value={t.tag}>{t.tag} ({t.n})</option>
                ))}
              </select>
            </label>
            <button className="btn btn-secondary">Filtrar</button>
          </form>
          <div className="flex items-center justify-between px-4 py-2.5 text-xs text-muted">
            <span>{fmtInt(rows.length)} contatos · {fmtInt(interessados)} com interesse</span>
          </div>
          {rows.length === 0 ? (
            <p className="px-4 pb-8 pt-4 text-center text-sm text-muted">
              Nenhum contato aqui ainda. Importe sua lista em <Link className="underline" href="/painel/contatos">Contatos e links</Link>.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Contato</th>
                    {PAGES.map((p) => (
                      <th key={p}>{CHAPTERS[p].n}. {CHAPTERS[p].label}</th>
                    ))}
                    <th>Interesse</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={r.cta_at ? "bg-good-soft/40" : ""}>
                      <td className="min-w-[11rem]">
                        <div className="font-semibold">{r.name}</div>
                        <div className="tabular text-xs text-muted">
                          {fmtPhone(r.phone)}
                          {r.tag ? ` · ${r.tag}` : ""}
                        </div>
                      </td>
                      <td><Cell t={r.brasil} /></td>
                      <td><Cell t={r.sc} /></td>
                      <td><Cell t={r.garuva} /></td>
                      <td className="whitespace-nowrap">
                        {r.cta_at ? (
                          <span className="rounded-md bg-good px-2 py-0.5 text-xs font-semibold text-white">Sim · {fmtDT(r.cta_at)}</span>
                        ) : (
                          <span className="text-line-2">—</span>
                        )}
                      </td>
                      <td>
                        {r.phone && (
                          <a className="btn btn-secondary btn-sm" href={`https://wa.me/${r.phone}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="rounded-xl border border-line bg-surface">
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">Atividade recente</h2>
          {feed.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">Nenhuma abertura ainda.</p>
          ) : (
            <ul className="divide-y divide-line">
              {feed.map((f, i) => (
                <li key={i} className="px-4 py-2.5 text-sm">
                  <div>
                    <span className="font-medium">{f.name ?? "Visitante sem link pessoal"}</span>
                    <span className="text-ink-2"> {f.cta_at ? "clicou em interesse no" : "abriu o"} cap. {CHAPTERS[f.page].n}</span>
                  </div>
                  <div className="tabular text-xs text-muted">
                    {fmtDT(f.cta_at ?? f.started_at)} · {f.device} · {fmtMs(f.duration_ms)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
