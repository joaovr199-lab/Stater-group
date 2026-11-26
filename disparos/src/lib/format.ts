const tz = "America/Sao_Paulo";
export const fmtInt = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
export const fmtPct = (n: number) => new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 }).format(n);
export const fmtDT = (d: string | Date | null) =>
  d ? new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(d)) : "—";
export const fmtMs = (ms: number) => (ms < 1000 ? "—" : ms < 60000 ? `${Math.round(ms / 1000)} s` : `${Math.floor(ms / 60000)} min ${Math.round((ms % 60000) / 1000)} s`);
export function fmtPhone(p: string | null) {
  if (!p) return "—";
  const d = p.replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return p;
}
