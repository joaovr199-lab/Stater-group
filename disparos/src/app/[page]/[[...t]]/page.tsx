import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CHAPTERS, isPage, PAGES } from "@/content/capitulos";
import { ARTICLE, SOURCES, src } from "@/content/radar";
import { GaruvaMap } from "@/components/GaruvaMap";
import { InterestButton } from "@/components/InterestButton";
import { Logo } from "@/components/Logo";
import { Tracker } from "@/components/Tracker";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ page: string; t?: string[] }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { page } = await params;
  if (!isPage(page)) return {};
  const c = CHAPTERS[page];
  return {
    title: { absolute: `${c.title} · Radar Logístico` },
    description: c.dek,
    openGraph: { title: c.title, description: c.dek, type: "article", locale: "pt_BR", siteName: "Radar Logístico · Stater Group" },
    robots: { index: false, follow: false },
  };
}

function Cite({ id }: { id: string }) {
  const n = src(id);
  return (
    <a href={`#fonte-${n}`} className="ml-0.5 align-super text-[0.65em] font-semibold text-gold no-underline hover:underline" aria-label={`Fonte ${n}`}>
      [{n}]
    </a>
  );
}

export default async function Chapter({ params }: P) {
  const { page, t } = await params;
  if (!isPage(page)) notFound();
  const c = CHAPTERS[page];
  const token = t?.[0]?.replace(/[^A-Za-z0-9]/g, "").slice(0, 16).toUpperCase() || null;
  const used = new Set(c.blocks.flatMap((b) => [...b.paragraphs.flatMap((p) => p.cite), ...b.stats.map((s) => s.source)]));
  const sources = SOURCES.map((s, i) => ({ ...s, n: i + 1 })).filter((s) => used.has(s.id));
  const whatsapp = process.env.WHATSAPP_NUMBER?.replace(/\D/g, "") || null;
  const nextHref = c.next ? `/${c.next.id}${token ? `/${token}` : ""}` : null;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Tracker page={c.id} token={token} />
      <header className="bg-black">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Logo height={16} />
          <span className="text-[0.68rem] font-medium uppercase tracking-[0.24em] text-white/60">Radar Logístico</span>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 pb-10 pt-12 sm:pt-16">
        <ol className="mb-8 flex flex-wrap gap-2 text-xs font-medium" aria-label="Capítulos da série">
          {PAGES.map((id) => {
            const ch = CHAPTERS[id];
            const here = id === c.id;
            return (
              <li key={id} className={`rounded-full px-3 py-1 ${here ? "bg-black text-brand" : "border border-line-2 text-muted"}`} aria-current={here ? "step" : undefined}>
                {ch.n}. {ch.label}
              </li>
            );
          })}
        </ol>
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.26em] text-gold">Capítulo {c.n} de 3</div>
        <h1 className="font-display text-[2.3rem] font-medium leading-[1.06] tracking-[-0.015em] [text-wrap:balance] sm:text-[3.4rem]">{c.title}</h1>
        <p className="mt-5 font-serif text-xl leading-relaxed text-ink-2">{c.dek}</p>
        <p className="mt-5 text-sm text-muted">{ARTICLE.byline} · {ARTICLE.date}</p>
      </section>

      <article className="article mx-auto max-w-3xl px-5">
        {c.blocks.map((b) => (
          <section key={b.title} className="border-t border-line-2 py-10">
            <h2 className="mb-5 font-display text-[1.8rem] font-medium leading-tight [text-wrap:balance] sm:text-[2.1rem]">{b.title}</h2>
            {b.paragraphs.map((p, i) => (
              <p key={i}>
                {p.text}
                {p.cite.map((id) => (
                  <Cite key={id} id={id} />
                ))}
              </p>
            ))}
            {c.id === "garuva" && <GaruvaMap refs={[src("gazeta-garuva"), src("br376"), src("nsc-garuva-infra")].join(", ")} />}
            <div className={`mt-8 grid gap-px overflow-hidden rounded-2xl bg-line ${b.stats.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              {b.stats.map((s) => (
                <div key={s.label} className="bg-white p-5">
                  <div className="font-display text-[1.9rem] leading-none tracking-tight">{s.value}</div>
                  <div className="mt-2.5 text-sm leading-snug text-ink-2">
                    {s.label}
                    <Cite id={s.source} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {c.prolog && (
          <section className="border-t border-line-2 py-10">
            <h2 className="mb-5 font-display text-[1.8rem] font-medium leading-tight sm:text-[2.1rem]">{ARTICLE.prolog.title}</h2>
            <p>{ARTICLE.prolog.lead}</p>
            <dl className="my-7 overflow-hidden rounded-2xl bg-black">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <span className="font-display text-2xl tracking-[0.12em] text-brand">PROLOG</span>
                <span className="text-[0.68rem] uppercase tracking-[0.24em] text-white/50">Stater Group</span>
              </div>
              {ARTICLE.prolog.facts.map((f) => (
                <div key={f.k} className="grid grid-cols-[8rem_1fr] gap-4 border-b border-white/10 px-6 py-3.5 last:border-0 sm:grid-cols-[10rem_1fr]">
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/50">{f.k}</dt>
                  <dd className={f.k === "Área" ? "font-display text-2xl text-brand" : "text-white"}>{f.v}</dd>
                </div>
              ))}
            </dl>
            {ARTICLE.prolog.paragraphs.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </section>
        )}
      </article>

      <section className="mx-auto max-w-3xl px-5 pb-16">
        <div className="rounded-3xl bg-[#ece7dd] p-6 sm:p-9">
          {c.next ? (
            <>
              <p className="font-display text-[1.45rem] leading-snug">{c.next.teaser}</p>
              <p className="mt-3 text-sm text-ink-2">O próximo capítulo chega pelo WhatsApp. Se quiser adiantar a conversa, avise:</p>
            </>
          ) : (
            <>
              <h2 className="font-display text-[1.8rem] leading-tight">{ARTICLE.convite.title}</h2>
              <p className="mt-3 text-[1.02rem] leading-relaxed text-ink-2">{ARTICLE.convite.text}</p>
            </>
          )}
          <div className="mt-6">
            <InterestButton label={c.prolog ? ARTICLE.convite.cta : "Tenho interesse no investimento"} whatsapp={whatsapp} chapter={c.label} />
          </div>
          {nextHref && (
            <Link href={nextHref} className="mt-5 inline-block text-sm font-medium text-ink underline underline-offset-4">
              Ler o capítulo {c.n + 1} agora
            </Link>
          )}
        </div>
        <p className="mt-6 text-xs leading-relaxed text-muted">{ARTICLE.disclaimer}</p>
      </section>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto max-w-3xl px-5 py-10">
          <h2 className="font-display text-lg">Fontes deste capítulo</h2>
          <ol className="mt-4 space-y-2.5 text-sm">
            {sources.map((s) => (
              <li key={s.id} id={`fonte-${s.n}`} className="grid grid-cols-[2rem_1fr] gap-2">
                <span className="tabular font-semibold text-gold">[{s.n}]</span>
                <span className="min-w-0 text-ink-2">
                  <strong className="text-ink">{s.publisher}.</strong> {s.title}. Publicado em {s.published}.{" "}
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">{s.url}</a>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="bg-black">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 px-5 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <Logo height={14} />
            <span>
              Registramos a abertura deste link para que nossa equipe acompanhe seu interesse. <Link href="/privacidade" className="underline">Privacidade</Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
