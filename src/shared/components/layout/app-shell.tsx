"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { PeriodPicker } from "@/shared/components/period-picker";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { PERIOD_ROUTES } from "./nav-items";
import { Brand, SidebarNav } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

type AppShellProps = {
  user: { name: string; email: string };
  /** Header action slot (e.g. "+ Lançamento"). */
  action?: ReactNode;
  children: ReactNode;
};

export function AppShell({ user, action, children }: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const showPeriod = PERIOD_ROUTES.some((route) => pathname.startsWith(route));

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="bg-card hidden w-60 shrink-0 flex-col gap-6 border-r py-5 md:flex">
        <Brand />
        <div className="px-3">
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/95 sticky top-0 z-30 flex h-16 items-center gap-2 border-b px-4 backdrop-blur md:px-6">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="size-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 gap-6 p-0 py-5">
              <SheetHeader className="p-0">
                <SheetTitle asChild>
                  <div>
                    <Brand />
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="px-3">
                <SidebarNav onNavigate={() => setMenuOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-1 justify-center md:justify-start">
            {showPeriod && <PeriodPicker />}
          </div>

          <div className="flex items-center gap-1">
            {action}
            <ThemeToggle />
            <UserMenu name={user.name} email={user.email} />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
