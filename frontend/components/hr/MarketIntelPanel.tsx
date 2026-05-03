"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp, Minus, Loader2 } from "lucide-react";
import { agentApi } from "@/lib/api";
import { cardSurfaceClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

export type MarketSignal = {
  skill_name: string;
  trend: string;
  demand_level: number;
  why: string;
};

type Props = {
  sector?: string | null;
  roleHint?: string;
  limit?: number;
  className?: string;
};

function trendIcon(trend: string) {
  const t = (trend || "").toLowerCase();
  if (t === "rising") return <TrendingUp className="h-4 w-4 text-emerald-600" aria-hidden />;
  if (t === "declining") return <TrendingDown className="h-4 w-4 text-amber-600" aria-hidden />;
  return <Minus className="h-4 w-4 text-slate-400" aria-hidden />;
}

export function MarketIntelPanel({ sector, roleHint, limit = 5, className }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["market-signals", sector, roleHint, limit],
    queryFn: async () => {
      const { data: d } = await agentApi.marketSignals({
        sector: sector || undefined,
        role: roleHint || "General workforce",
        limit,
      });
      return d as { sector: string; signals: MarketSignal[] };
    },
    enabled: Boolean(sector),
  });

  return (
    <div className={cn(cardSurfaceClass, "p-4 shadow-sm", className)}>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Market intelligence</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-tw-muted">
        AI-synthesized skill demand signals for sector <span className="font-medium">{data?.sector ?? sector ?? "—"}</span>.
      </p>
      {!sector && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-200">Set organization sector to load signals.</p>
      )}
      {isLoading && sector && (
        <div className="mt-6 flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" aria-hidden />
        </div>
      )}
      {error && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-300">Could not load market signals.</p>
      )}
      <ul className="mt-4 space-y-3">
        {(data?.signals ?? []).map((s, i) => (
          <li
            key={`${s.skill_name}-${i}`}
            className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 dark:border-tw-border dark:bg-tw-raised"
          >
            <div className="mt-0.5 shrink-0">{trendIcon(s.trend)}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-tw-text">{s.skill_name}</p>
              <p className="text-[11px] text-slate-500 dark:text-tw-muted line-clamp-2">{s.why}</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Demand {s.demand_level}/5 · {s.trend}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {!isLoading && sector && !(data?.signals?.length ?? 0) && !error && (
        <p className="mt-3 text-xs text-slate-500 dark:text-tw-muted">No signals (check Gemini API key).</p>
      )}
    </div>
  );
}
