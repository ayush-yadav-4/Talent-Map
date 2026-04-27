"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpenCheck, ExternalLink, Sparkles } from "lucide-react";
import { employeeApi, reportApi } from "@/lib/api";
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
  gapCourses: { title: string; provider: string; level: string; url: string }[];
  upgradeCourses: { title: string; provider: string; level: string; url: string }[];
};

type BestSkillSuggestion = {
  skillName: string;
  roleTitle: string;
  strengthScore: number;
  courses: { title: string; provider: string; level: string; url: string }[];
};

const COURSE_BASE_BY_SKILL_KEYWORD: Array<{
  keyword: string;
  courses: { title: string; provider: string; level: string; url: string }[];
}> = [
  {
    keyword: "python",
    courses: [
      { title: "Python for Everybody", provider: "Coursera", level: "Beginner", url: "https://www.coursera.org/specializations/python" },
      { title: "Complete Python Bootcamp", provider: "Udemy", level: "Beginner-Intermediate", url: "https://www.udemy.com/course/complete-python-bootcamp/" },
    ],
  },
  {
    keyword: "react",
    courses: [
      { title: "React - The Complete Guide", provider: "Udemy", level: "Intermediate", url: "https://www.udemy.com/course/react-the-complete-guide-incl-redux/" },
      { title: "Frontend Developer (React)", provider: "Meta/Coursera", level: "Intermediate", url: "https://www.coursera.org/professional-certificates/meta-front-end-developer" },
    ],
  },
  {
    keyword: "sql",
    courses: [
      { title: "SQL for Data Science", provider: "Coursera", level: "Beginner", url: "https://www.coursera.org/learn/sql-for-data-science" },
      { title: "The Complete SQL Bootcamp", provider: "Udemy", level: "Beginner-Intermediate", url: "https://www.udemy.com/course/the-complete-sql-bootcamp/" },
    ],
  },
  {
    keyword: "leadership",
    courses: [
      { title: "Leading People and Teams", provider: "Coursera", level: "Intermediate", url: "https://www.coursera.org/specializations/leading-people-teams" },
      { title: "Developing Your Leadership Style", provider: "LinkedIn Learning", level: "Intermediate", url: "https://www.linkedin.com/learning/" },
    ],
  },
];

const GENERIC_COURSES = [
  { title: "Learning How to Learn", provider: "Coursera", level: "All Levels", url: "https://www.coursera.org/learn/learning-how-to-learn" },
  { title: "Career Essentials in Professional Skills", provider: "LinkedIn/Microsoft", level: "All Levels", url: "https://www.linkedin.com/learning/" },
];

const UPGRADE_COURSES_BY_SKILL_KEYWORD: Array<{
  keyword: string;
  courses: { title: string; provider: string; level: string; url: string }[];
}> = [
  {
    keyword: "python",
    courses: [
      { title: "Advanced Python", provider: "LinkedIn Learning", level: "Advanced", url: "https://www.linkedin.com/learning/" },
      { title: "Python Design Patterns", provider: "Pluralsight", level: "Advanced", url: "https://www.pluralsight.com/" },
    ],
  },
  {
    keyword: "react",
    courses: [
      { title: "Advanced React Patterns", provider: "Frontend Masters", level: "Advanced", url: "https://frontendmasters.com/" },
      { title: "React Performance", provider: "Udemy", level: "Advanced", url: "https://www.udemy.com/" },
    ],
  },
  {
    keyword: "sql",
    courses: [
      { title: "Advanced SQL for Analytics", provider: "Coursera", level: "Advanced", url: "https://www.coursera.org/" },
      { title: "SQL Query Optimization", provider: "Udemy", level: "Advanced", url: "https://www.udemy.com/" },
    ],
  },
];

function getCoursesForSkill(skillName: string) {
  const lower = skillName.toLowerCase();
  const match = COURSE_BASE_BY_SKILL_KEYWORD.find((entry) => lower.includes(entry.keyword));
  return match?.courses ?? GENERIC_COURSES;
}

function getUpgradeCoursesForSkill(skillName: string) {
  const lower = skillName.toLowerCase();
  const match = UPGRADE_COURSES_BY_SKILL_KEYWORD.find((entry) => lower.includes(entry.keyword));
  return match?.courses ?? GENERIC_COURSES;
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
        gapCourses: getCoursesForSkill(gap.skillName),
        upgradeCourses: getUpgradeCoursesForSkill(gap.skillName),
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
        courses: getCoursesForSkill(item.skill_name),
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
              Personalized course recommendations based on your current role and open skill gaps.
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
          <p className="text-sm text-slate-600 dark:text-tw-muted">Loading course suggestions...</p>
        ) : highPrioritySuggestions.length > 0 ? (
          <div className="space-y-4">
            {highPrioritySuggestions.map((item) => (
              <div
                key={item.skillName}
                className="rounded-xl border border-slate-200 dark:border-tw-border bg-slate-50 dark:bg-tw-raised p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-tw-text">{item.skillName}</p>
                    <p className="text-xs text-slate-500 dark:text-tw-muted mt-1">{item.reason}</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                      item.priority === "High"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                    )}
                  >
                    {item.priority} Priority
                  </span>
                </div>

                <p className="mt-3 text-xs font-semibold text-slate-700 dark:text-tw-text">Gap-Closure Courses</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {item.gapCourses.map((course) => (
                    <a
                      key={`${item.skillName}-${course.title}-gap`}
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
                        <ExternalLink className="h-4 w-4 text-slate-400" />
                      </div>
                    </a>
                  ))}
                </div>

                <p className="mt-3 text-xs font-semibold text-slate-700 dark:text-tw-text">Skill-Upgrade Courses</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {item.upgradeCourses.map((course) => (
                    <a
                      key={`${item.skillName}-${course.title}-upgrade`}
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
                        <ExternalLink className="h-4 w-4 text-slate-400" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
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
          <p className="text-sm text-slate-600 dark:text-tw-muted">Loading best skill courses...</p>
        ) : bestSkillSuggestions.length > 0 ? (
          <div className="space-y-4">
            {bestSkillSuggestions.map((item) => (
              <div
                key={`${item.skillName}-best`}
                className="rounded-xl border border-slate-200 dark:border-tw-border bg-slate-50 dark:bg-tw-raised p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-tw-text">{item.skillName}</p>
                    <p className="text-xs text-slate-500 dark:text-tw-muted mt-1">
                      Strength score {item.strengthScore.toFixed(2)} for {item.roleTitle}. Use these courses to deepen expertise.
                    </p>
                  </div>
                  <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    Best Skill
                  </span>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {item.courses.map((course) => (
                    <a
                      key={`${item.skillName}-${course.title}-best`}
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
                        <ExternalLink className="h-4 w-4 text-slate-400" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
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
