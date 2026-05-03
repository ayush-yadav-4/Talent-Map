"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { reportApi } from "@/lib/api";
import { cardSurfaceClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

export type GapSummaryRow = {
  skill_id: string;
  skill_name: string;
  domain: string | null;
  total_employees_with_gap: number;
  avg_gap: number;
  worst_dept: string | null;
  compliance_flag: boolean;
};

type Props = {
  deptId?: string | null;
  className?: string;
  title?: string;
};

export function GapSummaryTable({ deptId, className, title = "Skill gap summary" }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["hr-gap-summary", deptId ?? ""],
    queryFn: async () => {
      const { data: d } = await reportApi.hrGapSummary(deptId || undefined);
      return d as GapSummaryRow[];
    },
  });

  return (
    <div className={cn(cardSurfaceClass, "overflow-hidden p-4 shadow-sm", className)}>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">{title}</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-tw-muted">Open role gaps aggregated by skill.</p>
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" aria-hidden />
        </div>
      )}
      {error && <p className="mt-3 text-xs text-red-600">Failed to load gap summary.</p>}
      {!isLoading && !error && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-tw-border dark:text-tw-muted">
                <th className="py-2 pr-2 font-semibold">Skill</th>
                <th className="py-2 pr-2 font-semibold">Domain</th>
                <th className="py-2 pr-2 font-semibold">Employees</th>
                <th className="py-2 pr-2 font-semibold">Avg gap</th>
                <th className="py-2 pr-2 font-semibold">Worst dept</th>
                <th className="py-2 font-semibold">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).slice(0, 12).map((row) => (
                <tr key={row.skill_id} className="border-b border-slate-100 dark:border-tw-border">
                  <td className="py-2 pr-2 font-medium text-slate-800 dark:text-tw-text">{row.skill_name}</td>
                  <td className="py-2 pr-2 text-slate-600 dark:text-tw-muted">{row.domain ?? "—"}</td>
                  <td className="py-2 pr-2">{row.total_employees_with_gap}</td>
                  <td className="py-2 pr-2">{row.avg_gap.toFixed(2)}</td>
                  <td className="py-2 pr-2 text-slate-600 dark:text-tw-muted">{row.worst_dept ?? "—"}</td>
                  <td className="py-2">
                    {row.compliance_flag ? (
                      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
                        Yes
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!(data?.length ?? 0) && <p className="mt-3 text-xs text-slate-500 dark:text-tw-muted">No open skill gaps.</p>}
        </div>
      )}
    </div>
  );
}
