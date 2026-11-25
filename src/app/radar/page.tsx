import type { Metadata } from "next";
import Link from "next/link";
import { ARTICLE, SOURCES, src, type Stat } from "@/content/radar";
import { publicTx } from "@/lib/db";
import { getPublicSettings } from "@/lib/queries";
import { Logo } from "@/components/Logo";
import { Analytics } from "@/components/radar/Analytics";
import { GaruvaMap } from "@/components/radar/GaruvaMap";
import { InviteForm } from "@/components/radar/InviteForm";
import { RadarTracker } from "@/components/radar/RadarTracker";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Radar Logístico · O próximo movimento do mercado imobiliário pode estar na logística" },
  description: ARTICLE.subtitle,
  robots: { index: true, follow: true },
  openGraph: { title: ARTICLE.title, description: ARTICLE.subtitle, type: "article", locale: "pt_BR" },
};

type P = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function Cite({ id }: { id: string }) {
  const n = src(id);
  return (
    <a href={`#fonte-${n}`} className="ml-0.5 align-super text-[0.65em] font-semibold text-accent no-underline hover:underline" aria-label={`Fonte ${n}`}>
      [{n}]
    </a>
  );
}

function Stats({ items, dark = false }: { items: Stat[]; dark?: boolean }) {
  return (
    <div className={`my-10 grid gap-px overflow-hidden rounded-2xl ${items.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"} ${dark ? "bg-white/10" : "bg-line"}`}>
      {items.map((s) => (
        <div key={s.label} className={`p-6 ${dark ? "bg-black" : "bg-white"}`}>
          <div className={`font-display text-[2.1rem] leading-none tracking-tight ${dark ? "text-brand" : "text-ink"}`}>{s.value}</div>
          <p className={`mt-3 text-sm leading-snug ${dark ? "text-white/70" : "text-ink-2"}`}>
            {s.label}
            <Cite id={s.source} />
          </p>
        </div>
      ))}
    </div>
  );
}

function Section({ id, n, title, track, dark = false, children }: { id: string; n: string; title: string; track?: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} data-track={track} className="reveal scroll-mt-16 py-12 sm:py-16">
      <div className="mb-6 flex items-center gap-4">
        <span className="font-display text-sm tracking-[0.2em] text-accent">{n}</span>
        <span className={`h-px flex-1 ${dark ? "bg-white/15" : "bg-line-2"}`} />
      </div>
      <h2 className={`mb-6 text-[2rem] font-medium leading-[1.12] tracking-tight sm:text-[2.6rem] ${dark ? "text-white" : "text-ink"}`}>{title}</h2>
      {children}
    </section>
  );
}

const Para = ({ children, first = false }: { children: React.ReactNode; first?: boolean }) => <p className={first ? "dropcap" : ""}>{children}</p>;

export default async function RadarPage({ searchParams }: P) {
  const sp = await searchParams;
  const rawRef = typeof sp.ref === "string" ? sp.ref.replace(/[^A-Za-z0-9]/g, "").slice(0, 24) : "";
  const { link, settings } = await publicTx(async (c) => {
    const link = rawRef ? (await c.query("select * from app.link_public($1)", [rawRef])).rows[0] ?? null : null;
    return { link, settings: await getPublicSettings(c) };
  });
  const a = ARTICLE;
  const whatsapp = settings.contact?.whatsapp_number || null;
  const garuvaRefs = [src("gazeta-garuva"), src("br376"), src("nsc-garuva-infra")].join(", ");

  return (
    <div className="bg-paper text-ink">
      <RadarTracker refCode={link ? link.code : null} />
      <Analytics />

      <header className="bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo height={18} />
          <span className="hidden text-[0.7rem] font-medium uppercase tracking-[0.28em] text-white/60 sm:inline">{a.kicker}</span>
        </div>
      </header>

      {link && (
        <div className="border-b border-line bg-white">
          <p className="mx-auto max-w-6xl px-5 py-2.5 text-center text-xs text-ink-2">
            Convite enviado por <strong className="font-semibold text-ink">{link.broker_name ?? link.agency_name}</strong>
            {link.broker_name ? `, ${link.agency_name}` : ""} · parceira Stater Group
          </p>
        </div>
      )}

      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-16 sm:pb-24 sm:pt-24">
          <div className="max-w-4xl">
            <div className="mb-6 text-xs font-semibold uppercase tracking-[0.28em] text-accent">Economia · Mercado imobiliário logístico</div>
            <h1 className="font-display text-[2.6rem] font-medium leading-[1.04] tracking-[-0.02em] sm:text-[4.4rem]">{a.title}</h1>
            <p className="mt-7 max-w-2xl font-serif text-xl leading-relaxed text-ink-2 sm:text-[1.4rem]">{a.subtitle}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="font-semibold text-ink">{a.byline}</span>
              <span>{a.date}</span>
              <span>{a.readingTime}</span>
            </div>
          </div>
        </div>
        <svg className="pointer-events-none absolute -right-40 top-10 hidden opacity-60 lg:block" width="560" height="560" viewBox="0 0 100 100" aria-hidden>
          {Array.from({ length: 7 }).map((_, i) => (
            <circle key={i} cx="50" cy="50" r={8 + i * 6.5} fill="none" stroke="#b9a27a" strokeOpacity={0.35 - i * 0.04} strokeWidth="0.25" />
          ))}
          <circle cx="50" cy="50" r="1.4" fill="#b9a27a" />
        </svg>
      </section>

      <nav aria-label="Capítulos" className="sticky top-0 z-40 border-y border-line bg-paper/95 backdrop-blur">
        <ol className="mx-auto flex max-w-6xl gap-5 overflow-x-auto px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted">
          {[
            ["brasil", "Brasil"],
            ["infraestrutura", "Infraestrutura"],
            ["santa-catarina", "Santa Catarina"],
            ["portos", "Portos"],
            ["garuva", "Garuva"],
            ["prolog", "PROLOG"],
            ["convite", "Convite"],
          ].map(([id, label], i) => (
            <li key={id} className="shrink-0">
              <a href={`#${id}`} className="hover:text-ink">
                <span className="text-accent">{String(i + 1).padStart(2, "0")}</span> {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="article mx-auto max-w-3xl px-5">
        <Section id="brasil" n="01" title={a.brasil.title} track="brasil_view">
          {a.brasil.paragraphs.map((t, i) => (
            <Para key={i} first={i === 0}>{t}<Cite id="jll-4t25" /></Para>
          ))}
          <Stats items={a.brasil.stats} />
        </Section>

        <Section id="infraestrutura" n="02" title={a.infra.title}>
          {a.infra.paragraphs.map((t, i) => (
            <Para key={i}>{t}<Cite id="jll-1t26" /></Para>
          ))}
          <Stats items={a.infra.stats} />
        </Section>

        <Section id="santa-catarina" n="03" title={a.sc.title} track="santa_catarina_view">
          {a.sc.paragraphs.map((t, i) => (
            <Para key={i}>{t}{i === 0 && <Cite id="jll-1t26" />}</Para>
          ))}
          <Stats items={a.sc.stats} />
        </Section>
      </article>

      <div className="bg-black text-white">
        <div className="article mx-auto max-w-3xl px-5 [&_p]:text-white/80">
          <Section id="portos" n="04" title={a.portos.title} dark>
            <p>{a.portos.paragraphs[0]}<Cite id="spaf-2024" /></p>
            <p>{a.portos.paragraphs[1]}<Cite id="fiesc-antaq" /><Cite id="itapoa-1s24" /></p>
            <p>{a.portos.paragraphs[2]}</p>
            <Stats items={a.portos.stats} dark />
          </Section>
        </div>
      </div>

      <article className="article mx-auto max-w-3xl px-5">
        <Section id="garuva" n="05" title={a.garuva.title} track="garuva_view">
          <p>{a.garuva.paragraphs[0]}<Cite id="gazeta-garuva" /><Cite id="br376" /></p>
          <p>{a.garuva.paragraphs[1]}<Cite id="nsc-garuva-infra" /></p>
          <GaruvaMap refs={garuvaRefs} />
          <p>{a.garuva.paragraphs[2]}<Cite id="ibge-garuva" /></p>
          <Stats items={a.garuva.stats} />
        </Section>

        <Section id="prolog" n="06" title={a.prolog.title} track="prolog_view">
          <p className="!text-[1.35rem] !leading-relaxed">{a.prolog.lead}</p>
          <dl className="my-8 overflow-hidden rounded-2xl border border-black bg-black">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <span className="font-display text-2xl tracking-[0.12em] text-brand">PROLOG</span>
              <span className="text-[0.68rem] uppercase tracking-[0.25em] text-white/50">Stater Group</span>
            </div>
            {a.prolog.facts.map((f) => (
              <div key={f.k} className="grid grid-cols-[8.5rem_1fr] gap-4 border-b border-white/10 px-6 py-3.5 last:border-0 sm:grid-cols-[11rem_1fr]">
                <dt className="text-xs uppercase tracking-[0.14em] text-white/50">{f.k}</dt>
                <dd className={f.k === "Área" ? "font-display text-2xl text-brand" : "text-white"}>{f.v}</dd>
              </div>
            ))}
          </dl>
          {a.prolog.paragraphs.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </Section>

        <section id="convite" className="reveal scroll-mt-16 pb-20 pt-6">
          <div className="rounded-3xl border border-line-2 bg-[#efebe3] p-6 sm:p-10">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-accent">07 · Convite</div>
            <h2 className="text-[2rem] font-medium leading-tight tracking-tight sm:text-[2.4rem]">{a.convite.title}</h2>
            <p className="!mb-8 !text-[1.1rem]">{a.convite.text}</p>
            <InviteForm cta={a.convite.cta} whatsapp={whatsapp} />
          </div>
          <p className="mt-6 text-xs leading-relaxed text-muted">{a.disclaimer}</p>
        </section>
      </article>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto max-w-3xl px-5 py-12">
          <h2 className="font-display text-xl">Fontes</h2>
          <p className="mt-1 text-xs text-muted">Dados citados nas datas de publicação de cada fonte. Os números não foram ajustados nem projetados pela Stater Group.</p>
          <ol className="mt-5 space-y-3 text-sm">
            {SOURCES.map((s, i) => (
              <li key={s.id} id={`fonte-${i + 1}`} className="grid grid-cols-[2rem_1fr] gap-2 scroll-mt-20">
                <span className="tabular font-semibold text-accent">[{i + 1}]</span>
                <span className="text-ink-2">
                  <strong className="font-semibold text-ink">{s.publisher}.</strong> {s.title}. Publicado em {s.published}. Consultado em {s.checkedAt}.{" "}
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="break-all text-navy underline underline-offset-2">{s.url}</a>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="bg-black">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-8 sm:flex-row sm:items-center">
            <Logo height={16} />
            <div className="flex gap-5 text-xs text-white/60">
              <Link href="/privacidade" className="hover:text-white">Aviso de Privacidade</Link>
              <span>© {new Date().getFullYear()} Stater Group</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
