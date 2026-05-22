"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, FileText, Target } from "lucide-react";
import { reportApi } from "@/lib/api";
import { cardSurfaceClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

type ReadinessReportItem = {
  employee: {
    employee_id: string;
    full_name: string;
    job_title?: string | null;
    seniority_level?: string | null;
  };
  has_report: boolean;
  updated_at?: string | null;
  report?: {
    role_fit_score: number;
    promotion_fit_score: number;
    internal_mobility_score: number;
    recommended_next_role?: string;
    readiness_summary?: string;
    model_used?: string;
    generated_at?: string;
  } | null;
};

export default function ReadinessReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["hr-readiness-latest-reports"],
    queryFn: async () => {
      const { data } = await reportApi.getLatestReadinessReports();
      return data as { items: ReadinessReportItem[]; total_employees: number };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand-600" /> Saved Readiness Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-tw-muted mt-1">
            Latest generated readiness and mobility report per employee.
          </p>
        </div>
        <Link href="/hr/readiness">
          <Button variant="outline">Back to Readiness & Mobility</Button>
        </Link>
      </div>

      <div className={cn(cardSurfaceClass, "overflow-hidden")}>
        <div className="px-4 py-3 border-b border-slate-100 dark:border-tw-border bg-slate-50/70">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Employees: {data?.total_employees ?? 0}
          </p>
        </div>

        {isLoading ? (
          <p className="p-4 text-sm text-slate-500">Loading saved reports...</p>
        ) : !data?.items?.length ? (
          <p className="p-4 text-sm text-slate-500">No employees found.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-tw-border">
            {data.items.map((item) => (
              <div key={item.employee.employee_id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-tw-text">{item.employee.full_name}</p>
                    <p className="text-xs text-slate-500">
                      {item.employee.job_title || "Unassigned"} {item.employee.seniority_level ? `| ${item.employee.seniority_level}` : ""}
                    </p>
                  </div>
                  {item.has_report ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      Report available
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                      Not generated yet
                    </span>
                  )}
                </div>

                {item.report ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded border border-slate-200">
                      <span className="text-slate-500">Role Fit</span>
                      <p className="font-bold">{Math.round(item.report.role_fit_score)}%</p>
                    </div>
                    <div className="p-2 rounded border border-slate-200">
                      <span className="text-slate-500">Promotion Fit</span>
                      <p className="font-bold">{Math.round(item.report.promotion_fit_score)}%</p>
                    </div>
                    <div className="p-2 rounded border border-slate-200">
                      <span className="text-slate-500">Mobility Fit</span>
                      <p className="font-bold">{Math.round(item.report.internal_mobility_score)}%</p>
                    </div>
                    <div className="sm:col-span-3 text-[11px] text-slate-500">
                      Model: {item.report.model_used || "n/a"} | Generated: {item.report.generated_at || item.updated_at || "n/a"}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> No saved readiness report yet for this employee.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={cn(cardSurfaceClass, "p-4 text-sm text-slate-600 dark:text-tw-muted flex items-center gap-2")}>
        <Target className="h-4 w-4 text-brand-600" />
        Generate reports from the Readiness & Mobility page. Only the latest report per employee is stored.
      </div>
    </div>
  );
}
