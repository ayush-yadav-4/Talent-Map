"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  Briefcase, 
  Search, 
  MapPin, 
  Building2,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { cardSurfaceClass } from "@/lib/ui";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useSearchParams } from "next/navigation";

function toDisplayText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    if (typeof item.skill_name === "string") {
      const parts: string[] = [item.skill_name];
      if (typeof item.note === "string" && item.note.trim()) parts.push(`- ${item.note}`);
      if (typeof item.proficiency === "number") parts.push(`(Proficiency: ${item.proficiency})`);
      return parts.join(" ");
    }
    const fallback = Object.values(item).find((v) => typeof v === "string");
    if (typeof fallback === "string") return fallback;
  }
  return "N/A";
}

export default function EmployeeJobDescriptionsPage() {
  const searchParams = useSearchParams();
  const { ready } = useRequireAuth(["employee", "org_admin", "hr_manager"]);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [selectedJD, setSelectedJD] = useState<any | null>(null);

  const { data: jds, isLoading } = useQuery({
    queryKey: ["job-descriptions"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/job-descriptions/");
      return data as any[];
    },
    enabled: ready,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const analyzeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/v1/job-descriptions/${id}/analyze-gap`);
      return data;
    },
    onError: () => toast.error("Could not complete analysis. Check your connection.")
  });

  const filteredJDs = jds?.filter(j => {
    const matchesSearch = j.title.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === "All" || j.role_type === filterRole;
    return matchesSearch && matchesRole;
  });

  const roleFilters = useMemo(() => {
    const dynamicRoles = Array.from(new Set((jds ?? []).map((jd) => jd.role_type).filter(Boolean)));
    return ["All", ...dynamicRoles];
  }, [jds]);

  useEffect(() => {
    if (!jds?.length) return;
    const jdIdFromQuery = searchParams.get("jd");
    if (!jdIdFromQuery) return;
    const matched = jds.find((item) => item.id === jdIdFromQuery);
    if (matched) {
      setSelectedJD(matched);
    }
  }, [jds, searchParams]);

  const { data: selectedJdDetails, isLoading: isLoadingSelectedJdDetails } = useQuery({
    queryKey: ["employee-jd-detail", selectedJD?.id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/job-descriptions/${selectedJD.id}`);
      return data as any;
    },
    enabled: ready && Boolean(selectedJD?.id),
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (!ready) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Open Positions & Roles</h1>
          <p className="text-sm text-slate-500 dark:text-tw-muted mt-1">Explore role details, responsibilities, and analyze your skill gap in one place.</p>
        </div>
      </div>

      <div className={cn(cardSurfaceClass, "p-4 space-y-3")}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search roles by title..."
            className="pl-10 h-10 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {roleFilters.map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                filterRole === r
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-tw-raised dark:text-tw-muted dark:hover:bg-tw-card",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
        </div>
      ) : filteredJDs?.length === 0 ? (
        <div className={cn(cardSurfaceClass, "p-10 text-center")}>
          <p className="text-sm text-slate-500 dark:text-tw-muted">No job descriptions found for your current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredJDs?.map((jd) => (
            <button
              key={jd.id}
              onClick={() => setSelectedJD(jd)}
              className={cn(
                cardSurfaceClass,
                "text-left p-6 border border-slate-200 dark:border-tw-border hover:border-brand-300 dark:hover:border-tw-blue/40 shadow-sm hover:shadow-md transition-all",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-tw-text leading-tight">{jd.title}</h3>
                <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase bg-brand-50 text-brand-700 dark:bg-tw-blue/20 dark:text-tw-blue">
                  {jd.role_type || "General"}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-tw-muted line-clamp-2">
                {jd.summary || "Open role in your organization. Click to view full details and responsibilities."}
              </p>
              <div className="mt-4 space-y-1 text-xs text-slate-600 dark:text-tw-muted">
                <p className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {jd.domain || "General domain"}</p>
                <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {jd.location || "Location not specified"}</p>
                <p>Seniority: {jd.seniority || "Not specified"}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedJD && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm p-4 flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              className={cn(cardSurfaceClass, "w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-tw-border")}
            >
              <div className="p-6 border-b border-slate-100 dark:border-tw-border bg-slate-50/70 dark:bg-tw-raised sticky top-0 z-10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-tw-text">{selectedJD.title}</h2>
                    <p className="text-sm text-slate-500 dark:text-tw-muted mt-1">
                      {(selectedJdDetails?.role_type || selectedJD.role_type || "General")} · {(selectedJdDetails?.domain || selectedJD.domain || "General")} · {(selectedJdDetails?.employment_type || selectedJD.employment_type || "Full-time")}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedJD(null);
                    }}
                    className="rounded-lg px-3 py-2 text-xs font-semibold border border-slate-200 dark:border-tw-border text-slate-600 dark:text-tw-muted hover:bg-slate-100 dark:hover:bg-tw-card"
                  >
                    Close
                  </button>
                </div>
                <div className="mt-4">
                  <Button
                    onClick={() => analyzeMutation.mutate(selectedJD.id)}
                    disabled={analyzeMutation.isPending}
                    className="bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-2"
                  >
                    {analyzeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    View Skill Gap
                  </Button>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {isLoadingSelectedJdDetails && (
                  <div className="py-10 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                  </div>
                )}
                {analyzeMutation.data && (
                  <div className="bg-brand-50/50 dark:bg-tw-blue/10 border border-brand-100 dark:border-tw-blue/30 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2 text-brand-700 dark:text-tw-blue font-bold">
                        <Sparkles className="h-5 w-5" /> AI GAP ANALYSIS
                      </div>
                      <span className={cn(
                        "text-lg font-black px-3 py-1 rounded-lg",
                        (analyzeMutation.data.analysis.fit_score ?? 0) > 70 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {analyzeMutation.data.analysis.fit_score ?? 0}% fit
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" /> Your Strengths
                        </h4>
                        <ul className="mt-2 space-y-2">
                          {(analyzeMutation.data.analysis.strengths || []).map((s: unknown, i: number) => (
                            <li key={i} className="text-sm text-slate-700 dark:text-tw-text flex items-start gap-2">
                              <ArrowRight className="h-3 w-3 mt-1 shrink-0 text-emerald-400" /> {toDisplayText(s)}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" /> Potential Gaps
                        </h4>
                        <ul className="mt-2 space-y-2">
                          {(analyzeMutation.data.analysis.gaps || []).map((g: unknown, i: number) => (
                            <li key={i} className="text-sm text-slate-700 dark:text-tw-text flex items-start gap-2">
                              <ArrowRight className="h-3 w-3 mt-1 shrink-0 text-amber-400" /> {toDisplayText(g)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <section className="rounded-xl border border-slate-100 dark:border-tw-border bg-slate-50 dark:bg-tw-raised p-5">
                    <h3 className="font-bold text-slate-900 dark:text-tw-text flex items-center gap-2">
                      <FileText className="h-4 w-4 text-brand-500" /> Summary
                    </h3>
                    <p className="mt-3 text-sm text-slate-600 dark:text-tw-muted leading-relaxed whitespace-pre-wrap">
                      {selectedJdDetails?.summary || selectedJD.summary || "No summary provided."}
                    </p>
                  </section>

                  <div className="border-t border-slate-100 dark:border-tw-border" />

                  <section className="rounded-xl border border-slate-100 dark:border-tw-border bg-slate-50 dark:bg-tw-raised p-5">
                    <h3 className="font-bold text-slate-900 dark:text-tw-text">Core Responsibilities</h3>
                    <p className="mt-3 text-sm text-slate-600 dark:text-tw-muted whitespace-pre-wrap leading-relaxed">
                      {selectedJdDetails?.responsibilities || selectedJD.responsibilities || "Check with HR for details."}
                    </p>
                  </section>

                  <div className="border-t border-slate-100 dark:border-tw-border" />

                  <section className="rounded-xl border border-slate-100 dark:border-tw-border bg-slate-50 dark:bg-tw-raised p-5">
                    <h3 className="font-bold text-slate-900 dark:text-tw-text">Requirements</h3>
                    <p className="mt-3 text-sm text-slate-700 dark:text-tw-text whitespace-pre-wrap leading-relaxed">
                      {selectedJdDetails?.requirements || selectedJD.requirements || "No requirements provided."}
                    </p>
                  </section>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
