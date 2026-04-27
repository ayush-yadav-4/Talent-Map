"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  Sparkles, 
  Search, 
  User, 
  Briefcase, 
  TrendingDown, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { cardSurfaceClass } from "@/lib/ui";

export default function HRSkillGapsPage() {
  const [search, setSearch] = useState("");

  const { data: gaps, isLoading } = useQuery({
    queryKey: ["all-skill-gaps"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/job-descriptions/all/gaps");
      return data as any[];
    }
  });

  const filteredGaps = gaps?.filter(g => 
    g.employee_name.toLowerCase().includes(search.toLowerCase()) || 
    g.jd_title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Organization Skill Gaps</h1>
        <p className="text-sm text-slate-500 dark:text-tw-muted mt-1">
          Review employee alignment with job descriptions and identified growth areas.
        </p>
      </div>

      <div className={cn(cardSurfaceClass, "p-4")}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by employee or role..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-4">
          {filteredGaps?.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl">
              <TrendingDown className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-400">No gap analyses found</h3>
              <p className="text-sm text-slate-400 mt-2">When employees compare their skills against JDs, the results will appear here.</p>
            </div>
          ) : (
            filteredGaps?.map(gap => (
              <div key={gap.id} className={cn(cardSurfaceClass, "p-6 hover:shadow-md transition-all")}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-lg">
                      {gap.employee_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{gap.employee_name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <Briefcase className="h-3 w-3" /> Compared against: <span className="font-semibold text-slate-700">{gap.jd_title}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase">Fit Score</span>
                      <span className={cn(
                        "text-xl font-black px-3 py-1 rounded-lg",
                        gap.fit_score > 70 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {gap.fit_score}%
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">Analyzed on {new Date(gap.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Key Strengths
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(gap.analysis_results.strengths || []).slice(0, 4).map((s: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[11px] rounded-md border border-emerald-100">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5" /> Identified Gaps
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(gap.analysis_results.gaps || []).slice(0, 4).map((g: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-amber-50 text-amber-700 text-[11px] rounded-md border border-amber-100">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-600 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" /> AI Recommendations
                    </h4>
                    <p className="text-xs text-slate-600 italic line-clamp-3">
                      "{gap.analysis_results.recommendations?.[0] || "Continue current learning path."}"
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
