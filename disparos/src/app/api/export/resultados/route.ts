import { PAGES } from "@/content/capitulos";
import { isAdmin } from "@/lib/auth";
import { contactRows, type Touch } from "@/lib/stats";

export const dynamic = "force-dynamic";
const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const iso = (d: string | null | undefined) => (d ? new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");

export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("unauthorized", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const rows = await contactRows({ tag: sp.get("etiqueta") || null, status: sp.get("status") || null, search: null, limit: 20000 });
  const head = ["nome", "telefone", "etiqueta", ...PAGES.flatMap((p, i) => [`cap${i + 1}_abriu_em`, `cap${i + 1}_segundos`, `cap${i + 1}_lido_%`]), "interesse_em"];
  const lines = rows.map((r) => {
    const cols = PAGES.flatMap((p) => {
      const t = r[p] as Touch;
      return t ? [iso(t.at), Math.round(t.ms / 1000), t.scroll] : ["", "", ""];
    });
    return [r.name, r.phone, r.tag, ...cols, iso(r.cta_at)].map(esc).join(";");
  });
  return new Response("﻿" + [head.map(esc).join(";"), ...lines].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="radar-resultados.csv"` },
  });
}
