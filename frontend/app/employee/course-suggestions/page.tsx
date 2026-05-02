"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpenCheck, ExternalLink, Sparkles } from "lucide-react";
import { employeeApi, reportApi, agentApi } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cn } from "@/lib/utils";
import { cardSurfaceClass } from "@/lib/ui";

type EmployeeProfilePayload = {
  employee: {
    full_name: string;
    job_title?: string | null;
  };
  skill_scores?: { skill_name: string; proficiency_score: number }[];
  gaps: { skill_name: string; gap_magnitude: number; criticality: string; status: string }[];
};
type EmployeeDashboardPayload = {
  top_gaps: { skill: string; gap: number; criticality: string; priority: number }[];
};

type CourseSuggestion = {
  skillName: string;
  roleTitle: string;
  priority: "High" | "Medium";
  reason: string;
};

type BestSkillSuggestion = {
  skillName: string;
  roleTitle: string;
  strengthScore: number;
};

function SkillCourseCard({
  skillName,
  roleTitle,
  priority,
  reason,
  isStrength
}: {
  skillName: string;
  roleTitle: string;
  priority?: "High" | "Medium";
  reason?: string;
  isStrength?: boolean;
}) {
  const { data: courses, isLoading } = useQuery({
    queryKey: ["agent-courses", skillName, roleTitle],
    queryFn: async () => {
      const { data } = await agentApi.learning.getCourses(skillName, roleTitle);
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache
    refetchOnWindowFocus: false,
  });

  return (
    <div className="rounded-xl border border-slate-200 dark:border-tw-border bg-slate-50 dark:bg-tw-raised p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-tw-text">{skillName}</p>
          {reason && <p className="text-xs text-slate-500 dark:text-tw-muted mt-1">{reason}</p>}
        </div>
        {priority && (
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
              priority === "High"
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
            )}
          >
            {priority} Priority
          </span>
        )}
        {isStrength && (
          <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            Best Skill
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="mt-4 animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
          </div>
        </div>
      ) : courses ? (
        <>
          {courses.gap_courses?.length > 0 && (
            <>
              <p className="mt-3 text-xs font-semibold text-slate-700 dark:text-tw-text">Gap-Closure Courses</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {courses.gap_courses.map((course: any, i: number) => (
                  <a
                    key={i}
                    href={course.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-200 dark:border-tw-border bg-white dark:bg-tw-card p-3 hover:border-brand-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-tw-text">{course.title}</p>
                        <p className="text-xs text-slate-500 dark:text-tw-muted mt-1">
                          {course.provider} · {course.level}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-400 shrink-0" />
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}

          {courses.upgrade_courses?.length > 0 && (
            <>
              <p className="mt-3 text-xs font-semibold text-slate-700 dark:text-tw-text">Skill-Upgrade Courses</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {courses.upgrade_courses.map((course: any, i: number) => (
                  <a
                    key={i}
                    href={course.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-200 dark:border-tw-border bg-white dark:bg-tw-card p-3 hover:border-brand-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-tw-text">{course.title}</p>
                        <p className="text-xs text-slate-500 dark:text-tw-muted mt-1">
                          {course.provider} · {course.level}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-400 shrink-0" />
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Failed to load courses.</p>
      )}
    </div>
  );
}

export default function EmployeeCourseSuggestionsPage() {
  const { ready, user } = useRequireAuth(["employee", "org_admin", "hr_manager"]);
  const employeeId = user?.employee_id;

  const { data, isLoading } = useQuery({
    queryKey: ["employee-course-suggestions", employeeId],
    queryFn: async () => {
      const { data } = await employeeApi.getProfile(employeeId!);
      return data as EmployeeProfilePayload;
    },
    enabled: ready && Boolean(employeeId),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ["employee-course-suggestions-dashboard-gaps", employeeId],
    queryFn: async () => {
      const { data } = await reportApi.employeeDashboard(employeeId!);
      return data as EmployeeDashboardPayload;
    },
    enabled: ready && Boolean(employeeId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const highPrioritySuggestions = useMemo<CourseSuggestion[]>(() => {
    const roleTitle = data?.employee.job_title?.trim() || "your current role";
    const profileGaps = (data?.gaps ?? [])
      .filter((gap) => {
        const normalized = String(gap.status ?? "").trim().toLowerCase();
        // Be tolerant to status variants (open / OPEN / in_progress / missing)
        return normalized === "" || normalized === "open" || normalized === "in_progress";
      })
      .map((gap) => ({
        skillName: gap.skill_name,
        gapMagnitude: Number(gap.gap_magnitude ?? 0),
        criticality: gap.criticality || "important",
      }));

    const dashboardGaps = (dashboardData?.top_gaps ?? []).map((gap) => ({
      skillName: gap.skill,
      gapMagnitude: Number(gap.gap ?? 0),
      criticality: gap.criticality || "important",
    }));

    const mergedBySkill = new Map<string, { skillName: string; gapMagnitude: number; criticality: string }>();
    [...profileGaps, ...dashboardGaps].forEach((g) => {
      if (!g.skillName) return;
      const key = g.skillName.trim().toLowerCase();
      const existing = mergedBySkill.get(key);
      if (!existing || g.gapMagnitude > existing.gapMagnitude) {
        mergedBySkill.set(key, g);
      }
    });

    const mergedGaps = Array.from(mergedBySkill.values())
      .sort((a, b) => b.gapMagnitude - a.gapMagnitude)
      .slice(0, 8);

    return mergedGaps.map((gap, index) => {
      const priority: "High" | "Medium" = index < 3 ? "High" : "Medium";
      return {
        skillName: gap.skillName,
        roleTitle,
        priority,
        reason: `This skill has a ${gap.gapMagnitude.toFixed(2)} gap for ${roleTitle}, so improving it should be your top learning priority.`,
      };
    });
  }, [data, dashboardData]);

  const bestSkillSuggestions = useMemo<BestSkillSuggestion[]>(() => {
    const roleTitle = data?.employee.job_title?.trim() || "your current role";
    const strongestSkills = (data?.skill_scores ?? [])
      .sort((a, b) => Number(b.proficiency_score ?? 0) - Number(a.proficiency_score ?? 0))
      .slice(0, 6);

    return strongestSkills.map((item) => ({
        skillName: item.skill_name,
        roleTitle,
        strengthScore: Number(item.proficiency_score ?? 0),
      }));
  }, [data]);

  if (!ready) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className={cn(cardSurfaceClass, "p-6 shadow-sm")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Course Suggestions</h1>
            <p className="text-sm text-slate-600 dark:text-tw-muted mt-1">
              Personalized course recommendations generated dynamically by AI based on your specific role and skill gaps.
            </p>
          </div>
          <div className="rounded-xl bg-brand-50 dark:bg-tw-raised p-2">
            <Sparkles className="h-5 w-5 text-brand-600 dark:text-tw-blue" />
          </div>
        </div>
      </section>

      <section className={cn(cardSurfaceClass, "p-6 shadow-sm")}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-tw-text mb-4">
          High Priority Suggestions (Based on Skill Gaps)
        </h2>
        {isLoading || isLoadingDashboard ? (
          <p className="text-sm text-slate-600 dark:text-tw-muted">Loading your skill profile...</p>
        ) : highPrioritySuggestions.length > 0 ? (
          <div className="space-y-4">
            {highPrioritySuggestions.map((item) => (
              <SkillCourseCard 
                key={item.skillName}
                skillName={item.skillName}
                roleTitle={item.roleTitle}
                priority={item.priority}
                reason={item.reason}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-tw-border p-6 text-center">
            <BookOpenCheck className="h-8 w-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-600 dark:text-tw-muted">
              No open skill gaps found yet. Complete assessments to generate gap-based high priority suggestions.
            </p>
          </div>
        )}
      </section>

      <section className={cn(cardSurfaceClass, "p-6 shadow-sm")}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-tw-text mb-4">
          Best Skill Courses (Role-Aligned Growth)
        </h2>
        {isLoading ? (
          <p className="text-sm text-slate-600 dark:text-tw-muted">Loading your skill profile...</p>
        ) : bestSkillSuggestions.length > 0 ? (
          <div className="space-y-4">
            {bestSkillSuggestions.map((item) => (
              <SkillCourseCard 
                key={`${item.skillName}-best`}
                skillName={item.skillName}
                roleTitle={item.roleTitle}
                isStrength={true}
                reason={`Strength score ${item.strengthScore.toFixed(2)} for ${item.roleTitle}. Use these courses to deepen expertise.`}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-tw-border p-6 text-center">
            <BookOpenCheck className="h-8 w-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-600 dark:text-tw-muted">
              Best skill course suggestions will appear after skill scores are available.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
