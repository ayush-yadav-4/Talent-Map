"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button, Card, Badge } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, CheckCircle2, ArrowRight, BrainCircuit, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";

export default function AssessmentTakePage() {
  const { id } = useParams();
  const router = useRouter();

  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [isFinished, setIsFinished] = useState(false);
  const [noQuestionsError, setNoQuestionsError] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);

  // Fire-and-forget on every mount — backend is idempotent (returns existing
  // in-progress session if one exists). We do NOT use a useRef guard because
  // React StrictMode (dev) resets all component state on the second mount
  // while keeping refs — which would leave the component stuck in the loading
  // state forever after the remount.
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    api.post("/api/v1/assessments/sessions", { assessment_id: id })
      .then(({ data }) => {
        if (cancelled) return;
        setSession(data);
        if (data.next_question) {
          setCurrentQuestion(data.next_question);
          setStartTime(Date.now());
        } else {
          setNoQuestionsError(true);
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        const msg = err?.response?.data?.detail || "Failed to start assessment.";
        setStartError(msg);
        toast.error(msg);
      })
      .finally(() => {
        if (!cancelled) setIsStarting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post(
        `/api/v1/assessments/sessions/${session.id}/respond`,
        payload
      );
      return data;
    },
    onSuccess: (data) => {
      if (data.status === "completed") {
        setSession(data);
        setIsFinished(true);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      } else {
        setSession(data);
        setCurrentQuestion(data.next_question);
        setSelectedOption(null);
        setStartTime(Date.now());
      }
    },
    onError: () => {
      toast.error("Error submitting answer. Please try again.");
    },
  });

  const handleNext = () => {
    if (!selectedOption) return;
    const duration = (Date.now() - startTime) / 1000;
    submitMutation.mutate({
      question_id: currentQuestion.id,
      selected_option_id: selectedOption,
      response_time_seconds: duration,
    });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isStarting) return <AssessmentLoadingState />;

  // ── Start error ───────────────────────────────────────────────────────────
  if (startError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-6 text-center px-4">
        <AlertCircle className="h-14 w-14 text-red-500" />
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-tw-text mb-2">
            Could Not Start Assessment
          </h3>
          <p className="text-slate-500 dark:text-tw-muted mb-6 max-w-sm">{startError}</p>
          <Button onClick={() => router.push("/employee/assessments")}>
            Back to Assessments
          </Button>
        </div>
      </div>
    );
  }

  // ── No questions in pool ──────────────────────────────────────────────────
  if (noQuestionsError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-6 text-center px-4">
        <AlertCircle className="h-14 w-14 text-amber-500" />
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-tw-text mb-2">
            No Questions Available
          </h3>
          <p className="text-slate-500 dark:text-tw-muted mb-6 max-w-sm">
            This assessment has no questions yet. Go back and regenerate your
            assessment after adding skills to your profile.
          </p>
          <Button onClick={() => router.push("/employee/assessments")}>
            Back to Assessments
          </Button>
        </div>
      </div>
    );
  }

  // ── Finished ──────────────────────────────────────────────────────────────
  if (isFinished) return <AssessmentFinishedState session={session} />;

  // ── Waiting (question not yet in state, but start finished) ───────────────
  if (!currentQuestion) return null;

  const precisionProgress = Math.min(
    100,
    Math.max(0, ((1.0 - (session?.current_se ?? 1.0)) / 0.7) * 100)
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col gap-1">
          <Badge
            variant="outline"
            className="w-fit text-brand-600 dark:text-tw-blue border-brand-200 dark:border-tw-blue/30"
          >
            {currentQuestion.bloom_level || "Analyzing"}
          </Badge>
          <h2 className="text-sm font-medium text-slate-500">
            Question {(session?.questions_served ?? 0) + 1}
          </h2>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Calibration Precision
            </span>
            <div className="w-32 h-1.5 bg-slate-100 dark:bg-tw-raised rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${precisionProgress}%` }}
                className="h-full bg-emerald-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-tw-muted font-mono text-sm">
            <Timer className="h-4 w-4" />
            <AssessmentTimer key={currentQuestion.id} />
          </div>
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex-1"
        >
          <Card className="p-8 border-slate-200 dark:border-tw-border bg-white dark:bg-tw-card shadow-2xl shadow-brand-500/5">
            <h3 className="text-xl font-medium leading-relaxed mb-10 text-slate-900 dark:text-tw-text">
              {currentQuestion.question_text}
            </h3>

            <div className="space-y-4">
              {(currentQuestion.options ?? []).map((option: any) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedOption(option.id)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                    selectedOption === option.id
                      ? "border-brand-500 bg-brand-50/50 dark:border-tw-blue dark:bg-tw-blue/10"
                      : "border-slate-100 dark:border-tw-border hover:border-brand-200 dark:hover:border-tw-blue/40 hover:bg-slate-50/50 dark:hover:bg-tw-raised"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedOption === option.id
                          ? "border-brand-500 bg-brand-500 dark:border-tw-blue dark:bg-tw-blue"
                          : "border-slate-300 dark:border-tw-border"
                      }`}
                    >
                      {selectedOption === option.id && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      )}
                    </div>
                    <span
                      className={`text-base ${
                        selectedOption === option.id
                          ? "text-brand-900 dark:text-tw-blue font-medium"
                          : "text-slate-700 dark:text-tw-text"
                      }`}
                    >
                      {option.text}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex justify-between items-center">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <BrainCircuit className="h-4 w-4" />
          Adaptive Difficulty:{" "}
          {Math.max(-3, Math.min(3, session?.current_theta ?? 0)).toFixed(1)}
        </div>
        <Button
          onClick={handleNext}
          disabled={!selectedOption || submitMutation.isPending}
          className="px-10 py-6 rounded-2xl bg-brand-600 hover:bg-brand-700 dark:bg-tw-blue dark:hover:bg-blue-600 text-white shadow-lg shadow-brand-600/20 text-lg flex gap-2"
        >
          {submitMutation.isPending ? "Evaluating..." : "Next Question"}
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AssessmentTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <span>
      {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, "0")}
    </span>
  );
}

function AssessmentLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] gap-6">
      <div className="relative">
        <div className="h-20 w-20 rounded-full border-4 border-brand-100 dark:border-tw-raised animate-pulse" />
        <div className="absolute top-0 left-0 h-20 w-20 rounded-full border-t-4 border-brand-600 dark:border-tw-blue animate-spin" />
      </div>
      <div className="text-center">
        <h3 className="text-xl font-bold text-slate-900 dark:text-tw-text">
          Starting Your Assessment
        </h3>
        <p className="text-slate-500 dark:text-tw-muted mt-1">
          Selecting the best questions for your skill profile…
        </p>
      </div>
    </div>
  );
}

function AssessmentFinishedState({ session }: { session: any }) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full bg-white dark:bg-tw-card border border-slate-200 dark:border-tw-border rounded-3xl p-10 text-center shadow-xl"
      >
        <div className="h-20 w-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-tw-text mb-2">
          Assessment Complete!
        </h2>
        <p className="text-slate-500 dark:text-tw-muted mb-8">
          Great job! Your skill profile has been updated.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-slate-50 dark:bg-tw-raised rounded-2xl">
            <p className="text-xs text-slate-400 uppercase font-bold mb-1">
              Proficiency
            </p>
            <p className="text-2xl font-bold text-brand-600 dark:text-tw-blue">
              {session?.final_proficiency != null
                ? `${session.final_proficiency.toFixed(1)} / 5.0`
                : "—"}
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-tw-raised rounded-2xl">
            <p className="text-xs text-slate-400 uppercase font-bold mb-1">
              Questions
            </p>
            <p className="text-2xl font-bold text-slate-700 dark:text-tw-text">
              {session?.questions_served ?? 0} answered
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            className="w-full py-6 rounded-2xl bg-brand-600 dark:bg-tw-blue"
            onClick={() => router.push("/employee/scores")}
          >
            View My Scores
          </Button>
          <Button
            variant="outline"
            className="w-full py-6 rounded-2xl"
            onClick={() => router.push("/employee/assessments")}
          >
            Back to Assessments
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
