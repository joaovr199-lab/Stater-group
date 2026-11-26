import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { q } from "@/lib/db";
import { ipOf, rateLimit } from "@/lib/rate";
import { newToken } from "@/lib/token";

export const dynamic = "force-dynamic";

const anon = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length >= 10 && v.length <= 13, "Informe um WhatsApp válido com DDD."),
  consent: z.literal(true, { message: "É necessário autorizar o contato." }),
});

/** "Tenho interesse": registra o clique; visitante sem link pessoal informa nome e WhatsApp. */
export async function POST(req: NextRequest) {
  if (!rateLimit(`cta:${ipOf(req.headers)}`, 10, 10 * 60_000)) return NextResponse.json({ error: "Muitas tentativas." }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const id = String(b.id ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Recarregue a página." }, { status: 400 });
  const v = (await q<{ contact_id: number | null; visitor: string }>("select contact_id, visitor from visits where id=$1", [id]))[0];
  if (!v) return NextResponse.json({ error: "Recarregue a página." }, { status: 400 });
  let contactId = v.contact_id;
  if (!contactId) {
    const p = anon.safeParse(b);
    if (!p.success) return NextResponse.json({ error: p.error.issues[0].message, needsForm: true }, { status: 422 });
    const phone = p.data.phone.length <= 11 ? `55${p.data.phone}` : p.data.phone;
    const row = (
      await q<{ id: number }>(
        `insert into contacts(token, name, phone, tag, source) values ($1,$2,$3,'orgânico','organico')
         on conflict (phone) where phone is not null do update set name = contacts.name returning id`,
        [newToken(), p.data.name, phone]
      )
    )[0];
    contactId = row.id;
    await q("update visits set contact_id=$1 where visitor=$2 and contact_id is null", [contactId, v.visitor]);
  }
  await q("update visits set cta_at = coalesce(cta_at, now()), last_at = now() where id=$1", [id]);
  return NextResponse.json({ ok: true });
}
