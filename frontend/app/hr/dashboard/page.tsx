"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { reportApi } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cardSurfaceClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

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
};

export default function HrDashboardPage() {
  const { ready } = useRequireAuth(["org_admin", "hr_manager", "manager"]);
  const { data, isLoading, error } = useQuery({
    queryKey: ["hr-dashboard"],
    queryFn: async () => {
      const { data: d } = await reportApi.hrDashboard();
      return d as HrDashboard;
    },
    enabled: ready,
  });

  if (!ready) return null;

  const heat = data?.heatmap ?? [];
  const avgProf = data?.proficiency?.avg_org_proficiency ?? 0;
  const crit = data?.counts?.critical_gaps ?? 0;
  const radarData = heat.length
    ? heat.slice(0, 6).map((row) => ({
        domain: (row.dept || row.name || "Dept").slice(0, 18),
        proficiency: row.avg_proficiency,
        gaps: row.gaps,
      }))
    : [
        { domain: "Technical", proficiency: avgProf, gaps: crit },
        { domain: "Compliance", proficiency: 0, gaps: 0 },
        { domain: "Leadership", proficiency: 0, gaps: 0 },
        { domain: "Communication", proficiency: 0, gaps: 0 },
        { domain: "Domain", proficiency: 0, gaps: 0 },
        { domain: "Cognitive", proficiency: 0, gaps: 0 },
      ];

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

      <div className="grid gap-6 lg:grid-cols-5">
        <div className={cn(cardSurfaceClass, "p-4 shadow-sm lg:col-span-3")}>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Capability snapshot</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-tw-muted">Department averages vs. gap counts (placeholder axes when data is sparse).</p>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="80%">
                <PolarGrid stroke="#cbd5e1" className="dark:stroke-tw-border" />
                <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11, fill: "#64748b" }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
                <Radar name="Avg proficiency" dataKey="proficiency" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.35} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
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
    </div>
  );
}
