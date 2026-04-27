"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { agentApi } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { Badge } from "@/components/ui";
import { Button } from "@/components/ui";
import { Users, Target, ArrowRight, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardSurfaceClass } from "@/lib/ui";

export function MatchingDashboard() {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const { data: roles } = useQuery({
    queryKey: ["matching-roles"],
    queryFn: async () => {
      const { data } = await agentApi.role.list();
      return data;
    }
  });

  const { data: topMatches, isLoading: matchesLoading } = useQuery({
    queryKey: ["role-matches", selectedRoleId],
    queryFn: async () => {
      if (!selectedRoleId) return null;
      const { data } = await agentApi.matching.getTopEmployees(selectedRoleId);
      return data;
    },
    enabled: !!selectedRoleId
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand-100 dark:bg-tw-blue/20 rounded-lg">
          <Target className="h-5 w-5 text-brand-600 dark:text-tw-blue" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-tw-text">Internal Mobility & Matching</h2>
          <p className="text-xs text-slate-500 dark:text-tw-muted">Find the best internal talent for your open roles using AI matching.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Role List */}
        <div className="md:col-span-1 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">Active Roles</h3>
          <div className="space-y-2">
            {roles?.map((role: any) => (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all duration-200",
                  selectedRoleId === role.id 
                    ? "bg-brand-50 border-brand-300 dark:bg-tw-blue/10 dark:border-tw-blue shadow-md" 
                    : "bg-white border-slate-200 hover:border-brand-200 dark:bg-tw-card dark:border-tw-border"
                )}
              >
                <p className="text-sm font-bold text-slate-900 dark:text-tw-text">{role.job_title}</p>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{role.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Matches List */}
        <div className="md:col-span-2">
          {!selectedRoleId ? (
            <div className={cn(cardSurfaceClass, "h-full flex flex-col items-center justify-center p-12 text-center border-dashed border-2")}>
              <Users className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 text-sm">Select a role to see matching employees</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">Top Talent Matches</h3>
              
              {matchesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-slate-100 dark:bg-tw-raised animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {topMatches?.map((match: any) => (
                    <div 
                      key={match.employee_id}
                      className={cn(cardSurfaceClass, "p-4 hover:shadow-md transition-shadow border-brand-50")}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-brand-700">
                            {match.full_name.split(' ').map((n:any) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-tw-text">{match.full_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] bg-brand-50 text-brand-700 border-brand-100">
                                {match.match_score}% Match
                              </Badge>
                              {match.gaps.length === 0 ? (
                                <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Ready
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-600 flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" /> {match.gaps.length} Growth Areas
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <Button variant="ghost" size="sm" className="gap-2 text-xs">
                          View Fit Analysis <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>

                      {match.gaps.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-50 flex flex-wrap gap-2">
                           <span className="text-[10px] uppercase font-bold text-slate-400 mr-2">Top Gaps:</span>
                           {match.gaps.slice(0, 3).map((gap: any, i: number) => (
                             <Badge key={i} variant="secondary" className="text-[9px] bg-slate-100 text-slate-600 dark:bg-tw-raised dark:text-tw-muted border-none">
                               {gap.skill} (-{gap.gap.toFixed(1)})
                             </Badge>
                           ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChevronRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
