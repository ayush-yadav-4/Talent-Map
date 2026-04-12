"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/site/Logo";
import { StepIndicator } from "@/components/shared/StepIndicator";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const LABELS = ["Personal", "Professional", "Skills & education", "Consent"];

function stepFromPath(pathname: string | null): number {
  const m = pathname?.match(/step(\d+)/);
  return m ? Math.min(4, Math.max(1, Number.parseInt(m[1], 10))) : 1;
}

export default function EmployeeOnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const current = stepFromPath(pathname);
  const { ready } = useRequireAuth(["employee"]);

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
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <ThemeToggle />
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-brand-700 dark:text-tw-muted dark:hover:text-tw-blue">
            Home
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-tw-blue">Employee onboarding</p>
        <h1 className="mt-2 text-xl font-bold text-slate-900 dark:text-tw-text">Set up your profile</h1>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-tw-border dark:bg-tw-raised dark:shadow-none sm:p-6">
          <StepIndicator steps={LABELS} currentStep={current} />
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
