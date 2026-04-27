"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { agentApi } from "@/lib/api";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
import { BookOpen, PlayCircle, ExternalLink, ChevronRight, Loader2, Award, Sparkles, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardSurfaceClass } from "@/lib/ui";
import { AIAssessment } from "./AIAssessment";

type LearningJourneyProps = {
  topGaps: any[];
  /** Defaults match the employee dashboard copy */
  title?: string;
  subtitle?: string;
};

export function LearningJourney({
  topGaps,
  title = "My Learning Journey",
  subtitle = "AI-curated learning paths to bridge your identified skill gaps.",
}: LearningJourneyProps) {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [activeAssessment, setActiveAssessment] = useState<boolean>(false);

  const { data: learningPath, isLoading } = useQuery({
    queryKey: ["learning-path", selectedSkill],
    queryFn: async () => {
      if (!selectedSkill) return null;
      const { data } = await agentApi.learning.getPath(selectedSkill);
      return data;
    },
    enabled: !!selectedSkill
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
          <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-tw-text">{title}</h2>
          <p className="text-xs text-slate-500 dark:text-tw-muted">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Gap Selection */}
        <div className="md:col-span-1 space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Bridge Your Gaps</h3>
          <div className="space-y-2">
            {topGaps.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-xl border border-dashed">No major gaps detected. Keep learning!</p>
            ) : (
              topGaps.map((gap: any) => (
                <button
                  key={gap.skill}
                  onClick={() => setSelectedSkill(gap.skill)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border transition-all duration-200 group",
                    selectedSkill === gap.skill 
                      ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-900/10 dark:border-emerald-500 shadow-md" 
                      : "bg-white border-slate-200 hover:border-emerald-200 dark:bg-tw-card dark:border-tw-border"
                  )}
                >
                  <p className="text-sm font-bold text-slate-900 dark:text-tw-text">{gap.skill}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline" className="text-[9px] py-0 border-amber-200 text-amber-700">Gap: {gap.gap.toFixed(1)}</Badge>
                    <ChevronRight className={cn("h-3 w-3 text-slate-300 group-hover:text-emerald-500", selectedSkill === gap.skill && "text-emerald-500")} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Learning Path Display */}
        <div className="md:col-span-3">
          {!selectedSkill ? (
            <div className={cn(cardSurfaceClass, "h-full flex flex-col items-center justify-center p-12 text-center border-dashed border-2")}>
              <Sparkles className="h-12 w-12 text-emerald-100 mb-4" />
              <p className="text-slate-500 text-sm font-medium">Select a skill to generate your personalized learning path</p>
              <p className="text-xs text-slate-400 mt-2">Our AI agent will curate the best resources for your proficiency level.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {isLoading ? (
                <div className={cn(cardSurfaceClass, "p-12 flex flex-col items-center justify-center")}>
                  <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-4" />
                  <p className="text-sm text-slate-500">Generating your learning journey...</p>
                </div>
              ) : learningPath && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-emerald-600" />
                        <h3 className="font-bold text-slate-900 dark:text-tw-text">Objective: Master {learningPath.skill_name}</h3>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        onClick={() => setActiveAssessment(true)}
                      >
                        <GraduationCap className="h-4 w-4" /> Level Up Now
                      </Button>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-tw-muted leading-relaxed">
                      {learningPath.summary_advice}
                    </p>
                  </div>

                  {activeAssessment && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                      <div className="bg-white dark:bg-tw-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
                        <AIAssessment 
                          skillName={selectedSkill!} 
                          proficiency={2.0} 
                          onClose={() => setActiveAssessment(false)} 
                        />
                      </div>
                    </div>
                  )}

                  <div className="relative space-y-4 pl-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-100 dark:before:bg-emerald-900/30">
                    {learningPath.curated_steps.map((step: any, idx: number) => (
                      <div key={idx} className="relative group">
                        <div className="absolute -left-8 top-1 h-5 w-5 rounded-full bg-emerald-500 border-4 border-white dark:border-tw-card z-10" />
                        <div className={cn(cardSurfaceClass, "p-4 border-slate-100 hover:border-emerald-200 transition-colors")}>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">{step.resource_type}</span>
                                <span className="text-[10px] text-slate-400">•</span>
                                <span className="text-[10px] font-medium text-slate-500">{step.estimated_duration}</span>
                              </div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-tw-text">{step.title}</h4>
                              <p className="text-xs text-slate-500 dark:text-tw-muted mt-1 leading-relaxed">{step.description}</p>
                            </div>
                            <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1.5 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200">
                              Start <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
