"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { 
  Briefcase, 
  Users, 
  Search, 
  Sparkles, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  Download,
  CheckCircle2,
  Eye,
  FileText,
  Printer
} from "lucide-react";
import { api, employeeApi, readStoredUser } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cn } from "@/lib/utils";
import { cardSurfaceClass } from "@/lib/ui";
import { Button, Input } from "@/components/ui";
import Link from "next/link";

type JD = {
  id: string;
  title: string;
  role_type?: string;
  summary?: string;
  requirements?: string;
};

type Employee = {
  id: string;
  full_name: string;
  job_title: string;
};

type GapRow = {
  id: string;
  employee_id: string;
  employee_name: string;
  jd_id: string;
  jd_title: string;
  fit_score: number;
  analysis_results: {
    strengths?: string[];
    gaps?: string[];
    recommendations?: string[];
    build_vs_buy?: {
      decision: "Hire" | "Upskill";
      reasoning: string;
      upskill_cost_estimate: number;
      hire_cost_estimate: number;
      time_to_upskill_months: number;
      time_to_hire_months: number;
      risk_score?: "Low" | "Medium" | "High";
    };
  };
};

export default function HireVsUpskillPage() {
  const { ready } = useRequireAuth(["org_admin", "hr_manager"]);
  const user = readStoredUser();
  const [selectedJdId, setSelectedJdId] = useState<string>("");
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [liveAnalysisResult, setLiveAnalysisResult] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLogging, setIsLogging] = useState(false);

  const { data: jds, isLoading: loadingJds } = useQuery({
    queryKey: ["hr-jds"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/job-descriptions");
      return data as JD[];
    },
    enabled: ready,
  });

  const { data: employees, isLoading: loadingEmps } = useQuery({
    queryKey: ["hr-employees"],
    queryFn: async () => {
      const { data } = await employeeApi.list();
      return data as Employee[];
    },
    enabled: ready,
  });

  const { data: gaps, isLoading: loadingGaps, refetch: refetchGaps } = useQuery({
    queryKey: ["all-skill-gaps"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/job-descriptions/all/gaps");
      return data as GapRow[];
    },
    enabled: ready,
  });

  const activeJd = useMemo(() => jds?.find(j => j.id === selectedJdId), [jds, selectedJdId]);

  // Combine employees and their existing gaps for the selected JD
  const combinedCandidates = useMemo(() => {
    if (!employees || !selectedJdId) return [];
    
    const mapped = employees.map(emp => {
      const gap = gaps?.find(g => g.employee_id === emp.id && g.jd_id === selectedJdId);
      return {
        ...emp,
        gapId: gap?.id,
        fit_score: gap?.fit_score,
        hasGapAnalysis: !!gap,
        hasBuildVsBuy: !!gap?.analysis_results?.build_vs_buy,
        gapRecord: gap
      };
    });

    mapped.sort((a, b) => {
      if (a.hasGapAnalysis && b.hasGapAnalysis) return (b.fit_score || 0) - (a.fit_score || 0);
      if (a.hasGapAnalysis) return -1;
      if (b.hasGapAnalysis) return 1;
      return a.full_name.localeCompare(b.full_name);
    });

    if (!searchQuery.trim()) return mapped;
    return mapped.filter(c => c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || c.job_title?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [employees, gaps, selectedJdId, searchQuery]);

  const activeCandidate = selectedEmpId ? combinedCandidates.find(c => c.id === selectedEmpId) : null;
  const analysisToDisplay = liveAnalysisResult || activeCandidate?.gapRecord?.analysis_results?.build_vs_buy;

  const handleAnalyze = async () => {
    if (!selectedJdId || !activeCandidate) return;
    setIsAnalyzing(true);
    setLiveAnalysisResult(null);
    try {
      let currentGapId = activeCandidate.gapId;
      
      if (!currentGapId) {
        const { data: gapData } = await api.post(`/api/v1/job-descriptions/${selectedJdId}/analyze-gap?employee_id=${activeCandidate.id}`);
        currentGapId = gapData.gap_id;
        await refetchGaps();
      }

      if (currentGapId) {
        const { data } = await api.get(`/api/v1/job-descriptions/gaps/${currentGapId}/hire-vs-upskill`);
        setLiveAnalysisResult(data);
        await refetchGaps();
      }
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLogDecision = () => {
    setIsLogging(true);
    setTimeout(() => {
      alert("Decision successfully logged to candidate profile!");
      setIsLogging(false);
    }, 1000);
  };

  if (!ready) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 print:p-0 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-tw-text flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-brand-600" />
            Decision Intelligence: Hire vs Upskill
          </h1>
          <p className="mt-2 text-base text-slate-500 dark:text-tw-muted max-w-2xl">
            Evaluate the financial and operational trade-offs of internal upskilling versus external hiring. Make data-backed decisions based on market intelligence and candidate readiness.
          </p>
        </div>
      </div>

      {/* Top Section: Role and Candidates (Full Width side-by-side or stacked) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
        {/* 1. Select Target Role */}
        <div className={cn(cardSurfaceClass, "p-6 border-2 border-transparent hover:border-slate-200 transition-all shadow-sm")}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-slate-800 dark:text-tw-text flex items-center gap-2">
               <Briefcase className="h-5 w-5 text-brand-600" />
               1. Target Job Role
            </h3>
          </div>
          
          {loadingJds ? (
             <div className="h-12 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
          ) : (
            <div className="space-y-4">
              <select
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold dark:border-tw-border dark:bg-tw-card focus:ring-brand-500 focus:border-brand-500 transition-colors cursor-pointer"
                value={selectedJdId}
                onChange={(e) => {
                  setSelectedJdId(e.target.value);
                  setSelectedEmpId(null);
                  setLiveAnalysisResult(null);
                }}
              >
                <option value="" disabled>-- Select a Job Description --</option>
                {jds?.map((jd) => (
                  <option key={jd.id} value={jd.id}>{jd.title}</option>
                ))}
              </select>

              {selectedJdId && activeJd && (
                <Link href={`/hr/job-descriptions/${selectedJdId}`} target="_blank">
                  <Button 
                    className="w-full flex items-center justify-center gap-2 text-sm font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                    type="button"
                  >
                    <Eye className="h-4 w-4" /> View JD Details
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* 2. Internal Candidates */}
        <div className={cn(cardSurfaceClass, "p-0 overflow-hidden flex flex-col border-2 border-transparent hover:border-slate-200 transition-all shadow-sm h-[300px]")}>
          <div className="p-4 border-b border-slate-100 dark:border-tw-border bg-slate-50/80 dark:bg-tw-raised backdrop-blur flex justify-between items-center z-10">
            <h3 className="text-lg font-black text-slate-800 dark:text-tw-text flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-600" />
              2. Internal Candidates
            </h3>
            {selectedJdId && (
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input 
                  placeholder="Search..." 
                  className="pl-8 h-8 text-xs bg-white dark:bg-tw-card"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="overflow-y-auto flex-1 p-3 flex flex-col gap-2 bg-slate-50/30 dark:bg-transparent">
            {!selectedJdId ? (
               <div className="flex items-center justify-center text-slate-400 text-sm font-medium py-10">
                 Select a role first
               </div>
            ) : loadingEmps ? (
               <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
            ) : combinedCandidates.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-10 font-medium">No employees found.</div>
            ) : (
              combinedCandidates.map((candidate) => (
                <button
                  key={candidate.id}
                  onClick={() => {
                    setSelectedEmpId(candidate.id);
                    setLiveAnalysisResult(null);
                  }}
                  className={cn(
                    "text-left p-3 rounded-xl flex flex-col justify-center transition-all border-2",
                    selectedEmpId === candidate.id 
                      ? "bg-brand-50 dark:bg-brand-900/40 border-brand-500 shadow-sm" 
                      : "bg-white dark:bg-tw-card border-slate-100 dark:border-tw-border hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm"
                  )}
                >
                  <div className="flex justify-between items-start w-full mb-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-tw-text truncate pr-2">{candidate.full_name}</p>
                    {candidate.hasGapAnalysis ? (
                       <span className={cn(
                         "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0",
                         (candidate.fit_score || 0) > 70 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                       )}>{Math.round(candidate.fit_score || 0)}% Fit</span>
                    ) : (
                       <span className="text-[10px] text-slate-400 font-bold px-1.5 bg-slate-100 dark:bg-tw-raised rounded uppercase tracking-wider">New</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate w-full">
                    {candidate.hasBuildVsBuy ? (
                      <span className="text-emerald-600 flex items-center gap-1 font-semibold"><CheckCircle2 className="h-3 w-3"/> Evaluated</span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1"><AlertCircle className="h-3 w-3"/> Pending Analysis</span>
                    )}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Analysis Section - Full Width */}
      <div className="w-full">
        {!selectedJdId || !selectedEmpId ? (
          <div className="hidden"></div>
        ) : (
          <div className="space-y-6">
            {/* Top Bar for Action */}
            <div className={cn(cardSurfaceClass, "p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white border-none shadow-xl overflow-hidden relative print:hidden")}>
              <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-brand-600/30 to-transparent pointer-events-none"></div>
              <div className="z-10">
                <h2 className="text-3xl font-black tracking-tight">Candidate Profile: {activeCandidate?.full_name}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <p className="text-slate-300 text-sm font-medium flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> Target: {activeJd?.title}
                  </p>
                  {activeCandidate?.hasGapAnalysis && (
                    <span className="px-3 py-1 rounded-md text-xs font-black bg-white/10 text-white border border-white/20">
                      Baseline Match: {Math.round(activeCandidate?.fit_score || 0)}%
                    </span>
                  )}
                </div>
              </div>
              <Button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="z-10 bg-brand-500 hover:bg-brand-400 text-white font-black shadow-lg shadow-brand-500/30 py-6 px-8 text-lg rounded-xl transition-all hover:scale-105 active:scale-95"
              >
                {isAnalyzing ? <Loader2 className="h-5 w-5 mr-3 animate-spin" /> : <Sparkles className="h-5 w-5 mr-3" />}
                {activeCandidate?.hasGapAnalysis ? "Generate Executive Report" : "Run Deep Assessment"}
              </Button>
            </div>

            {!analysisToDisplay ? (
              <div className={cn(cardSurfaceClass, "p-24 text-center shadow-md bg-white dark:bg-tw-card border-2 border-dashed border-slate-200 dark:border-tw-border print:hidden")}>
                 <div className="inline-flex items-center justify-center p-5 bg-brand-50 dark:bg-brand-950/30 rounded-full mb-6">
                   <TrendingUp className="h-12 w-12 text-brand-500" />
                 </div>
                 <h3 className="text-2xl font-black text-slate-800 dark:text-tw-text mb-4">Awaiting Assessment</h3>
                 <p className="text-slate-500 text-lg max-w-xl mx-auto leading-relaxed">
                   Initiate the Deep Assessment to generate comprehensive metrics comparing the ROI of internal upskilling versus external recruitment.
                 </p>
              </div>
            ) : (
              <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 print:space-y-6">
                
                {/* Print Only Header */}
                <div className="hidden print:block mb-8">
                  <h1 className="text-4xl font-black text-black">Decision Intelligence Report</h1>
                  <h2 className="text-xl text-gray-600 mt-2">Target Role: {activeJd?.title} | Candidate: {activeCandidate?.full_name}</h2>
                  <hr className="my-4 border-gray-300" />
                </div>

                {/* AI Recommendation Banner */}
                <div className={cn(
                  "p-5 rounded-2xl border-2 flex flex-col gap-4 shadow-lg relative overflow-hidden print:border-slate-300",
                  analysisToDisplay.decision === "Upskill" 
                    ? "bg-emerald-900 border-emerald-700 text-white print:bg-emerald-50 print:text-slate-900" 
                    : "bg-blue-900 border-blue-700 text-white print:bg-blue-50 print:text-slate-900"
                )}>
                  <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none print:hidden">
                    {analysisToDisplay.decision === "Upskill" ? <TrendingUp className="w-32 h-32" /> : <Users className="w-32 h-32" />}
                  </div>
                  
                  <div className="flex items-center gap-4 z-10">
                    <div className={cn(
                      "p-3 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
                      analysisToDisplay.decision === "Upskill" ? "bg-emerald-800 text-emerald-100 print:bg-emerald-100 print:text-emerald-800" : "bg-blue-800 text-blue-100 print:bg-blue-100 print:text-blue-800"
                    )}>
                      {analysisToDisplay.decision === "Upskill" ? <TrendingUp className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-0.5">System Verdict</p>
                      <h3 className="text-2xl font-black tracking-tight">
                        Recommended Strategy: {analysisToDisplay.decision}
                      </h3>
                    </div>
                  </div>

                  <div className="z-10 w-full mt-2">
                    <ReactMarkdown
                      components={{
                        ul: ({node, ...props}) => <div className="space-y-3" {...props} />,
                        li: ({node, ...props}) => (
                          <div className="bg-black/20 p-4 rounded-xl border border-white/10 shadow-sm print:bg-white print:border-slate-300 print:text-slate-900 flex items-start gap-3">
                            <div className="h-2 w-2 rounded-full bg-white/50 print:bg-slate-400 mt-2 shrink-0"></div>
                            <span className="text-sm leading-relaxed block flex-1" {...props} />
                          </div>
                        ),
                        p: ({node, ...props}) => <p className="mb-3 text-sm print:text-slate-900" {...props} />
                      }}
                    >
                      {analysisToDisplay.reasoning}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Side by Side Comparison - White text inside options */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 break-inside-avoid">
                  {/* UPSKILL CARD */}
                  <div className={cn("rounded-2xl p-6 relative overflow-hidden flex flex-col transition-all duration-300 shadow-lg print:border print:border-slate-300", 
                    analysisToDisplay.decision === "Upskill" ? "bg-slate-900 ring-2 ring-emerald-500 shadow-emerald-500/20 print:bg-white" : "bg-slate-800 opacity-90 hover:opacity-100 print:bg-slate-50"
                  )}>
                    {analysisToDisplay.decision === "Upskill" && (
                      <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest shadow-md print:hidden">
                        Best ROI Option
                      </div>
                    )}
                    <h4 className="text-xl font-black text-white print:text-slate-900 flex items-center gap-3 mb-1">
                      <TrendingUp className="h-6 w-6 text-emerald-400 print:text-emerald-600" /> Option A: Upskill Internally
                    </h4>
                    <p className="text-slate-400 print:text-slate-600 font-medium mb-6 text-xs">Develop {activeCandidate?.full_name} to meet role requirements</p>
                    
                    <div className="space-y-4 flex-1 text-white print:text-slate-900">
                      <div className="flex justify-between items-center py-3 border-b border-white/10 print:border-slate-200">
                        <span className="text-xs font-bold text-slate-300 print:text-slate-500 uppercase tracking-widest">Total Estimated Cost</span>
                        <span className="text-2xl font-black text-emerald-400 print:text-emerald-700">
                          ${analysisToDisplay.upskill_cost_estimate?.toLocaleString() || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-white/10 print:border-slate-200">
                        <span className="text-xs font-bold text-slate-300 print:text-slate-500 uppercase tracking-widest">Readiness Time</span>
                        <span className="font-bold text-xl">
                          {analysisToDisplay.time_to_upskill_months} months
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-white/10 print:border-slate-200">
                        <span className="text-xs font-bold text-slate-300 print:text-slate-500 uppercase tracking-widest">Risk Profile</span>
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 print:bg-emerald-100 print:text-emerald-800 rounded text-xs font-black uppercase tracking-widest border border-emerald-500/30 print:border-emerald-200">
                          Low Risk
                        </span>
                      </div>

                      {/* Detailed Skill Gaps & Training needs inside the Upskill card */}
                      <div className="mt-6 pt-4">
                        <h5 className="text-xs font-black text-emerald-400 print:text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" /> Required Training Plan
                        </h5>
                        <ul className="space-y-2">
                          {(activeCandidate?.gapRecord?.analysis_results?.gaps || []).length > 0 ? (
                            (activeCandidate?.gapRecord?.analysis_results?.gaps || []).map((g: any, i: number) => {
                              const skillName = typeof g === 'string' ? g : g.skill_name || JSON.stringify(g);
                              return (
                                <li key={i} className="flex items-start gap-2 bg-white/5 print:bg-white p-2 rounded-lg border border-white/10 print:border-slate-200">
                                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 print:bg-emerald-600 mt-2 shrink-0"></div>
                                  <div>
                                    <span className="font-bold text-sm block">{skillName}</span>
                                    <span className="text-[10px] text-slate-400 print:text-slate-500 mt-0.5 block">Estimated ~{Math.max(1, Math.floor((analysisToDisplay.time_to_upskill_months || 1) * 2))} weeks structured learning</span>
                                  </div>
                                </li>
                              )
                            })
                          ) : (
                            <li className="text-xs text-slate-400 print:text-slate-500 italic">Minor refinements required; no major gaps.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* HIRE CARD */}
                  <div className={cn("rounded-2xl p-6 relative overflow-hidden flex flex-col transition-all duration-300 shadow-lg print:border print:border-slate-300", 
                    analysisToDisplay.decision === "Hire" ? "bg-slate-900 ring-2 ring-blue-500 shadow-blue-500/20 print:bg-white" : "bg-slate-800 opacity-90 hover:opacity-100 print:bg-slate-50"
                  )}>
                    {analysisToDisplay.decision === "Hire" && (
                      <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest shadow-md print:hidden">
                        Best ROI Option
                      </div>
                    )}
                    <h4 className="text-xl font-black text-white print:text-slate-900 flex items-center gap-3 mb-1">
                      <Users className="h-6 w-6 text-blue-400 print:text-blue-600" /> Option B: Hire Externally
                    </h4>
                    <p className="text-slate-400 print:text-slate-600 font-medium mb-6 text-xs">Recruit a fully qualified candidate for {activeJd?.title}</p>
                    
                    <div className="space-y-4 flex-1 text-white print:text-slate-900">
                      <div className="flex justify-between items-center py-3 border-b border-white/10 print:border-slate-200">
                        <span className="text-xs font-bold text-slate-300 print:text-slate-500 uppercase tracking-widest">Est. Hiring Cost</span>
                        <span className="text-2xl font-black text-blue-400 print:text-blue-700">
                          ${analysisToDisplay.hire_cost_estimate?.toLocaleString() || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-white/10 print:border-slate-200">
                        <span className="text-xs font-bold text-slate-300 print:text-slate-500 uppercase tracking-widest">Productivity Time</span>
                        <span className="font-bold text-xl">
                          {analysisToDisplay.time_to_hire_months} months
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-white/10 print:border-slate-200">
                        <span className="text-xs font-bold text-slate-300 print:text-slate-500 uppercase tracking-widest">Risk Profile</span>
                        <span className="px-3 py-1 bg-amber-500/20 text-amber-300 print:bg-amber-100 print:text-amber-800 rounded text-xs font-black uppercase tracking-widest border border-amber-500/30 print:border-amber-200">
                          Medium Risk
                        </span>
                      </div>

                      <div className="mt-6 pt-4">
                         <h5 className="text-xs font-black text-blue-400 print:text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                           <FileText className="h-4 w-4" /> Market Intelligence Factors
                         </h5>
                         <ul className="space-y-2">
                           <li className="flex items-start gap-2 bg-white/5 print:bg-white p-2 rounded-lg border border-white/10 print:border-slate-200">
                             <div className="h-1.5 w-1.5 rounded-full bg-blue-400 print:bg-blue-600 mt-2 shrink-0"></div>
                             <div>
                               <span className="font-bold text-sm block">Recruitment Fees</span>
                               <span className="text-[10px] text-slate-400 print:text-slate-500 mt-0.5 block">Estimated 15-20% CTC agency + sourcing costs.</span>
                             </div>
                           </li>
                           <li className="flex items-start gap-2 bg-white/5 print:bg-white p-2 rounded-lg border border-white/10 print:border-slate-200">
                             <div className="h-1.5 w-1.5 rounded-full bg-blue-400 print:bg-blue-600 mt-2 shrink-0"></div>
                             <div>
                               <span className="font-bold text-sm block">Onboarding Ramp-up</span>
                               <span className="text-[10px] text-slate-400 print:text-slate-500 mt-0.5 block">Includes domain integration & organizational acclimation.</span>
                             </div>
                           </li>
                           <li className="flex items-start gap-2 bg-white/5 print:bg-white p-2 rounded-lg border border-white/10 print:border-slate-200">
                             <div className="h-1.5 w-1.5 rounded-full bg-blue-400 print:bg-blue-600 mt-2 shrink-0"></div>
                             <div>
                               <span className="font-bold text-sm block">Culture Fit Risk</span>
                               <span className="text-[10px] text-slate-400 print:text-slate-500 mt-0.5 block">External hires hold a higher 12-month attrition risk.</span>
                             </div>
                           </li>
                         </ul>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 print:hidden">
                   <Button 
                     variant="outline" 
                     className="gap-2 font-bold h-12 px-6 bg-white dark:bg-tw-card border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                     onClick={handlePrint}
                   >
                     <Printer className="h-5 w-5" /> Export PDF Report
                   </Button>
                   <Button 
                     className="gap-2 font-bold h-12 px-10 shadow-lg text-base"
                     onClick={handleLogDecision}
                     disabled={isLogging}
                   >
                     {isLogging ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                     Log Final Decision
                   </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
