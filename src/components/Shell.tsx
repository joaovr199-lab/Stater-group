import Link from "next/link";
import { asUser, type SessionUser } from "@/lib/auth";
import { logoutAction, markNotificationsReadAction } from "@/lib/actions";
import { fmtDateTime } from "@/lib/format";
import { notifications } from "@/lib/queries";
import { LiveRefresh } from "./LiveRefresh";
import { NavLinks } from "./NavLinks";
import { Logo } from "./Logo";

const NAV = {
  stater_admin: [
    { href: "/stater", label: "Visão geral" },
    { href: "/stater/campanhas", label: "Campanhas" },
    { href: "/stater/imobiliarias", label: "Imobiliárias" },
    { href: "/stater/corretores", label: "Corretores" },
    { href: "/stater/leads", label: "Gestão de leads" },
    { href: "/stater/inteligencia", label: "Inteligência comercial" },
    { href: "/stater/relatorios", label: "Relatórios" },
    { href: "/stater/configuracoes", label: "Configurações" },
    { href: "/stater/auditoria", label: "Auditoria" },
  ],
  agency_manager: [
    { href: "/imobiliaria", label: "Visão geral" },
    { href: "/imobiliaria/leads", label: "Leads" },
    { href: "/imobiliaria/reunioes", label: "Reuniões" },
    { href: "/imobiliaria/corretores", label: "Corretores" },
    { href: "/imobiliaria/links", label: "Links e QR Codes" },
    { href: "/imobiliaria/relatorios", label: "Relatórios" },
  ],
  broker: [
    { href: "/corretor", label: "Início" },
    { href: "/corretor/leads", label: "Meus leads" },
  ],
} as const;

const ROLE_LABEL = { stater_admin: "Stater · Administração", agency_manager: "Gestor da imobiliária", broker: "Corretor" };

export async function Shell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const notif = await asUser(user, (c) => notifications(c));
  const nav = NAV[user.role];
  const home = nav[0].href;
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15.5rem_1fr]">
      <aside className="hidden border-r border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="bg-black px-5 py-5">
          <Link href={home} className="block">
            <Logo height={17} />
            <div className="mt-2.5 text-[0.7rem] font-medium uppercase tracking-[0.24em] text-white/70">PROLOG Intelligence</div>
          </Link>
        </div>
        <NavLinks items={[...nav]} />
        <div className="mt-auto border-t border-line px-5 py-4 text-xs">
          <div className="font-semibold text-ink">{user.name}</div>
          <div className="text-muted">{user.agency_name ?? ROLE_LABEL[user.role]}</div>
          <div className="mt-3 flex items-center justify-between">
            <Link href="/conta/senha" className="text-ink-2 hover:text-ink">Alterar senha</Link>
            <form action={logoutAction}>
              <button className="text-ink-2 hover:text-bad">Sair</button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={home} className="truncate font-semibold tracking-tight lg:hidden">
              <span className="text-accent">PROLOG</span> Intelligence
            </Link>
            <span className="hidden text-xs text-muted lg:inline">{ROLE_LABEL[user.role]}{user.agency_name ? ` · ${user.agency_name}` : ""}</span>
          </div>
          <div className="flex items-center gap-3">
            <LiveRefresh />
            <details className="relative">
              <summary className="btn btn-ghost btn-sm list-none" aria-label="Notificações">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                {notif.unread > 0 && <span className="tabular rounded-full bg-bad px-1.5 text-[0.65rem] font-bold text-white">{notif.unread}</span>}
              </summary>
              <div className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface shadow-lg">
                <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <span className="text-sm font-semibold">Notificações</span>
                  {notif.unread > 0 && (
                    <form action={markNotificationsReadAction}>
                      <button className="text-xs text-navy hover:underline">Marcar como lidas</button>
                    </form>
                  )}
                </div>
                <ul className="max-h-96 overflow-y-auto">
                  {notif.items.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Nenhuma notificação.</li>}
                  {notif.items.map((n) => (
                    <li key={n.id} className={`border-b border-line px-4 py-3 text-sm last:border-0 ${n.read_at ? "" : "bg-warn-soft/40"}`}>
                      <Link href={n.lead_id ? `${home === "/corretor" ? "/corretor" : home}/leads/${n.lead_id}` : home} className="block">
                        <div className="font-medium text-ink">{n.title}</div>
                        {n.body && <div className="text-xs text-ink-2">{n.body}</div>}
                        <div className="mt-1 text-[0.7rem] text-muted">{fmtDateTime(n.created_at)}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
            <form action={logoutAction} className="lg:hidden">
              <button className="btn btn-ghost btn-sm">Sair</button>
            </form>
          </div>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-1.5 lg:hidden" aria-label="Menu">
          <NavLinks items={[...nav]} mobile />
        </nav>
        <main className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
