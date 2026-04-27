"use client";

import { useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orgApi, type OrgStructureNode, type ProjectPayload } from "@/lib/api";
import { cardSurfaceClass, formInputClass, formLabelClass } from "@/lib/ui";

type ProjectAssignmentView = {
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
  project_type?: string | null;
  status?: string | null;
  priority?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  currency?: string | null;
  delivery_model?: string | null;
  tech_stack?: string | null;
  assignments: ProjectAssignmentView[];
};

type ProjectManagementSectionProps = {
  orgId: string;
  structureData: { departments: OrgStructureNode[] } | undefined;
};

const initialProjectForm: ProjectPayload = {
  name: "",
  code: "",
  client_name: "",
  description: "",
  project_type: "",
  status: "planning",
  priority: "medium",
  start_date: "",
  end_date: "",
  budget: undefined,
  currency: "USD",
  delivery_model: "",
  tech_stack: "",
};

export function ProjectManagementSection({ orgId, structureData }: ProjectManagementSectionProps) {
  const queryClient = useQueryClient();
  const [projectForm, setProjectForm] = useState<ProjectPayload>(initialProjectForm);
  const [assignForms, setAssignForms] = useState<Record<string, { employee_id: string; position: string }>>({});

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ["hr-org-projects", orgId],
    queryFn: async () => {
      const { data } = await orgApi.listProjects(orgId);
      return data as ProjectView[];
    },
    enabled: Boolean(orgId),
  });

  const employeeOptions = useMemo(() => {
    const map = new Map<string, { id: string; full_name: string; email: string }>();
    for (const node of structureData?.departments ?? []) {
      for (const employee of node.employees) {
        map.set(employee.id, { id: employee.id, full_name: employee.full_name, email: employee.email });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [structureData]);

  const refreshProjects = () => {
    queryClient.invalidateQueries({ queryKey: ["hr-org-projects", orgId] });
    queryClient.invalidateQueries({ queryKey: ["hr-org-structure", orgId] });
    queryClient.invalidateQueries({ queryKey: ["employees", orgId] });
  };

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      await orgApi.createProject(orgId, {
        ...projectForm,
        name: projectForm.name?.trim() ?? "",
        code: projectForm.code?.trim() || undefined,
        client_name: projectForm.client_name?.trim() || undefined,
        description: projectForm.description?.trim() || undefined,
        project_type: projectForm.project_type?.trim() || undefined,
        status: projectForm.status?.trim() || "planning",
        priority: projectForm.priority?.trim() || undefined,
        start_date: projectForm.start_date || undefined,
        end_date: projectForm.end_date || undefined,
        budget: projectForm.budget || undefined,
        currency: projectForm.currency?.trim() || undefined,
        delivery_model: projectForm.delivery_model?.trim() || undefined,
        tech_stack: projectForm.tech_stack?.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Project created");
      setProjectForm(initialProjectForm);
      refreshProjects();
    },
    onError: (error) => {
      if (isAxiosError(error)) toast.error(String(error.response?.data?.detail ?? error.message));
      else toast.error("Could not create project");
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (payload: { projectId: string; employee_id: string; position: string }) => {
      await orgApi.assignProjectMember(orgId, payload.projectId, {
        employee_id: payload.employee_id,
        position: payload.position.trim(),
      });
    },
    onSuccess: (_, variables) => {
      toast.success("Employee assigned to project");
      setAssignForms((prev) => ({
        ...prev,
        [variables.projectId]: { employee_id: "", position: "lead" },
      }));
      refreshProjects();
    },
    onError: (error) => {
      if (isAxiosError(error)) toast.error(String(error.response?.data?.detail ?? error.message));
      else toast.error("Could not assign employee");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (payload: { projectId: string; employeeId: string }) => {
      await orgApi.removeProjectMember(orgId, payload.projectId, payload.employeeId);
    },
    onSuccess: () => {
      toast.success("Project assignment removed");
      refreshProjects();
    },
    onError: (error) => {
      if (isAxiosError(error)) toast.error(String(error.response?.data?.detail ?? error.message));
      else toast.error("Could not remove assignment");
    },
  });

  return (
    <section className={cardSurfaceClass + " space-y-4 p-4"}>
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-tw-text">Projects</h2>
        <p className="text-sm text-slate-600 dark:text-tw-muted">
          Create projects, capture project details, and assign employees with a project position (lead, manager, hr, etc.).
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 p-4 dark:border-tw-border">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-tw-text">Create project</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={formLabelClass}>Project name</label>
            <input className={formInputClass} value={projectForm.name ?? ""} onChange={(e) => setProjectForm((prev) => ({ ...prev, name: e.target.value }))} />
          </div>
          <div>
            <label className={formLabelClass}>Project code</label>
            <input className={formInputClass} value={projectForm.code ?? ""} onChange={(e) => setProjectForm((prev) => ({ ...prev, code: e.target.value }))} />
          </div>
          <div>
            <label className={formLabelClass}>Client name</label>
            <input className={formInputClass} value={projectForm.client_name ?? ""} onChange={(e) => setProjectForm((prev) => ({ ...prev, client_name: e.target.value }))} />
          </div>
          <div>
            <label className={formLabelClass}>Project type</label>
            <input className={formInputClass} value={projectForm.project_type ?? ""} onChange={(e) => setProjectForm((prev) => ({ ...prev, project_type: e.target.value }))} />
          </div>
          <div>
            <label className={formLabelClass}>Status</label>
            <input className={formInputClass} value={projectForm.status ?? ""} onChange={(e) => setProjectForm((prev) => ({ ...prev, status: e.target.value }))} />
          </div>
          <div>
            <label className={formLabelClass}>Priority</label>
            <input className={formInputClass} value={projectForm.priority ?? ""} onChange={(e) => setProjectForm((prev) => ({ ...prev, priority: e.target.value }))} />
          </div>
          <div>
            <label className={formLabelClass}>Start date</label>
            <input type="date" className={formInputClass} value={projectForm.start_date ?? ""} onChange={(e) => setProjectForm((prev) => ({ ...prev, start_date: e.target.value }))} />
          </div>
          <div>
            <label className={formLabelClass}>End date</label>
            <input type="date" className={formInputClass} value={projectForm.end_date ?? ""} onChange={(e) => setProjectForm((prev) => ({ ...prev, end_date: e.target.value }))} />
          </div>
          <div>
            <label className={formLabelClass}>Budget</label>
            <input type="number" className={formInputClass} value={projectForm.budget ?? ""} onChange={(e) => setProjectForm((prev) => ({ ...prev, budget: e.target.value ? Number(e.target.value) : undefined }))} />
          </div>
          <div>
            <label className={formLabelClass}>Currency</label>
            <input className={formInputClass} value={projectForm.currency ?? ""} onChange={(e) => setProjectForm((prev) => ({ ...prev, currency: e.target.value }))} />
          </div>
          <div>
            <label className={formLabelClass}>Delivery model</label>
            <input className={formInputClass} value={projectForm.delivery_model ?? ""} onChange={(e) => setProjectForm((prev) => ({ ...prev, delivery_model: e.target.value }))} />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className={formLabelClass}>Tech stack</label>
            <input className={formInputClass} value={projectForm.tech_stack ?? ""} onChange={(e) => setProjectForm((prev) => ({ ...prev, tech_stack: e.target.value }))} />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className={formLabelClass}>Description</label>
            <textarea className={formInputClass} rows={3} value={projectForm.description ?? ""} onChange={(e) => setProjectForm((prev) => ({ ...prev, description: e.target.value }))} />
          </div>
        </div>
        <button
          type="button"
          className="mt-3 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-tw-blue dark:hover:bg-tw-blue-hover"
          onClick={() => createProjectMutation.mutate()}
          disabled={createProjectMutation.isPending || !projectForm.name?.trim()}
        >
          {createProjectMutation.isPending ? "Creating..." : "Create project"}
        </button>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-slate-500 dark:text-tw-muted">Loading projects...</p>}
        {(projectsData ?? []).map((project) => {
          const assignForm = assignForms[project.id] ?? { employee_id: "", position: "lead" };
          return (
            <div key={project.id} className="rounded-xl border border-slate-200 p-4 dark:border-tw-border">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-tw-text">{project.name}</p>
                  <p className="text-xs text-slate-500 dark:text-tw-muted">
                    {(project.status ?? "planning")} · {project.client_name ?? "Internal"} · {project.code ?? "No code"}
                  </p>
                </div>
              </div>
              {project.description && <p className="mt-2 text-sm text-slate-600 dark:text-tw-muted">{project.description}</p>}

              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <select
                  className={formInputClass}
                  value={assignForm.employee_id}
                  onChange={(e) =>
                    setAssignForms((prev) => ({
                      ...prev,
                      [project.id]: { ...assignForm, employee_id: e.target.value },
                    }))
                  }
                >
                  <option value="">Select employee</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name} ({employee.email})
                    </option>
                  ))}
                </select>
                <input
                  className={formInputClass}
                  value={assignForm.position}
                  onChange={(e) =>
                    setAssignForms((prev) => ({
                      ...prev,
                      [project.id]: { ...assignForm, position: e.target.value },
                    }))
                  }
                  placeholder="Position in project (lead, manager, hr)"
                />
                <button
                  type="button"
                  className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-tw-blue dark:hover:bg-tw-blue-hover"
                  onClick={() =>
                    assignMutation.mutate({
                      projectId: project.id,
                      employee_id: assignForm.employee_id,
                      position: assignForm.position,
                    })
                  }
                  disabled={assignMutation.isPending || !assignForm.employee_id || !assignForm.position.trim()}
                >
                  Assign employee
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {project.assignments.map((assignment) => (
                  <div key={`${project.id}-${assignment.employee_id}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-tw-border dark:bg-tw-raised">
                    <p className="text-sm text-slate-700 dark:text-tw-text">
                      {assignment.employee_name} - <span className="capitalize">{assignment.position ?? "member"}</span>
                    </p>
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => removeMemberMutation.mutate({ projectId: project.id, employeeId: assignment.employee_id })}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {!project.assignments.length && <p className="text-xs text-slate-500 dark:text-tw-muted">No employees assigned yet.</p>}
              </div>
            </div>
          );
        })}
        {!isLoading && !(projectsData ?? []).length && <p className="text-sm text-slate-500 dark:text-tw-muted">No projects created yet.</p>}
      </div>
    </section>
  );
}
