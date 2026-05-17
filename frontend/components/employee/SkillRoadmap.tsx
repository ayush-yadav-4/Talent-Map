"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Map,
  Sparkles,
  Target,
} from "lucide-react";
import { roadmapApi } from "@/lib/api";
import { Button, Input } from "@/components/ui";
import { cardSurfaceClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type RoleSuggestion = {
  role_title: string;
  fit_score: number;
  readiness_level: string;
  rationale: string;
  key_strengths: string[];
  skills_to_develop: string[];
  typical_timeline_months: number;
  domain: string;
};

type RoadmapPhase = {
  phase_number: number;
  title: string;
  duration_weeks: number;
  objectives: string[];
  skills: string[];
  activities: string[];
  success_criteria: string;
};

type RoadmapResult = {
  target_role: string;
  current_role: string;
  estimated_months: number;
  overview: string;
  current_strengths: string[];
  priority_gaps: string[];
  phases: RoadmapPhase[];
  quick_wins: string[];
  recommended_certifications: string[];
  summary: string;
};

function readinessBadge(level: string) {
  const l = level.toLowerCase();
  if (l === "strong_match") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  }
  if (l === "stretch") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  }
  return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
}

function readinessLabel(level: string) {
  const l = level.toLowerCase();
  if (l === "strong_match") return "Strong match";
  if (l === "stretch") return "Stretch goal";
  return "Achievable";
}

export function SkillRoadmap() {
  const [selectedRole, setSelectedRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [suggestions, setSuggestions] = useState<RoleSuggestion[]>([]);
  const [suggestionsSummary, setSuggestionsSummary] = useState("");
  const [roadmap, setRoadmap] = useState<RoadmapResult | null>(null);

  const suggestMutation = useMutation({
    mutationFn: async () => {
      const { data } = await roadmapApi.roleSuggestions();
      return data as {
        suggestions: RoleSuggestion[];
        summary: string;
        current_role: string;
        skills_count: number;
      };
    },
    onSuccess: (data) => {
      setSuggestions(data.suggestions ?? []);
      setSuggestionsSummary(data.summary ?? "");
      setRoadmap(null);
      if (!data.suggestions?.length) {
        toast.message("No suggestions returned — try adding more skills first.");
      } else {
        toast.success("Role suggestions ready");
      }
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err.response?.data?.detail ?? "Could not load role suggestions");
    },
  });

  const roadmapMutation = useMutation({
    mutationFn: async (targetRole: string) => {
      const { data } = await roadmapApi.generate({ target_role: targetRole });
      return data as RoadmapResult;
    },
    onSuccess: (data) => {
      setRoadmap(data);
      toast.success("Skill roadmap generated");
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err.response?.data?.detail ?? "Could not generate roadmap");
    },
  });

  const effectiveRole = selectedRole || customRole.trim();

  return (
    <section className={cn(cardSurfaceClass, "space-y-6 p-5 shadow-sm")}>
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-brand-100 p-2 dark:bg-brand-900/30">
          <Map className="h-5 w-5 text-brand-700 dark:text-brand-300" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-tw-text">Skill roadmap</h2>
          <p className="text-xs text-slate-500 dark:text-tw-muted">
            Discover roles you can grow into, then generate a step-by-step upskilling plan.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/50 p-4 dark:border-brand-900/40 dark:bg-brand-950/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Step 1 · Explore target roles
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">
          Get AI suggestions based on your current skills, experience, and your organization&apos;s domain.
        </p>
        <Button
          type="button"
          className="mt-3 gap-2"
          disabled={suggestMutation.isPending}
          onClick={() => suggestMutation.mutate()}
        >
          {suggestMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Get role suggestions
        </Button>
      </div>

      {suggestionsSummary ? (
        <p className="text-sm text-slate-600 dark:text-tw-muted leading-relaxed">{suggestionsSummary}</p>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {suggestions.map((item) => (
            <button
              key={item.role_title}
              type="button"
              onClick={() => {
                setSelectedRole(item.role_title);
                setCustomRole("");
                setRoadmap(null);
              }}
              className={cn(
                "rounded-xl border p-4 text-left transition-all",
                selectedRole === item.role_title
                  ? "border-brand-400 bg-brand-50 ring-2 ring-brand-200 dark:border-tw-blue dark:bg-tw-raised dark:ring-brand-900/50"
                  : "border-slate-200 bg-white hover:border-brand-200 dark:border-tw-border dark:bg-tw-card",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-900 dark:text-tw-text">{item.role_title}</p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    readinessBadge(item.readiness_level),
                  )}
                >
                  {readinessLabel(item.readiness_level)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Fit {Math.round(item.fit_score)}% · ~{item.typical_timeline_months} months
                {item.domain ? ` · ${item.domain}` : ""}
              </p>
              <p className="mt-2 text-xs text-slate-600 dark:text-tw-muted line-clamp-2">{item.rationale}</p>
              {(item.skills_to_develop?.length ?? 0) > 0 ? (
                <p className="mt-2 text-[10px] text-slate-500">
                  Focus: {item.skills_to_develop.slice(0, 3).join(", ")}
                </p>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 p-4 dark:border-tw-border">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-tw-muted">
          Step 2 · Choose your target role
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">
          Pick a suggestion above or enter any role you want to prepare for.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            placeholder="e.g. Senior Data Analyst, Clinical Lead…"
            value={customRole}
            onChange={(e) => {
              setCustomRole(e.target.value);
              setSelectedRole("");
              setRoadmap(null);
            }}
            className="max-w-md flex-1"
          />
          <Button
            type="button"
            disabled={!effectiveRole || roadmapMutation.isPending}
            onClick={() => roadmapMutation.mutate(effectiveRole)}
            className="gap-2"
          >
            {roadmapMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Generate detailed roadmap
          </Button>
        </div>
        {effectiveRole ? (
          <p className="mt-2 text-xs text-brand-700 dark:text-tw-blue">
            Target: <span className="font-semibold">{effectiveRole}</span>
          </p>
        ) : null}
      </div>

      {roadmap ? (
        <div className="space-y-5 border-t border-slate-200 pt-5 dark:border-tw-border animate-in fade-in duration-500">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Your upskilling roadmap</p>
            <h3 className="text-lg font-bold text-slate-900 dark:text-tw-text">
              {roadmap.current_role} → {roadmap.target_role}
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">
              Estimated timeline: <span className="font-semibold">{roadmap.estimated_months} months</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-tw-text">{roadmap.overview}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-emerald-50/80 p-3 dark:bg-emerald-950/20">
              <p className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">Current strengths</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-tw-text">
                {roadmap.current_strengths.map((s) => (
                  <li key={s} className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-amber-50/80 p-3 dark:bg-amber-950/20">
              <p className="text-xs font-bold uppercase text-amber-700 dark:text-amber-300">Priority gaps</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-tw-text">
                {roadmap.priority_gaps.map((g) => (
                  <li key={g} className="flex gap-2">
                    <Target className="h-4 w-4 shrink-0 text-amber-600" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {roadmap.quick_wins.length > 0 ? (
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Quick wins (2–4 weeks)</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-600 dark:text-tw-muted">
                {roadmap.quick_wins.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-brand-200 dark:before:bg-brand-900/50">
            {roadmap.phases.map((phase) => (
              <div key={phase.phase_number} className="relative">
                <span className="absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {phase.phase_number}
                </span>
                <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4 dark:border-tw-border dark:bg-tw-raised">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-semibold text-slate-900 dark:text-tw-text">{phase.title}</h4>
                    <span className="text-xs text-slate-500">{phase.duration_weeks} weeks</span>
                  </div>
                  {phase.objectives.length > 0 ? (
                    <p className="mt-2 text-xs text-slate-600 dark:text-tw-muted">
                      <span className="font-semibold">Objectives:</span> {phase.objectives.join(" · ")}
                    </p>
                  ) : null}
                  {phase.skills.length > 0 ? (
                    <p className="mt-1 text-xs text-slate-600 dark:text-tw-muted">
                      <span className="font-semibold">Skills:</span> {phase.skills.join(", ")}
                    </p>
                  ) : null}
                  {phase.activities.length > 0 ? (
                    <ul className="mt-2 list-disc pl-4 text-xs text-slate-600 dark:text-tw-muted">
                      {phase.activities.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  ) : null}
                  {phase.success_criteria ? (
                    <p className="mt-2 text-[11px] italic text-slate-500">Success: {phase.success_criteria}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {roadmap.recommended_certifications.length > 0 ? (
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Recommended certifications</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {roadmap.recommended_certifications.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs dark:border-tw-border dark:bg-tw-card"
                  >
                    {c}
                  </span>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-sm text-slate-600 dark:text-tw-muted border-t border-slate-100 pt-4 dark:border-tw-border">
            {roadmap.summary}
          </p>
        </div>
      ) : null}
    </section>
  );
}
