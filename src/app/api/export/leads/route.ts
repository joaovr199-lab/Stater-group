import { asUser, currentUser } from "@/lib/auth";
import { CLASS_LABEL, stageLabel } from "@/lib/constants";
import { parseFilters } from "@/lib/filters";
import { leadsList } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Exporta os leads do escopo do usuário (RLS) em CSV. Registrado em auditoria. */
export async function GET(req: Request) {
  const u = await currentUser();
  if (!u) return new Response("unauthorized", { status: 401 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const f = parseFilters(sp);
  const rows = await asUser(u, async (c) => {
    const r = await leadsList(c, f, { limit: 1000 });
    await c.query("select app.audit('lead.export','lead',null,$1)", [{ count: r.length, filters: sp }]);
    return r;
  });
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Nome", "WhatsApp", "E-mail", "Interesse", "Imobiliária", "Corretor", "Campanha", "Entrada", "Score", "Classificação", "Etapa", "Último evento"];
  const lines = rows.map((l) =>
    [l.name, l.phone, l.email, l.interest, l.agency_name, l.broker_name, l.campaign_name, new Date(l.created_at).toISOString(), l.score, CLASS_LABEL[l.classification], stageLabel(l.stage), l.last_event]
      .map(esc)
      .join(";")
  );
  return new Response("﻿" + [head.map(esc).join(";"), ...lines].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="leads-prolog-${Date.now()}.csv"` },
  });
}
