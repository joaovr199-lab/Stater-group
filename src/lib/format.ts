const tz = "America/Sao_Paulo";
export const fmtInt = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
export const fmtPct = (n: number) => new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(n);
export const fmtDate = (d: Date | string | null) =>
  d ? new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(d)) : "—";
export const fmtDateTime = (d: Date | string | null) =>
  d
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(d))
    : "—";
export function fmtHours(h: number | null | undefined) {
  if (h == null || !isFinite(h)) return "—";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} d`;
}
export function fmtPhone(p: string | null) {
  if (!p) return "—";
  const d = p.replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return p;
}
export const fmtDuration = (ms: number | null) => (ms ? (ms < 60000 ? `${Math.round(ms / 1000)} s` : `${Math.round(ms / 60000)} min`) : "");
