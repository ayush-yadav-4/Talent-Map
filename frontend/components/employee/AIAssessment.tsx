"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui";
import { Loader2, CheckCircle2, AlertCircle, HelpCircle, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function AIAssessment({ skillName, proficiency, onClose }: { skillName: string, proficiency: number, onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState<"loading" | "testing" | "result">("loading");
  const [assessment, setAssessment] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<any>(null);

  const { isLoading: isGenerating } = useQuery({
    queryKey: ["generate-assessment", skillName],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/agent/assessment/generate/${skillName}`, { params: { proficiency } });
      setAssessment(data);
      setCurrentStep("testing");
      return data;
    },
    enabled: currentStep === "loading"
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      let correct = 0;
      assessment.questions.forEach((q: any, idx: number) => {
        if (answers[idx] === q.correct_option_index) correct++;
      });
      const score = (correct / assessment.questions.length) * 100;
      const { data } = await api.post("/api/v1/agent/assessment/submit", { 
        skill_name: skillName, 
        score_percentage: score 
      });
      return { score, ...data };
    },
    onSuccess: (data) => {
      setResult(data);
      setCurrentStep("result");
      if (data.delta > 0) {
        toast.success(`Proficiency increased by ${data.delta}!`);
      }
    }
  });

  if (currentStep === "loading") {
    return (
      <div className="p-12 text-center">
        <Loader2 className="h-10 w-10 text-brand-600 animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-bold">Generating Assessment...</h3>
        <p className="text-sm text-slate-500">Gemini is crafting questions for {skillName}.</p>
      </div>
    );
  }

  if (currentStep === "testing") {
    return (
      <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">{skillName} Assessment</h3>
            <p className="text-xs text-slate-500">Select the best answer for each question.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        {assessment.questions.map((q: any, idx: number) => (
          <div key={idx} className="space-y-4 p-4 rounded-xl border border-slate-100 bg-slate-50">
            {q.scenario_context && (
              <div className="text-xs p-3 bg-white border border-slate-100 rounded-lg italic text-slate-600">
                Scenario: {q.scenario_context}
              </div>
            )}
            <p className="text-sm font-bold flex gap-2">
              <span className="text-brand-600">{idx + 1}.</span>
              {q.question_text}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {q.options.map((opt: string, oidx: number) => (
                <button
                  key={oidx}
                  onClick={() => setAnswers(prev => ({ ...prev, [idx]: oidx }))}
                  className={cn(
                    "text-left p-3 text-sm rounded-lg border transition-all",
                    answers[idx] === oidx 
                      ? "bg-brand-600 text-white border-brand-600" 
                      : "bg-white border-slate-200 hover:border-brand-300"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        <Button 
          className="w-full bg-brand-600 h-12"
          disabled={Object.keys(answers).length < assessment.questions.length || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
          Submit Assessment
        </Button>
      </div>
    );
  }

  return (
    <div className="p-12 text-center space-y-6">
      <div className={cn(
        "h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4",
        result.score >= 70 ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
      )}>
        {result.score >= 70 ? <CheckCircle2 className="h-10 w-10" /> : <AlertCircle className="h-10 w-10" />}
      </div>
      
      <h3 className="text-2xl font-bold">Your Score: {Math.round(result.score)}%</h3>
      
      {result.delta > 0 ? (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
          <p className="text-sm font-bold flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" /> 
            Proficiency Leveled Up! (+{result.delta})
          </p>
          <p className="text-xs mt-1">Your new proficiency for {skillName} is {result.new_proficiency.toFixed(1)}.</p>
        </div>
      ) : (
        <p className="text-sm text-slate-500">You need a higher score to increase your proficiency. Keep practicing!</p>
      )}

      <Button onClick={onClose} variant="outline" className="w-full">Close Assessment</Button>
    </div>
  );
}
