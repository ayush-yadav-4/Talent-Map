"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
import { Clock, Target, TrendingUp, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { cardSurfaceClass } from "@/lib/ui";

type AssessmentSkill =
  | string
  | {
      skill_name?: string;
      proficiency?: number;
      note?: string;
    };

function getSkillLabel(skill: AssessmentSkill): string {
  if (typeof skill === "string") return skill;
  return skill.skill_name || "Skill";
}

export default function AssessmentsPage() {
  const queryClient = useQueryClient();
  
  const { data: assessments, isLoading } = useQuery({
    queryKey: ["assessments"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/assessments/mine");
      return data as {
        id: string;
        title: string;
        description: string;
        estimated_time: string;
        is_mandatory: boolean;
        status: string;
        skills: AssessmentSkill[];
        difficulty: string;
        assessment_type: "current_assessment" | "skill_test";
      }[];
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const generateAssessmentMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/assessments/generate-personalized");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Generated: ${data.title}`);
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to generate assessment");
    }
  });

  const generateSkillTestMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/assessments/generate-skill-test");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Generated: ${data.title}`);
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to generate skill test");
    },
  });

  const grouped = useMemo(() => {
    const current = (assessments ?? []).filter((a) => a.assessment_type !== "skill_test");
    const tests = (assessments ?? []).filter((a) => a.assessment_type === "skill_test");
    return { current, tests };
  }, [assessments]);

  if (isLoading) return <div className="flex justify-center items-center h-64">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-tw-text">Skill Assessments</h1>
          <p className="text-slate-500 dark:text-tw-muted">Complete adaptive tests to calibrate your skill profile and identify growth opportunities.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => generateAssessmentMutation.mutate()}
            disabled={generateAssessmentMutation.isPending}
            className="bg-brand-600 hover:bg-brand-700 text-white gap-2 h-11 px-6 shadow-lg shadow-brand-500/20"
          >
            {generateAssessmentMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate My Assessment
          </Button>
          <Button
            onClick={() => generateSkillTestMutation.mutate()}
            disabled={generateSkillTestMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white gap-2 h-11 px-6 shadow-lg shadow-red-500/20"
          >
            {generateSkillTestMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Target className="h-4 w-4" />
            )}
            Test My Skills
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-tw-text">Current Assessments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {grouped.current.length ? grouped.current.map((assessment, index) => (
          <motion.div
            key={assessment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full flex flex-col border-slate-200 dark:border-tw-border bg-white dark:bg-tw-card overflow-hidden hover:shadow-xl transition-all duration-300 group">
              <CardHeader className="relative pb-0">
                {assessment.is_mandatory && (
                  <Badge variant="destructive" className="absolute top-4 right-4 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-none">
                    Mandatory
                  </Badge>
                )}
                <div className="p-3 bg-brand-50 dark:bg-tw-raised rounded-xl w-fit mb-4">
                  <Target className="h-6 w-6 text-brand-600 dark:text-tw-blue" />
                </div>
                <CardTitle className="text-xl group-hover:text-brand-600 dark:group-hover:text-tw-blue transition-colors">
                  {assessment.title}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-4 pt-4">
                <p className="text-sm text-slate-600 dark:text-tw-muted line-clamp-2">
                  {assessment.description}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {assessment.skills.map((skill, idx) => {
                    const label = getSkillLabel(skill);
                    return (
                    <Badge key={`${label}-${idx}`} variant="secondary" className="bg-slate-100 dark:bg-tw-raised text-slate-600 dark:text-tw-text">
                      {label}
                    </Badge>
                  )})}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-tw-muted">
                    <Clock className="h-3.5 w-3.5" />
                    {assessment.estimated_time}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-tw-muted">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {assessment.difficulty}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t border-slate-100 dark:border-tw-border">
                {assessment.status === "in_progress" ? (
                  <Button asChild className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                    <Link href={`/employee/assessments/${assessment.id}/take`}>
                      Resume Assessment
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="w-full bg-brand-600 hover:bg-brand-700 text-white dark:bg-tw-blue dark:hover:bg-blue-600">
                    <Link href={`/employee/assessments/${assessment.id}/take`}>
                      Start Assessment
                    </Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        )) : (
          <div className={cn(cardSurfaceClass, "p-6 md:col-span-2 lg:col-span-3 text-center")}>
            <p className="text-sm text-slate-600 dark:text-tw-muted">
              No assessments generated yet. Click <span className="font-semibold">Generate My Assessment</span> to create one.
            </p>
          </div>
        )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-tw-text">Skill Tests</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {grouped.tests.length ? grouped.tests.map((assessment, index) => (
          <motion.div
            key={assessment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full flex flex-col border-slate-200 dark:border-tw-border bg-white dark:bg-tw-card overflow-hidden hover:shadow-xl transition-all duration-300 group">
              <CardHeader className="relative pb-0">
                <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl w-fit mb-4">
                  <Target className="h-6 w-6 text-red-600 dark:text-red-300" />
                </div>
                <CardTitle className="text-xl group-hover:text-red-600 transition-colors">
                  {assessment.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="flex-1 space-y-4 pt-4">
                <p className="text-sm text-slate-600 dark:text-tw-muted line-clamp-2">
                  20 unique questions across your skills with standard correct/wrong scoring and percentage out of 100.
                </p>
                <div className="flex flex-wrap gap-2">
                  {assessment.skills.map((skill, idx) => {
                    const label = getSkillLabel(skill);
                    return (
                    <Badge key={`${label}-${idx}`} variant="secondary" className="bg-slate-100 dark:bg-tw-raised text-slate-600 dark:text-tw-text">
                      {label}
                    </Badge>
                  )})}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-tw-muted">
                    <Clock className="h-3.5 w-3.5" />
                    ~20 questions
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-tw-muted">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Standard Marking
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t border-slate-100 dark:border-tw-border">
                {assessment.status === "in_progress" ? (
                  <Button asChild className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                    <Link href={`/employee/assessments/${assessment.id}/take`}>Resume Skill Test</Link>
                  </Button>
                ) : (
                  <Button asChild className="w-full bg-red-600 hover:bg-red-700 text-white">
                    <Link href={`/employee/assessments/${assessment.id}/take`}>Start Skill Test</Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        )) : (
          <div className={cn(cardSurfaceClass, "p-6 md:col-span-2 lg:col-span-3 text-center")}>
            <p className="text-sm text-slate-600 dark:text-tw-muted">
              No skill tests yet. Click <span className="font-semibold">Test My Skills</span> to generate a 20-question test.
            </p>
          </div>
        )}
        </div>
      </section>
      
      <div className={cn(cardSurfaceClass, "p-6 flex flex-col md:flex-row items-center gap-6 border-brand-100 dark:border-tw-border/50")}>
        <div className="p-4 bg-white dark:bg-tw-card rounded-2xl shadow-sm">
          <AlertCircle className="h-8 w-8 text-brand-600 dark:text-tw-blue" />
        </div>
        <div className="flex-1 space-y-1 text-center md:text-left">
          <h3 className="font-semibold text-slate-900 dark:text-tw-text">How it works</h3>
          <p className="text-sm text-slate-600 dark:text-tw-muted">Our AI-powered adaptive engine adjusts difficulty in real-time based on your answers. No two tests are the same.</p>
        </div>
      </div>
    </div>
  );
}
