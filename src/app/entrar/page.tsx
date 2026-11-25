import { redirect } from "next/navigation";
import { HOME, requireUser } from "@/lib/auth";

export default async function Entrar() {
  const u = await requireUser();
  redirect(u.must_change_password ? "/conta/senha" : HOME[u.role]);
}
