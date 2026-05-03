"use client";

import Link from "next/link";
import { GapSummaryTable } from "@/components/hr/GapSummaryTable";
import { MarketIntelPanel } from "@/components/hr/MarketIntelPanel";
import { SkillTaxonomyManager } from "@/components/hr/SkillTaxonomyManager";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { orgApi, readStoredUser } from "@/lib/api";
import { cardSurfaceClass } from "@/lib/ui";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function SkillIntelligencePage() {
  const { ready } = useRequireAuth(["org_admin", "hr_manager", "manager"]);
  const user = readStoredUser();
  const orgId = user?.org_id ?? "";

  const { data: org } = useQuery({
    queryKey: ["org-sector", orgId],
    queryFn: async () => {
      const { data } = await orgApi.get(orgId);
      return data as { sector?: string; name?: string };
    },
    enabled: ready && Boolean(orgId),
  });

  if (!ready) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-tw-text">Skill intelligence</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">
            Taxonomy, market signals, and org-wide gap summary for{" "}
            <span className="font-medium">{org?.name ?? "your organization"}</span>.
          </p>
        </div>
        <Link href="/hr/dashboard" className="text-sm font-semibold text-brand-700 hover:underline dark:text-tw-blue">
          ← Dashboard
        </Link>
      </div>

      <div className={cn(cardSurfaceClass, "p-4 text-sm text-slate-600 dark:text-tw-muted")}>
        <p>
          Sector preset: <span className="font-semibold text-slate-900 dark:text-tw-text">{org?.sector ?? "—"}</span>.
          Non-IT sectors (government, hospital, manufacturing, retail) use tailored skill domains when seeding.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SkillTaxonomyManager />
        <MarketIntelPanel sector={org?.sector} roleHint="Workforce planning" limit={8} />
      </div>

      <GapSummaryTable title="Organization gap matrix" />
    </div>
  );
}
