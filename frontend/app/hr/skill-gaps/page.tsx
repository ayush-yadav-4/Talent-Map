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
    build_vs_buy?: any;
  };
  created_at: string;
};

function textMentionsCompliance(row: GapRow): boolean {
  const blob = [
    ...(row.analysis_results?.gaps ?? []),
    ...(row.analysis_results?.strengths ?? []),
    ...(row.analysis_results?.recommendations ?? []),
  ]
    .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
    .join(" ")
    .toLowerCase();
  return /compliance|regulatory|iso|nabh|hipaa|osha|mandatory certification/.test(blob);
}

function toRenderableText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.skill_name === "string") {
      const details: string[] = [obj.skill_name];
      if (typeof obj.proficiency === "number") details.push(`(Proficiency: ${obj.proficiency})`);
      if (typeof obj.note === "string" && obj.note.trim()) details.push(`- ${obj.note}`);
      return details.join(" ");
    }
    const firstString = Object.values(obj).find((v) => typeof v === "string");
    if (typeof firstString === "string") return firstString;
    return JSON.stringify(value);
  }
  return "N/A";
}

export default function HRSkillGapsPage() {
  const { ready } = useRequireAuth(["org_admin", "hr_manager", "manager"]);
  const user = readStoredUser();
  const orgId = user?.org_id ?? "";
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [sortFitDesc, setSortFitDesc] = useState(true);

  const [analyzingGapId, setAnalyzingGapId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Record<string, any>>({});
  const [expandedJdGapId, setExpandedJdGapId] = useState<string | null>(null);

  const handleAnalyzeBuildVsBuy = async (gapId: string) => {
    setAnalyzingGapId(gapId);
    try {
      const { data } = await api.get(`/api/v1/job-descriptions/gaps/${gapId}/hire-vs-upskill`);
      setAnalysisResults((prev) => ({ ...prev, [gapId]: data }));
    } catch (error) {
      console.error("Failed to analyze build vs buy", error);
    } finally {
      setAnalyzingGapId(null);
    }
  };

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

  const sortedGroups = useMemo(() => {
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

    const groups: Record<string, { employee_id: string; employee_name: string; dept_name?: string | null; gaps: GapRow[]; highest_fit_score: number }> = {};
    for (const row of rows) {
      const eid = row.employee_id || row.employee_name;
      if (!groups[eid]) {
        groups[eid] = {
          employee_id: eid,
          employee_name: row.employee_name,
          dept_name: row.dept_name,
          gaps: [],
          highest_fit_score: 0,
        };
      }
      groups[eid].gaps.push(row);
      if (row.fit_score > groups[eid].highest_fit_score) {
        groups[eid].highest_fit_score = row.fit_score;
      }
    }

    const sorted = Object.values(groups).sort((a, b) =>
      sortFitDesc ? b.highest_fit_score - a.highest_fit_score : a.highest_fit_score - b.highest_fit_score,
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
            Highest Fit score: {sortFitDesc ? "High → Low" : "Low → High"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroups.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 py-20 text-center">
              <TrendingDown className="mx-auto mb-4 h-12 w-12 text-slate-200" />
              <h3 className="text-lg font-bold text-slate-400">No gap analyses found</h3>
              <p className="mt-2 text-sm text-slate-400">
                When employees compare their skills against JDs, the results will appear here.
              </p>
            </div>
          ) : (
            sortedGroups.map((group) => {
              return (
                <div key={group.employee_id} className={cn(cardSurfaceClass, "p-6 transition-all hover:shadow-md")}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-600">
                        {group.employee_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-tw-text">{group.employee_name}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-tw-muted">
                          {group.dept_name && (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] dark:bg-tw-raised">
                              {group.dept_name}
                            </span>
                          )}
                          <span className="font-semibold px-2 py-0.5 bg-slate-50 dark:bg-tw-card rounded">
                            Analyzed against {group.gaps.length} Job Description{group.gaps.length !== 1 && 's'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                       <span className="text-slate-500">Highest Fit:</span>
                       <span className={cn(
                            "rounded-lg px-2 py-1 text-sm font-black",
                            group.highest_fit_score > 70 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                          )}>{Math.round(group.highest_fit_score)}%</span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Evaluated Job Descriptions</h4>
                    {group.gaps.map((gap) => {
                      const isExpanded = expandedJdGapId === gap.id;
                      const complianceHint = textMentionsCompliance(gap);

                      return (
                        <div key={gap.id} className="border border-slate-200 dark:border-tw-border rounded-xl overflow-hidden">
                          {/* Header Row */}
                          <div
                            className="p-4 bg-slate-50 dark:bg-tw-card hover:bg-slate-100 dark:hover:bg-tw-raised cursor-pointer flex justify-between items-center transition-colors"
                            onClick={() => setExpandedJdGapId(isExpanded ? null : gap.id)}
                          >
                            <div className="flex items-center gap-3">
                              <Briefcase className="h-4 w-4 text-slate-400" />
                              <span className="font-semibold text-slate-800 dark:text-tw-text">{gap.jd_title}</span>
                              {complianceHint && (
                                <span className="flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                                  <ShieldAlert className="h-3 w-3" aria-hidden />
                                  Compliance signal
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] text-slate-400 hidden sm:block">
                                {new Date(gap.created_at).toLocaleDateString()}
                              </span>
                              <span
                                className={cn(
                                  "rounded-lg px-2 py-1 text-xs font-black min-w-[50px] text-center",
                                  gap.fit_score > 70 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                                )}
                              >
                                {Math.round(Number(gap.fit_score))}% Fit
                              </span>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-tw-border">
                              <div className="flex justify-end mb-6">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAnalyzeBuildVsBuy(gap.id);
                                  }}
                                  disabled={analyzingGapId === gap.id}
                                  className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 hover:bg-brand-700 hover:shadow-brand-500/40 disabled:opacity-50 transition-all"
                                >
                                  {analyzingGapId === gap.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-4 w-4" />
                                  )}
                                  Hire vs Upskill Analysis
                                </button>
                              </div>

                              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                <div className="space-y-3">
                                  <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Key strengths
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {(gap.analysis_results?.strengths ?? []).slice(0, 4).map((s: unknown, i: number) => (
                                      <span
                                        key={i}
                                        className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700"
                                      >
                                        {toRenderableText(s)}
                                      </span>
                                    ))}
                                    {(gap.analysis_results?.strengths?.length === 0) && <span className="text-xs text-slate-400">None found</span>}
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                                    <AlertCircle className="h-3.5 w-3.5" /> Identified gaps
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {(gap.analysis_results?.gaps ?? []).slice(0, 4).map((g: unknown, i: number) => (
                                      <span
                                        key={i}
                                        className="rounded-md border border-amber-100 bg-amber-50 px-2 py-1 text-[11px] text-amber-700"
                                      >
                                        {toRenderableText(g)}
                                      </span>
                                    ))}
                                     {(gap.analysis_results?.gaps?.length === 0) && <span className="text-xs text-slate-400">None found</span>}
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-brand-600">
                                    <Sparkles className="h-3.5 w-3.5" /> AI recommendations
                                  </h4>
                                  <p className="line-clamp-3 text-xs italic text-slate-600 dark:text-tw-muted">
                                    &ldquo;{toRenderableText(gap.analysis_results?.recommendations?.[0]) || "Continue current learning path."}&rdquo;
                                  </p>
                                </div>

                                {/* Hire vs Upskill Analysis Result */}
                                {(analysisResults[gap.id] || gap.analysis_results?.build_vs_buy) && (
                                  <div className="col-span-1 mt-4 rounded-xl bg-slate-50 p-5 border border-slate-200 dark:bg-tw-raised dark:border-tw-border md:col-span-2 lg:col-span-3">
                                    {(() => {
                                      const res = analysisResults[gap.id] || gap.analysis_results?.build_vs_buy;
                                      return (
                                        <>
                                          <div className="flex items-center gap-2 mb-3">
                                            <h4 className="font-bold text-slate-800 dark:text-tw-text">Build vs Buy Decision:</h4>
                                            <span className={cn(
                                              "px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider",
                                              res.decision === "Hire" ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                            )}>
                                              {res.decision}
                                            </span>
                                          </div>
                                          <p className="mb-5 text-sm leading-relaxed text-slate-600 dark:text-tw-muted border-l-4 border-slate-300 dark:border-slate-600 pl-3 italic">
                                            {res.reasoning}
                                          </p>
                                          <div className="flex flex-wrap gap-4 text-sm bg-white p-4 rounded-lg border border-slate-200 dark:bg-tw-card dark:border-tw-border shadow-sm">
                                            <div className="flex flex-col"><span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Upskill Cost</span> <span className="font-bold">${res.upskill_cost_estimate?.toLocaleString() || "N/A"}</span></div>
                                            <div className="flex flex-col"><span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hire Cost</span> <span className="font-bold">${res.hire_cost_estimate?.toLocaleString() || "N/A"}</span></div>
                                            <div className="flex flex-col"><span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Upskill Time</span> <span className="font-bold">{res.time_to_upskill_months} months</span></div>
                                            <div className="flex flex-col"><span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hire Time</span> <span className="font-bold">{res.time_to_hire_months} months</span></div>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
