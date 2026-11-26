import { PAGES } from "@/content/capitulos";
import { isAdmin } from "@/lib/auth";
import { fill } from "@/lib/messages";
import { contactRows } from "@/lib/stats";

export const dynamic = "force-dynamic";
const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("unauthorized", { status: 401 });
  const tag = new URL(req.url).searchParams.get("etiqueta") || null;
  const rows = await contactRows({ tag, status: null, search: null, limit: 20000 });
  const base = process.env.APP_URL ?? new URL(req.url).origin;
  const head = ["nome", "telefone", "etiqueta", ...PAGES.map((p, i) => `link_cap${i + 1}_${p}`), ...PAGES.map((p, i) => `mensagem_cap${i + 1}`)];
  const lines = rows.map((r) => {
    const links = PAGES.map((p) => `${base}/${p}/${r.token}`);
    return [r.name, r.phone, r.tag, ...links, ...PAGES.map((p, i) => fill(p, r.name, links[i]))].map(esc).join(";");
  });
  return new Response("﻿" + [head.map(esc).join(";"), ...lines].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="radar-disparo.csv"` },
  });
}
