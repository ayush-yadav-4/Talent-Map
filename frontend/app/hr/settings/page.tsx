"use client";

import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orgApi, readStoredUser } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cardSurfaceClass, formInputClass, formLabelClass } from "@/lib/ui";

type SettingsForm = {
  name: string;
  domain: string;
  country: string;
  state: string;
  sub_sector: string;
};

export default function HrSettingsPage() {
  const queryClient = useQueryClient();
  const { ready } = useRequireAuth(["org_admin", "hr_manager"]);
  const user = readStoredUser();
  const orgId = user?.org_id;
  const [form, setForm] = useState<SettingsForm>({
    name: "",
    domain: "",
    country: "",
    state: "",
    sub_sector: "",
  });

  const { data: orgData, isLoading } = useQuery({
    queryKey: ["hr-org", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await orgApi.get(orgId);
      return data as {
        name?: string;
        domain?: string;
        country?: string;
        state?: string;
        sub_sector?: string;
      };
    },
    enabled: ready && Boolean(orgId),
  });

  useEffect(() => {
    if (!orgData) return;
    setForm({
      name: orgData.name ?? "",
      domain: orgData.domain ?? "",
      country: orgData.country ?? "",
      state: orgData.state ?? "",
      sub_sector: orgData.sub_sector ?? "",
    });
  }, [orgData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Missing organization context");
      await orgApi.update(orgId, {
        name: form.name.trim(),
        domain: form.domain.trim() || undefined,
        country: form.country.trim() || undefined,
        state: form.state.trim() || undefined,
        sub_sector: form.sub_sector.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Organization settings updated");
      queryClient.invalidateQueries({ queryKey: ["hr-org", orgId] });
    },
    onError: (error) => {
      if (isAxiosError(error)) toast.error(String(error.response?.data?.detail ?? error.message));
      else toast.error("Could not update settings");
    },
  });

  if (!ready) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Settings</h1>
      <p className="text-sm text-slate-600 dark:text-tw-muted">Update your organization profile and maintain clean account metadata.</p>

      <div className={cardSurfaceClass + " max-w-3xl p-5"}>
        {isLoading && <p className="text-sm text-slate-500 dark:text-tw-muted">Loading organization settings...</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={formLabelClass}>Organization name</label>
            <input className={formInputClass} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          </div>
          <div>
            <label className={formLabelClass}>Company domain</label>
            <input className={formInputClass} value={form.domain} onChange={(e) => setForm((prev) => ({ ...prev, domain: e.target.value }))} />
          </div>
          <div>
            <label className={formLabelClass}>Country</label>
            <input className={formInputClass} value={form.country} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))} />
          </div>
          <div>
            <label className={formLabelClass}>State</label>
            <input className={formInputClass} value={form.state} onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className={formLabelClass}>Sub-sector</label>
            <input className={formInputClass} value={form.sub_sector} onChange={(e) => setForm((prev) => ({ ...prev, sub_sector: e.target.value }))} />
          </div>
        </div>
        <button
          type="button"
          disabled={saveMutation.isPending || !form.name.trim()}
          onClick={() => saveMutation.mutate()}
          className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-tw-blue dark:hover:bg-tw-blue-hover"
        >
          {saveMutation.isPending ? "Saving..." : "Save settings"}
        </button>
      </div>
    </div>
  );
}
