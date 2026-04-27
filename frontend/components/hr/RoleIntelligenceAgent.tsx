"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { agentApi } from "@/lib/api";
import { Button } from "@/components/ui";
import { cardSurfaceClass, formInputClass } from "@/lib/ui";
import { Sparkles, Loader2, Save, CheckCircle2, ChevronRight, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function RoleIntelligenceAgent() {
  const [jdText, setJdText] = useState("");
  const [extraction, setExtraction] = useState<any>(null);
  const queryClient = useQueryClient();

  const extractMutation = useMutation({
    mutationFn: async () => {
      const { data } = await agentApi.role.extract(jdText);
      return data;
    },
    onSuccess: (data) => {
      setExtraction(data);
      toast.success("Job description analyzed successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to analyze JD");
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await agentApi.role.create(extraction);
      return data;
    },
    onSuccess: () => {
      toast.success("Saved to Job Descriptions");
      setExtraction(null);
      setJdText("");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["job-descriptions"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to save role");
    }
  });

  return (
    <div className={cn(cardSurfaceClass, "p-6 shadow-lg border-brand-100/50 dark:border-tw-border/50")}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-brand-100 dark:bg-tw-blue/20 rounded-lg">
          <Sparkles className="h-5 w-5 text-brand-600 dark:text-tw-blue" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-tw-text">Role Intelligence Agent</h2>
          <p className="text-xs text-slate-500 dark:text-tw-muted">Paste a Job Description to extract a structured skill profile.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 dark:border-tw-border bg-slate-50 dark:bg-tw-raised p-3 text-xs text-slate-600 dark:text-tw-muted">
          For better results, include details like role purpose, team size, minimum experience, qualification, tools/platforms, key responsibilities, stakeholders, and success metrics.
        </div>
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="Paste the job description here... Include: role summary, qualifications, key responsibilities, required tools, key stakeholders, and success metrics/KPIs."
          className={cn(formInputClass, "min-h-[200px] resize-none text-sm leading-relaxed")}
          disabled={extractMutation.isPending}
        />

        <div className="flex justify-end gap-3">
          {extraction && (
            <Button
              variant="ghost"
              onClick={() => setExtraction(null)}
              className="text-slate-500 hover:text-slate-700"
            >
              Clear
            </Button>
          )}
          <Button
            onClick={() => extractMutation.mutate()}
            disabled={!jdText.trim() || extractMutation.isPending}
            className="bg-brand-600 hover:bg-brand-700 text-white gap-2 px-6"
          >
            {extractMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Analyze JD
          </Button>
        </div>
      </div>

      {extraction && (
        <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="p-4 bg-slate-50 dark:bg-tw-raised rounded-xl border border-slate-200 dark:border-tw-border">
            <h3 className="text-sm font-bold text-slate-900 dark:text-tw-text flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-600" />
              Extracted Role: {extraction.job_title}
            </h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-tw-muted italic">
              {extraction.description_summary}
            </p>
            <div className="mt-3 space-y-2 text-xs">
              <div className="rounded-lg bg-white dark:bg-tw-card border border-slate-100 dark:border-tw-border p-3 w-full">
                <p className="font-semibold text-slate-700 dark:text-tw-text">Role Summary</p>
                <p className="text-slate-600 dark:text-tw-muted mt-1">{extraction.role_summary || "—"}</p>
              </div>
              <div className="rounded-lg bg-white dark:bg-tw-card border border-slate-100 dark:border-tw-border p-3 w-full">
                <p className="font-semibold text-slate-700 dark:text-tw-text">Qualification</p>
                <p className="text-slate-600 dark:text-tw-muted mt-1">{extraction.qualification || "—"}</p>
              </div>
              <div className="rounded-lg bg-white dark:bg-tw-card border border-slate-100 dark:border-tw-border p-3 w-full">
                <p className="font-semibold text-slate-700 dark:text-tw-text">Responsibilities</p>
                <p className="text-slate-600 dark:text-tw-muted mt-1">{extraction.responsibilities || "—"}</p>
              </div>
              <div className="rounded-lg bg-white dark:bg-tw-card border border-slate-100 dark:border-tw-border p-3 w-full">
                <p className="font-semibold text-slate-700 dark:text-tw-text">Domain / Category</p>
                <p className="text-slate-600 dark:text-tw-muted mt-1">{extraction.domain || "General"} · {extraction.role_type_category || "General"}</p>
              </div>
              <div className="rounded-lg bg-white dark:bg-tw-card border border-slate-100 dark:border-tw-border p-3 w-full">
                <p className="font-semibold text-slate-700 dark:text-tw-text">Key Deliverables</p>
                <p className="text-slate-600 dark:text-tw-muted mt-1">{extraction.key_deliverables || "—"}</p>
              </div>
              <div className="rounded-lg bg-white dark:bg-tw-card border border-slate-100 dark:border-tw-border p-3 w-full">
                <p className="font-semibold text-slate-700 dark:text-tw-text">Stakeholders</p>
                <p className="text-slate-600 dark:text-tw-muted mt-1">{extraction.stakeholders || "—"}</p>
              </div>
              <div className="rounded-lg bg-white dark:bg-tw-card border border-slate-100 dark:border-tw-border p-3 w-full">
                <p className="font-semibold text-slate-700 dark:text-tw-text">Success Metrics / KPIs</p>
                <p className="text-slate-600 dark:text-tw-muted mt-1">{extraction.success_metrics || "—"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-tw-muted">Skill Requirements</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {extraction.required_skills.map((skill: any, idx: number) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white dark:bg-tw-card rounded-lg border border-slate-100 dark:border-tw-border shadow-sm group hover:border-brand-200 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-900 dark:text-tw-text">{skill.skill_name}</span>
                    <span className={cn(
                      "text-[10px] font-bold uppercase mt-0.5",
                      skill.importance === "Essential" ? "text-red-500" : "text-emerald-500"
                    )}>
                      {skill.importance}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase">Min Level</div>
                      <div className="text-sm font-bold text-slate-700 dark:text-tw-muted">{skill.min_proficiency}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-tw-border">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-11"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Role to Job Descriptions
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
