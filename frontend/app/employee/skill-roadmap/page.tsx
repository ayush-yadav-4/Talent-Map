"use client";

import { SkillRoadmap } from "@/components/employee/SkillRoadmap";

export default function EmployeeSkillRoadmapPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Skill roadmap</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">
          Explore recommended target roles and generate a detailed upskilling plan.
        </p>
      </div>
      <SkillRoadmap />
    </div>
  );
}
