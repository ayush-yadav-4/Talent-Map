"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  steps: string[];
  currentStep: number;
  /** 1-based step index that are completed (all steps < currentStep typically completed) */
  completedThrough?: number;
};

export function StepIndicator({ steps, currentStep, completedThrough }: Props) {
  const doneThrough = completedThrough ?? Math.max(0, currentStep - 1);
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex min-w-[280px] items-center justify-between gap-2">
        {steps.map((label, i) => {
          const n = i + 1;
          const done = n <= doneThrough;
          const active = n === currentStep;
          return (
            <div key={label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-center">
                {i > 0 && <div className={cn("h-0.5 flex-1 rounded-full", done ? "bg-brand-600 dark:bg-tw-blue" : "bg-slate-200 dark:bg-tw-border")} />}
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition",
                    done && "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-600",
                    active &&
                      !done &&
                      "border-brand-600 bg-white text-brand-700 ring-2 ring-brand-200 dark:border-tw-blue dark:bg-tw-card dark:text-tw-blue dark:ring-tw-border",
                    !done && !active && "border-slate-200 bg-white text-slate-400 dark:border-tw-border dark:bg-tw-card dark:text-tw-muted",
                  )}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden /> : n}
                </div>
                {i < steps.length - 1 && (
                  <div className={cn("h-0.5 flex-1 rounded-full", n < doneThrough ? "bg-brand-600 dark:bg-tw-blue" : "bg-slate-200 dark:bg-tw-border")} />
                )}
              </div>
              <p
                className={cn(
                  "hidden max-w-[120px] text-center text-[11px] font-medium sm:block",
                  active ? "text-brand-800 dark:text-tw-text" : "text-slate-500 dark:text-tw-muted",
                )}
              >
                {label}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs text-slate-600 dark:text-tw-muted sm:hidden">
        {steps[currentStep - 1]}
      </p>
    </div>
  );
}
