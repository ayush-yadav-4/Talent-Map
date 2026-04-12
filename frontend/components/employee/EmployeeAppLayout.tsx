"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LineChart, Settings, Target } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { clearAuth, readStoredUser } from "@/lib/api";
import { cn } from "@/lib/utils";

const links = [
  { href: "/employee/dashboard", label: "Dashboard", icon: Home },
  { href: "/employee/gaps", label: "My gaps", icon: Target },
  { href: "/employee/skills", label: "My skills", icon: LineChart },
  { href: "/employee/settings", label: "Settings", icon: Settings },
];

export function EmployeeAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onboarding = pathname?.startsWith("/employee/onboarding");
  const user = readStoredUser();

  if (onboarding) {
    return <div className="min-h-screen bg-white dark:bg-tw-bg">{children}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-tw-bg md:flex-row">
      <aside className="border-b border-slate-200 bg-white px-4 py-3 dark:border-tw-border dark:bg-tw-card md:w-56 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between md:block">
          <p className="text-sm font-semibold text-slate-900 dark:text-tw-text">Talent Map</p>
          <ThemeToggle />
        </div>
        <nav className="mt-4 flex gap-2 overflow-x-auto md:flex-col">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                pathname === l.href
                  ? "bg-brand-50 text-brand-800 dark:bg-tw-raised dark:text-tw-blue"
                  : "text-slate-600 hover:bg-slate-100 dark:text-tw-muted dark:hover:bg-tw-raised",
              )}
            >
              <l.icon className="h-4 w-4" aria-hidden />
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 hidden text-xs text-slate-500 dark:text-tw-muted md:block">
          <p className="font-medium text-slate-800 dark:text-tw-text">{user?.full_name ?? user?.email}</p>
          <Link href="/login" onClick={() => clearAuth()} className="mt-2 inline-block hover:text-brand-700 dark:hover:text-tw-blue">
            Sign out
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
