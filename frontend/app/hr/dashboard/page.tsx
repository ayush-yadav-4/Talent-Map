"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MarketIntelPanel } from "@/components/hr/MarketIntelPanel";
import { MatchingDashboard } from "@/components/hr/MatchingDashboard";
import { RoleIntelligenceAgent } from "@/components/hr/RoleIntelligenceAgent";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cardSurfaceClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { orgApi, readStoredUser, reportApi } from "@/lib/api";

type TopSkillGap = {
  skill_name?: string;
  skill?: string;
  domain?: string;
  is_compliance?: boolean;
  employees_affected?: number;
  count?: number;
  workforce_pct?: number;
};

type CertAlert = {
  employee_name?: string;
  cert_name?: string;
  urgency?: string;
  days_until_expiry?: number | null;
  expiry_date?: string | null;
};

type HrDashboard = {
  counts: {
    total_employees: number;
    active_employees: number;
    employees_assessed: number;
    assessment_coverage_pct: number;
    total_open_gaps: number;
    critical_gaps: number;
    high_risk_employees: number;
    certifications_expiring_30: number;
    certifications_expiring_90: number;
    assessments_pending: number;
  };
  proficiency: { avg_org_proficiency: number };
  heatmap: { dept?: string; name?: string; gaps: number; avg_proficiency: number }[];
  gaps?: { top_skill_gaps?: TopSkillGap[] };
  certifications?: { alerts?: CertAlert[] };
};

export default function HrDashboardPage() {
  const { ready } = useRequireAuth(["org_admin", "hr_manager", "manager"]);
  const user = readStoredUser();
  const orgId = user?.org_id;
  const { data, isLoading, error } = useQuery({
    queryKey: ["hr-dashboard"],
    queryFn: async () => {
      const { data: d } = await reportApi.hrDashboard();
      return d as HrDashboard;
    },
    enabled: ready,
  });
  const { data: org } = useQuery({
    queryKey: ["hr-dashboard-org", orgId],
    queryFn: async () => {
      const { data: o } = await orgApi.get(orgId ?? "");
      return o as { sector?: string; name?: string };
    },
    enabled: ready && Boolean(orgId),
  });
  const { data: employees } = useQuery({
    queryKey: ["dashboard-employees"],
    queryFn: async () => {
      const { data: rows } = await orgApi.getStructure(orgId ?? "");
      return rows.departments.flatMap((item) => item.employees).slice(0, 6);
    },
    enabled: ready && Boolean(orgId),
  });

  if (!ready) return null;

  const heat = data?.heatmap ?? [];
  const deptBarData = heat.map((row) => ({
    name: (row.dept || row.name || "Dept").slice(0, 14),
    gaps: row.gaps ?? 0,
    proficiency: row.avg_proficiency ?? 0,
  }));
  const topGaps = (data?.gaps?.top_skill_gaps ?? []).slice(0, 5);
  const certAlerts = (data?.certifications?.alerts ?? []).slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-tw-text">Workforce overview</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">Live stats from your Talent Map workspace.</p>
        </div>
        <Link
          href="/hr/employees"
          className="text-sm font-semibold text-brand-700 hover:underline dark:text-tw-blue"
        >
          Manage employees →
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          Could not load dashboard stats. Check that you are signed in as HR or manager.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total employees",
            value: data?.counts?.total_employees ?? "—",
            sub: `${data?.counts?.active_employees ?? 0} active`,
          },
          {
            label: "Skills profiled",
            value: data?.counts?.employees_assessed ?? "—",
            sub: `${data?.counts?.assessment_coverage_pct ?? 0}% coverage`,
          },
          {
            label: "Critical gaps",
            value: data?.counts?.critical_gaps ?? "—",
            sub: `${data?.counts?.total_open_gaps ?? 0} open · ${data?.counts?.high_risk_employees ?? 0} high-risk`,
          },
          {
            label: "Certs (30d)",
            value: data?.counts?.certifications_expiring_30 ?? "—",
            sub: `${data?.counts?.certifications_expiring_90 ?? 0} within 90d`,
          },
        ].map((c) => (
          <div key={c.label} className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-tw-muted">{c.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-tw-text">{isLoading ? "…" : c.value}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-tw-muted">{c.sub}</p>
          </div>
        ))}
      </div>

      <RoleIntelligenceAgent />

      <MatchingDashboard />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className={cn(cardSurfaceClass, "p-4 shadow-sm lg:col-span-3")}>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Department gap load</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-tw-muted">Open skill gaps by department (from live gap data).</p>
          <div className="mt-4 h-72 w-full">
            {deptBarData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptBarData} margin={{ left: 0, right: 8, bottom: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-tw-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={48} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="gaps" name="Open gaps" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="proficiency" name="Avg proficiency" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-16 text-center text-sm text-slate-500 dark:text-tw-muted">No department gap data yet.</p>
            )}
          </div>
        </div>
        <div className={cn(cardSurfaceClass, "space-y-3 p-4 shadow-sm lg:col-span-2")}>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Risk highlights</h2>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            Critical gaps (essential): <span className="font-bold">{data?.counts?.critical_gaps ?? 0}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-tw-border dark:bg-tw-raised dark:text-tw-text">
            Certs expiring (30d): <span className="font-bold">{data?.counts?.certifications_expiring_30 ?? 0}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-tw-border dark:bg-tw-raised dark:text-tw-text">
            Pending assessments: <span className="font-bold">{data?.counts?.assessments_pending ?? 0}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className={cn(cardSurfaceClass, "p-4 shadow-sm")}>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Top skill gaps</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-tw-muted">Highest-impact gaps across the workforce.</p>
          <ul className="mt-4 space-y-2">
            {topGaps.map((g, idx) => {
              const name = g.skill_name || g.skill || "Skill";
              const n = g.employees_affected ?? g.count ?? 0;
              const pct = g.workforce_pct ?? 0;
              return (
                <li
                  key={`${name}-${idx}`}
                  className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs dark:border-tw-border dark:bg-tw-raised"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-tw-text">{name}</p>
                    <p className="text-slate-500 dark:text-tw-muted">{g.domain ?? ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 dark:text-tw-text">{n} people</p>
                    <p className="text-slate-500">{pct}% org</p>
                    {g.is_compliance && (
                      <span className="mt-1 inline-block rounded bg-rose-100 px-1 text-[10px] font-bold text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                        Compliance
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {!topGaps.length && (
            <p className="mt-4 text-xs text-slate-500 dark:text-tw-muted">No aggregated gaps yet — add role requirements and evidence.</p>
          )}
        </div>

        <MarketIntelPanel sector={org?.sector} roleHint="Organization workforce" limit={5} />

        <div className={cn(cardSurfaceClass, "p-4 shadow-sm")}>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Certification board</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-tw-muted">Upcoming and urgent expiries.</p>
          <ul className="mt-4 space-y-2">
            {certAlerts.map((c, i) => (
              <li
                key={`${c.employee_name}-${c.cert_name}-${i}`}
                className="rounded-lg border border-slate-100 px-3 py-2 text-xs dark:border-tw-border"
              >
                <p className="font-medium text-slate-900 dark:text-tw-text">{c.employee_name}</p>
                <p className="text-slate-600 dark:text-tw-muted">{c.cert_name}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                  {c.urgency ?? "—"}
                  {c.days_until_expiry != null ? ` · ${c.days_until_expiry}d` : ""}
                </p>
              </li>
            ))}
          </ul>
          {!certAlerts.length && (
            <p className="mt-4 text-xs text-slate-500 dark:text-tw-muted">No certification rows tracked.</p>
          )}
        </div>
      </div>

      <div className={cn(cardSurfaceClass, "space-y-2 p-5 shadow-sm")}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Recently added employees</h2>
          <Link href="/hr/employees" className="text-xs font-semibold text-brand-700 hover:underline dark:text-tw-blue">
            Manage employees
          </Link>
        </div>
        {(employees ?? []).map((employee) => (
          <div key={employee.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-tw-border dark:bg-tw-raised">
            <p className="text-sm font-medium text-slate-900 dark:text-tw-text">{employee.full_name}</p>
            <p className="text-xs text-slate-500 dark:text-tw-muted">{employee.email}</p>
          </div>
        ))}
        {!employees?.length && <p className="text-xs text-slate-500 dark:text-tw-muted">No employees added yet.</p>}
      </div>
    </div>
  );
}
