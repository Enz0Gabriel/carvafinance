"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { NAV_ITEMS, PERIOD_ROUTES } from "./nav-items";

type SidebarNavProps = { onNavigate?: () => void };

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Keep the selected period when moving between period-aware pages.
  const period = new URLSearchParams();
  for (const key of ["from", "to", "preset"]) {
    const value = searchParams.get(key);
    if (value) period.set(key, value);
  }
  const periodQuery = period.size ? `?${period.toString()}` : "";

  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={PERIOD_ROUTES.includes(href) ? `${href}${periodQuery}` : href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-3">
      <Image src="/logo.webp" alt="" width={32} height={32} />
      <span className="text-lg font-semibold tracking-tight">CarvaFinance</span>
    </Link>
  );
}
