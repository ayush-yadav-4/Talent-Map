"use client";

import { useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orgApi, type OrgStructureNode } from "@/lib/api";
import { formInputClass, formLabelClass } from "@/lib/ui";

type InviteEmployeeFormProps = {
  orgId: string;
};

type InviteFormState = {
  full_name: string;
  email: string;
  job_title: string;
  role: string;
  notes: string;
};

export function InviteEmployeeForm({ orgId }: InviteEmployeeFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<InviteFormState>({
    full_name: "",
    email: "",
    job_title: "",
    role: "employee",
    notes: "",
  });

  const { data: structureData } = useQuery({
    queryKey: ["invite-form-structure", orgId],
    queryFn: async () => {
      const { data } = await orgApi.getStructure(orgId);
      return data.departments as OrgStructureNode[];
    },
    enabled: Boolean(orgId),
  });

  const roleOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (structureData ?? [])
            .flatMap((node) => node.roles)
            .map((role) => role.title.trim())
            .filter((title) => title.length > 0),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [structureData],
  );

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const response = await orgApi.inviteEmployee(orgId, {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        job_title: form.job_title || undefined,
        notes: form.notes.trim() || undefined,
        role: form.role,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Employee added");
      if (data.email_sent) {
        toast.success("Login credentials sent by email.");
      } else {
        toast.message(`Email not sent. Temporary password: ${data.temp_password}`);
      }
      setForm({
        full_name: "",
        email: "",
        job_title: "",
        role: "employee",
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees", orgId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-employees"] });
      queryClient.invalidateQueries({ queryKey: ["hr-org-structure"] });
      queryClient.invalidateQueries({ queryKey: ["invite-form-structure", orgId] });
    },
    onError: (error) => {
      if (isAxiosError(error)) toast.error(String(error.response?.data?.detail ?? error.message));
      else toast.error("Could not add employee");
    },
  });

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={formLabelClass}>Full name</label>
          <input
            value={form.full_name}
            onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
            placeholder="Full name"
            className={formInputClass}
          />
        </div>
        <div>
          <label className={formLabelClass}>Work email</label>
          <input
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Work email"
            className={formInputClass}
          />
        </div>
        <div>
          <label className={formLabelClass}>Role access</label>
          <select
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            className={formInputClass}
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="hr_manager">HR Manager</option>
          </select>
        </div>
        <div>
          <label className={formLabelClass}>Job title (from onboarding roles)</label>
          <select
            value={form.job_title}
            onChange={(e) => setForm((prev) => ({ ...prev, job_title: e.target.value }))}
            className={formInputClass}
          >
            <option value="">Select job title</option>
            {roleOptions.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={formLabelClass}>Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Add onboarding notes, reporting context, or manager comments"
            className={formInputClass}
            rows={2}
            maxLength={1000}
          />
        </div>
      </div>
      <button
        type="button"
        disabled={inviteMutation.isPending || !form.full_name.trim() || !form.email.trim()}
        onClick={() => inviteMutation.mutate()}
        className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-tw-blue dark:hover:bg-tw-blue-hover"
      >
        {inviteMutation.isPending ? "Adding..." : "Add employee"}
      </button>
    </div>
  );
}
