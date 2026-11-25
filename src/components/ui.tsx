import Link from "next/link";
import { CLASS_LABEL, stageLabel } from "@/lib/constants";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[1.6rem] font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = "", actions, pad = true }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode; pad?: boolean }) {
  return (
    <section className={`rounded-xl border border-line bg-surface ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {actions}
        </header>
      )}
      <div className={pad ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warn" | "bad" | "good" }) {
  const toneCls = tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : tone === "good" ? "text-good" : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3.5">
      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.07em] text-muted">{label}</div>
      <div className={`tabular mt-1.5 text-[1.65rem] font-semibold leading-none tracking-tight ${toneCls}`}>{value}</div>
      {hint && <div className="mt-1.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

const classTone: Record<string, string> = {
  alta_intencao: "bg-accent-soft text-accent ring-accent/25",
  interessado: "bg-navy-soft text-navy ring-navy/15",
  exploratorio: "bg-[#f1f2f4] text-ink-2 ring-line-2",
};

export function ScoreBadge({ score, cls }: { score: number; cls: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${classTone[cls] ?? classTone.exploratorio}`}>
      <span className="tabular">{score}</span>
      <span className="font-medium">{CLASS_LABEL[cls] ?? cls}</span>
    </span>
  );
}

const stageTone: Record<string, string> = {
  novo: "bg-warn-soft text-warn",
  convertido: "bg-good-soft text-good",
  perdido: "bg-[#f1f2f4] text-muted",
  reuniao_agendada: "bg-navy-soft text-navy",
  reuniao_realizada: "bg-navy-soft text-navy",
  em_negociacao: "bg-accent-soft text-accent",
};

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${stageTone[stage] ?? "bg-[#eef0f3] text-ink-2"}`}>
      {stageLabel(stage)}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line-2 px-4 py-8 text-center text-sm text-muted">{children}</div>;
}

export function Tabs({ items, active }: { items: { href: string; label: string; count?: number }[]; active: string }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
            active === t.label ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {t.label}
          {t.count != null && <span className="tabular ml-1.5 rounded-full bg-[#eef0f3] px-1.5 py-0.5 text-[0.7rem] text-ink-2">{t.count}</span>}
        </Link>
      ))}
    </div>
  );
}
