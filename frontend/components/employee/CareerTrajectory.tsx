"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cardSurfaceClass } from "@/lib/ui";
import { TrendingUp, Calendar, Target, Award, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type CareerTrajectoryProps = {
  /** When set (e.g. HR viewing an employee), loads that employee's stored trajectory instead of the logged-in user. */
  employeeId?: string;
};

export function CareerTrajectory({ employeeId: employeeIdProp }: CareerTrajectoryProps = {}) {
  const { data: trajectory, isLoading } = useQuery({
    queryKey: ["career-trajectory-latest", employeeIdProp ?? "self"],
    queryFn: async () => {
      let employeeId = employeeIdProp;
      if (!employeeId) {
        const userRaw = typeof window !== "undefined" ? sessionStorage.getItem("tm_user") : null;
        const user = userRaw ? JSON.parse(userRaw) : null;
        employeeId = user?.employee_id;
      }
      if (!employeeId) return null;
      const { data } = await api.get(`/api/v1/employee-skills/${employeeId}/sync-ai-insights/latest`);
      if (!data?.found) return null;
      return data?.data?.payload?.trajectory ?? null;
    },
  });

  if (isLoading) {
    return (
      <div className={cn(cardSurfaceClass, "p-8 flex flex-col items-center justify-center")}>
        <Loader2 className="h-8 w-8 text-brand-600 animate-spin mb-4" />
        <p className="text-sm text-slate-500">Predicting your career path...</p>
      </div>
    );
  }

  if (!trajectory) return null;

  return (
    <div className={cn(cardSurfaceClass, "p-6 shadow-lg overflow-hidden relative")}>
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <TrendingUp className="h-32 w-32" />
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-brand-100 dark:bg-tw-blue/20 rounded-lg">
          <TrendingUp className="h-5 w-5 text-brand-600 dark:text-tw-blue" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-tw-text">Career Trajectory Prediction</h2>
          <p className="text-xs text-slate-500 dark:text-tw-muted">AI-driven projection of your professional growth over the next 12 months.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {trajectory.milestones.map((milestone: any, idx: number) => (
          <div key={idx} className="relative p-6 bg-slate-50 dark:bg-tw-raised rounded-2xl border border-slate-100 dark:border-tw-border group hover:border-brand-200 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand-600" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{milestone.timeframe}</span>
              </div>
              <div className="text-[10px] font-bold px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full">
                {Math.round(milestone.confidence_score * 100)}% Confidence
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 dark:text-tw-text mb-1">Predicted: {milestone.predicted_role}</h3>
            <p className="text-xs text-slate-500 mb-4 italic">"{trajectory.current_path}"</p>

            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">Target Skills to Acquire:</p>
              <div className="flex flex-wrap gap-2">
                {milestone.expected_skills.map((skill: string, sidx: number) => (
                  <div key={sidx} className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-tw-card border border-slate-200 dark:border-tw-border rounded-lg text-xs text-slate-700 dark:text-tw-muted shadow-sm">
                    <Target className="h-3 w-3 text-brand-500" />
                    {skill}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs text-slate-500">Growth Readiness</div>
              <div className="flex-1 max-w-[120px] h-1.5 bg-slate-200 dark:bg-tw-border rounded-full mx-4">
                <div 
                  className="h-full bg-brand-600 rounded-full" 
                  style={{ width: `${trajectory.readiness_score}%` }} 
                />
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-tw-text">{trajectory.readiness_score}%</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="h-5 w-5 text-emerald-600" />
          <p className="text-sm text-emerald-800 dark:text-emerald-400 font-medium">
            You are currently on track for a promotion. Keep up the learning!
          </p>
        </div>
        <button className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1">
          Full Report <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
