"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { orgApi, readStoredUser } from "@/lib/api";
import { formInputClass, formLabelClass } from "@/lib/ui";

type Invited = { name: string; email: string; tempPassword?: string };

export default function HrOnboardingStep5Page() {
  const router = useRouter();
  const user = readStoredUser();
  const orgId = user?.org_id;
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState("employee");
  const [invited, setInvited] = useState<Invited[]>([]);
  const [busy, setBusy] = useState(false);

  const inviteOne = async () => {
    if (!orgId) return;
    if (!email.trim() || !name.trim()) {
      toast.error("Email and full name are required.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await orgApi.inviteEmployee(orgId, {
        email: email.trim().toLowerCase(),
        full_name: name.trim(),
        job_title: jobTitle.trim() || undefined,
        role,
      });
      const temp = (data as { temp_password?: string }).temp_password;
      toast.success("Invite created. Temporary password shown on the card below.");
      setInvited((prev) => [{ name: name.trim(), email: email.trim().toLowerCase(), tempPassword: temp }, ...prev]);
      setEmail("");
      setName("");
      setJobTitle("");
    } catch (e) {
      if (isAxiosError(e)) toast.error(String(e.response?.data?.detail ?? e.message));
      else toast.error("Could not send invite");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!orgId) return;
    setBusy(true);
    try {
      await orgApi.completeOnboarding(orgId);
      if (typeof window !== "undefined") {
        const raw = sessionStorage.getItem("tm_user");
        if (raw) {
          const u = JSON.parse(raw) as { onboarding_completed?: boolean; onboarding_step?: number };
          u.onboarding_completed = true;
          u.onboarding_step = 5;
          sessionStorage.setItem("tm_user", JSON.stringify(u));
        }
      }
      toast.success("Welcome to your dashboard");
      router.push("/hr/dashboard");
    } catch (e) {
      if (isAxiosError(e)) toast.error(String(e.response?.data?.detail ?? e.message));
      else toast.error("Could not complete onboarding");
    } finally {
      setBusy(false);
    }
  };

  if (!orgId) return <p className="text-sm text-slate-600 dark:text-tw-muted">Sign in to continue.</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-tw-text">Invite your team</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">
          Send a Talent Map invite with a temporary password, or skip and add people later from Employees.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-tw-border">
          <p className="text-sm font-medium text-slate-800 dark:text-tw-text">Individual invite</p>
          <div>
            <label className={formLabelClass}>Full name *</label>
            <input className={formInputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={formLabelClass}>Work email *</label>
            <input type="email" className={formInputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className={formLabelClass}>Job title</label>
            <input className={formInputClass} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div>
            <label className={formLabelClass}>Role on Talent Map</label>
            <select className={formInputClass} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="hr_manager">HR Manager</option>
            </select>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={inviteOne}
            className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-tw-blue dark:hover:bg-tw-blue-hover"
          >
            Send invite
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-tw-border">
            <p className="font-medium text-slate-800 dark:text-tw-text">Bulk CSV import</p>
            <p className="mt-1 text-slate-600 dark:text-tw-muted">
              Template download and drag-and-drop import will connect to the bulk API in a follow-up iteration.
            </p>
          </div>
          <div className="rounded-xl border border-slate-900 bg-slate-900 p-4 text-sm text-slate-100 dark:border-tw-border dark:bg-tw-card">
            <p className="font-semibold">What happens when you are done</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-slate-200 dark:text-tw-muted">
              <li>Employees receive a temporary password and onboarding link.</li>
              <li>Talent Map starts building skill profiles from declarations and integrations you enable.</li>
              <li>HR sees coverage and gaps on the dashboard as data arrives.</li>
              <li>Everything stays under your organization tenant.</li>
            </ul>
          </div>
        </div>
      </div>

      {invited.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-tw-text">Recently invited</p>
          <div className="mt-2 space-y-2">
            {invited.map((i) => (
              <div
                key={i.email}
                className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100"
              >
                <p className="font-semibold">{i.name}</p>
                <p className="text-xs text-emerald-900/90 dark:text-emerald-200">{i.email}</p>
                {i.tempPassword ? (
                  <p className="mt-1 font-mono text-xs">Temp password: {i.tempPassword}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          disabled={busy}
          onClick={finish}
          className="text-left text-sm font-medium text-slate-600 hover:text-brand-700 disabled:opacity-60 dark:text-tw-muted dark:hover:text-tw-blue"
        >
          Skip — I will invite employees later
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={finish}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Go to dashboard →
        </button>
      </div>
    </div>
  );
}
