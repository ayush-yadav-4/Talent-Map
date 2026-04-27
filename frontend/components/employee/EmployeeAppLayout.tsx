"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, BookOpenCheck, Home, LineChart, LogOut, MessageCircle, Trophy } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { clearAuth, orgApi, readStoredUser, type AuthUser } from "@/lib/api";
import { cn } from "@/lib/utils";

const links = [
  { href: "/employee/dashboard", label: "Dashboard", icon: Home },
  { href: "/employee/skills", label: "My Skills", icon: LineChart },
  { href: "/employee/projects", label: "My Projects", icon: BriefcaseBusiness },
  { href: "/employee/coach", label: "AI Coach", icon: MessageCircle },
  { href: "/employee/job-descriptions", label: "Job Descriptions", icon: BriefcaseBusiness },
  { href: "/employee/assessments", label: "My Assessments", icon: BriefcaseBusiness },
  { href: "/employee/scores", label: "Scores", icon: Trophy },
  { href: "/employee/course-suggestions", label: "Course Suggestions", icon: BookOpenCheck },
];

export function EmployeeAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onboarding = pathname?.startsWith("/employee/onboarding");
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const orgId = user?.org_id;

  useEffect(() => {
    setMounted(true);
    setUser(readStoredUser());
  }, []);

  const { data: orgData } = useQuery({
    queryKey: ["employee-org", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await orgApi.get(orgId);
      return data as { name?: string };
    },
    enabled: mounted && Boolean(orgId) && !onboarding,
  });

  if (onboarding) {
    return <div className="min-h-screen bg-white dark:bg-tw-bg">{children}</div>;
  }

  if (!mounted) {
    return <div className="min-h-screen bg-slate-50 dark:bg-tw-bg" />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-tw-bg">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-4 dark:border-tw-border dark:bg-tw-card md:flex">
        <div className="px-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-tw-text">Employee workspace</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-tw-muted">{orgData?.name ?? "Organization"}</p>
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
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
        <div className="border-t border-slate-200 px-3 pt-3 text-xs text-slate-500 dark:border-tw-border dark:text-tw-muted">
          <p className="font-medium text-slate-800 dark:text-tw-text">{user?.full_name ?? user?.email}</p>
          <Link href="/employee/login" onClick={() => clearAuth()} className="mt-2 inline-flex items-center gap-1 hover:text-brand-700 dark:hover:text-tw-blue">
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Sign out
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-tw-border dark:bg-tw-card">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-tw-text">{orgData?.name ?? "Organization"}</p>
            <p className="text-xs text-slate-500 dark:text-tw-muted">{user?.full_name ?? user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/employee/login" onClick={() => clearAuth()} className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-tw-border dark:text-tw-text dark:hover:bg-tw-raised">
              Sign out
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
