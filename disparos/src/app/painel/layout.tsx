import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Painel", robots: { index: false } };

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen">
      <header className="bg-black">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Logo height={15} />
            <span className="hidden text-[0.68rem] uppercase tracking-[0.24em] text-white/55 sm:inline">Radar Logístico</span>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/painel" className="rounded-md px-3 py-1.5 text-white/85 hover:bg-white/10">Quem clicou</Link>
            <Link href="/painel/contatos" className="rounded-md px-3 py-1.5 text-white/85 hover:bg-white/10">Contatos e links</Link>
            <form action={logoutAction}>
              <button className="rounded-md px-3 py-1.5 text-white/55 hover:text-white">Sair</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
