"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, employeeApi, orgApi, reportApi } from "@/lib/api";
import {
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  Loader2,
  ChevronLeft,
  Star,
  Activity,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  LayoutGrid,
  Filter,
  Search,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { cardSurfaceClass } from "@/lib/ui";
import { LearningJourney } from "@/components/employee/LearningJourney";
import { CareerTrajectory } from "@/components/employee/CareerTrajectory";

function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.skill_name === "string") {
      const parts: string[] = [obj.skill_name];
      if (typeof obj.note === "string" && obj.note.trim()) parts.push(`- ${obj.note}`);
      if (typeof obj.proficiency === "number") parts.push(`(${obj.proficiency})`);
      return parts.join(" ");
    }
    const fallback = Object.values(obj).find((v) => typeof v === "string");
    if (typeof fallback === "string") return fallback;
  }
  return "N/A";
}

function formatDate(value?: string | null): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString();
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type DashboardStats = {
  total_skills_profiled: number;
  avg_proficiency: number;
  skills_by_domain: { domain: string; count: number; avg: number }[];
  top_gaps: { skill: string; gap: number; priority: number; criticality: string }[];
  total_gaps: number;
  recent_sessions: { id: string; status: string; proficiency?: number | null; completed_at?: string | null }[];
  certs_expiring_soon: number;
};

type ProfilePayload = {
  gaps: { skill_name: string; gap_magnitude: number; criticality: string; status: string }[];
  critical_gaps: number;
  expiring_certs: number;
};

type SectionFilter =
  | "all"
  | "overview"
  | "profile"
  | "projects"
  | "skills"
  | "gaps"
  | "assessments"
  | "jd"
  | "learning";

const SECTION_OPTIONS: { value: SectionFilter; label: string }[] = [
  { value: "all", label: "All sections" },
  { value: "overview", label: "Overview (dashboard)" },
  { value: "profile", label: "Profile & identity" },
  { value: "projects", label: "Projects" },
  { value: "skills", label: "Skills" },
  { value: "gaps", label: "Skill gaps" },
  { value: "assessments", label: "Assessments" },
  { value: "jd", label: "JD gap analyses" },
  { value: "learning", label: "Learning & career" },
];

export default function HREmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const employeeIdStr = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] ?? "" : "";

  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const q = searchQuery.trim().toLowerCase();
  const matches = (blob: string) => !q || blob.toLowerCase().includes(q);

  const isAll = sectionFilter === "all";
  const vis = {
    overview: isAll || sectionFilter === "overview",
    profile: isAll || sectionFilter === "profile",
    projects: isAll || sectionFilter === "projects",
    skills: isAll || sectionFilter === "skills",
    gaps: isAll || sectionFilter === "gaps",
    assessments: isAll || sectionFilter === "assessments",
    jd: isAll || sectionFilter === "jd",
    learningJourney: isAll || sectionFilter === "overview" || sectionFilter === "learning",
    careerTrajectory: isAll || sectionFilter === "learning",
  };

  const { data: profile, isLoading } = useQuery({
    queryKey: ["employee-full-profile", employeeIdStr],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/employees/${employeeIdStr}/full-profile`);
      return data;
    },
    enabled: Boolean(employeeIdStr),
  });

  const { data: dashboardStats, isLoading: loadingDash } = useQuery({
    queryKey: ["hr-employee-dashboard-stats", employeeIdStr],
    queryFn: async () => {
      const { data } = await reportApi.employeeDashboard(employeeIdStr);
      return data as DashboardStats;
    },
    enabled: Boolean(employeeIdStr),
  });

  const { data: empProfile } = useQuery({
    queryKey: ["hr-employee-profile", employeeIdStr],
    queryFn: async () => {
      const { data } = await employeeApi.getProfile(employeeIdStr);
      return data as ProfilePayload & { employee: Record<string, unknown> };
    },
    enabled: Boolean(employeeIdStr),
  });

  const orgId = profile?.employee?.org_id as string | undefined;

  const { data: orgProjects } = useQuery({
    queryKey: ["org-projects-hr-employee", orgId],
    queryFn: async () => {
      const { data } = await orgApi.listProjects(orgId!);
      return data as {
        id: string;
        name: string;
        status?: string | null;
        client_name?: string | null;
        deadline?: string | null;
        assignments: { employee_id: string; position?: string | null }[];
      }[];
    },
    enabled: Boolean(orgId) && Boolean(profile),
  });

  const projects = profile?.projects ?? [];
  const assessments = profile?.assessments ?? [];
  const skills = profile?.skills ?? [];
  const skillGaps = profile?.skill_gaps ?? [];
  const savedGaps = profile?.saved_gaps ?? [];

  const projectsEnriched = useMemo(() => {
    const list = orgProjects ?? [];
    return projects.map((p: Record<string, unknown>) => {
      const full = list.find((op) => op.id === p.id);
      return {
        ...p,
        client_name: full?.client_name ?? null,
        org_status: full?.status ?? null,
      };
    });
  }, [projects, orgProjects]);

  const activeProjectsCount = projects.filter((p: any) => String(p?.status ?? "").toLowerCase() === "active").length;
  const completedAssessmentsCount = assessments.filter(
    (a: any) => String(a?.status ?? "").toLowerCase() === "completed",
  ).length;

  const topDomains = (dashboardStats?.skills_by_domain ?? []).slice(0, 8);
  const topGapsDash = (dashboardStats?.top_gaps ?? []).slice(0, 6);
  const recentSessions = (dashboardStats?.recent_sessions ?? []).slice(0, 8);

  const filteredSkills = useMemo(() => {
    return skills.filter((s: any) =>
      matches(`${toText(s?.name ?? s?.skill_name)} ${s?.domain ?? ""} ${s?.score ?? ""}`),
    );
  }, [skills, q]);

  const filteredProjects = useMemo(() => {
    return projectsEnriched.filter((p: any) =>
      matches(`${p.name ?? ""} ${p.position ?? ""} ${p.status ?? ""} ${p.client_name ?? ""}`),
    );
  }, [projectsEnriched, q]);

  const filteredAssessments = useMemo(() => {
    return assessments.filter((a: any) =>
      matches(`${a.assessment_title ?? ""} ${a.status ?? ""} ${a.score ?? ""}`),
    );
  }, [assessments, q]);

  const filteredSkillGaps = useMemo(() => {
    return skillGaps.filter((g: any) =>
      matches(`${g.skill_name ?? ""} ${g.criticality ?? ""} ${g.gap_magnitude ?? ""}`),
    );
  }, [skillGaps, q]);

  const filteredSavedGaps = useMemo(() => {
    return savedGaps.filter((g: any) => matches(`${g.jd_title ?? ""} ${g.fit_score ?? ""}`));
  }, [savedGaps, q]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500 dark:text-tw-blue" />
      </div>
    );
  }
  if (!profile) {
    return <div className="p-20 text-center text-slate-600 dark:text-tw-muted">Employee not found</div>;
  }

  const emp = profile.employee;

  return (
    <div className="w-full max-w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-tw-muted dark:hover:text-tw-text"
      >
        <ChevronLeft className="h-4 w-4" /> Back to list
      </Button>

      {/* Header */}
      <div className={cn(cardSurfaceClass, "w-full p-8 relative overflow-hidden")}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
          <div className="h-24 w-24 rounded-3xl bg-brand-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-brand-500/20 shrink-0">
            {String(emp.full_name ?? "?").charAt(0)}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-tw-text">{emp.full_name}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-tw-muted">
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 shrink-0" /> {emp.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 shrink-0" /> {emp.job_title || "No Title"}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" /> {emp.location_city || "Unknown"}
              </span>
              <span className="flex items-center gap-1.5 font-bold text-brand-600 dark:text-tw-blue uppercase tracking-wider bg-brand-50 dark:bg-tw-blue/20 px-2 py-0.5 rounded text-[10px]">
                {emp.project_status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={cn(cardSurfaceClass, "w-full p-4 flex flex-col lg:flex-row gap-4 lg:items-end")}>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-tw-text shrink-0">
          <Filter className="h-4 w-4 text-brand-500" />
          Filter view
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search skills, projects, assessments, gaps, JD titles…"
              className="pl-9 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <LayoutGrid className="h-4 w-4 text-slate-400 shrink-0 hidden sm:block" />
            <select
              className={cn(
                "flex-1 min-w-[200px] h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-tw-border dark:bg-tw-card dark:text-tw-text",
              )}
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value as SectionFilter)}
            >
              {SECTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Overview stats — mirrors employee dashboard KPI row */}
      {vis.overview && (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 w-full">
          <div className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-tw-muted">Assigned projects</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-tw-text">{projects.length}</p>
          </div>
          <div className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-tw-muted">Skills tracked</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-tw-text">
              {loadingDash ? "…" : dashboardStats?.total_skills_profiled ?? skills.length}
            </p>
          </div>
          <div className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-tw-muted">Avg proficiency</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-tw-text">
              {loadingDash ? "…" : dashboardStats?.avg_proficiency ?? 0}
            </p>
          </div>
          <div className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-tw-muted">Open gaps</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-tw-text">
              {loadingDash ? "…" : dashboardStats?.total_gaps ?? skillGaps.length}
            </p>
          </div>
          <div className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-tw-muted">Critical gaps</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-tw-text">{empProfile?.critical_gaps ?? "—"}</p>
          </div>
          <div className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-tw-muted">Expiring certs</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-tw-text">
              {loadingDash ? "…" : dashboardStats?.certs_expiring_soon ?? empProfile?.expiring_certs ?? 0}
            </p>
          </div>
        </section>
      )}

      {/* Learning journey — same position as employee dashboard (after KPI cards) */}
      {vis.learningJourney && (
        <div className="w-full">
          <LearningJourney
            topGaps={topGapsDash}
            title="Learning journey (priority gaps)"
            subtitle="Same gap-based learning view as the employee dashboard. Pick a skill to preview curated steps."
          />
        </div>
      )}

      {vis.overview && (
        <div className="grid grid-cols-1 w-full">
          <div className={cn(cardSurfaceClass, "p-4 w-full")}>
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-tw-muted">Quick snapshot</p>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-slate-500 dark:text-tw-muted">Active projects</span>
                <p className="font-bold text-slate-900 dark:text-tw-text">{activeProjectsCount}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-tw-muted">Completed assessments</span>
                <p className="font-bold text-slate-900 dark:text-tw-text">{completedAssessmentsCount}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-tw-muted">Skills listed</span>
                <p className="font-bold text-slate-900 dark:text-tw-text">{skills.length}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-tw-muted">JD analyses saved</span>
                <p className="font-bold text-slate-900 dark:text-tw-text">{savedGaps.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee details */}
      {vis.profile && (
        <section className={cn(cardSurfaceClass, "w-full p-6 space-y-4")}>
          <h3 className="font-bold text-slate-900 dark:text-tw-text flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-brand-500" /> Employee details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-tw-border pb-2">
              <span className="text-slate-500 dark:text-tw-muted">Employee ID</span>
              <span className="font-semibold text-slate-900 dark:text-tw-text text-right break-all">{toText(emp.id)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-tw-border pb-2">
              <span className="text-slate-500 dark:text-tw-muted">Department</span>
              <span className="font-semibold text-slate-900 dark:text-tw-text">{toText(emp.dept_id)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-tw-border pb-2">
              <span className="text-slate-500 dark:text-tw-muted">Seniority</span>
              <span className="font-semibold text-slate-900 dark:text-tw-text">{toText(emp.seniority_level)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-tw-border pb-2">
              <span className="text-slate-500 dark:text-tw-muted">Employment type</span>
              <span className="font-semibold text-slate-900 dark:text-tw-text">{toText(emp.employment_type)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-tw-border pb-2">
              <span className="text-slate-500 dark:text-tw-muted">Experience</span>
              <span className="font-semibold text-slate-900 dark:text-tw-text">{toText(emp.years_of_experience)} years</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-tw-border pb-2">
              <span className="text-slate-500 dark:text-tw-muted">Employment status</span>
              <span className="font-semibold text-slate-900 dark:text-tw-text">{toText(emp.employment_status)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-tw-border pb-2">
              <span className="text-slate-500 dark:text-tw-muted">Joined on</span>
              <span className="font-semibold text-slate-900 dark:text-tw-text">{formatDate(emp.date_of_joining)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-tw-border pb-2">
              <span className="text-slate-500 dark:text-tw-muted">Profile created</span>
              <span className="font-semibold text-slate-900 dark:text-tw-text">{formatDate(emp.created_at)}</span>
            </div>
          </div>
        </section>
      )}

      {/* Dashboard parity blocks */}
      {vis.overview && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
            <section className={cn(cardSurfaceClass, "p-5 shadow-sm w-full")}>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Project assignment summary</h2>
              <div className="mt-3 space-y-2">
                {filteredProjects.length ? (
                  filteredProjects.map((project: any) => (
                    <div
                      key={String(project.id)}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-tw-border dark:bg-tw-raised"
                    >
                      <p className="text-sm font-medium text-slate-900 dark:text-tw-text">{project.name}</p>
                      <p className="text-xs text-slate-500 dark:text-tw-muted">
                        {(project.status ?? project.org_status ?? "planning")} · {project.client_name ?? "Internal"} ·{" "}
                        {project.position ?? "member"}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-tw-muted mt-1">
                        Deadline: {project.deadline ? formatDate(project.deadline) : "TBD"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600 dark:text-tw-muted">No matching projects.</p>
                )}
              </div>
            </section>

            <section className={cn(cardSurfaceClass, "p-5 shadow-sm w-full")}>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Skill domain health</h2>
              <div className="mt-3 space-y-2">
                {topDomains.length ? (
                  topDomains.map((domain) => (
                    <div key={domain.domain}>
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-tw-muted">
                        <span className="capitalize">{domain.domain}</span>
                        <span>
                          {domain.avg.toFixed(2)} / 5 ({domain.count} skills)
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-tw-raised">
                        <div
                          className="h-full rounded-full bg-brand-600 dark:bg-tw-blue"
                          style={{ width: `${Math.min(100, (domain.avg / 5) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600 dark:text-tw-muted">Skill analytics appear after data is recorded.</p>
                )}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
            <section className={cn(cardSurfaceClass, "p-5 shadow-sm w-full")}>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Priority gap action plan</h2>
              <div className="mt-3 space-y-2">
                {topGapsDash.length ? (
                  topGapsDash.map((gap) => (
                    <div
                      key={gap.skill}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-tw-border dark:bg-tw-raised"
                    >
                      <p className="text-sm font-medium text-slate-900 dark:text-tw-text">{gap.skill}</p>
                      <p className="text-xs text-slate-500 dark:text-tw-muted">
                        Gap {gap.gap.toFixed(2)} · {gap.criticality} · priority {gap.priority.toFixed(2)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600 dark:text-tw-muted">No open gaps detected in dashboard stats.</p>
                )}
              </div>
            </section>

            <section className={cn(cardSurfaceClass, "p-5 shadow-sm w-full")}>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Learning & compliance timeline</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-tw-muted">
                <li>Open critical gaps: {empProfile?.critical_gaps ?? 0}</li>
                <li>Expiring certifications: {empProfile?.expiring_certs ?? 0}</li>
                <li>
                  Suggested weekly learning target:{" "}
                  {Math.max(2, (empProfile?.critical_gaps ?? 0) * 2)} hours
                </li>
                <li>Compliance reminder: Keep certifications and mandatory skills current.</li>
              </ul>
            </section>
          </div>

          <section className={cn(cardSurfaceClass, "p-5 shadow-sm w-full")}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Saved JD gap summaries</h2>
              <Link
                href="/hr/job-descriptions"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-tw-blue"
              >
                Open job descriptions
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {savedGaps.length ? (
                filteredSavedGaps.slice(0, 12).map((item: any, idx: number) => {
                  const analysis = item.results ?? {};
                  const strengthsCount = Array.isArray(analysis.strengths) ? analysis.strengths.length : item.strengths_count ?? 0;
                  const gapsCount = Array.isArray(analysis.gaps) ? analysis.gaps.length : item.gaps_count ?? 0;
                  return (
                    <div
                      key={`${item.jd_title}-${idx}`}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-tw-border dark:bg-tw-raised"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-900 dark:text-tw-text">{item.jd_title}</p>
                        <span className="text-xs font-bold text-slate-700 dark:text-tw-text">{Math.round(item.fit_score)}% fit</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-tw-muted">
                        {strengthsCount} strengths · {gapsCount} gaps · {formatDate(item.created_at)}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-600 dark:text-tw-muted">No saved JD gap analyses for this employee.</p>
              )}
            </div>
          </section>

          <section className={cn(cardSurfaceClass, "p-5 shadow-sm w-full")}>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Recent assessment activity</h2>
            <div className="mt-3 space-y-2">
              {recentSessions.length ? (
                recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-tw-border dark:bg-tw-raised dark:text-tw-text"
                  >
                    Session {session.id.slice(0, 8)} · {session.status} · proficiency {session.proficiency ?? "N/A"}
                    {session.completed_at ? ` · ${formatDate(session.completed_at)}` : ""}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600 dark:text-tw-muted">No recent sessions in dashboard stats.</p>
              )}
            </div>
          </section>
        </>
      )}

      {/* Skills */}
      {vis.skills && (
        <section className={cn(cardSurfaceClass, "w-full p-6 space-y-4")}>
          <h3 className="font-bold text-slate-900 dark:text-tw-text flex items-center gap-2">
            <Star className="h-4 w-4 text-brand-500" /> Skill profile
          </h3>
          <div className="space-y-3">
            {filteredSkills.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-tw-muted">No skills match this filter.</p>
            ) : (
              filteredSkills.map((s: any, idx: number) => (
                <div key={`${toText(s?.name ?? s?.skill_name)}-${idx}`}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-slate-700 dark:text-tw-text">{toText(s?.name ?? s?.skill_name)}</span>
                    <span className="text-slate-400 dark:text-tw-muted">{s.score}/5</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-tw-dim rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(toNumber(s.score, 0) / 5) * 100}%` }} />
                  </div>
                  {s.domain ? (
                    <p className="text-[10px] text-slate-400 mt-1 uppercase">{s.domain}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Projects detail */}
      {vis.projects && (
        <section className={cn(cardSurfaceClass, "w-full p-6")}>
          <h3 className="font-bold text-slate-900 dark:text-tw-text flex items-center gap-2 mb-6">
            <Briefcase className="h-4 w-4 text-brand-500" /> Project assignments (detail)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full py-8 text-center bg-slate-50 dark:bg-tw-raised rounded-2xl border border-dashed border-slate-200 dark:border-tw-border">
                <p className="text-sm text-slate-400 dark:text-tw-muted">No matching projects.</p>
              </div>
            ) : (
              filteredProjects.map((p: any) => (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl border border-slate-100 dark:border-tw-border hover:border-brand-200 dark:hover:border-tw-blue/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-tw-text text-sm">{p.name}</h4>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0",
                          String(p.status).toLowerCase() === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-500 dark:bg-tw-dim dark:text-tw-muted",
                        )}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-tw-muted mt-1">Role: {p.position}</p>
                    {p.client_name ? (
                      <p className="text-xs text-slate-500 dark:text-tw-muted">Client: {p.client_name}</p>
                    ) : null}
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 dark:text-tw-muted">
                    <Calendar className="h-3 w-3 shrink-0" /> Deadline: {p.deadline ? formatDate(p.deadline) : "TBD"}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Assessments */}
      {vis.assessments && (
        <section className={cn(cardSurfaceClass, "w-full p-6")}>
          <h3 className="font-bold text-slate-900 dark:text-tw-text flex items-center gap-2 mb-6">
            <Activity className="h-4 w-4 text-emerald-500" /> Assessment history
          </h3>
          <div className="space-y-3 w-full">
            {filteredAssessments.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-tw-muted">No matching assessments.</p>
            ) : (
              filteredAssessments.map((a: any) => {
                const score = toNumber(a.score);
                const status = String(a.status ?? "unknown").toLowerCase();
                return (
                  <div
                    key={a.id}
                    className="p-4 bg-slate-50 dark:bg-tw-raised rounded-xl border border-slate-100 dark:border-tw-border w-full"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-tw-text">
                          {toText(a.assessment_title || "Assessment")}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-tw-muted mt-1">
                          Completed: {formatDate(a.completed_at)} · Questions served: {toText(a.questions_served)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase px-2 py-1 rounded",
                            status === "completed"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                          )}
                        >
                          {toText(a.status)}
                        </span>
                        <span className="text-xs font-black text-brand-700 dark:text-tw-blue bg-brand-100 dark:bg-tw-blue/20 px-2 py-1 rounded">
                          {score.toFixed(2)}/5
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* Profile skill gaps */}
      {vis.gaps && (
        <section className={cn(cardSurfaceClass, "w-full p-6")}>
          <h3 className="font-bold text-slate-900 dark:text-tw-text flex items-center gap-2 mb-6">
            <AlertTriangle className="h-4 w-4 text-red-500" /> Current skill gaps (profile engine)
          </h3>
          <div className="space-y-3 w-full">
            {filteredSkillGaps.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-tw-muted">No matching gaps.</p>
            ) : (
              filteredSkillGaps.map((g: any, idx: number) => (
                <div
                  key={`${g.skill_name}-${idx}`}
                  className="p-3 rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50/40 dark:bg-red-900/10"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-tw-text">{g.skill_name}</p>
                    <span className="text-[10px] font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded uppercase">
                      {g.criticality}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-tw-muted mt-1">
                    Current {g.current_proficiency?.toFixed?.(2) ?? g.current_proficiency} / Required{" "}
                    {g.required_proficiency?.toFixed?.(2) ?? g.required_proficiency}
                    {" · "}Gap {g.gap_magnitude?.toFixed?.(2) ?? g.gap_magnitude}
                    {" · "}Priority {g.priority_score?.toFixed?.(2) ?? g.priority_score}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* JD AI history — full width */}
      {vis.jd && (
        <section className={cn(cardSurfaceClass, "w-full p-6")}>
          <h3 className="font-bold text-slate-900 dark:text-tw-text flex items-center gap-2 mb-6">
            <BarChart3 className="h-4 w-4 text-amber-500" /> AI skill gap history (JD comparison)
          </h3>
          <div className="space-y-6 w-full">
            {filteredSavedGaps.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-tw-muted text-center py-8">No matching analyses.</p>
            ) : (
              filteredSavedGaps.map((g: any, i: number) => (
                <div
                  key={`${g.jd_title}-${i}`}
                  className="p-6 bg-amber-50/30 dark:bg-amber-900/10 rounded-2xl border border-amber-100/50 dark:border-amber-900/30 w-full"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-tw-text text-base">{g.jd_title}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-tw-muted mt-1">Analyzed on: {formatDate(g.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-tw-muted uppercase">Fit score</span>
                      <span className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-black">
                        {g.fit_score}%
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-3">Strengths</p>
                      <div className="flex flex-wrap gap-2">
                        {(g.results?.strengths ?? []).map((s: unknown, j: number) => (
                          <span
                            key={j}
                            className="text-[10px] px-2 py-1 bg-white dark:bg-tw-raised border border-emerald-100 dark:border-emerald-900/40 rounded text-slate-600 dark:text-tw-text"
                          >
                            {toText(s)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-3">Gaps</p>
                      <div className="flex flex-wrap gap-2">
                        {(g.results?.gaps ?? []).map((s: unknown, j: number) => (
                          <span
                            key={j}
                            className="text-[10px] px-2 py-1 bg-white dark:bg-tw-raised border border-amber-100 dark:border-amber-900/40 rounded text-slate-600 dark:text-tw-text"
                          >
                            {toText(s)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {Array.isArray(g.results?.recommendations) && g.results.recommendations.length > 0 ? (
                    <div className="mt-6 pt-4 border-t border-amber-100/50 dark:border-amber-900/30 space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Recommendations</p>
                      <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-tw-muted space-y-1">
                        {g.results.recommendations.map((rec: unknown, ri: number) => (
                          <li key={ri}>{toText(rec)}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-6 pt-4 border-t border-amber-100/50 dark:border-amber-900/30">
                      <p className="text-[10px] text-slate-400 dark:text-tw-muted italic">
                        {toText(g.results?.recommendations?.[0]) !== "N/A"
                          ? `" ${toText(g.results?.recommendations?.[0])} "`
                          : "No recommendation text stored."}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Career trajectory (stored AI insights) — same source as employee dashboard */}
      {vis.careerTrajectory && (
        <div className="w-full">
          <CareerTrajectory employeeId={employeeIdStr} />
        </div>
      )}
    </div>
  );
}
