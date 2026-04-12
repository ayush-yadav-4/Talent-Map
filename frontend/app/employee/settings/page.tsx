"use client";

import { cardSurfaceClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default function EmployeeSettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Settings</h1>
      <div className={cn(cardSurfaceClass, "p-6 text-sm text-slate-600 dark:text-tw-muted")}>
        Profile and consent controls will live here. Your selections from onboarding are stored on your employee record.
      </div>
    </div>
  );
}
