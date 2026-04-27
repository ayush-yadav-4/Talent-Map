"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Trophy, BarChart3 } from "lucide-react";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cn } from "@/lib/utils";
import { cardSurfaceClass } from "@/lib/ui";

type ScoreRow = {
  session_id: string;
  assessment_id: string;
  assessment_title: string;
  assessment_type: "current_assessment" | "skill_test";
  score: number;
  questions_served: number;
  total_answers: number;
  correct_answers: number;
  wrong_answers: number;
  percentage_score: number;
  completed_at: string | null;
};

export default function EmployeeScoresPage() {
  const { ready, user } = useRequireAuth(["employee", "org_admin", "hr_manager"]);

  const { data, isLoading } = useQuery({
    queryKey: ["employee-assessment-scores", user?.employee_id],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/assessments/my-scores");
      return data as ScoreRow[];
    },
    enabled: ready && Boolean(user?.employee_id),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const grouped = useMemo(() => {
    const current = (data ?? []).filter((item) => item.assessment_type !== "skill_test");
    const tests = (data ?? []).filter((item) => item.assessment_type === "skill_test");
    return { current, tests };
  }, [data]);

  if (!ready) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <section className={cn(cardSurfaceClass, "p-6 shadow-sm")}>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-50 dark:bg-tw-raised p-2">
            <Trophy className="h-5 w-5 text-brand-600 dark:text-tw-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">My Assessment Scores</h1>
            <p className="text-sm text-slate-600 dark:text-tw-muted">
              Track all your completed assessment scores and progress.
            </p>
          </div>
        </div>
      </section>

      <section className={cn(cardSurfaceClass, "p-6 shadow-sm")}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-tw-text mb-4">Current Assessment Scores</h2>
        {isLoading ? (
          <p className="text-sm text-slate-600 dark:text-tw-muted">Loading scores...</p>
        ) : (grouped.current.length ?? 0) > 0 ? (
          <div className="space-y-3">
            {grouped.current.map((row) => (
              <div
                key={row.session_id}
                className="rounded-xl border border-slate-200 dark:border-tw-border bg-slate-50 dark:bg-tw-raised p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-tw-text">{row.assessment_title}</p>
                    <p className="text-xs text-slate-500 dark:text-tw-muted">
                      {row.questions_served} questions served
                      {` · ${row.correct_answers} correct · ${row.wrong_answers} wrong`}
                      {row.completed_at ? ` · ${new Date(row.completed_at).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5">
                    <BarChart3 className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                    <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                      {row.score.toFixed(2)} / 5.00
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-tw-muted">
            No completed assessment scores yet. Start and finish an assessment to see your score history here.
          </p>
        )}
      </section>

      <section className={cn(cardSurfaceClass, "p-6 shadow-sm")}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-tw-text mb-4">Test My Skills Scores</h2>
        {isLoading ? (
          <p className="text-sm text-slate-600 dark:text-tw-muted">Loading skill test scores...</p>
        ) : grouped.tests.length > 0 ? (
          <div className="space-y-3">
            {grouped.tests.map((row) => (
              <div
                key={row.session_id}
                className="rounded-xl border border-slate-200 dark:border-tw-border bg-slate-50 dark:bg-tw-raised p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-tw-text">{row.assessment_title}</p>
                    <p className="text-xs text-slate-500 dark:text-tw-muted">
                      {row.questions_served} questions served
                      {` · ${row.correct_answers} correct · ${row.wrong_answers} wrong`}
                      {row.completed_at ? ` · ${new Date(row.completed_at).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg bg-red-100 dark:bg-red-900/30 px-3 py-1.5">
                    <BarChart3 className="h-4 w-4 text-red-700 dark:text-red-300" />
                    <span className="text-sm font-bold text-red-800 dark:text-red-200">
                      {row.percentage_score.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-tw-muted">
            No completed skill tests yet. Use <span className="font-semibold">Test My Skills</span> to start a 20-question test.
          </p>
        )}
      </section>
    </div>
  );
}
