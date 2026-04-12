"use client";

import Link from "next/link";
import { cardSurfaceClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default function EmployeeSkillsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">My skills</h1>
      <div className={cn(cardSurfaceClass, "p-6 text-sm text-slate-600 dark:text-tw-muted")}>
        Full skill profile grid ships next. For now, use the{" "}
        <Link href="/employee/dashboard" className="font-medium text-brand-700 hover:underline dark:text-tw-blue">
          dashboard
        </Link>{" "}
        summary and HR tools for deep dives.
      </div>
    </div>
  );
}
