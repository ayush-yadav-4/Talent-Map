"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, CheckCircle2, Loader2, Sparkles, Target, TrendingUp } from "lucide-react";
import { developmentApi, roadmapApi, type DevelopmentPlan } from "@/lib/api";
import { Button, Input, Progress } from "@/components/ui";
import { cardSurfaceClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type RoleSuggestion = {
  role_title: string;
  fit_score: number;
  readiness_level: string;
  rationale: string;
  skills_to_develop: string[];
  typical_timeline_months: number;
};

function normalizeReadiness(readinessLevel: string): string {
  const level = readinessLevel.toLowerCase();
  if (level === "strong_match") return "Strong Match";
  if (level === "stretch") return "Stretch";
  return "Achievable";
}

export function SkillJourneyTracker() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [suggestions, setSuggestions] = useState<RoleSuggestion[]>([]);
  const [suggestionsSummary, setSuggestionsSummary] = useState("");
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ["employee-development-plans"],
    queryFn: async () => {
      const { data } = await developmentApi.listPlans();
      return data;
    },
  });

  const plans = useMemo(() => ((plansData ?? []) as DevelopmentPlan[]), [plansData]);
  const activePlan = useMemo(() => {
    if (!plans.length) return null;
    if (activePlanId) return plans.find((plan) => plan.id === activePlanId) ?? plans[0];
    return plans[0];
  }, [plans, activePlanId]);

  const suggestMutation = useMutation({
    mutationFn: async () => {
      const { data } = await roadmapApi.roleSuggestions();
      return data as { suggestions: RoleSuggestion[]; summary?: string };
    },
    onSuccess: (data) => {
      setSuggestions(data.suggestions ?? []);
      setSuggestionsSummary(data.summary ?? "");
      if (!data.suggestions?.length) {
        toast.message("No role suggestions yet. Add more skill data or assessments.");
      }
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      toast.error(error.response?.data?.detail ?? "Could not fetch role suggestions.");
    },
  });

  const createJourneyMutation = useMutation({
    mutationFn: async (targetRole: string) => {
      const { data } = await developmentApi.generateJourney(targetRole);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employee-development-plans"] });
      toast.success(data.used_cached_plan ? "Loaded existing saved roadmap." : "Created and saved a new roadmap.");
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      toast.error(error.response?.data?.detail ?? "Could not generate roadmap.");
    },
  });

  const milestoneUpdateMutation = useMutation({
    mutationFn: async ({ milestoneId, status }: { milestoneId: string; status: "pending" | "in_progress" | "completed" }) => {
      const payload = status === "completed" ? { status, outcome_score: 100 } : { status };
      await developmentApi.updateMilestone(milestoneId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-development-plans"] });
    },
    onError: () => {
      toast.error("Could not update module progress.");
    },
  });

  const effectiveRole = (selectedRole || customRole).trim();
  const completedMilestones = (activePlan?.milestones ?? []).filter((milestone) => milestone.status === "completed").length;
  const totalMilestones = activePlan?.milestones?.length ?? 0;
  const progressPercent = totalMilestones ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return (
    <section className={cn(cardSurfaceClass, "space-y-6 p-5 shadow-sm")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-tw-text">Skill upgradation journey</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">
            Select a target role, generate a personalized roadmap, and track each module until completed.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => suggestMutation.mutate()} disabled={suggestMutation.isPending}>
          {suggestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Suggest roles
        </Button>
      </div>

      {suggestionsSummary ? <p className="text-sm text-slate-600 dark:text-tw-muted">{suggestionsSummary}</p> : null}

      {suggestions.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {suggestions.map((role) => (
            <button
              key={role.role_title}
              type="button"
              onClick={() => {
                setSelectedRole(role.role_title);
                setCustomRole("");
              }}
              className={cn(
                "rounded-xl border p-4 text-left transition",
                selectedRole === role.role_title
                  ? "border-brand-300 bg-brand-50 dark:border-tw-blue dark:bg-tw-raised"
                  : "border-slate-200 bg-white hover:border-brand-200 dark:border-tw-border dark:bg-tw-card",
              )}
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-tw-text">{role.role_title}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-tw-muted">
                Fit {Math.round(role.fit_score)}% · {normalizeReadiness(role.readiness_level)} · {role.typical_timeline_months} months
              </p>
              <p className="mt-2 text-xs text-slate-600 dark:text-tw-muted line-clamp-2">{role.rationale}</p>
            </button>
          ))}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 p-4 dark:border-tw-border">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-tw-muted">Create or reuse roadmap</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            value={customRole}
            onChange={(event) => {
              setCustomRole(event.target.value);
              setSelectedRole("");
            }}
            placeholder="Enter your target role (or choose suggestion above)"
            className="max-w-lg flex-1"
          />
          <Button
            className="gap-2"
            disabled={!effectiveRole || createJourneyMutation.isPending}
            onClick={() => createJourneyMutation.mutate(effectiveRole)}
          >
            {createJourneyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
            Build roadmap
          </Button>
        </div>
        {effectiveRole ? <p className="mt-2 text-xs text-brand-700 dark:text-tw-blue">Target role: {effectiveRole}</p> : null}
      </div>

      <div className="rounded-xl border border-slate-200 p-4 dark:border-tw-border">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-tw-text">Saved personalized roadmaps</p>
          <span className="text-xs text-slate-500 dark:text-tw-muted">{plansLoading ? "Loading..." : `${plans.length} saved`}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setActivePlanId(plan.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                activePlan?.id === plan.id
                  ? "border-brand-300 bg-brand-50 text-brand-800 dark:border-tw-blue dark:bg-tw-raised dark:text-tw-blue"
                  : "border-slate-200 text-slate-700 dark:border-tw-border dark:text-tw-muted",
              )}
            >
              {plan.target_role || "Current role journey"}
            </button>
          ))}
          {!plans.length && !plansLoading ? <p className="text-xs text-slate-500 dark:text-tw-muted">No roadmap saved yet.</p> : null}
        </div>
      </div>

      {activePlan ? (
        <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-tw-border">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-tw-muted">Active journey</p>
              <h3 className="text-base font-bold text-slate-900 dark:text-tw-text">{activePlan.title}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">{activePlan.description}</p>
            </div>
            <div className="min-w-44">
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-tw-muted">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} />
            </div>
          </div>

          <div className="grid gap-3">
            {activePlan.milestones.map((milestone, index) => (
              <article key={milestone.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-tw-border dark:bg-tw-raised">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-tw-muted">Module {index + 1}</p>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-tw-text">{milestone.title}</h4>
                    <p className="mt-1 text-xs text-slate-600 dark:text-tw-muted">{milestone.description}</p>
                  </div>
                  <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:border-tw-border dark:text-tw-muted">
                    {milestone.status.replace("_", " ")}
                  </span>
                </div>

                {(milestone.target_skills?.length ?? 0) > 0 ? (
                  <p className="mt-2 text-xs text-slate-600 dark:text-tw-muted">Skills: {milestone.target_skills?.join(", ")}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500 dark:text-tw-muted">Due: {new Date(milestone.due_date).toLocaleDateString()}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={milestoneUpdateMutation.isPending || milestone.status === "in_progress"}
                    onClick={() => milestoneUpdateMutation.mutate({ milestoneId: milestone.id, status: "in_progress" })}
                    className="gap-1.5"
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    Start
                  </Button>
                  <Button
                    size="sm"
                    disabled={milestoneUpdateMutation.isPending || milestone.status === "completed"}
                    onClick={() => milestoneUpdateMutation.mutate({ milestoneId: milestone.id, status: "completed" })}
                    className="gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={milestoneUpdateMutation.isPending || milestone.status === "pending"}
                    onClick={() => milestoneUpdateMutation.mutate({ milestoneId: milestone.id, status: "pending" })}
                    className="gap-1.5"
                  >
                    <BookOpenCheck className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

