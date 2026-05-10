"use client";

import { useQuery } from "@tanstack/react-query";
import { employeeApi, api } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BrainCircuit, Activity, Target, AlertCircle, TrendingUp, Sparkles, UserCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PersonaPage() {
  const { ready } = useRequireAuth(["employee"]);

  // Fetch employee profile
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["employee-me"],
    queryFn: async () => {
      const { data } = await employeeApi.me();
      return data as any;
    },
    enabled: ready,
  });

  // Fetch their assessment scores
  const { data: scores, isLoading: loadingScores } = useQuery({
    queryKey: ["employee-assessment-scores"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/assessments/my-scores");
      return data as any[];
    },
    enabled: ready,
  });

  if (!ready || loadingProfile || loadingScores) {
    return <div className="flex justify-center p-20"><Loader2 className="h-10 w-10 animate-spin text-brand-500" /></div>;
  }

  // Determine if assessments have been taken based on scores
  const takenPsychometric = scores?.some(s => s.assessment_type === "psychometric");
  const takenProblemSolving = scores?.some(s => s.assessment_type === "problem_solving");
  const takenScenario = scores?.some(s => s.assessment_type === "scenario_based");
  const takenSkillTest = scores?.some(s => s.assessment_type === "skill_test");

  const missingAssessments = [];
  if (!takenPsychometric) missingAssessments.push("Psychometric");
  if (!takenProblemSolving) missingAssessments.push("Problem Solving");
  if (!takenScenario) missingAssessments.push("Scenario Based");
  if (!takenSkillTest) missingAssessments.push("Skill Assessment");

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-tw-text flex items-center gap-3">
            <UserCircle className="h-8 w-8 text-brand-600" /> My Persona
          </h1>
          <p className="text-slate-500 dark:text-tw-muted mt-2">
            A comprehensive overview of your skills, cognitive abilities, and professional profile.
          </p>
        </div>
      </div>

      {missingAssessments.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-6 rounded-xl">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-amber-600 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-amber-800 dark:text-amber-500">Incomplete Persona Profile</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1 mb-4">
                To build your complete professional persona and get the best career recommendations, please complete the following pending assessments:
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {missingAssessments.map(m => (
                  <Badge key={m} variant="outline" className="bg-white/50 border-amber-200 text-amber-700">{m}</Badge>
                ))}
              </div>
              <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white">
                <Link href="/employee/assessments">Go to Assessments to Complete Profile</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-md border-slate-200 dark:border-tw-border bg-white dark:bg-tw-card relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Target className="w-24 h-24" />
          </div>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg">
                <Target className="h-5 w-5 text-brand-600" />
              </div>
              <CardTitle className="text-lg">Core Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Role</p>
              <p className="text-base font-semibold text-slate-900 dark:text-white">{profile?.job_title || "Unassigned"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Seniority</p>
              <p className="text-base font-semibold text-slate-900 dark:text-white">{profile?.seniority_level || "Not specified"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Experience</p>
              <p className="text-base font-semibold text-slate-900 dark:text-white">{profile?.years_of_experience || 0} Years</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-slate-200 dark:border-tw-border bg-white dark:bg-tw-card relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <TrendingUp className="w-24 h-24" />
          </div>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <CardTitle className="text-lg">Current Skills</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {profile?.skills && profile.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill: any, idx: number) => (
                  <Badge key={idx} variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {skill.skill_name || skill.canonical_name || "Skill"}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No skills added yet.</p>
            )}
            
            {!takenSkillTest && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30 text-sm text-red-700 dark:text-red-400 font-medium">
                Skill evidence lacking. Take a skill test to validate these skills.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md border-slate-200 dark:border-tw-border bg-white dark:bg-tw-card relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Activity className="w-24 h-24" />
          </div>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Psychometric Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {takenPsychometric ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm text-slate-500">Learning Style</span>
                  <span className="font-semibold text-purple-600">{profile?.psychometric?.learning_style || "Visual"}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm text-slate-500">Dominant Trait</span>
                  <span className="font-semibold text-purple-600">{profile?.psychometric?.dominant_trait || "Analytical"}</span>
                </div>
                <p className="text-xs text-slate-500 italic mt-2">
                  {profile?.psychometric?.summary || "Your profile indicates a strong analytical mindset combined with structured learning patterns."}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">Complete the psychometric assessment to unlock your behavioral insights.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md border-slate-200 dark:border-tw-border bg-white dark:bg-tw-card relative overflow-hidden md:col-span-2 lg:col-span-3">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <BrainCircuit className="w-24 h-24" />
          </div>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <BrainCircuit className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Cognitive & Scenario Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" /> Problem Solving Aptitude
                </h4>
                {takenProblemSolving ? (
                  <div className="space-y-2">
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                    <p className="text-xs text-slate-500">Advanced problem solver. You excel at breaking down complex requirements into manageable solutions.</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No data available. Take the problem solving test to populate this section.</p>
                )}
              </div>

              <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Situational Judgment
                </h4>
                {takenScenario ? (
                  <div className="space-y-2">
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                    <p className="text-xs text-slate-500">Strong situational judgment. You effectively balance technical constraints with business priorities.</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No data available. Take the scenario based test to populate this section.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
