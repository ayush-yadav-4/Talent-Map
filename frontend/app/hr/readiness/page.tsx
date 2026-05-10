"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Target, 
  TrendingUp, 
  MoveUpRight, 
  Search, 
  Users, 
  Loader2, 
  Sparkles, 
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  ChevronRight
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { employeeApi, reportApi, readStoredUser } from "@/lib/api";
import { cardSurfaceClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default function ReadinessMobilityPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["hr-readiness-employees"],
    queryFn: async () => {
      const { data } = await employeeApi.list();
      return data as any[];
    }
  });

  const { data: scorecard, isLoading: isLoadingScorecard, error: scorecardError } = useQuery({
    queryKey: ["readiness-scorecard", selectedEmployeeId],
    queryFn: async () => {
      if (!selectedEmployeeId) return null;
      const { data } = await reportApi.getReadinessScorecard(selectedEmployeeId);
      return data as any;
    },
    enabled: !!selectedEmployeeId,
    retry: false
  });

  const filteredEmployees = employees?.filter(emp => 
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedEmployee = employees?.find(emp => emp.id === selectedEmployeeId);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text flex items-center gap-2">
            <Target className="h-6 w-6 text-brand-600" /> Manager Copilot
          </h1>
          <p className="text-sm text-slate-500 dark:text-tw-muted mt-1">
            AI-driven readiness scorecards for succession planning and internal mobility.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Employee List Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search employees..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className={cn(cardSurfaceClass, "overflow-hidden flex flex-col max-h-[600px]")}>
            <div className="p-3 border-b border-slate-100 dark:border-tw-border bg-slate-50/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team Members</p>
            </div>
            <div className="overflow-y-auto flex-1">
              {isLoadingEmployees ? (
                <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>
              ) : filteredEmployees?.length === 0 ? (
                <p className="p-4 text-center text-sm text-slate-500">No employees found</p>
              ) : (
                filteredEmployees?.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className={cn(
                      "w-full p-4 flex items-center gap-3 transition-all border-b border-slate-50 dark:border-tw-border/50 hover:bg-slate-50 dark:hover:bg-tw-raised text-left",
                      selectedEmployeeId === emp.id ? "bg-brand-50/80 dark:bg-brand-900/20 border-l-4 border-l-brand-600" : ""
                    )}
                  >
                    <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-tw-raised flex items-center justify-center font-bold text-slate-500 text-xs shrink-0">
                      {emp.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-tw-text truncate">{emp.full_name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{emp.job_title || "Unassigned"}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 ml-auto text-slate-300 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Scorecard Display */}
        <div className="lg:col-span-3 space-y-6">
          {!selectedEmployeeId ? (
            <div className={cn(cardSurfaceClass, "flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 min-h-[500px]")}>
              <div className="p-4 bg-slate-100 rounded-full mb-4">
                <Users className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-tw-text mb-2">Select an Employee</h3>
              <p className="text-sm text-slate-500 dark:text-tw-muted max-w-xs">
                Select a team member from the list to analyze their career readiness and mobility fit.
              </p>
            </div>
          ) : isLoadingScorecard ? (
            <div className={cn(cardSurfaceClass, "flex flex-col items-center justify-center p-12 text-center min-h-[500px]")}>
              <div className="relative mb-6">
                <div className="h-20 w-20 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-brand-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-tw-text mb-2">Analyzing Readiness...</h3>
              <p className="text-sm text-slate-500 dark:text-tw-muted animate-pulse">
                Gemini is evaluating skills, experience, and mobility paths for {selectedEmployee?.full_name}
              </p>
            </div>
          ) : scorecardError ? (
            <div className={cn(cardSurfaceClass, "flex flex-col items-center justify-center p-12 text-center text-red-500 min-h-[500px]")}>
              <AlertCircle className="h-12 w-12 mb-4" />
              <h3 className="text-lg font-bold mb-2">Analysis Failed</h3>
              <p className="text-sm opacity-80">Could not generate readiness scorecard at this time.</p>
              <Button variant="outline" className="mt-4" onClick={() => setSelectedEmployeeId(selectedEmployeeId)}>Retry</Button>
            </div>
          ) : scorecard && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
              {/* Profile Overview Header */}
              <div className={cn(cardSurfaceClass, "p-6 bg-gradient-to-r from-slate-900 to-brand-900 text-white border-none")}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl font-bold border border-white/20">
                      {selectedEmployee?.full_name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{selectedEmployee?.full_name}</h2>
                      <p className="text-brand-200 text-sm flex items-center gap-2">
                        {selectedEmployee?.job_title} <span className="opacity-40">|</span> {selectedEmployee?.seniority_level || "Standard Level"}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 min-w-[200px]">
                    <p className="text-[10px] font-bold text-brand-200 uppercase mb-1">Recommended Path</p>
                    <p className="text-sm font-bold flex items-center gap-2">
                      <MoveUpRight className="h-4 w-4 text-cyan-400" /> {scorecard.recommended_next_role}
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Scores Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ScoreCard 
                  label="Role Fit" 
                  score={scorecard.role_fit_score} 
                  icon={ShieldCheck} 
                  color="emerald" 
                  desc="Alignment with current role expectations."
                />
                <ScoreCard 
                  label="Promotion Fit" 
                  score={scorecard.promotion_fit_score} 
                  icon={TrendingUp} 
                  color="brand" 
                  desc="Readiness for next seniority level."
                />
                <ScoreCard 
                  label="Mobility Fit" 
                  score={scorecard.internal_mobility_score} 
                  icon={Zap} 
                  color="cyan" 
                  desc="Cross-functional adaptability."
                />
              </div>

              {/* Detailed Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className={cn(cardSurfaceClass, "p-6")}>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-tw-text mb-4 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Key Strengths
                    </h3>
                    <div className="space-y-3">
                      {scorecard.strengths.map((str: string, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg text-sm text-slate-700 dark:text-tw-muted border border-emerald-100/50">
                          <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          {str}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={cn(cardSurfaceClass, "p-6")}>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-tw-text mb-4 uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" /> Critical Skills Missing
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {scorecard.critical_skills_missing.map((skill: string, i: number) => (
                        <div key={i} className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold border border-amber-200/50">
                          {skill}
                        </div>
                      ))}
                    </div>
                    {scorecard.critical_skills_missing.length === 0 && (
                      <p className="text-sm text-slate-400 italic">No critical gaps identified.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className={cn(cardSurfaceClass, "p-6 border-l-4 border-l-brand-500")}>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-tw-text mb-3 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-brand-500" /> AI Readiness Summary
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-tw-muted leading-relaxed italic">
                      &quot;{scorecard.readiness_summary}&quot;
                    </p>
                  </div>

                  <div className={cn(cardSurfaceClass, "p-6")}>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-tw-text mb-4 uppercase tracking-wider flex items-center gap-2">
                      <Users className="h-4 w-4 text-cyan-500" /> Internal Mobility Paths
                    </h3>
                    <div className="space-y-4">
                      {scorecard.mobility_recommendations.map((role: string, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 border border-slate-100 dark:border-tw-border rounded-xl hover:bg-slate-50 dark:hover:bg-tw-raised transition-colors group cursor-default">
                          <p className="text-sm font-bold text-slate-700 dark:text-tw-text">{role}</p>
                          <ArrowRight className="h-4 w-4 text-slate-300 dark:text-tw-muted group-hover:text-brand-500 transition-colors" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, score, icon: Icon, color, desc }: { 
  label: string; 
  score: number; 
  icon: any; 
  color: "emerald" | "brand" | "cyan";
  desc: string;
}) {
  const colorClasses = {
    emerald: "text-emerald-600 bg-emerald-100 border-emerald-200 ring-emerald-500",
    brand: "text-brand-600 bg-brand-100 border-brand-200 ring-brand-500",
    cyan: "text-cyan-600 bg-cyan-100 border-cyan-200 ring-cyan-500",
  };

  return (
    <div className={cn(cardSurfaceClass, "p-5 flex flex-col group")}>
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2 rounded-lg", colorClasses[color].split(" ")[1])}>
          <Icon className={cn("h-5 w-5", colorClasses[color].split(" ")[0])} />
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-slate-900 dark:text-tw-text">{Math.round(score)}%</span>
        </div>
      </div>
      <h4 className="text-sm font-bold text-slate-900 dark:text-tw-text mb-1">{label}</h4>
      <p className="text-[11px] text-slate-500 dark:text-tw-muted leading-tight mb-4">{desc}</p>
      
      <div className="h-2 w-full bg-slate-100 dark:bg-tw-raised rounded-full overflow-hidden mt-auto">
        <div 
          className={cn("h-full transition-all duration-1000", 
            color === "emerald" ? "bg-emerald-500" : 
            color === "brand" ? "bg-brand-500" : "bg-cyan-500"
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
