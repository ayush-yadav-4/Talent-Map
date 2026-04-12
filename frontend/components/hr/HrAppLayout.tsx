"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { clearAuth, readStoredUser } from "@/lib/api";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/hr/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hr/employees", label: "Employees", icon: Users },
];

export function HrAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onboarding = pathname?.startsWith("/hr/onboarding");

  if (onboarding) {
    return <div className="min-h-screen bg-white dark:bg-tw-bg">{children}</div>;
  }

  const user = readStoredUser();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-tw-bg">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-brand-900 text-white dark:border-tw-border dark:bg-tw-dim md:flex">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-4">
          <Link href="/hr/dashboard" className="text-sm font-semibold tracking-tight text-white">
            Talent <span className="text-cyan-300">Map</span>
          </Link>
          <ThemeToggle />
        </div>
        <div className="px-4 py-3 text-xs text-indigo-200 dark:text-tw-muted">
          <p className="font-semibold text-white dark:text-tw-text">{user?.email ?? "HR"}</p>
          <p className="capitalize opacity-80">{user?.role?.replace("_", " ")}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 py-4">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active ? "bg-white/15 text-white" : "text-indigo-100 hover:bg-white/10 dark:text-tw-muted dark:hover:bg-tw-raised",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <Link
            href="/login"
            onClick={() => clearAuth()}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-indigo-100 hover:bg-white/10 dark:text-tw-muted"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-tw-border dark:bg-tw-card md:hidden">
          <Link href="/hr/dashboard" className="text-sm font-semibold text-slate-900 dark:text-tw-text">
            Talent <span className="text-brand-600 dark:text-tw-blue">Map</span>
          </Link>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
