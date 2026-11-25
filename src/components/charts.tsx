import { fmtInt, fmtPct } from "@/lib/format";

/** Funil horizontal (uma série, um matiz). Valor e % do topo como rótulos diretos. */
export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const top = Math.max(1, steps[0]?.value ?? 1);
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="space-y-2" role="table" aria-label="Funil de avanço">
      {steps.map((s) => (
        <div key={s.label} role="row" className="group grid grid-cols-[8.5rem_1fr_4.5rem] items-center gap-3 text-sm sm:grid-cols-[11rem_1fr_6rem]" title={`${s.label}: ${fmtInt(s.value)} (${fmtPct(s.value / top)} do topo)`}>
          <span role="cell" className="truncate text-ink-2">{s.label}</span>
          <span role="cell" className="h-5 rounded-[4px] bg-[#eef0f3]">
            <span className="block h-full rounded-[4px] bg-navy transition-opacity group-hover:opacity-85" style={{ width: `${(s.value / max) * 100}%`, minWidth: s.value ? 3 : 0 }} />
          </span>
          <span role="cell" className="tabular text-right">
            <span className="font-semibold text-ink">{fmtInt(s.value)}</span>
            <span className="ml-1.5 text-xs text-muted">{fmtPct(s.value / top)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Barras diárias (uma série). Tooltip nativo por barra; eixo recessivo. */
export function DailyBars({ data, label }: { data: { day: string; value: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <figure>
      <figcaption className="mb-3 flex items-baseline justify-between text-sm">
        <span className="font-medium text-ink-2">{label}</span>
        <span className="tabular text-xs text-muted">total {fmtInt(total)}</span>
      </figcaption>
      <div className="flex h-28 items-end gap-[2px] border-b border-line">
        {data.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end" title={`${d.day}: ${fmtInt(d.value)}`}>
            <div className="w-full rounded-t-[4px] bg-navy/85 group-hover:bg-ink" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 2 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[0.68rem] text-muted tabular">
        <span>{data[0]?.day}</span>
        <span>máx. {fmtInt(max)}/dia</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
    </figure>
  );
}
