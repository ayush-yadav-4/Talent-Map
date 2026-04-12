"use client";

import { useQuery } from "@tanstack/react-query";
import { reportApi, readStoredUser } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cardSurfaceClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default function EmployeeDashboardPage() {
  const { ready } = useRequireAuth();
  const user = readStoredUser();
  const eid = user?.employee_id;

  const { data, isLoading } = useQuery({
    queryKey: ["employee-dashboard", eid],
    queryFn: async () => {
      const { data: d } = await reportApi.employeeDashboard(eid!);
      return d as {
        total_skills_profiled: number;
        avg_proficiency: number;
        top_gaps: { skill: string; gap: number }[];
      };
    },
    enabled: ready && Boolean(eid),
  });

  if (!ready) return null;

  if (!eid) {
    return (
      <div className={cn(cardSurfaceClass, "p-6")}>
        <p className="text-sm text-slate-600 dark:text-tw-muted">
          Your account is not linked to an employee profile yet. HR dashboards stay available for admins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">My dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-tw-muted">Skills tracked</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-tw-text">{isLoading ? "…" : data?.total_skills_profiled ?? 0}</p>
        </div>
        <div className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-tw-muted">Avg proficiency</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-tw-text">{isLoading ? "…" : data?.avg_proficiency ?? 0}</p>
        </div>
        <div className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-tw-muted">Top gaps shown</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-tw-text">{isLoading ? "…" : data?.top_gaps?.length ?? 0}</p>
        </div>
      </div>
      <div className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Priority gaps</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-tw-muted">
          {(data?.top_gaps ?? []).length ?
            data!.top_gaps.map((g) => (
              <li key={g.skill}>
                <span className="font-medium text-slate-800 dark:text-tw-text">{g.skill}</span> — gap {g.gap.toFixed(2)}
              </li>
            ))
          : <li>No open gaps detected yet.</li>}
        </ul>
      </div>
    </div>
  );
}
