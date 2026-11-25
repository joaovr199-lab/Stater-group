import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { publicTx } from "@/lib/db";
import { INTERESTS } from "@/lib/constants";
import { notifyNewLead } from "@/lib/notify";
import { CONSENT_CONTACT, CONSENT_PRIVACY, NOTICE_VERSION, textHash } from "@/lib/privacy";
import { rateLimit, sha256 } from "@/lib/security";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length >= 10 && v.length <= 13, "Informe um WhatsApp válido com DDD."),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email("E-mail inválido.").max(160)]).optional(),
  interest: z.string().refine((v) => INTERESTS.includes(v), "Selecione o interesse principal."),
  consent_privacy: z.literal(true, { message: "É necessário declarar ciência do Aviso de Privacidade." }),
  consent_contact: z.literal(true, { message: "É necessário autorizar o contato para receber o atendimento." }),
  website: z.string().max(0).optional(), // honeypot anti-robô
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`lead:${ip}`, 8, 10 * 60_000)) return NextResponse.json({ error: "Muitas tentativas. Tente novamente em alguns minutos." }, { status: 429 });
  const sid = req.cookies.get("pi_sid")?.value;
  if (!sid || !/^[0-9a-f-]{36}$/i.test(sid)) return NextResponse.json({ error: "Sessão expirada. Recarregue a página." }, { status: 400 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  const d = parsed.data;
  const phone = d.phone.length <= 11 ? `55${d.phone}` : d.phone;
  try {
    const r = await publicTx((c) =>
      c.query("select app.submit_lead($1,$2,$3,$4,$5,$6,$7,$8,$9) as id", [
        sid,
        d.name,
        phone,
        d.email ?? "",
        d.interest,
        NOTICE_VERSION,
        textHash(CONSENT_PRIVACY),
        textHash(CONSENT_CONTACT),
        sha256(`${process.env.IP_HASH_SALT ?? "prolog"}:${ip}`).slice(0, 32),
      ])
    );
    const id = r.rows[0].id as string;
    void notifyNewLead(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[lead]", e);
    return NextResponse.json({ error: "Não foi possível enviar agora. Tente novamente." }, { status: 500 });
  }
}
