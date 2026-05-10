"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Target, 
  Sparkles, 
  Calendar, 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Loader2, 
  Trophy, 
  ExternalLink,
  MessageSquare,
  Clock,
  Plus
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { developmentApi } from "@/lib/api";
import { cardSurfaceClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function EmployeeDevelopmentPage() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetRole, setTargetRole] = useState("");

  const { data: plans, isLoading: isLoadingPlans } = useQuery({
    queryKey: ["my-development-plans"],
    queryFn: async () => {
      const { data } = await developmentApi.listPlans();
      return data as any[];
    }
  });

  const generateMutation = useMutation({
    mutationFn: async (role: string) => {
      const { data } = await developmentApi.generateIdp(role);
      return data;
    },
    onSuccess: async (data) => {
      console.log("AI IDP Data Received:", data);
      
      if (data && data.message) {
        toast.info(data.message);
        setIsGenerating(false);
        return;
      }

      if (!data || !data.title) {
        toast.error("AI returned an incomplete plan. Please try again.");
        setIsGenerating(false);
        return;
      }

      // Prompt user to save this plan
      if (confirm(`AI has generated a plan: "${data.title}". Would you like to save it to your journey?`)) {
        const payload = {
          title: data.title || "My Development Plan",
          description: data.description || "",
          target_role: data.target_role || targetRole,
          milestones: (data.milestones || []).map((m: any) => ({
            title: m.title || "New Milestone",
            description: m.description || "",
            target_skills: m.target_skills || [],
            learning_resources: m.learning_resources || [],
            check_in_focus: m.check_in_focus || "",
            due_date: new Date(Date.now() + (m.due_date_relative_days || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }))
        };
        
        try {
          await developmentApi.createPlan(payload);
          queryClient.invalidateQueries({ queryKey: ["my-development-plans"] });
          toast.success("Development plan saved!");
        } catch (err) {
          console.error("Failed to save plan:", err);
          toast.error("Failed to save development plan.");
        }
      }
      setIsGenerating(false);
    },
    onError: () => {
      toast.error("Failed to generate plan.");
      setIsGenerating(false);
    }
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string, status: string, notes?: string }) => {
      await developmentApi.updateMilestone(id, { status, completion_notes: notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-development-plans"] });
      toast.success("Milestone updated!");
    }
  });

  const activePlan = plans?.find(p => p.status === "active");

  if (isLoadingPlans) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <p className="mt-4 text-slate-500">Loading your development journey...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text flex items-center gap-2">
            <Target className="h-6 w-6 text-brand-600" /> My Development Journey
          </h1>
          <p className="text-sm text-slate-500 dark:text-tw-muted mt-1">
            Accelerate your growth with personalized, AI-orchestrated learning paths.
          </p>
        </div>
        {!activePlan && !isGenerating && (
          <Button onClick={() => setIsGenerating(true)} className="gap-2 bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/20">
            <Sparkles className="h-4 w-4" /> Start New AI IDP
          </Button>
        )}
      </div>

      {isGenerating && (
        <div className={cn(cardSurfaceClass, "p-8 text-center bg-gradient-to-br from-slate-900 to-brand-900 text-white border-none relative overflow-hidden")}>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="h-32 w-32" />
          </div>
          <h2 className="text-xl font-bold mb-4">What is your career goal?</h2>
          <div className="max-w-md mx-auto space-y-4">
            <Input 
              placeholder="e.g. Senior Frontend Engineer, Team Lead..." 
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
            <div className="flex gap-2 justify-center">
              <Button variant="ghost" onClick={() => setIsGenerating(false)} className="text-white hover:bg-white/10">Cancel</Button>
              <Button 
                onClick={() => generateMutation.mutate(targetRole)} 
                disabled={generateMutation.isPending}
                className="bg-white text-brand-900 hover:bg-slate-100 font-bold"
              >
                {generateMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</> : "Generate AI Path"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {activePlan ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Plan Timeline */}
          <div className="xl:col-span-2 space-y-6">
            <div className={cn(cardSurfaceClass, "p-6 border-l-4 border-l-brand-500")}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">{activePlan.title}</h2>
                <div className="px-3 py-1 bg-brand-50 text-brand-700 text-[10px] font-bold uppercase rounded-full">Active Plan</div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{activePlan.description}</p>
              {activePlan.target_role && (
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" /> Goal: <span className="text-slate-900 font-bold">{activePlan.target_role}</span>
                </div>
              )}
            </div>

            <div className="relative space-y-8 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-tw-border">
              {activePlan.milestones.map((milestone: any, index: number) => {
                const isCompleted = milestone.status === "completed";
                const isPending = milestone.status === "pending";
                
                return (
                  <div key={milestone.id} className="relative pl-12 group">
                    {/* Timeline Node */}
                    <div className={cn(
                      "absolute left-0 top-0 h-10 w-10 rounded-full border-4 border-white dark:border-tw-bg flex items-center justify-center transition-all shadow-sm z-10",
                      isCompleted ? "bg-emerald-500 text-white" : "bg-white dark:bg-tw-raised text-slate-300 border-slate-100"
                    )}>
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 fill-current" />}
                    </div>

                    <div className={cn(
                      cardSurfaceClass, 
                      "p-6 transition-all",
                      isCompleted ? "opacity-75 grayscale-[0.5]" : "group-hover:border-brand-300 shadow-sm"
                    )}>
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-900 dark:text-tw-text">{milestone.title}</h3>
                            {isCompleted && <span className="text-[10px] font-bold text-emerald-600 uppercase">Completed</span>}
                          </div>
                          <p className="text-sm text-slate-500 line-clamp-2">{milestone.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                            <Calendar className="h-3.5 w-3.5" /> Due {new Date(milestone.due_date).toLocaleDateString()}
                          </div>
                          {!isCompleted && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 p-0 h-auto font-bold"
                              onClick={() => {
                                const notes = prompt("Any notes on your achievement?");
                                updateMilestoneMutation.mutate({ id: milestone.id, status: "completed", notes: notes || "" });
                              }}
                            >
                              Mark as Complete <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50 dark:border-tw-border/50">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <BookOpen className="h-3 w-3" /> Learning Resources
                          </p>
                          <div className="space-y-2">
                            {milestone.learning_resources.map((res: any, i: number) => (
                              <a 
                                key={i} 
                                href={res.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-tw-raised hover:bg-slate-100 transition-colors group/link"
                              >
                                <span className="text-xs font-medium text-slate-700">{res.title}</span>
                                <ExternalLink className="h-3 w-3 text-slate-300 group-hover/link:text-brand-500" />
                              </a>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Target className="h-3 w-3" /> Target Skills
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {milestone.target_skills.map((skill: string) => (
                              <span key={skill} className="px-2 py-0.5 bg-white dark:bg-tw-elevated border border-slate-200 dark:border-tw-border rounded text-[10px] font-semibold text-slate-600">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className={cn(cardSurfaceClass, "p-6 bg-slate-900 text-white border-none")}>
              <h3 className="text-sm font-bold mb-4 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-400" /> Path Progress
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Completion</span>
                  <span className="font-bold text-brand-400">
                    {Math.round((activePlan.milestones.filter((m: any) => m.status === "completed").length / activePlan.milestones.length) * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-500 transition-all duration-1000"
                    style={{ width: `${(activePlan.milestones.filter((m: any) => m.status === "completed").length / activePlan.milestones.length) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center p-3 bg-white/5 rounded-xl">
                    <p className="text-xl font-bold">{activePlan.milestones.filter((m: any) => m.status === "completed").length}</p>
                    <p className="text-[10px] text-slate-400 uppercase">Done</p>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-xl">
                    <p className="text-xl font-bold">{activePlan.milestones.filter((m: any) => m.status === "pending").length}</p>
                    <p className="text-[10px] text-slate-400 uppercase">Pending</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={cn(cardSurfaceClass, "p-6")}>
              <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-brand-500" /> Manager Check-in focus
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                Discuss these points in your next 1-on-1:
              </p>
              <ul className="mt-3 space-y-2">
                {activePlan.milestones.filter((m: any) => m.status === "pending").slice(0, 1).map((m: any) => (
                  <li key={m.id} className="text-xs text-slate-700 flex items-start gap-2">
                    <div className="h-1 w-1 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                    {m.check_in_focus || "General progress on development goals."}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : !isGenerating && (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center max-w-lg mx-auto">
          <div className="p-6 bg-slate-100 rounded-3xl mb-6">
            <Trophy className="h-12 w-12 text-slate-300" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No active development path</h2>
          <p className="text-sm text-slate-500 mb-8">
            Turn your skill gaps into a structured growth journey. Our AI will orchestrate milestones, 
            learning resources, and check-ins tailored just for you.
          </p>
          <Button 
            size="lg" 
            onClick={() => setIsGenerating(true)}
            className="bg-brand-600 hover:bg-brand-700 shadow-xl shadow-brand-500/30 px-8 gap-2"
          >
            <Plus className="h-5 w-5" /> Create My First IDP
          </Button>
        </div>
      )}
    </div>
  );
}
