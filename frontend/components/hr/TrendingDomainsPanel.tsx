"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles, TrendingUp } from "lucide-react";
import { skillApi } from "@/lib/api";
import { Button } from "@/components/ui";
import { cardSurfaceClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type TrendingDomainSuggestion = {
  domain_name: string;
  trend: string;
  relevance_score: number;
  rationale: string;
  example_skills: string[];
};

type Props = {
  sector?: string | null;
  subSector?: string | null;
  orgDomain?: string | null;
  className?: string;
};

function trendLabel(trend: string) {
  const t = (trend || "").toLowerCase();
  if (t === "rising" || t === "emerging") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
        <TrendingUp className="h-3 w-3" aria-hidden />
        {t}
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t || "stable"}</span>
  );
}

export function TrendingDomainsPanel({ sector, subSector, orgDomain, className }: Props) {
  const suggestMutation = useMutation({
    mutationFn: async () => {
      const { data } = await skillApi.trendingDomains({ limit: 6 });
      return data as {
        sector: string;
        sub_sector?: string | null;
        org_domain?: string | null;
        existing_domains: string[];
        suggestions: TrendingDomainSuggestion[];
      };
    },
    onError: () => toast.error("Could not load suggestions — check OpenAI API key."),
  });

  const suggestions = suggestMutation.data?.suggestions ?? [];
  const scopeParts = [sector, subSector, orgDomain].filter(Boolean);

  return (
    <div className={cn(cardSurfaceClass, "p-4 shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Trending skill domains</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-tw-muted">
            AI suggestions scoped to your organization
            {scopeParts.length > 0 ? `: ${scopeParts.join(" · ")}` : ""}.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!sector || suggestMutation.isPending}
          onClick={() => suggestMutation.mutate()}
          className="gap-1.5 shrink-0"
        >
          {suggestMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden />
          )}
          Get suggestions
        </Button>
      </div>

      {!sector && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-200">Set organization sector in settings to enable suggestions.</p>
      )}

      {sector && !suggestMutation.isPending && suggestions.length === 0 && !suggestMutation.isError && (
        <p className="mt-4 text-xs text-slate-500 dark:text-tw-muted">
          Click <span className="font-medium">Get suggestions</span> to discover emerging domains for your sector — uses one AI call only when you request it.
        </p>
      )}

      {suggestMutation.isError && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-300">Could not load domain suggestions.</p>
      )}

      <ul className="mt-4 space-y-3">
        {suggestions.map((item) => (
          <li
            key={item.domain_name}
            className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 dark:border-tw-border dark:bg-tw-raised"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-tw-text">{item.domain_name}</p>
              {trendLabel(item.trend)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-tw-muted line-clamp-2">{item.rationale}</p>
            <p className="mt-1 text-[10px] font-medium text-slate-400">Relevance {item.relevance_score}/5</p>
            {(item.example_skills?.length ?? 0) > 0 && (
              <p className="mt-1.5 text-[10px] text-slate-500 dark:text-tw-muted">
                Examples: {item.example_skills.join(", ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
