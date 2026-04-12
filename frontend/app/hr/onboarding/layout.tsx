"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/site/Logo";
import { StepIndicator } from "@/components/shared/StepIndicator";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const STEP_LABELS = ["Register", "Departments", "Roles", "Integrations", "Invite & finish"];

function stepFromPath(pathname: string | null): number {
  if (!pathname) return 2;
  const m = pathname.match(/step(\d+)/);
  if (!m) return 2;
  return Math.min(5, Math.max(2, Number.parseInt(m[1], 10)));
}

export default function HrOnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const current = stepFromPath(pathname);
  const { ready } = useRequireAuth(["org_admin", "hr_manager"]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-tw-bg">
        <p className="text-sm text-slate-500 dark:text-tw-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hero-mesh dark:bg-hero-mesh-dark">
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-tw-border dark:bg-tw-card dark:backdrop-blur-none">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-brand-700 dark:text-tw-muted dark:hover:text-tw-blue">
              Home
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-tw-blue">HR onboarding</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-tw-text">Finish setting up your organization</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-tw-muted">
          Step {current} of 5 — you completed registration in step 1.
        </p>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-tw-border dark:bg-tw-raised dark:shadow-none sm:p-6">
          <StepIndicator steps={STEP_LABELS} currentStep={current} completedThrough={1} />
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
