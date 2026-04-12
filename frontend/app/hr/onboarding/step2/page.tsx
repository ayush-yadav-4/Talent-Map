"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { Info, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { orgApi, readStoredUser } from "@/lib/api";
import { DEPARTMENT_PRESETS, suggestDeptCode } from "@/lib/sector-presets";
import { cardSurfaceClass, formInputClass, formLabelClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

type DeptRow = { name: string; code: string; description: string; color: string };

export default function HrOnboardingStep2Page() {
  const router = useRouter();
  const user = readStoredUser();
  const orgId = user?.org_id;
  const [sector, setSector] = useState<string>("corporate");
  const [rows, setRows] = useState<DeptRow[]>([{ name: "", code: "", description: "", color: "" }]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const { data } = await orgApi.get(orgId);
        setSector((data as { sector?: string }).sector ?? "corporate");
      } catch {
        toast.error("Could not load organization");
      } finally {
        setFetching(false);
      }
    })();
  }, [orgId]);

  const presets = useMemo(() => DEPARTMENT_PRESETS[sector] ?? DEPARTMENT_PRESETS.corporate, [sector]);

  const addPreset = useCallback((name: string) => {
    const code = suggestDeptCode(name);
    setRows((r) => [...r, { name, code, description: "", color: "" }]);
    if (code) toast.success(`Added “${name}” (${code})`);
  }, []);

  const addAllPresets = useCallback(() => {
    const next: DeptRow[] = [...rows];
    for (const name of presets) {
      if (next.some((d) => d.name.trim().toLowerCase() === name.toLowerCase())) continue;
      next.push({ name, code: suggestDeptCode(name), description: "", color: "" });
    }
    setRows(next.length ? next : [{ name: "", code: "", description: "", color: "" }]);
    toast.success("Suggested departments added");
  }, [presets, rows]);

  const submit = async () => {
    if (!orgId) return;
    const departments = rows
      .map((r) => ({
        name: r.name.trim(),
        code: r.code.trim() || undefined,
        description: r.description.trim() || undefined,
        color: r.color.trim() || undefined,
      }))
      .filter((d) => d.name.length >= 2);
    if (!departments.length) {
      toast.error("Add at least one department with a name.");
      return;
    }
    setLoading(true);
    try {
      await orgApi.setupStep2(orgId, { departments });
      toast.success("Departments saved");
      router.push("/hr/onboarding/step3");
    } catch (e) {
      if (isAxiosError(e)) toast.error(String(e.response?.data?.detail ?? e.message));
      else toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  };

  if (!orgId) {
    return <p className="p-6 text-sm text-slate-600 dark:text-tw-muted">Sign in again to continue onboarding.</p>;
  }

  if (fetching) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-tw-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading organization…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-tw-text">Set up your departments</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">
          You can add more later from Settings. Quick-add presets match your sector.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-sm text-sky-950 dark:border-tw-blue/30 dark:bg-tw-raised dark:text-tw-text sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-tw-blue" aria-hidden />
          <p className="text-sky-900 dark:text-tw-muted">
            Tap a chip to add a row with a suggested 3-letter code, or use <span className="font-semibold">Add all suggested</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={addAllPresets}
          className="shrink-0 rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-900 hover:bg-sky-100 dark:border-tw-border dark:bg-tw-card dark:text-tw-text dark:hover:bg-tw-raised"
        >
          Add all suggested
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => addPreset(p)}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:border-brand-300 dark:border-tw-border dark:bg-tw-raised dark:text-tw-text dark:hover:border-tw-blue"
          >
            + {p}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {rows.map((row, idx) => (
          <div key={idx} className={cn(cardSurfaceClass, "grid gap-3 p-4 sm:grid-cols-2")}>
            <div className="flex items-start justify-between gap-2 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-tw-muted">
                Department {idx + 1}
              </span>
              {rows.length > 1 && (
                <button
                  type="button"
                  aria-label="Remove department"
                  onClick={() => setRows((r) => r.filter((_, i) => i !== idx))}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-tw-raised"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div>
              <label className={formLabelClass}>Name *</label>
              <input
                className={formInputClass}
                value={row.name}
                onChange={(e) => setRows((r) => r.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
              />
            </div>
            <div>
              <label className={formLabelClass}>Code (optional, max 10)</label>
              <input
                className={formInputClass}
                maxLength={10}
                value={row.code}
                onChange={(e) => setRows((r) => r.map((x, i) => (i === idx ? { ...x, code: e.target.value } : x)))}
              />
            </div>
            <div>
              <label className={formLabelClass}>Color (hex, optional)</label>
              <input
                className={formInputClass}
                placeholder="#3366CC"
                maxLength={20}
                value={row.color}
                onChange={(e) => setRows((r) => r.map((x, i) => (i === idx ? { ...x, color: e.target.value } : x)))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={formLabelClass}>Description</label>
              <textarea
                className={formInputClass}
                rows={2}
                maxLength={200}
                value={row.description}
                onChange={(e) => setRows((r) => r.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows((r) => [...r, { name: "", code: "", description: "", color: "" }])}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline dark:text-tw-blue"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add department
        </button>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-tw-blue dark:hover:bg-tw-blue-hover"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Continue to roles
        </button>
      </div>
    </div>
  );
}
