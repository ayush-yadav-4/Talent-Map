"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Sparkles, 
  UserPlus, 
  ArrowLeft, 
  Pencil, 
  Users, 
  Briefcase, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Loader2,
  TrendingUp,
  UserCheck,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui";
import { orgApi, readStoredUser } from "@/lib/api";
import { cardSurfaceClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function HrProjectViewPage() {
  const params = useParams<{ id: string }>();
  const user = readStoredUser();
  const orgId = user?.org_id;
  const projectId = String(params?.id ?? "");
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"details" | "team_builder">("details");

  const { data: project, isLoading } = useQuery({
    queryKey: ["hr-project", orgId, projectId],
    queryFn: async () => {
      const { data } = await orgApi.getProject(orgId!, projectId);
      return data as any;
    },
    enabled: Boolean(orgId && projectId),
  });

  const { data: recommendations, isLoading: isLoadingRecs, refetch: getRecs } = useQuery({
    queryKey: ["project-recommendations", orgId, projectId],
    queryFn: async () => {
      const { data } = await orgApi.getProjectRecommendations(orgId!, projectId);
      return data as any;
    },
    enabled: false, // Trigger manually
  });

  const assignMutation = useMutation({
    mutationFn: async ({ employeeId, position }: { employeeId: string, position: string }) => {
      await orgApi.assignProjectMember(orgId!, projectId, { employee_id: employeeId, position });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-project", orgId, projectId] });
      toast.success("Employee assigned to project!");
    },
    onError: () => {
      toast.error("Failed to assign employee.");
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      await orgApi.removeProjectMember(orgId!, projectId, employeeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-project", orgId, projectId] });
      toast.success("Employee removed from project.");
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <p className="text-sm text-slate-500">Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <AlertCircle className="h-12 w-12 text-slate-300" />
        <p className="text-lg font-medium text-slate-900">Project not found</p>
        <Link href="/hr/projects"><Button variant="outline">Back to Projects</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/hr/projects">
            <div className="p-2 hover:bg-slate-100 dark:hover:bg-tw-raised rounded-full transition-colors cursor-pointer text-slate-500">
              <ArrowLeft className="h-5 w-5" />
            </div>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">{project.name}</h1>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-tw-raised rounded text-[10px] font-bold text-slate-500">{project.code}</span>
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
              <Briefcase className="h-3.5 w-3.5" /> {project.client_name || "Internal Project"}
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <Clock className="h-3.5 w-3.5 ml-1" /> {project.status}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/hr/projects/${projectId}/edit`}>
            <Button variant="outline" className="gap-2">
              <Pencil className="h-4 w-4" /> Edit Details
            </Button>
          </Link>
          <Button 
            className={cn(
              "gap-2 bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/20",
              activeTab === "team_builder" && "ring-2 ring-brand-500 ring-offset-2"
            )}
            onClick={() => setActiveTab("team_builder")}
          >
            <Sparkles className="h-4 w-4" /> AI Team Builder
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-tw-border">
        <button 
          onClick={() => setActiveTab("details")}
          className={cn(
            "px-6 py-3 text-sm font-bold transition-all border-b-2",
            activeTab === "details" 
              ? "border-brand-500 text-brand-600" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Project Overview
        </button>
        <button 
          onClick={() => setActiveTab("team_builder")}
          className={cn(
            "px-6 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2",
            activeTab === "team_builder" 
              ? "border-brand-500 text-brand-600" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Sparkles className="h-4 w-4" /> Team Builder & Recommendations
        </button>
      </div>

      {activeTab === "details" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className={cn(cardSurfaceClass, "p-6")}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900">
                <FileText className="h-5 w-5 text-brand-500" /> Description
              </h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{project.description || "No description provided."}</p>
              
              {project.tech_stack && (
                <div className="mt-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Required Tech Stack</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.tech_stack.split(",").map((tech: string) => (
                      <span key={tech} className="px-3 py-1 bg-slate-100 dark:bg-tw-raised rounded-full text-xs font-medium text-slate-700">
                        {tech.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={cn(cardSurfaceClass, "p-6")}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                  <Users className="h-5 w-5 text-brand-500" /> Current Team ({project.assignments?.length || 0})
                </h3>
                <Link href={`/hr/projects/${projectId}/add-employee`}>
                  <Button variant="ghost" size="sm" className="text-brand-600 hover:text-brand-700 font-bold">
                    <UserPlus className="h-4 w-4 mr-2" /> Manual Add
                  </Button>
                </Link>
              </div>
              
              {!project.assignments?.length ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400 bg-slate-50 dark:bg-tw-raised rounded-xl border-2 border-dashed border-slate-200">
                  <Users className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm font-medium">No team members assigned yet</p>
                  <Button 
                    variant="link" 
                    className="text-brand-600 mt-1"
                    onClick={() => setActiveTab("team_builder")}
                  >
                    Try AI Team Builder
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.assignments.map((a: any) => (
                    <div key={a.employee_id} className="p-4 rounded-xl border border-slate-100 dark:border-tw-border bg-white dark:bg-tw-elevated shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm">
                            {a.employee_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-tw-text">{a.employee_name}</p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Briefcase className="h-3 w-3" /> {a.position || "Member"}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                          onClick={() => removeMutation.mutate(a.employee_id)}
                        >
                          &times;
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Details */}
          <div className="space-y-6">
            <div className={cn(cardSurfaceClass, "p-6")}>
              <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider border-b pb-2 border-slate-100">Project Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <Calendar className="h-4 w-4" /> Deadline
                  </div>
                  <span className="text-sm font-bold text-slate-900">{project.deadline ? new Date(project.deadline).toLocaleDateString() : "No date"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <TrendingUp className="h-4 w-4" /> Priority
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                    project.priority === "high" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
                  )}>
                    {project.priority || "Normal"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <CheckCircle2 className="h-4 w-4" /> Status
                  </div>
                  <span className="text-sm font-bold text-brand-600">{project.status}</span>
                </div>
              </div>
            </div>

            {project.delivery_notes && (
              <div className={cn(cardSurfaceClass, "p-6 bg-brand-50 border-brand-100")}>
                <h3 className="text-sm font-bold text-brand-900 mb-2">Delivery Notes</h3>
                <p className="text-xs text-brand-700 italic leading-relaxed">{project.delivery_notes}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className={cn(cardSurfaceClass, "p-8 text-center bg-gradient-to-br from-brand-600 to-brand-800 text-white")}>
            <div className="inline-flex p-3 bg-white/20 rounded-2xl mb-4 backdrop-blur-md">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">AI Team Recommendation Engine</h2>
            <p className="text-brand-100 max-w-lg mx-auto mb-6 text-sm">
              Our AI analyzes your project requirements against the entire organization&apos;s skill pool, 
              seniority levels, and current bench availability to suggest the most optimal team.
            </p>
            <Button 
              size="lg" 
              className="bg-white text-brand-700 hover:bg-slate-50 font-bold px-8 shadow-xl"
              onClick={() => getRecs()}
              disabled={isLoadingRecs}
            >
              {isLoadingRecs ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analyzing...</> : "Run AI Analysis"}
            </Button>
          </div>

          {recommendations && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className={cn(cardSurfaceClass, "p-6 bg-slate-50 border-l-4 border-brand-500")}>
                <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-brand-500" /> Strategic Analysis
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">{recommendations.summary_analysis}</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {recommendations.recommendations.map((rec: any) => {
                  const isAssigned = project.assignments?.some((a: any) => a.employee_id === rec.employee_id);
                  
                  return (
                    <div key={rec.employee_id} className={cn(cardSurfaceClass, "p-6 hover:border-brand-300 transition-all")}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                              {rec.employee_name.charAt(0)}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm">
                              <div className={cn(
                                "h-4 w-4 rounded-full flex items-center justify-center",
                                rec.match_score > 85 ? "bg-emerald-500" : "bg-amber-500"
                              )}>
                                <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-tw-text text-lg">{rec.employee_name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                                <TrendingUp className="h-3 w-3 text-brand-500" /> Match Score: 
                                <span className="text-brand-600 ml-1">{rec.match_score}%</span>
                              </div>
                              {rec.seniority_match && (
                                <span className="px-2 py-0.5 bg-brand-50 text-brand-600 text-[9px] font-bold uppercase rounded">Seniority Fit</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {isAssigned ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
                            <UserCheck className="h-3.5 w-3.5" /> Assigned
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            className="bg-brand-600 hover:bg-brand-700 text-white h-9 px-4 gap-2"
                            onClick={() => assignMutation.mutate({ employee_id: rec.employee_id, position: "AI-Recommended Member" })}
                            disabled={assignMutation.isPending}
                          >
                            <UserPlus className="h-3.5 w-3.5" /> Assign
                          </Button>
                        )}
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="p-3 bg-slate-50 dark:bg-tw-raised rounded-xl text-xs text-slate-600 italic border-l-2 border-brand-200">
                          &quot;{rec.reasoning}&quot;
                        </div>
                        
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Key Alignment Skills</p>
                          <div className="flex flex-wrap gap-1.5">
                            {rec.skill_alignment.map((skill: string) => (
                              <span key={skill} className="px-2 py-1 bg-white dark:bg-tw-elevated border border-slate-200 dark:border-tw-border rounded text-[10px] font-semibold text-slate-700">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
