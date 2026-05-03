"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Sparkles,
  Search,
  Briefcase,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { api, orgApi, readStoredUser } from "@/lib/api";
import { Input } from "@/components/ui";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cn } from "@/lib/utils";
import { cardSurfaceClass } from "@/lib/ui";

type GapRow = {
  id: string;
  employee_name: string;
  employee_id?: string;
  dept_id?: string | null;
  dept_name?: string | null;
  jd_title: string;
  fit_score: number;
  analysis_results: {
    strengths?: string[];
    gaps?: string[];
    recommendations?: string[];
  };
  created_at: string;
};

function textMentionsCompliance(row: GapRow): boolean {
  const blob = [
    ...(row.analysis_results?.gaps ?? []),
    ...(row.analysis_results?.strengths ?? []),
    ...(row.analysis_results?.recommendations ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return /compliance|regulatory|iso|nabh|hipaa|osha|mandatory certification/.test(blob);
}

export default function HRSkillGapsPage() {
  const { ready } = useRequireAuth(["org_admin", "hr_manager", "manager"]);
  const user = readStoredUser();
  const orgId = user?.org_id ?? "";
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [sortFitDesc, setSortFitDesc] = useState(true);

  const { data: departments } = useQuery({
    queryKey: ["skill-gaps-departments", orgId],
    queryFn: async () => {
      const { data } = await orgApi.getDepartments(orgId);
      return data as { id: string; name: string }[];
    },
    enabled: ready && Boolean(orgId),
  });

  const { data: gaps, isLoading } = useQuery({
    queryKey: ["all-skill-gaps"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/job-descriptions/all/gaps");
      return data as GapRow[];
    },
    enabled: ready,
  });

  const filteredGaps = useMemo(() => {
    let rows = gaps ?? [];
    if (deptFilter) {
      rows = rows.filter((g) => g.dept_id === deptFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (g) => g.employee_name.toLowerCase().includes(q) || g.jd_title.toLowerCase().includes(q),
      );
    }
    const sorted = [...rows].sort((a, b) =>
      sortFitDesc ? b.fit_score - a.fit_score : a.fit_score - b.fit_score,
    );
    return sorted;
  }, [gaps, search, deptFilter, sortFitDesc]);

  if (!ready) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Organization skill gaps</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-tw-muted">
          Review employee alignment with job descriptions and identified growth areas.
        </p>
      </div>

      <div className={cn(cardSurfaceClass, "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between")}>
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by employee or role…"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-tw-border dark:bg-tw-card"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All departments</option>
            {(departments ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-tw-border dark:bg-tw-card dark:text-tw-text"
            onClick={() => setSortFitDesc((v) => !v)}
          >
            Fit score: {sortFitDesc ? "High → Low" : "Low → High"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGaps.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 py-20 text-center">
              <TrendingDown className="mx-auto mb-4 h-12 w-12 text-slate-200" />
              <h3 className="text-lg font-bold text-slate-400">No gap analyses found</h3>
              <p className="mt-2 text-sm text-slate-400">
                When employees compare their skills against JDs, the results will appear here.
              </p>
            </div>
          ) : (
            filteredGaps.map((gap) => {
              const complianceHint = textMentionsCompliance(gap);
              return (
                <div key={gap.id} className={cn(cardSurfaceClass, "p-6 transition-all hover:shadow-md")}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-600">
                        {gap.employee_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-tw-text">{gap.employee_name}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-tw-muted">
                          <Briefcase className="h-3 w-3 shrink-0" />
                          <span>Compared against:</span>
                          <span className="font-semibold text-slate-700 dark:text-tw-text">{gap.jd_title}</span>
                          {gap.dept_name && (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] dark:bg-tw-raised">
                              {gap.dept_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        {complianceHint && (
                          <span className="flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                            <ShieldAlert className="h-3 w-3" aria-hidden />
                            Compliance signal
                          </span>
                        )}
                        <span className="text-xs font-bold uppercase text-slate-400">Fit score</span>
                        <span
                          className={cn(
                            "rounded-lg px-3 py-1 text-xl font-black",
                            gap.fit_score > 70 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                          )}
                        >
                          {Math.round(Number(gap.fit_score))}%
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Analyzed on {new Date(gap.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-3">
                      <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Key strengths
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(gap.analysis_results?.strengths ?? []).slice(0, 4).map((s: string, i: number) => (
                          <span
                            key={i}
                            className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                        <AlertCircle className="h-3.5 w-3.5" /> Identified gaps
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(gap.analysis_results?.gaps ?? []).slice(0, 4).map((g: string, i: number) => (
                          <span
                            key={i}
                            className="rounded-md border border-amber-100 bg-amber-50 px-2 py-1 text-[11px] text-amber-700"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-brand-600">
                        <Sparkles className="h-3.5 w-3.5" /> AI recommendations
                      </h4>
                      <p className="line-clamp-3 text-xs italic text-slate-600 dark:text-tw-muted">
                        &ldquo;{gap.analysis_results?.recommendations?.[0] || "Continue current learning path."}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
