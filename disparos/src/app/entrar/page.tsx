import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { loginAction } from "@/lib/actions";
import { ActionForm, Submit } from "@/components/Client";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Entrar", robots: { index: false } };

export default async function Entrar() {
  if (await isAdmin()) redirect("/painel");
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-5">
      <div className="w-full max-w-sm">
        <Logo height={22} />
        <div className="mt-3 text-xs uppercase tracking-[0.26em] text-white/60">Radar Logístico · Painel de disparos</div>
        <ActionForm action={loginAction} className="mt-8 space-y-4 rounded-2xl bg-white p-6">
          <label className="block">
            <span className="label">Senha do painel</span>
            <input id="password" name="password" type="password" autoComplete="current-password" className="field" required autoFocus />
          </label>
          <Submit className="btn btn-primary w-full">Entrar</Submit>
        </ActionForm>
      </div>
    </main>
  );
}
