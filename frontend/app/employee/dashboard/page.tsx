"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, employeeApi, orgApi, reportApi } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cardSurfaceClass, buttonClass } from "@/lib/ui";
import { LearningJourney } from "@/components/employee/LearningJourney";
import { CareerTrajectory } from "@/components/employee/CareerTrajectory";
import { cn } from "@/lib/utils";
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";

export default function EmployeeDashboardPage() {
  const { ready, user } = useRequireAuth();
  const employeeId = user?.employee_id;
  const orgId = user?.org_id;

  const { data: dashboardStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["employee-dashboard", employeeId],
    queryFn: async () => {
      const { data: d } = await reportApi.employeeDashboard(employeeId!);
      return d as {
        total_skills_profiled: number;
        avg_proficiency: number;
        skills_by_domain: { domain: string; count: number; avg: number }[];
        top_gaps: { skill: string; gap: number; priority: number; criticality: string }[];
        total_gaps: number;
        recent_sessions: { id: string; status: string; proficiency?: number | null; completed_at?: string | null }[];
        certs_expiring_soon: number;
      };
    },
    enabled: ready && Boolean(employeeId),
  });

  const { data: employeeProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["employee-profile", employeeId],
    queryFn: async () => {
      const { data } = await employeeApi.getProfile(employeeId!);
      return data as {
        employee: {
          full_name: string;
          email: string;
          job_title?: string | null;
          project_status?: string;
          onboarding_step: number;
          last_ai_sync_at?: string | null;
        };
        gaps: { skill_name: string; gap_magnitude: number; criticality: string; status: string }[];
        critical_gaps: number;
        expiring_certs: number;
      };
    },
    enabled: ready && Boolean(employeeId),
  });

  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["employee-projects", orgId],
    queryFn: async () => {
      const { data } = await orgApi.listProjects(orgId!);
      return data as {
        id: string;
        name: string;
        status?: string | null;
        client_name?: string | null;
        assignments: { employee_id: string; position?: string | null }[];
      }[];
    },
    enabled: ready && Boolean(orgId),
  });

  const { data: savedJdGaps, isLoading: isLoadingSavedJdGaps } = useQuery({
    queryKey: ["employee-jd-gaps", employeeId],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/job-descriptions/my/gaps");
      return data as {
        id: string;
        jd_id: string;
        jd_title: string;
        fit_score: number;
        created_at: string;
        strengths_count: number;
        gaps_count: number;
      }[];
    },
    enabled: ready && Boolean(employeeId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const myProjects = useMemo(
    () =>
      (projects ?? [])
        .map((project) => ({
          ...project,
          myAssignment: project.assignments.find((assignment) => assignment.employee_id === employeeId),
        }))
        .filter((project) => Boolean(project.myAssignment)),
    [projects, employeeId],
  );

  const queryClient = useQueryClient();
  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/v1/employees/${employeeId}/sync-ai-insights`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-profile"] });
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
      toast.success("AI Insights updated! Check your Career Trajectory below.");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || "Could not sync AI insights";
      toast.error(msg);
    }
  });

  if (!ready) return null;

  if (!employeeId) {
    return (
      <div className={cn(cardSurfaceClass, "p-6")}>
        <p className="text-sm text-slate-600 dark:text-tw-muted">
          Your account is not linked to an employee profile yet. HR dashboards stay available for admins.
        </p>
      </div>
    );
  }

  const isBench = (employeeProfile?.employee.project_status ?? "bench") === "bench";
  const topDomains = (dashboardStats?.skills_by_domain ?? []).slice(0, 5);
  const topGaps = (dashboardStats?.top_gaps ?? []).slice(0, 6);
  const recentSessions = (dashboardStats?.recent_sessions ?? []).slice(0, 5);
  const onboardingStep = employeeProfile?.employee.onboarding_step ?? 1;

  const lastSync = employeeProfile?.employee.last_ai_sync_at;
  const canSync = dashboardStats?.total_skills_profiled && dashboardStats.total_skills_profiled > 0;

  return (
    <div className="space-y-6">
      <section className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">My dashboard</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">
              {employeeProfile?.employee.full_name ?? user?.full_name ?? user?.email} · {employeeProfile?.employee.job_title ?? "Employee"}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-1 text-xs font-semibold",
              isBench
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
            )}
          >
            {isBench ? "Bench" : "Allocated"}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/employee/projects" className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 dark:bg-tw-blue dark:hover:bg-tw-blue-hover">
            View my projects
          </Link>
          <Link href="/employee/job-descriptions" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400">
            View job descriptions
          </Link>
          <Link href="/employee/skills" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-tw-border dark:text-tw-text dark:hover:bg-tw-raised">
            View skills
          </Link>
          <Button 
            onClick={() => syncMutation.mutate()} 
            disabled={!canSync || syncMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {syncMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Sync AI Insights
          </Button>
          {!canSync && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-medium">
              <AlertCircle className="h-3 w-3" /> Add skills first to enable AI sync
            </div>
          )}
          {lastSync && (
            <span className="text-[10px] text-slate-400 self-center">
              Last synced: {new Date(lastSync).toLocaleDateString()}
            </span>
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <div className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-tw-muted">Assigned projects</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-tw-text">{isLoadingProjects ? "..." : myProjects.length}</p>
        </div>
        <div className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-tw-muted">Skills tracked</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-tw-text">{isLoadingStats ? "..." : dashboardStats?.total_skills_profiled ?? 0}</p>
        </div>
        <div className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-tw-muted">Avg proficiency</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-tw-text">{isLoadingStats ? "..." : dashboardStats?.avg_proficiency ?? 0}</p>
        </div>
        <div className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-tw-muted">Open gaps</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-tw-text">{isLoadingStats ? "..." : dashboardStats?.total_gaps ?? 0}</p>
        </div>
        <div className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-tw-muted">Critical gaps</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-tw-text">{isLoadingProfile ? "..." : employeeProfile?.critical_gaps ?? 0}</p>
        </div>
        <div className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-tw-muted">Expiring certs</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-tw-text">{isLoadingStats ? "..." : dashboardStats?.certs_expiring_soon ?? 0}</p>
        </div>
      </div>

      <LearningJourney topGaps={topGaps} />

      <div className="grid gap-4 xl:grid-cols-2">
        <section className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Project assignment summary</h2>
          <div className="mt-3 space-y-2">
            {myProjects.length ? (
              myProjects.map((project) => (
                <div key={project.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-tw-border dark:bg-tw-raised">
                  <p className="text-sm font-medium text-slate-900 dark:text-tw-text">{project.name}</p>
                  <p className="text-xs text-slate-500 dark:text-tw-muted">
                    {(project.status ?? "planning")} · {project.client_name ?? "Internal"} · {project.myAssignment?.position ?? "member"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600 dark:text-tw-muted">No project assigned yet. You are currently on bench.</p>
            )}
          </div>
        </section>

        <section className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Skill domain health</h2>
          <div className="mt-3 space-y-2">
            {topDomains.length ? (
              topDomains.map((domain) => (
                <div key={domain.domain}>
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-tw-muted">
                    <span className="capitalize">{domain.domain}</span>
                    <span>{domain.avg.toFixed(2)} / 5 ({domain.count} skills)</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-tw-raised">
                    <div className="h-full rounded-full bg-brand-600 dark:bg-tw-blue" style={{ width: `${Math.min(100, (domain.avg / 5) * 100)}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600 dark:text-tw-muted">Skill analytics will appear after assessments complete.</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Priority gap action plan</h2>
          <div className="mt-3 space-y-2">
            {topGaps.length ? (
              topGaps.map((gap) => (
                <div key={gap.skill} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-tw-border dark:bg-tw-raised">
                  <p className="text-sm font-medium text-slate-900 dark:text-tw-text">{gap.skill}</p>
                  <p className="text-xs text-slate-500 dark:text-tw-muted">
                    Gap {gap.gap.toFixed(2)} · {gap.criticality} · priority {gap.priority.toFixed(2)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600 dark:text-tw-muted">No open gaps detected yet.</p>
            )}
          </div>
        </section>

        <section className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Learning and compliance timeline</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-tw-muted">
            <li>Open critical gaps: {employeeProfile?.critical_gaps ?? 0}</li>
            <li>Expiring certifications: {employeeProfile?.expiring_certs ?? 0}</li>
            <li>Suggested weekly learning target: {Math.max(2, (employeeProfile?.critical_gaps ?? 0) * 2)} hours</li>
            <li>Compliance reminder: Keep certifications and mandatory skills current.</li>
          </ul>
        </section>
      </div>

      <section className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Gaps</h2>
          <Link
            href="/employee/job-descriptions"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-tw-blue"
          >
            View all JDs
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {isLoadingSavedJdGaps ? (
            <p className="text-sm text-slate-500 dark:text-tw-muted">Loading saved analyses...</p>
          ) : (savedJdGaps?.length ?? 0) > 0 ? (
            (savedJdGaps ?? []).slice(0, 6).map((item) => (
              <Link
                key={item.id}
                href={`/employee/job-descriptions?jd=${item.jd_id}`}
                className="block rounded-lg border border-slate-200 bg-slate-50 p-3 hover:border-brand-300 hover:bg-white transition-colors dark:border-tw-border dark:bg-tw-raised dark:hover:bg-tw-card"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-900 dark:text-tw-text">{item.jd_title}</p>
                  <span className="text-xs font-bold text-slate-700 dark:text-tw-text">{Math.round(item.fit_score)}% fit</span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-tw-muted">
                  {item.strengths_count} strengths · {item.gaps_count} gaps · {new Date(item.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-slate-600 dark:text-tw-muted">
              No saved JD gap analyses yet. Open a Job Description and click View Skill Gap.
            </p>
          )}
        </div>
      </section>

      <section className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Recent assessment activity</h2>
        <div className="mt-3 space-y-2">
          {recentSessions.length ? (
            recentSessions.map((session) => (
              <div key={session.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-tw-border dark:bg-tw-raised dark:text-tw-text">
                Session {session.id.slice(0, 8)} · {session.status} · proficiency {session.proficiency ?? "N/A"}
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600 dark:text-tw-muted">No completed assessments yet.</p>
          )}
        </div>
      </section>

      <CareerTrajectory />
    </div>
  );
}
