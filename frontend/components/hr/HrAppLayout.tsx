"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Brain, Building2, LayoutDashboard, LineChart, LogOut, Settings, Target, Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { clearAuth, orgApi, readStoredUser, type AuthUser, type OrgStructureNode } from "@/lib/api";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/hr/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hr/employees", label: "Employees", icon: Users },
  { href: "/hr/projects", label: "Projects", icon: Building2 },
  { href: "/hr/job-descriptions", label: "Job Descriptions", icon: Building2 },
  { href: "/hr/skill-intelligence", label: "Skill Intelligence", icon: LineChart },
  { href: "/hr/skill-gaps", label: "Skill Gaps", icon: Target },
  { href: "/hr/psychometrics", label: "Psychometrics", icon: Brain },
  { href: "/hr/organization", label: "Organization", icon: Building2 },
  { href: "/hr/settings", label: "Settings", icon: Settings },
];

export function HrAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onboarding = pathname?.startsWith("/hr/onboarding");
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const orgId = user?.org_id;
  const canQueryOrg = mounted && !onboarding && Boolean(orgId) && hasAccessToken;

  useEffect(() => {
    setMounted(true);
    setUser(readStoredUser());
    setHasAccessToken(Boolean(sessionStorage.getItem("tm_access_token")));
  }, []);

  const { data: orgData } = useQuery({
    queryKey: ["hr-org", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await orgApi.get(orgId);
      return data as { name?: string };
    },
    enabled: canQueryOrg,
  });

  const { data: structureData } = useQuery({
    queryKey: ["hr-org-structure", orgId],
    queryFn: async () => {
      if (!orgId) return { departments: [] as OrgStructureNode[] };
      const { data } = await orgApi.getStructure(orgId);
      return data;
    },
    enabled: canQueryOrg,
  });

  if (onboarding) {
    return <div className="min-h-screen bg-white dark:bg-tw-bg">{children}</div>;
  }

  if (!mounted) {
    return <div className="min-h-screen bg-slate-50 dark:bg-tw-bg" />;
  }

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
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
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
        <div className="max-h-64 overflow-y-auto border-t border-white/10 px-3 py-3">
          <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-200 dark:text-tw-muted">
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            Organization structure
          </p>
          <div className="space-y-2">
            {(structureData?.departments ?? []).map((node) => (
              <div key={node.department.id} className="rounded-lg bg-white/5 p-2">
                <p className="text-xs font-semibold text-white">{node.department.name}</p>
                <p className="mt-1 text-[11px] text-indigo-200">Roles: {node.roles.map((role) => role.title).join(", ") || "None"}</p>
                <p className="mt-0.5 text-[11px] text-indigo-200">
                  Employees: {node.employees.map((employee) => employee.full_name).join(", ") || "None"}
                </p>
              </div>
            ))}
            {!structureData?.departments?.length && (
              <p className="text-xs text-indigo-200 dark:text-tw-muted">Add departments and roles to view structure.</p>
            )}
          </div>
        </div>
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
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-tw-border dark:bg-tw-card">
          <div>
            <Link href="/hr/dashboard" className="text-sm font-semibold text-slate-900 dark:text-tw-text">
              Talent <span className="text-brand-600 dark:text-tw-blue">Map</span>
            </Link>
            <p className="text-xs text-slate-500 dark:text-tw-muted">{orgData?.name ?? "Organization"}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 dark:text-tw-muted sm:inline">{user?.email}</span>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
