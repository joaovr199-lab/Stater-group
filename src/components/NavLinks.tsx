"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ items, mobile = false }: { items: { href: string; label: string }[]; mobile?: boolean }) {
  const path = usePathname();
  const isActive = (href: string) => path === href || (href.split("/").length > 2 && path.startsWith(href + "/"));
  if (mobile)
    return (
      <>
        {items.map((i) => (
          <Link key={i.href} href={i.href} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${isActive(i.href) ? "bg-ink text-white" : "text-ink-2"}`}>
            {i.label}
          </Link>
        ))}
      </>
    );
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Menu principal">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`block rounded-lg px-3 py-2 text-sm ${isActive(i.href) ? "bg-navy-soft font-semibold text-ink" : "text-ink-2 hover:bg-[#f3f4f6] hover:text-ink"}`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
