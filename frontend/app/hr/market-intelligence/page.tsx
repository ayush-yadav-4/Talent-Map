"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MarketIntelPanel } from "@/components/hr/MarketIntelPanel";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { orgApi, readStoredUser, reportApi } from "@/lib/api";
import { cardSurfaceClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

type HrDashboard = {
  counts: {
    critical_gaps: number;
    certifications_expiring_30: number;
    assessments_pending: number;
  };
  heatmap: { dept?: string; name?: string; gaps: number; avg_proficiency: number }[];
};

export default function MarketIntelligencePage() {
  const { ready } = useRequireAuth(["org_admin", "hr_manager", "manager"]);
  const user = readStoredUser();
  const orgId = user?.org_id;

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ["hr-market-dashboard"],
    queryFn: async () => {
      const { data } = await reportApi.hrDashboard();
      return data as HrDashboard;
    },
    enabled: ready,
  });

  const { data: org } = useQuery({
    queryKey: ["hr-market-org", orgId],
    queryFn: async () => {
      const { data } = await orgApi.get(orgId ?? "");
      return data as { sector?: string; name?: string };
    },
    enabled: ready && Boolean(orgId),
  });

  if (!ready) return null;

  const deptBarData = (dashboardData?.heatmap ?? []).map((row) => ({
    name: (row.dept || row.name || "Dept").slice(0, 14),
    gaps: row.gaps ?? 0,
    proficiency: row.avg_proficiency ?? 0,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-tw-text">Market intelligence</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">
            External signals plus internal risk posture for <span className="font-medium">{org?.name ?? "your organization"}</span>.
          </p>
        </div>
        <Link href="/hr/dashboard" className="text-sm font-semibold text-brand-700 hover:underline dark:text-tw-blue">
          ← Dashboard
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          Could not load dashboard-derived risk metrics.
        </div>
      )}

      <MarketIntelPanel sector={org?.sector} roleHint="Organization workforce" limit={8} />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className={cn(cardSurfaceClass, "p-4 shadow-sm lg:col-span-3")}>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Department gap load</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-tw-muted">
            Pulled from the live HR dashboard heatmap (open gaps + average proficiency by department).
          </p>
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
              <p className="py-16 text-center text-sm text-slate-500 dark:text-tw-muted">
                {isLoading ? "Loading gap heatmap..." : "No department gap data yet."}
              </p>
            )}
          </div>
        </div>

        <div className={cn(cardSurfaceClass, "space-y-3 p-4 shadow-sm lg:col-span-2")}>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Risk highlights</h2>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            Critical gaps (essential): <span className="font-bold">{dashboardData?.counts?.critical_gaps ?? 0}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-tw-border dark:bg-tw-raised dark:text-tw-text">
            Certs expiring (30d): <span className="font-bold">{dashboardData?.counts?.certifications_expiring_30 ?? 0}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-tw-border dark:bg-tw-raised dark:text-tw-text">
            Pending assessments: <span className="font-bold">{dashboardData?.counts?.assessments_pending ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

