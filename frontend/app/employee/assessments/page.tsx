"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
import { Clock, Target, TrendingUp, AlertCircle, Sparkles, Loader2, BrainCircuit, Activity, BookOpen, MessageSquare, Award } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("current_assessment");
  
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
        assessment_type: "current_assessment" | "skill_test" | "problem_solving" | "scenario_based" | "psychometric" | "communication" | "experience";
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

  const generateProblemSolvingMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/assessments/generate-problem-solving");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Generated: ${data.title}`);
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to generate"),
  });

  const generateScenarioMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/assessments/generate-scenario");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Generated: ${data.title}`);
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to generate"),
  });

  const generatePsychometricMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/assessments/generate-psychometric");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Generated: ${data.title}`);
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to generate"),
  });

  const generateCommunicationMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/assessments/generate-communication");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Generated: ${data.title}`);
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to generate"),
  });

  const generateExperienceMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/assessments/generate-experience");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Generated: ${data.title}`);
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to generate"),
  });

  const grouped = useMemo(() => {
    const current = (assessments ?? []).filter((a) => a.assessment_type === "current_assessment");
    const tests = (assessments ?? []).filter((a) => a.assessment_type === "skill_test");
    const problemSolving = (assessments ?? []).filter((a) => a.assessment_type === "problem_solving");
    const scenario = (assessments ?? []).filter((a) => a.assessment_type === "scenario_based");
    const psychometric = (assessments ?? []).filter((a) => a.assessment_type === "psychometric");
    const communication = (assessments ?? []).filter((a) => a.assessment_type === "communication");
    const experience = (assessments ?? []).filter((a) => a.assessment_type === "experience");
    return { current, tests, problemSolving, scenario, psychometric, communication, experience };
  }, [assessments]);

  if (isLoading) return <div className="flex justify-center items-center h-64">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2 border-b border-slate-200 dark:border-tw-border pb-4">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-tw-text">Assessments Center</h1>
        <p className="text-slate-500 dark:text-tw-muted">Complete adaptive tests to calibrate your skill profile and identify growth opportunities.</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto pb-2 -mb-2 gap-2">
        <Button 
          variant={activeTab === "current_assessment" ? "default" : "outline"} 
          className={cn("whitespace-nowrap", activeTab === "current_assessment" && "bg-brand-600 hover:bg-brand-700 text-white")}
          onClick={() => setActiveTab("current_assessment")}
        >
          <Sparkles className="h-4 w-4 mr-2" /> Profile Assessments
        </Button>
        <Button 
          variant={activeTab === "skill_test" ? "default" : "outline"} 
          className={cn("whitespace-nowrap", activeTab === "skill_test" && "bg-red-600 hover:bg-red-700 text-white")}
          onClick={() => setActiveTab("skill_test")}
        >
          <Target className="h-4 w-4 mr-2" /> Skill Tests
        </Button>
        <Button 
          variant={activeTab === "problem_solving" ? "default" : "outline"} 
          className={cn("whitespace-nowrap", activeTab === "problem_solving" && "bg-emerald-600 hover:bg-emerald-700 text-white")}
          onClick={() => setActiveTab("problem_solving")}
        >
          <BrainCircuit className="h-4 w-4 mr-2" /> Problem Solving
        </Button>
        <Button 
          variant={activeTab === "scenario_based" ? "default" : "outline"} 
          className={cn("whitespace-nowrap", activeTab === "scenario_based" && "bg-amber-600 hover:bg-amber-700 text-white")}
          onClick={() => setActiveTab("scenario_based")}
        >
          <BookOpen className="h-4 w-4 mr-2" /> Scenario Based
        </Button>
        <Button 
          variant={activeTab === "psychometric" ? "default" : "outline"} 
          className={cn("whitespace-nowrap", activeTab === "psychometric" && "bg-purple-600 hover:bg-purple-700 text-white")}
          onClick={() => setActiveTab("psychometric")}
        >
          <Activity className="h-4 w-4 mr-2" /> Psychometric
        </Button>
        <Button 
          variant={activeTab === "communication" ? "default" : "outline"} 
          className={cn("whitespace-nowrap", activeTab === "communication" && "bg-cyan-600 hover:bg-cyan-700 text-white")}
          onClick={() => setActiveTab("communication")}
        >
          <MessageSquare className="h-4 w-4 mr-2" /> Communication & Etiquette
        </Button>
        <Button 
          variant={activeTab === "experience" ? "default" : "outline"} 
          className={cn("whitespace-nowrap", activeTab === "experience" && "bg-indigo-600 hover:bg-indigo-700 text-white")}
          onClick={() => setActiveTab("experience")}
        >
          <Award className="h-4 w-4 mr-2" /> Experience Specific
        </Button>
      </div>

      {/* Render Active Section */}
      
      {activeTab === "current_assessment" && (
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-50 dark:bg-tw-raised p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-100 dark:bg-tw-card rounded-lg"><Sparkles className="h-5 w-5 text-brand-600 dark:text-tw-blue" /></div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-tw-text">Profile Assessments</h2>
            </div>
            <Button
              onClick={() => generateAssessmentMutation.mutate()}
              disabled={generateAssessmentMutation.isPending}
              className="bg-brand-600 hover:bg-brand-700 text-white gap-2 shadow-sm w-full md:w-auto"
            >
              {generateAssessmentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Profile Assessment
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grouped.current.length ? grouped.current.map((assessment, index) => (
            <motion.div key={assessment.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
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
                  <p className="text-sm text-slate-600 dark:text-tw-muted line-clamp-2">{assessment.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {assessment.skills.map((skill, idx) => {
                      const label = getSkillLabel(skill);
                      return <Badge key={`${label}-${idx}`} variant="secondary" className="bg-slate-100 dark:bg-tw-raised text-slate-600 dark:text-tw-text">{label}</Badge>
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-tw-muted"><Clock className="h-3.5 w-3.5" />{assessment.estimated_time}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-tw-muted"><TrendingUp className="h-3.5 w-3.5" />{assessment.difficulty}</div>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-slate-100 dark:border-tw-border">
                  {assessment.status === "in_progress" ? (
                    <Button asChild className="w-full bg-amber-500 hover:bg-amber-600 text-white"><Link href={`/employee/assessments/${assessment.id}/take`}>Resume Assessment</Link></Button>
                  ) : (
                    <Button asChild className="w-full bg-brand-600 hover:bg-brand-700 text-white dark:bg-tw-blue dark:hover:bg-blue-600"><Link href={`/employee/assessments/${assessment.id}/take`}>Start Assessment</Link></Button>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          )) : (
            <div className={cn(cardSurfaceClass, "p-6 md:col-span-2 lg:col-span-3 text-center")}>
              <p className="text-sm text-slate-600 dark:text-tw-muted">No assessments generated yet.</p>
            </div>
          )}
          </div>
        </section>
      )}

      {activeTab === "skill_test" && (
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-red-50 dark:bg-red-950/20 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg"><Target className="h-5 w-5 text-red-600 dark:text-red-400" /></div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-tw-text">Skill Tests</h2>
            </div>
            <Button
              onClick={() => generateSkillTestMutation.mutate()}
              disabled={generateSkillTestMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white gap-2 shadow-sm w-full md:w-auto"
            >
              {generateSkillTestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
              Generate Skill Test
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grouped.tests.length ? grouped.tests.map((assessment, index) => (
            <motion.div key={assessment.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="h-full flex flex-col border-slate-200 dark:border-tw-border bg-white dark:bg-tw-card overflow-hidden hover:shadow-xl transition-all duration-300 group">
                <CardHeader className="relative pb-0">
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl w-fit mb-4">
                    <Target className="h-6 w-6 text-red-600 dark:text-red-300" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-red-600 transition-colors">{assessment.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-4 pt-4">
                  <p className="text-sm text-slate-600 dark:text-tw-muted line-clamp-2">20 unique questions across your skills with standard correct/wrong scoring and percentage out of 100.</p>
                  <div className="flex flex-wrap gap-2">
                    {assessment.skills.map((skill, idx) => {
                      const label = getSkillLabel(skill);
                      return <Badge key={`${label}-${idx}`} variant="secondary" className="bg-slate-100 dark:bg-tw-raised text-slate-600 dark:text-tw-text">{label}</Badge>
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-tw-muted"><Clock className="h-3.5 w-3.5" />~20 questions</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-tw-muted"><TrendingUp className="h-3.5 w-3.5" />Standard Marking</div>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-slate-100 dark:border-tw-border">
                  {assessment.status === "in_progress" ? (
                    <Button asChild className="w-full bg-amber-500 hover:bg-amber-600 text-white"><Link href={`/employee/assessments/${assessment.id}/take`}>Resume Skill Test</Link></Button>
                  ) : (
                    <Button asChild className="w-full bg-red-600 hover:bg-red-700 text-white"><Link href={`/employee/assessments/${assessment.id}/take`}>Start Skill Test</Link></Button>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          )) : (
            <div className={cn(cardSurfaceClass, "p-6 md:col-span-2 lg:col-span-3 text-center")}>
              <p className="text-sm text-slate-600 dark:text-tw-muted">No skill tests generated yet.</p>
            </div>
          )}
          </div>
        </section>
      )}

      {activeTab === "problem_solving" && (
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg"><BrainCircuit className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-tw-text">Problem Solving Assessments</h2>
            </div>
            <Button
              onClick={() => generateProblemSolvingMutation.mutate()}
              disabled={generateProblemSolvingMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm w-full md:w-auto"
            >
              {generateProblemSolvingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
              Generate Problem Solving
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grouped.problemSolving.length ? grouped.problemSolving.map((assessment, index) => (
            <motion.div key={assessment.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="h-full flex flex-col border-slate-200 dark:border-tw-border bg-white dark:bg-tw-card overflow-hidden hover:shadow-xl transition-all duration-300 group">
                <CardHeader className="relative pb-0">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl w-fit mb-4">
                    <BrainCircuit className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-emerald-600 transition-colors">{assessment.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-4 pt-4">
                  <p className="text-sm text-slate-600 dark:text-tw-muted line-clamp-2">Test your analytical reasoning and problem-solving skills with unique algorithmic and logical challenges.</p>
                </CardContent>
                <CardFooter className="pt-4 border-t border-slate-100 dark:border-tw-border">
                  <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"><Link href={`/employee/assessments/${assessment.id}/take`}>Start Assessment</Link></Button>
                </CardFooter>
              </Card>
            </motion.div>
          )) : (
            <div className={cn(cardSurfaceClass, "p-6 md:col-span-2 lg:col-span-3 text-center")}>
              <p className="text-sm text-slate-600 dark:text-tw-muted">No Problem Solving tests generated yet.</p>
            </div>
          )}
          </div>
        </section>
      )}

      {activeTab === "scenario_based" && (
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg"><BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" /></div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-tw-text">Scenario Based Assessments</h2>
            </div>
            <Button
              onClick={() => generateScenarioMutation.mutate()}
              disabled={generateScenarioMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-sm w-full md:w-auto"
            >
              {generateScenarioMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
              Generate Scenario Based
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grouped.scenario.length ? grouped.scenario.map((assessment, index) => (
            <motion.div key={assessment.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="h-full flex flex-col border-slate-200 dark:border-tw-border bg-white dark:bg-tw-card overflow-hidden hover:shadow-xl transition-all duration-300 group">
                <CardHeader className="relative pb-0">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl w-fit mb-4">
                    <BookOpen className="h-6 w-6 text-amber-600 dark:text-amber-300" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-amber-600 transition-colors">{assessment.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-4 pt-4">
                  <p className="text-sm text-slate-600 dark:text-tw-muted line-clamp-2">Engage with situational judgment scenarios reflecting real-world challenges in your domain.</p>
                </CardContent>
                <CardFooter className="pt-4 border-t border-slate-100 dark:border-tw-border">
                  <Button asChild className="w-full bg-amber-600 hover:bg-amber-700 text-white"><Link href={`/employee/assessments/${assessment.id}/take`}>Start Assessment</Link></Button>
                </CardFooter>
              </Card>
            </motion.div>
          )) : (
            <div className={cn(cardSurfaceClass, "p-6 md:col-span-2 lg:col-span-3 text-center")}>
              <p className="text-sm text-slate-600 dark:text-tw-muted">No Scenario Based tests generated yet.</p>
            </div>
          )}
          </div>
        </section>
      )}

      {activeTab === "psychometric" && (
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-purple-50 dark:bg-purple-950/20 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg"><Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" /></div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-tw-text">Psychometric Assessments</h2>
            </div>
            <Button
              onClick={() => generatePsychometricMutation.mutate()}
              disabled={generatePsychometricMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-sm w-full md:w-auto"
            >
              {generatePsychometricMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              Generate Psychometric
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grouped.psychometric.length ? grouped.psychometric.map((assessment, index) => (
            <motion.div key={assessment.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="h-full flex flex-col border-slate-200 dark:border-tw-border bg-white dark:bg-tw-card overflow-hidden hover:shadow-xl transition-all duration-300 group">
                <CardHeader className="relative pb-0">
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl w-fit mb-4">
                    <Activity className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-purple-600 transition-colors">{assessment.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-4 pt-4">
                  <p className="text-sm text-slate-600 dark:text-tw-muted line-clamp-2">Evaluate cognitive abilities, personality traits, and workplace behaviors to understand your overall fit and potential.</p>
                </CardContent>
                <CardFooter className="pt-4 border-t border-slate-100 dark:border-tw-border">
                  <Button asChild className="w-full bg-purple-600 hover:bg-purple-700 text-white"><Link href={`/employee/assessments/${assessment.id}/take`}>Start Assessment</Link></Button>
                </CardFooter>
              </Card>
            </motion.div>
          )) : (
            <div className={cn(cardSurfaceClass, "p-6 md:col-span-2 lg:col-span-3 text-center")}>
              <p className="text-sm text-slate-600 dark:text-tw-muted">No Psychometric tests generated yet.</p>
            </div>
          )}
          </div>
        </section>
      )}

      {activeTab === "communication" && (
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-cyan-50 dark:bg-cyan-950/20 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900/40 rounded-lg"><MessageSquare className="h-5 w-5 text-cyan-600 dark:text-cyan-400" /></div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-tw-text">Communication & Business Etiquette</h2>
            </div>
            <Button
              onClick={() => generateCommunicationMutation.mutate()}
              disabled={generateCommunicationMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2 shadow-sm w-full md:w-auto"
            >
              {generateCommunicationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              Generate Communication Assessment
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grouped.communication.length ? grouped.communication.map((assessment, index) => (
            <motion.div key={assessment.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="h-full flex flex-col border-slate-200 dark:border-tw-border bg-white dark:bg-tw-card overflow-hidden hover:shadow-xl transition-all duration-300 group">
                <CardHeader className="relative pb-0">
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-xl w-fit mb-4">
                    <MessageSquare className="h-6 w-6 text-cyan-600 dark:text-cyan-300" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-cyan-600 transition-colors">{assessment.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-4 pt-4">
                  <p className="text-sm text-slate-600 dark:text-tw-muted line-clamp-2">Test your professional communication skills and standard business etiquette.</p>
                </CardContent>
                <CardFooter className="pt-4 border-t border-slate-100 dark:border-tw-border">
                  <Button asChild className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"><Link href={`/employee/assessments/${assessment.id}/take`}>Start Assessment</Link></Button>
                </CardFooter>
              </Card>
            </motion.div>
          )) : (
            <div className={cn(cardSurfaceClass, "p-6 md:col-span-2 lg:col-span-3 text-center")}>
              <p className="text-sm text-slate-600 dark:text-tw-muted">No Communication tests generated yet.</p>
            </div>
          )}
          </div>
        </section>
      )}

      {activeTab === "experience" && (
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg"><Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /></div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-tw-text">Experience Specific Assessments</h2>
            </div>
            <Button
              onClick={() => generateExperienceMutation.mutate()}
              disabled={generateExperienceMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm w-full md:w-auto"
            >
              {generateExperienceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
              Generate Experience Assessment
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grouped.experience.length ? grouped.experience.map((assessment, index) => (
            <motion.div key={assessment.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="h-full flex flex-col border-slate-200 dark:border-tw-border bg-white dark:bg-tw-card overflow-hidden hover:shadow-xl transition-all duration-300 group">
                <CardHeader className="relative pb-0">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl w-fit mb-4">
                    <Award className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-indigo-600 transition-colors">{assessment.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-4 pt-4">
                  <p className="text-sm text-slate-600 dark:text-tw-muted line-clamp-2">Test specific skills appropriately matched to your registered years of experience.</p>
                </CardContent>
                <CardFooter className="pt-4 border-t border-slate-100 dark:border-tw-border">
                  <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"><Link href={`/employee/assessments/${assessment.id}/take`}>Start Assessment</Link></Button>
                </CardFooter>
              </Card>
            </motion.div>
          )) : (
            <div className={cn(cardSurfaceClass, "p-6 md:col-span-2 lg:col-span-3 text-center")}>
              <p className="text-sm text-slate-600 dark:text-tw-muted">No Experience Specific tests generated yet.</p>
            </div>
          )}
          </div>
        </section>
      )}
      
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
