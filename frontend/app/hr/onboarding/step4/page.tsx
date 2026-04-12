"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { orgApi, readStoredUser } from "@/lib/api";
import { formInputClass, formLabelClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

const HRIS_OPTIONS = [
  "BambooHR",
  "Keka",
  "Darwinbox",
  "Workday",
  "SAP SuccessFactors",
  "Oracle HCM",
  "Zoho People",
  "HiBob",
  "Rippling",
  "ADP",
  "Other",
];

const LMS_OPTIONS = [
  "Moodle",
  "TalentLMS",
  "Degreed",
  "LinkedIn Learning",
  "Udemy Business",
  "Cornerstone",
  "iGOT Karmayogi",
  "Other",
];

const GOV_HRMIS = ["Manav Sampada", "NIC e-HRMS", "State HRMIS", "Other"];

export default function HrOnboardingStep4Page() {
  const router = useRouter();
  const user = readStoredUser();
  const orgId = user?.org_id;
  const [sector, setSector] = useState("");
  const [enableHris, setEnableHris] = useState(false);
  const [hrisPlatform, setHrisPlatform] = useState("");
  const [enableGithub, setEnableGithub] = useState(false);
  const [githubOrg, setGithubOrg] = useState("");
  const [enableTeams, setEnableTeams] = useState(false);
  const [enableJira, setEnableJira] = useState(false);
  const [jiraUrl, setJiraUrl] = useState("");
  const [enableLms, setEnableLms] = useState(false);
  const [lmsPlatform, setLmsPlatform] = useState("");
  const [enableGov, setEnableGov] = useState(false);
  const [govPlatform, setGovPlatform] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const { data } = await orgApi.get(orgId);
        setSector(String((data as { sector?: string }).sector ?? "").toLowerCase());
      } catch {
        /* ignore */
      }
    })();
  }, [orgId]);

  const submit = async (skip: boolean) => {
    if (!orgId) return;
    setLoading(true);
    try {
      await orgApi.setupStep4(orgId, {
        enable_hris: skip ? false : enableHris,
        hris_platform: hrisPlatform || null,
        enable_github: skip ? false : enableGithub,
        github_org: githubOrg || null,
        enable_teams: skip ? false : enableTeams,
        enable_jira: skip ? false : enableJira,
        jira_workspace_url: jiraUrl || null,
        enable_lms: skip ? false : enableLms,
        lms_platform: lmsPlatform || null,
        enable_gov_hrmis: skip ? false : enableGov,
        gov_hrmis_platform: govPlatform || null,
        skip_integrations: skip,
      });
      toast.success(skip ? "Skipped integrations" : "Preferences saved");
      router.push("/hr/onboarding/step5");
    } catch (e) {
      if (isAxiosError(e)) toast.error(String(e.response?.data?.detail ?? e.message));
      else toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  };

  if (!orgId) return <p className="text-sm text-slate-600 dark:text-tw-muted">Sign in to continue.</p>;

  const card = (children: ReactNode) => (
    <div className="rounded-xl border border-slate-200 bg-white/50 p-4 dark:border-tw-border dark:bg-tw-raised">{children}</div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-tw-text">Connect your tools</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">
          Integrations can be configured later from Settings. Toggle what you plan to use so Talent Map can prepare the
          right connectors.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {card(
          <div className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900 dark:text-tw-text">HRIS</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-tw-muted">Auto-creates employee profiles from your HR system.</p>
                <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">Benefit: fewer manual imports</p>
              </div>
              <input
                type="checkbox"
                checked={enableHris}
                onChange={(e) => setEnableHris(e.target.checked)}
                className="mt-1 h-4 w-4 accent-brand-600"
              />
            </div>
            {enableHris && (
              <div>
                <label className={formLabelClass}>Which HRIS?</label>
                <select className={formInputClass} value={hrisPlatform} onChange={(e) => setHrisPlatform(e.target.value)}>
                  <option value="">Select…</option>
                  {HRIS_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500 dark:text-tw-muted">
                  We will guide connection in Settings → Integrations after setup.
                </p>
              </div>
            )}
          </div>,
        )}

        {card(
          <div className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900 dark:text-tw-text">Microsoft 365</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-tw-muted">
                  Extracts domain expertise from Teams and Outlook signals (metadata-first).
                </p>
                <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Benefit: richer collaboration signals
                </p>
              </div>
              <input
                type="checkbox"
                checked={enableTeams}
                onChange={(e) => setEnableTeams(e.target.checked)}
                className="mt-1 h-4 w-4 accent-brand-600"
              />
            </div>
            {enableTeams && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                Requires Microsoft Entra ID admin approval. IT setup instructions can be shared after onboarding.
              </div>
            )}
          </div>,
        )}

        {card(
          <div className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900 dark:text-tw-text">GitHub</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-tw-muted">Maps technical skills from code contributions.</p>
                <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">Benefit: objective engineering proof</p>
              </div>
              <input
                type="checkbox"
                checked={enableGithub}
                onChange={(e) => setEnableGithub(e.target.checked)}
                className="mt-1 h-4 w-4 accent-brand-600"
              />
            </div>
            {enableGithub && (
              <div>
                <label className={formLabelClass}>GitHub organization (optional)</label>
                <input className={formInputClass} value={githubOrg} onChange={(e) => setGithubOrg(e.target.value)} placeholder="acme-corp" />
                <p className="mt-1 text-xs text-slate-500 dark:text-tw-muted">GitHub App installation is required later.</p>
              </div>
            )}
          </div>,
        )}

        {card(
          <div className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900 dark:text-tw-text">Jira / Atlassian</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-tw-muted">Understands problems you solve from work items.</p>
                <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">Benefit: delivery & domain depth</p>
              </div>
              <input
                type="checkbox"
                checked={enableJira}
                onChange={(e) => setEnableJira(e.target.checked)}
                className="mt-1 h-4 w-4 accent-brand-600"
              />
            </div>
            {enableJira && (
              <div>
                <label className={formLabelClass}>Jira workspace URL</label>
                <input
                  className={formInputClass}
                  value={jiraUrl}
                  onChange={(e) => setJiraUrl(e.target.value)}
                  placeholder="company.atlassian.net"
                />
              </div>
            )}
          </div>,
        )}

        {card(
          <div className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900 dark:text-tw-text">LMS / learning</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-tw-muted">Tracks learning activity for skill refresh signals.</p>
                <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">Benefit: continuous upskilling visibility</p>
              </div>
              <input
                type="checkbox"
                checked={enableLms}
                onChange={(e) => setEnableLms(e.target.checked)}
                className="mt-1 h-4 w-4 accent-brand-600"
              />
            </div>
            {enableLms && (
              <div>
                <label className={formLabelClass}>LMS platform</label>
                <select className={formInputClass} value={lmsPlatform} onChange={(e) => setLmsPlatform(e.target.value)}>
                  <option value="">Select…</option>
                  {LMS_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>,
        )}

        {sector === "government"
          ? card(
              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-tw-text">Government HRMIS</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-tw-muted">Imports records, APAR, and iGOT completions.</p>
                    <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">Benefit: unified public-sector HR view</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableGov}
                    onChange={(e) => setEnableGov(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-brand-600"
                  />
                </div>
                {enableGov && (
                  <div>
                    <label className={formLabelClass}>Which system?</label>
                    <select className={formInputClass} value={govPlatform} onChange={(e) => setGovPlatform(e.target.value)}>
                      <option value="">Select…</option>
                      {GOV_HRMIS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-500 dark:text-tw-muted">
                      Many deployments use SFTP-based integration — we can schedule a setup call from Settings.
                    </p>
                  </div>
                )}
              </div>,
            )
          : null}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={loading}
          onClick={() => submit(true)}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-tw-border dark:text-tw-text dark:hover:bg-tw-raised"
        >
          Skip for now
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => submit(false)}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-tw-blue dark:hover:bg-tw-blue-hover",
          )}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Continue →
        </button>
      </div>
    </div>
  );
}
