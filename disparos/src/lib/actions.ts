"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { checkPassword, endSession, requireAdmin, startSession } from "./auth";
import { q } from "./db";
import { ipOf, rateLimit } from "./rate";
import { newToken } from "./token";

export type State = { ok?: boolean; error?: string; message?: string } | null;

export async function loginAction(_: State, form: FormData): Promise<State> {
  const ip = ipOf(await headers());
  if (!rateLimit(`login:${ip}`, 10, 15 * 60_000)) return { error: "Muitas tentativas. Aguarde alguns minutos." };
  if (!process.env.ADMIN_PASSWORD) return { error: "Defina a variável ADMIN_PASSWORD no servidor." };
  if (!checkPassword(String(form.get("password") ?? ""))) return { error: "Senha incorreta." };
  await startSession();
  redirect("/painel");
}

export async function logoutAction() {
  await endSession();
  redirect("/entrar");
}

/**
 * Importa contatos colados de uma planilha. Cada linha: nome; telefone; etiqueta (opcional).
 * Aceita separador ; , ou tabulação. Telefones repetidos são atualizados, não duplicados.
 */
export async function importAction(_: State, form: FormData): Promise<State> {
  await requireAdmin();
  const text = String(form.get("lines") ?? "");
  const defaultTag = String(form.get("tag") ?? "").trim().slice(0, 40) || null;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { error: "Cole ao menos uma linha: nome; telefone." };
  if (lines.length > 5000) return { error: "Máximo de 5.000 linhas por vez." };
  let added = 0, updated = 0;
  const skipped: string[] = [];
  for (const line of lines) {
    const parts = line.split(/\t|;|,(?=\s*[\d(+])/).map((s) => s.trim());
    const name = parts[0];
    let phone = (parts[1] ?? "").replace(/\D/g, "");
    if (/^nome$/i.test(name)) continue; // cabeçalho
    if (!name || name.length < 2 || phone.length < 10 || phone.length > 13) {
      skipped.push(line.slice(0, 40));
      continue;
    }
    if (phone.length <= 11) phone = `55${phone}`;
    const tag = (parts[2] || defaultTag || "").slice(0, 40) || null;
    const r = await q<{ inserted: boolean }>(
      `insert into contacts(token, name, phone, tag) values ($1,$2,$3,$4)
       on conflict (phone) where phone is not null do update set name = excluded.name, tag = coalesce(excluded.tag, contacts.tag)
       returning (xmax = 0) as inserted`,
      [newToken(), name.slice(0, 120), phone, tag]
    );
    if (r[0]?.inserted) added++;
    else updated++;
  }
  revalidatePath("/painel", "layout");
  return {
    ok: true,
    message: `${added} contatos novos, ${updated} atualizados.${skipped.length ? ` ${skipped.length} linhas ignoradas (nome ou telefone inválido): ${skipped.slice(0, 3).join(" | ")}${skipped.length > 3 ? "…" : ""}` : ""}`,
  };
}

export async function deleteContactAction(form: FormData) {
  await requireAdmin();
  await q("delete from contacts where id=$1", [Number(form.get("id"))]);
  revalidatePath("/painel", "layout");
}
