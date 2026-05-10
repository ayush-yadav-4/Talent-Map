"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Loader2, ArrowLeft, Briefcase, MapPin, Building2, PencilLine } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { cardSurfaceClass } from "@/lib/ui";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function JobDescriptionViewPage() {
  const { ready } = useRequireAuth(["org_admin", "hr_manager"]);
  const params = useParams();
  const id = params?.id as string;

  const { data: selectedJd, isLoading } = useQuery({
    queryKey: ["job-description-detail", id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/job-descriptions/${id}`);
      return data as any;
    },
    enabled: ready && Boolean(id),
    retry: false,
  });

  if (!ready) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/hr/job-descriptions">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Job Description View</h1>
          <p className="text-sm text-slate-500 dark:text-tw-muted mt-1">Review the details of this specific role.</p>
        </div>
      </div>

      {isLoading || !selectedJd ? (
        <div className="flex justify-center p-20">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
        </div>
      ) : (
        <div className={cn(cardSurfaceClass, "p-8 space-y-8")}>
          <div className="border-b border-slate-100 dark:border-tw-border pb-6 flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-brand-50 dark:bg-tw-blue/10 rounded-xl">
                <Briefcase className="h-8 w-8 text-brand-600" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-tw-text">{selectedJd.title}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-600 dark:text-tw-muted font-medium">
                  <span className="px-3 py-1 bg-slate-100 dark:bg-tw-raised rounded-md uppercase tracking-wider text-xs font-bold text-slate-500">
                    {selectedJd.role_type || "General"}
                  </span>
                  <span className="px-3 py-1 bg-slate-100 dark:bg-tw-raised rounded-md uppercase tracking-wider text-xs font-bold text-slate-500">
                    {selectedJd.domain || "General"}
                  </span>
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {selectedJd.location || "Remote"}</span>
                  <span className="flex items-center gap-1"><Building2 className="h-4 w-4" /> {selectedJd.seniority || "Not specified"}</span>
                </div>
              </div>
            </div>
            <Link href={`/hr/job-descriptions?edit=${id}`}>
              <Button variant="outline" className="gap-2">
                <PencilLine className="h-4 w-4" /> Edit Role
              </Button>
            </Link>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                Role Summary
              </h3>
              <div className="text-base text-slate-700 dark:text-tw-text leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-tw-raised p-6 rounded-2xl border border-slate-100 dark:border-tw-border">
                {selectedJd.summary || "No summary provided."}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                Core Responsibilities
              </h3>
              <div className="text-base text-slate-700 dark:text-tw-text leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-tw-raised p-6 rounded-2xl border border-slate-100 dark:border-tw-border">
                {selectedJd.responsibilities || "No responsibilities provided."}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                Requirements & Qualifications
              </h3>
              <div className="text-base text-slate-700 dark:text-tw-text leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-tw-raised p-6 rounded-2xl border border-slate-100 dark:border-tw-border">
                {selectedJd.requirements || "No requirements provided."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
