import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser, HOME } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Acesso" };

export default async function LoginPage() {
  const u = await currentUser();
  if (u) redirect(HOME[u.role]);
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-black p-12 text-white lg:flex">
        <div>
          <Logo height={26} />
          <div className="mt-4 text-xs font-medium uppercase tracking-[0.3em] text-white/60">PROLOG Intelligence</div>
        </div>
        <div className="max-w-md">
          <p className="font-display text-[2.1rem] leading-[1.15]">Cada ação de vendas, uma operação mensurável.</p>
          <p className="mt-4 text-sm leading-relaxed text-white/65">
            Central de campanhas, links por corretor, captação de investidores e acompanhamento comercial em tempo real.
          </p>
        </div>
        <div className="text-xs text-white/40">Acesso restrito a usuários autorizados. Atividades são registradas para auditoria.</div>
        <svg className="pointer-events-none absolute -right-24 -bottom-24 opacity-[0.07]" width="520" height="520" viewBox="0 0 100 100" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <circle key={i} cx="50" cy="50" r={6 + i * 6} fill="none" stroke="#b9a27a" strokeWidth="0.4" />
          ))}
        </svg>
      </section>
      <section className="flex items-center justify-center bg-canvas px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 rounded-xl bg-black px-5 py-4 lg:hidden">
            <Logo height={18} />
            <div className="mt-2 text-[0.68rem] uppercase tracking-[0.24em] text-white/60">PROLOG Intelligence</div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Acessar a central</h1>
          <p className="mt-1 text-sm text-muted">Stater, imobiliárias parceiras e corretores.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
