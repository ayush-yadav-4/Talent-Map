"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { orgApi, readStoredUser } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cardSurfaceClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

type ProjectAssignment = {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  position?: string | null;
};

type ProjectView = {
  id: string;
  name: string;
  code?: string | null;
  client_name?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  assignments: ProjectAssignment[];
};

export default function EmployeeProjectsPage() {
  const { ready } = useRequireAuth();
  const user = readStoredUser();
  const orgId = user?.org_id;
  const employeeId = user?.employee_id;

  const { data, isLoading } = useQuery({
    queryKey: ["employee-projects", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await orgApi.listProjects(orgId);
      return data as ProjectView[];
    },
    enabled: ready && Boolean(orgId),
  });

  const myProjects = useMemo(
    () =>
      (data ?? [])
        .map((project) => ({
          ...project,
          myAssignment: project.assignments.find((assignment) => assignment.employee_id === employeeId),
        }))
        .filter((project) => Boolean(project.myAssignment)),
    [data, employeeId],
  );

  if (!ready) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">My projects</h1>
      {isLoading && <div className={cn(cardSurfaceClass, "p-6 text-sm text-slate-600 dark:text-tw-muted")}>Loading projects...</div>}
      {!isLoading && !myProjects.length && (
        <div className={cn(cardSurfaceClass, "p-6 text-sm text-slate-600 dark:text-tw-muted")}>
          You are currently on bench and not assigned to a project yet.
        </div>
      )}
      <div className="grid gap-4">
        {myProjects.map((project) => (
          <div key={project.id} className={cn(cardSurfaceClass, "p-5 shadow-sm")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-tw-text">{project.name}</p>
                <p className="text-xs text-slate-500 dark:text-tw-muted">
                  {(project.status ?? "planning")} · {project.client_name ?? "Internal"} · {project.code ?? "No code"}
                </p>
              </div>
              <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-medium capitalize text-brand-800 dark:bg-tw-raised dark:text-tw-blue">
                {project.myAssignment?.position ?? "member"}
              </span>
            </div>
            {project.description && <p className="mt-3 text-sm text-slate-600 dark:text-tw-muted">{project.description}</p>}
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-tw-muted">
              <span>Priority: {project.priority ?? "medium"}</span>
              <span>Start: {project.start_date ?? "TBD"}</span>
              <span>End: {project.end_date ?? "TBD"}</span>
            </div>
            <div className="mt-4">
              <Link href={`/employee/projects/${project.id}`}>
                <Button variant="outline" size="sm">View Project</Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
