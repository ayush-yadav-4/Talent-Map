"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { orgApi, readStoredUser } from "@/lib/api";
import { ROLE_PRESETS } from "@/lib/sector-presets";
import { formInputClass, formLabelClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

type DeptOpt = { id: string; name: string };

const SENIORITY = [
  { value: "junior", title: "Junior (0–2 yrs)", hint: "Well-defined tasks with guidance." },
  { value: "mid_level", title: "Mid-level (2–5 yrs)", hint: "Owns features end-to-end with occasional support." },
  { value: "senior", title: "Senior (5–10 yrs)", hint: "Complex problems independently; may mentor others." },
  { value: "lead", title: "Lead / Manager", hint: "Sets direction for a team or workstream." },
  { value: "principal", title: "Principal / Architect", hint: "Org-wide technical or domain authority." },
  { value: "executive", title: "Executive / Director", hint: "Strategy, budgets, and cross-functional outcomes." },
] as const;

type RoleRow = { title: string; seniority_level: string; dept_id: string };

export default function HrOnboardingStep3Page() {
  const router = useRouter();
  const user = readStoredUser();
  const orgId = user?.org_id;
  const [sector, setSector] = useState("corporate");
  const [departments, setDepartments] = useState<DeptOpt[]>([]);
  const [rows, setRows] = useState<RoleRow[]>([
    { title: "Software Engineer", seniority_level: "mid_level", dept_id: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const [orgRes, deptRes] = await Promise.all([orgApi.get(orgId), orgApi.getDepartments(orgId)]);
        setSector((orgRes.data as { sector?: string }).sector ?? "corporate");
        const list = (deptRes.data as { id: string; name: string }[]).map((d) => ({ id: d.id, name: d.name }));
        setDepartments(list);
      } catch {
        toast.error("Could not load organization");
      } finally {
        setFetching(false);
      }
    })();
  }, [orgId]);

  const presets = useMemo(() => ROLE_PRESETS[sector] ?? ROLE_PRESETS.corporate, [sector]);

  const addPresetTitle = useCallback((title: string) => {
    setRows((r) => [...r, { title, seniority_level: "mid_level", dept_id: "" }]);
  }, []);

  const submit = async () => {
    if (!orgId) return;
    const roles = rows
      .map((row) => ({
        title: row.title.trim(),
        seniority_level: row.seniority_level,
        dept_id: row.dept_id || undefined,
      }))
      .filter((x) => x.title.length >= 2);
    if (!roles.length) {
      toast.error("Add at least one job title.");
      return;
    }
    setLoading(true);
    try {
      await orgApi.setupStep3(orgId, { roles });
      toast.success("Role profiles created");
      router.push("/hr/onboarding/step4");
    } catch (e) {
      if (isAxiosError(e)) toast.error(String(e.response?.data?.detail ?? e.message));
      else toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  };

  if (!orgId) return <p className="text-sm text-slate-600 dark:text-tw-muted">Sign in to continue.</p>;

  if (fetching) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-tw-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-tw-text">Define the roles in your organization</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">
          Skill requirements can be refined after onboarding. ESCO-backed mapping will run in the background.
        </p>
      </div>

      <div>
        <p className={formLabelClass}>Quick-add by sector</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => addPresetTitle(p)}
              className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-900 hover:border-violet-400 dark:border-tw-border dark:bg-tw-raised dark:text-tw-text dark:hover:border-tw-blue"
            >
              + {p}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {rows.map((row, idx) => (
          <div key={idx} className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-tw-border">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-tw-muted">
                Role {idx + 1}
              </span>
              {rows.length > 1 && (
                <button
                  type="button"
                  aria-label="Remove role"
                  onClick={() => setRows((x) => x.filter((_, i) => i !== idx))}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-tw-raised"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div>
              <label className={formLabelClass}>Job title *</label>
              <input
                className={formInputClass}
                value={row.title}
                onChange={(e) => setRows((r) => r.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)))}
              />
            </div>
            <div>
              <p className={formLabelClass}>Seniority *</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {SENIORITY.map((s) => {
                  const on = row.seniority_level === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setRows((r) => r.map((x, i) => (i === idx ? { ...x, seniority_level: s.value } : x)))}
                      className={cn(
                        "rounded-xl border p-3 text-left text-sm transition",
                        on
                          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200 dark:border-tw-blue dark:bg-tw-raised dark:ring-tw-blue/40"
                          : "border-slate-200 bg-white/60 hover:border-brand-200 dark:border-tw-border dark:bg-tw-card dark:hover:border-tw-blue/50",
                      )}
                    >
                      <p className="font-semibold text-slate-900 dark:text-tw-text">{s.title}</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-tw-muted">{s.hint}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className={formLabelClass}>Department</label>
              <select
                className={formInputClass}
                value={row.dept_id}
                onChange={(e) => setRows((r) => r.map((x, i) => (i === idx ? { ...x, dept_id: e.target.value } : x)))}
              >
                <option value="">Any department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows((x) => [...x, { title: "", seniority_level: "mid_level", dept_id: "" }])}
          className={cn("inline-flex items-center gap-2 text-sm font-medium text-brand-700 dark:text-tw-blue")}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add role
        </button>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={loading}
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-tw-blue dark:hover:bg-tw-blue-hover"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Continue to integrations
        </button>
      </div>
    </div>
  );
}
