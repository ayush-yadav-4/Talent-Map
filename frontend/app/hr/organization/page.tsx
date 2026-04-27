"use client";

import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { orgApi, readStoredUser, type DepartmentPayload, type RolePayload } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cardSurfaceClass, formInputClass, formLabelClass } from "@/lib/ui";

type EditDepartmentState = Record<string, DepartmentPayload>;
type EditRoleState = Record<string, RolePayload>;

export default function HrOrganizationPage() {
  const queryClient = useQueryClient();
  const { ready } = useRequireAuth(["org_admin", "hr_manager"]);
  const user = readStoredUser();
  const orgId = user?.org_id;
  const [editOrg, setEditOrg] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [editDepartments, setEditDepartments] = useState<EditDepartmentState>({});
  const [editRoles, setEditRoles] = useState<EditRoleState>({});
  const [newDepartment, setNewDepartment] = useState<DepartmentPayload>({ name: "", code: "" });
  const [newRole, setNewRole] = useState<RolePayload>({ title: "", seniority_level: "mid_level", dept_id: "" });

  const { data: structureData, isLoading } = useQuery({
    queryKey: ["hr-org-structure", orgId],
    queryFn: async () => {
      if (!orgId) return { departments: [] };
      const { data } = await orgApi.getStructure(orgId);
      return data;
    },
    enabled: ready && Boolean(orgId),
  });
  const { data: organizationData } = useQuery({
    queryKey: ["hr-org", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await orgApi.get(orgId);
      return data as {
        name?: string;
        sector?: string;
        sub_sector?: string;
        domain?: string;
        country?: string;
        state?: string;
      };
    },
    enabled: ready && Boolean(orgId),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["hr-org-structure", orgId] });
    queryClient.invalidateQueries({ queryKey: ["invite-form-structure", orgId] });
    queryClient.invalidateQueries({ queryKey: ["hr-org", orgId] });
  };

  const saveOrgMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Missing organization context");
      await orgApi.update(orgId, { name: organizationName.trim() });
    },
    onSuccess: () => {
      toast.success("Organization updated");
      setEditOrg(false);
      refresh();
    },
    onError: (error) => {
      if (isAxiosError(error)) toast.error(String(error.response?.data?.detail ?? error.message));
      else toast.error("Failed to update organization");
    },
  });

  const updateDepartment = async (departmentId: string) => {
    if (!orgId || !editDepartments[departmentId]) return;
    try {
      await orgApi.updateDepartment(orgId, departmentId, editDepartments[departmentId]);
      toast.success("Department updated");
      setEditDepartments((prev) => {
        const next = { ...prev };
        delete next[departmentId];
        return next;
      });
      refresh();
    } catch (error) {
      if (isAxiosError(error)) toast.error(String(error.response?.data?.detail ?? error.message));
      else toast.error("Failed to update department");
    }
  };

  const createDepartment = async () => {
    if (!orgId || !newDepartment.name?.trim()) return;
    try {
      await orgApi.createDepartment(orgId, {
        name: newDepartment.name.trim(),
        code: newDepartment.code?.trim() || undefined,
        description: newDepartment.description?.trim() || undefined,
      });
      toast.success("Department added");
      setNewDepartment({ name: "", code: "" });
      refresh();
    } catch (error) {
      if (isAxiosError(error)) toast.error(String(error.response?.data?.detail ?? error.message));
      else toast.error("Failed to add department");
    }
  };

  const removeDepartment = async (departmentId: string) => {
    if (!orgId || departmentId === "unassigned") return;
    try {
      await orgApi.deleteDepartment(orgId, departmentId);
      toast.success("Department removed");
      refresh();
    } catch (error) {
      if (isAxiosError(error)) toast.error(String(error.response?.data?.detail ?? error.message));
      else toast.error("Failed to delete department");
    }
  };

  const updateRole = async (roleId: string) => {
    if (!orgId || !editRoles[roleId]) return;
    try {
      await orgApi.updateRole(orgId, roleId, editRoles[roleId]);
      toast.success("Role updated");
      setEditRoles((prev) => {
        const next = { ...prev };
        delete next[roleId];
        return next;
      });
      refresh();
    } catch (error) {
      if (isAxiosError(error)) toast.error(String(error.response?.data?.detail ?? error.message));
      else toast.error("Failed to update role");
    }
  };

  const removeRole = async (roleId: string) => {
    if (!orgId) return;
    try {
      await orgApi.deleteRole(orgId, roleId);
      toast.success("Role removed");
      refresh();
    } catch (error) {
      if (isAxiosError(error)) toast.error(String(error.response?.data?.detail ?? error.message));
      else toast.error("Failed to delete role");
    }
  };

  const createRole = async () => {
    if (!orgId || !newRole.title?.trim()) return;
    try {
      await orgApi.createRole(orgId, {
        title: newRole.title.trim(),
        seniority_level: newRole.seniority_level?.trim() || "mid_level",
        dept_id: newRole.dept_id || undefined,
      });
      toast.success("Role added");
      setNewRole({ title: "", seniority_level: "mid_level", dept_id: "" });
      refresh();
    } catch (error) {
      if (isAxiosError(error)) toast.error(String(error.response?.data?.detail ?? error.message));
      else toast.error("Failed to add role");
    }
  };

  useEffect(() => {
    if (organizationData?.name) {
      setOrganizationName(organizationData.name);
    }
  }, [organizationData?.name]);

  if (!ready) return null;

  const allDepartmentNodes = structureData?.departments ?? [];
  const departmentNodes = allDepartmentNodes.filter((node) => node.department.id !== "unassigned");
  const unassignedNode = allDepartmentNodes.find((node) => node.department.id === "unassigned");
  const rolesView = allDepartmentNodes.flatMap((node) =>
    node.roles.map((role) => ({
      ...role,
      departmentId: node.department.id,
      departmentName: node.department.id === "unassigned" ? "Unassigned" : node.department.name,
    })),
  );
  const totalEmployees = allDepartmentNodes.reduce((sum, node) => sum + node.employees.length, 0);

  return (
    <div className="space-y-6">
      <div className={cardSurfaceClass + " p-5"}>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">{organizationData?.name ?? "Organization"}</h1>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-tw-border dark:text-tw-text dark:hover:bg-tw-raised"
            onClick={() => setEditOrg((prev) => !prev)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit organization
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">Complete organization structure with departments, roles, and assigned employees.</p>
        {editOrg && (
          <div className="mt-3 flex items-end gap-2">
            <div className="w-full max-w-md">
              <label className={formLabelClass}>Organization name</label>
              <input className={formInputClass} value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
            </div>
            <button
              type="button"
              onClick={() => saveOrgMutation.mutate()}
              disabled={saveOrgMutation.isPending || !organizationName.trim()}
              className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-tw-blue dark:hover:bg-tw-blue-hover"
            >
              Save
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={cardSurfaceClass + " p-4"}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-tw-muted">Departments</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-tw-text">{departmentNodes.length}</p>
        </div>
        <div className={cardSurfaceClass + " p-4"}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-tw-muted">Roles</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-tw-text">{rolesView.length}</p>
        </div>
        <div className={cardSurfaceClass + " p-4"}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-tw-muted">Employees</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-tw-text">{totalEmployees}</p>
        </div>
      </div>

      <section className={cardSurfaceClass + " p-4"}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-tw-text">Add department</h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-tw-muted">Create new departments for your organization structure.</p>
        <div className="grid gap-2 md:grid-cols-4">
          <input
            className={formInputClass + " md:col-span-2"}
            placeholder="Department name"
            value={newDepartment.name ?? ""}
            onChange={(e) => setNewDepartment((prev) => ({ ...prev, name: e.target.value }))}
          />
          <input
            className={formInputClass}
            placeholder="Code (optional)"
            value={newDepartment.code ?? ""}
            onChange={(e) => setNewDepartment((prev) => ({ ...prev, code: e.target.value }))}
          />
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-tw-blue dark:hover:bg-tw-blue-hover"
            onClick={() => void createDepartment()}
            disabled={!newDepartment.name?.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
            Add department
          </button>
        </div>
      </section>

      <section className={cardSurfaceClass + " p-4"}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-tw-text">Add role</h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-tw-muted">Add role titles and map them to departments.</p>
        <div className="grid gap-2 md:grid-cols-4">
          <input
            className={formInputClass}
            placeholder="Role title"
            value={newRole.title ?? ""}
            onChange={(e) => setNewRole((prev) => ({ ...prev, title: e.target.value }))}
          />
          <select
            className={formInputClass}
            value={newRole.seniority_level ?? "mid_level"}
            onChange={(e) => setNewRole((prev) => ({ ...prev, seniority_level: e.target.value }))}
          >
            <option value="junior">junior</option>
            <option value="mid_level">mid_level</option>
            <option value="senior">senior</option>
            <option value="lead">lead</option>
            <option value="principal">principal</option>
          </select>
          <select
            className={formInputClass}
            value={newRole.dept_id ?? ""}
            onChange={(e) => setNewRole((prev) => ({ ...prev, dept_id: e.target.value }))}
          >
            <option value="">Unassigned</option>
            {departmentNodes.map((dept) => (
              <option key={dept.department.id} value={dept.department.id}>
                {dept.department.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-tw-blue dark:hover:bg-tw-blue-hover"
            onClick={() => void createRole()}
            disabled={!newRole.title?.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
            Add role
          </button>
        </div>
      </section>

      <section className={cardSurfaceClass + " p-4"}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-tw-text">Current organization structure</h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-tw-muted">View departments and employee assignments with inline department management.</p>
        {isLoading && <p className="text-sm text-slate-500 dark:text-tw-muted">Loading structure...</p>}
        <div className="space-y-4">
          {departmentNodes.map((node) => {
            const deptId = node.department.id;
            const isEditingDept = Boolean(editDepartments[deptId]);
            return (
              <div key={deptId} className="rounded-xl border border-slate-200 p-4 dark:border-tw-border">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900 dark:text-tw-text">{node.department.name}</p>
                    <p className="text-xs text-slate-500 dark:text-tw-muted">{node.employees.length} employees · {node.roles.length} roles</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-tw-raised"
                      onClick={() =>
                        setEditDepartments((prev) => ({
                          ...prev,
                          [deptId]: prev[deptId] ?? { name: node.department.name, code: node.department.code ?? "" },
                        }))
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" className="rounded-lg p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => void removeDepartment(deptId)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isEditingDept && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className={formLabelClass}>Department name</label>
                      <input className={formInputClass} value={editDepartments[deptId].name ?? ""} onChange={(e) => setEditDepartments((prev) => ({ ...prev, [deptId]: { ...prev[deptId], name: e.target.value } }))} />
                    </div>
                    <div>
                      <label className={formLabelClass}>Code</label>
                      <input className={formInputClass} value={editDepartments[deptId].code ?? ""} onChange={(e) => setEditDepartments((prev) => ({ ...prev, [deptId]: { ...prev[deptId], code: e.target.value } }))} />
                    </div>
                    <button type="button" className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 dark:bg-tw-blue dark:hover:bg-tw-blue-hover" onClick={() => void updateDepartment(deptId)}>
                      Save department
                    </button>
                  </div>
                )}

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-tw-muted">Employees</p>
                  <div className="mt-2 grid gap-2 lg:grid-cols-2">
                    {node.employees.map((employee) => (
                      <div key={employee.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-tw-border dark:bg-tw-raised">
                        <p className="text-sm font-medium text-slate-900 dark:text-tw-text">{employee.full_name}</p>
                        <p className="text-xs text-slate-500 dark:text-tw-muted">{employee.job_title ?? "No title"} · {employee.email}</p>
                      </div>
                    ))}
                    {!node.employees.length && <p className="text-xs text-slate-500 dark:text-tw-muted">No employees mapped yet.</p>}
                  </div>
                </div>
              </div>
            );
          })}
          {!departmentNodes.length && <p className="text-sm text-slate-500 dark:text-tw-muted">No departments available yet.</p>}
          {unassignedNode && unassignedNode.employees.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Unassigned employees</p>
              <p className="mb-2 text-xs text-amber-700 dark:text-amber-300">{unassignedNode.employees.length} employees are not mapped to a department.</p>
              <div className="grid gap-2 md:grid-cols-2">
                {unassignedNode.employees.map((employee) => (
                  <div key={employee.id} className="rounded-lg border border-amber-200/80 bg-white p-2 dark:border-amber-900/60 dark:bg-tw-card">
                    <p className="text-sm font-medium text-slate-900 dark:text-tw-text">{employee.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-tw-muted">{employee.job_title ?? "No title"} · {employee.email}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className={cardSurfaceClass + " p-4"}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-tw-text">Roles</h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-tw-muted">Manage role titles, levels, and department mapping in one place.</p>
        <div className="space-y-3">
          {rolesView.map((role) => {
            const isEditingRole = Boolean(editRoles[role.id]);
            return (
              <div key={role.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-tw-border dark:bg-tw-raised">
                {isEditingRole ? (
                  <div className="grid gap-2 md:grid-cols-4">
                    <input className={formInputClass} value={editRoles[role.id].title} onChange={(e) => setEditRoles((prev) => ({ ...prev, [role.id]: { ...prev[role.id], title: e.target.value } }))} />
                    <select className={formInputClass} value={editRoles[role.id].seniority_level} onChange={(e) => setEditRoles((prev) => ({ ...prev, [role.id]: { ...prev[role.id], seniority_level: e.target.value } }))}>
                      <option value="junior">junior</option>
                      <option value="mid_level">mid_level</option>
                      <option value="senior">senior</option>
                      <option value="lead">lead</option>
                      <option value="principal">principal</option>
                    </select>
                    <select className={formInputClass} value={editRoles[role.id].dept_id ?? ""} onChange={(e) => setEditRoles((prev) => ({ ...prev, [role.id]: { ...prev[role.id], dept_id: e.target.value || undefined } }))}>
                      <option value="">Unassigned</option>
                      {departmentNodes.map((dept) => (
                        <option key={dept.department.id} value={dept.department.id}>
                          {dept.department.name}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 dark:bg-tw-blue dark:hover:bg-tw-blue-hover" onClick={() => void updateRole(role.id)}>
                      Save role
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-tw-text">{role.title}</p>
                      <p className="text-xs text-slate-500 dark:text-tw-muted">{role.seniority_level ?? "mid_level"} · {role.departmentName}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-tw-card"
                        onClick={() =>
                          setEditRoles((prev) => ({
                            ...prev,
                            [role.id]: {
                              title: role.title,
                              seniority_level: role.seniority_level ?? "mid_level",
                              dept_id: role.departmentId === "unassigned" ? "" : role.departmentId,
                            },
                          }))
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => void removeRole(role.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!rolesView.length && <p className="text-sm text-slate-500 dark:text-tw-muted">No roles available yet.</p>}
        </div>
      </section>

    </div>
  );
}
