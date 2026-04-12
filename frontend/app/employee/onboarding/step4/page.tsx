"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { employeeApi, readStoredUser } from "@/lib/api";

export default function EmployeeOnboardingStep4() {
  const router = useRouter();
  const user = readStoredUser();
  const id = user?.employee_id;
  const [consentGithub, setConsentGithub] = useState(false);
  const [consentEmail, setConsentEmail] = useState(false);
  const [consentTeams, setConsentTeams] = useState(false);
  const [consentSlack, setConsentSlack] = useState(false);
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    if (!id) return;
    setLoading(true);
    try {
      await employeeApi.onboardingStep4(id, {
        consent_github: consentGithub,
        consent_email: consentEmail,
        consent_teams: consentTeams,
        consent_slack: consentSlack,
      });
      if (typeof window !== "undefined") {
        const raw = sessionStorage.getItem("tm_user");
        if (raw) {
          const u = JSON.parse(raw) as { onboarding_completed?: boolean; onboarding_step?: number };
          u.onboarding_completed = true;
          u.onboarding_step = 4;
          sessionStorage.setItem("tm_user", JSON.stringify(u));
        }
      }
      toast.success("You are all set");
      router.push("/employee/dashboard");
    } catch (e) {
      if (isAxiosError(e)) toast.error(String(e.response?.data?.detail ?? e.message));
      else toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  };

  if (!id) return null;

  return (
    <div className="space-y-4 text-sm">
      <p className="text-slate-600 dark:text-tw-muted">Choose what we may analyze to enrich your skill profile. You can change this later.</p>
      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-tw-border">
        <span className="font-medium text-slate-800 dark:text-tw-text">GitHub activity</span>
        <input type="checkbox" checked={consentGithub} onChange={(e) => setConsentGithub(e.target.checked)} className="h-4 w-4 accent-brand-600" />
      </label>
      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-tw-border">
        <span className="font-medium text-slate-800 dark:text-tw-text">Email metadata</span>
        <input type="checkbox" checked={consentEmail} onChange={(e) => setConsentEmail(e.target.checked)} className="h-4 w-4 accent-brand-600" />
      </label>
      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-tw-border">
        <span className="font-medium text-slate-800 dark:text-tw-text">Microsoft Teams</span>
        <input type="checkbox" checked={consentTeams} onChange={(e) => setConsentTeams(e.target.checked)} className="h-4 w-4 accent-brand-600" />
      </label>
      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-tw-border">
        <span className="font-medium text-slate-800 dark:text-tw-text">Slack public channels</span>
        <input type="checkbox" checked={consentSlack} onChange={(e) => setConsentSlack(e.target.checked)} className="h-4 w-4 accent-brand-600" />
      </label>
      <button
        type="button"
        disabled={loading}
        onClick={finish}
        className="mt-4 w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-tw-blue dark:hover:bg-tw-blue-hover"
      >
        {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" aria-hidden /> : "Complete setup"}
      </button>
    </div>
  );
}
