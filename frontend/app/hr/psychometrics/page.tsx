"use client";

import type React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button, Input } from "@/components/ui";
import { employeeApi, psychometricsApi, reportApi } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cardSurfaceClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function HrPsychometricsPage() {
  const { ready } = useRequireAuth(["org_admin", "hr_manager"]);
  const qc = useQueryClient();
  const [assessmentType, setAssessmentType] = useState<"DISC" | "BigFive">("DISC");
  const [employeeId, setEmployeeId] = useState("");
  const [dScore, setDScore] = useState(50);
  const [iScore, setIScore] = useState(50);
  const [sScore, setSScore] = useState(50);
  const [cScore, setCScore] = useState(50);

  const { data: dist, isLoading: distLoading } = useQuery({
    queryKey: ["psychometric-distribution"],
    queryFn: async () => {
      const { data } = await reportApi.hrPsychometricDistribution();
      return data as {
        trait_counts: Record<string, number>;
        learning_style_counts: Record<string, number>;
        by_department: Record<string, Record<string, number>>;
        employees_profiled: number;
      };
    },
    enabled: ready,
  });

  const { data: summary } = useQuery({
    queryKey: ["psychometric-hr-summary"],
    queryFn: async () => {
      const { data } = await psychometricsApi.hrSummary();
      return data as {
        employee_id: string;
        employee_name: string;
        dept_id: string | null;
        assessment_type: string;
        dominant_trait: string;
        learning_style: string;
        completed_at: string | null;
      }[];
    },
    enabled: ready,
  });

  const [oScore, setOScore] = useState(50);
  const [cBf, setCBf] = useState(50);
  const [eScore, setEScore] = useState(50);
  const [aScore, setAScore] = useState(50);
  const [nScore, setNScore] = useState(50);

  const { data: employees } = useQuery({
    queryKey: ["psychometric-employee-pick"],
    queryFn: async () => {
      const { data } = await employeeApi.list({ limit: 200 });
      return (data as { id: string; full_name: string; email: string }[]) ?? [];
    },
    enabled: ready,
  });

  const chartData = useMemo(() => {
    const tc = dist?.trait_counts ?? {};
    return Object.entries(tc).map(([name, value]) => ({ name: name.slice(0, 24), value }));
  }, [dist]);

  const submitMutation = useMutation({
    mutationFn: () =>
      psychometricsApi.submit({
        employee_id: employeeId || undefined,
        assessment_type: assessmentType,
        scores:
          assessmentType === "DISC"
            ? { D: dScore, I: iScore, S: sScore, C: cScore }
            : {
                openness: oScore,
                conscientiousness: cBf,
                extraversion: eScore,
                agreeableness: aScore,
                neuroticism: nScore,
              },
      }),
    onSuccess: () => {
      toast.success("Psychometric result saved");
      void qc.invalidateQueries({ queryKey: ["psychometric-distribution"] });
      void qc.invalidateQueries({ queryKey: ["psychometric-hr-summary"] });
    },
    onError: () => toast.error("Submit failed"),
  });

  if (!ready) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Psychometric insights</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">DISC / Big Five summaries for L&D personalization.</p>
        </div>
        <Link href="/hr/dashboard" className="text-sm font-semibold text-brand-700 hover:underline dark:text-tw-blue">
          ← Dashboard
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={cn(cardSurfaceClass, "p-4 shadow-sm")}>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Dominant trait distribution</h2>
          <p className="text-xs text-slate-500 dark:text-tw-muted">Employees profiled: {dist?.employees_profiled ?? 0}</p>
          {distLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            </div>
          ) : (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: 8, right: 8, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-tw-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" name="Employees" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className={cn(cardSurfaceClass, "space-y-3 p-4 shadow-sm")}>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Learning styles</h2>
          <ul className="space-y-2 text-sm">
            {Object.entries(dist?.learning_style_counts ?? {}).map(([k, v]) => (
              <li key={k} className="flex justify-between border-b border-slate-100 py-1 dark:border-tw-border">
                <span className="text-slate-700 dark:text-tw-text">{k}</span>
                <span className="font-semibold text-slate-900 dark:text-tw-text">{v}</span>
              </li>
            ))}
            {!Object.keys(dist?.learning_style_counts ?? {}).length && (
              <li className="text-xs text-slate-500">No submissions yet.</li>
            )}
          </ul>
        </div>
      </div>

      <div className={cn(cardSurfaceClass, "p-4 shadow-sm")}>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Record assessment (HR)</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-tw-muted">
          Enter DISC dimension scores (0–100). Gemini derives learning style labels.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-tw-border dark:bg-tw-card"
            value={assessmentType}
            onChange={(e) => setAssessmentType(e.target.value as "DISC" | "BigFive")}
          >
            <option value="DISC">DISC</option>
            <option value="BigFive">Big Five</option>
          </select>
          <select
            className="min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-tw-border dark:bg-tw-card"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">Select employee…</option>
            {(employees ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
        </div>
        {assessmentType === "DISC" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {[
              ["D", dScore, setDScore],
              ["I", iScore, setIScore],
              ["S", sScore, setSScore],
              ["C", cScore, setCScore],
            ].map(([label, val, set]) => (
              <label key={String(label)} className="text-xs font-medium text-slate-600 dark:text-tw-muted">
                {label}
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1"
                  value={val as number}
                  onChange={(e) => (set as React.Dispatch<React.SetStateAction<number>>)(Number(e.target.value))}
                />
              </label>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-5">
            {[
              ["O", oScore, setOScore],
              ["C", cBf, setCBf],
              ["E", eScore, setEScore],
              ["A", aScore, setAScore],
              ["N", nScore, setNScore],
            ].map(([label, val, set]) => (
              <label key={String(label)} className="text-xs font-medium text-slate-600 dark:text-tw-muted">
                {label}
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1"
                  value={val as number}
                  onChange={(e) => (set as React.Dispatch<React.SetStateAction<number>>)(Number(e.target.value))}
                />
              </label>
            ))}
          </div>
        )}
        <Button
          type="button"
          className="mt-4"
          disabled={!employeeId || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & derive profile"}
        </Button>
      </div>

      <div className={cn(cardSurfaceClass, "overflow-x-auto p-4 shadow-sm")}>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Latest per employee</h2>
        <table className="mt-3 w-full min-w-[520px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-tw-border">
              <th className="py-2 font-semibold">Employee</th>
              <th className="py-2 font-semibold">Type</th>
              <th className="py-2 font-semibold">Dominant trait</th>
              <th className="py-2 font-semibold">Learning style</th>
              <th className="py-2 font-semibold">Completed</th>
            </tr>
          </thead>
          <tbody>
            {(summary ?? []).map((row) => (
              <tr key={row.employee_id} className="border-b border-slate-100 dark:border-tw-border">
                <td className="py-2 font-medium text-slate-800 dark:text-tw-text">{row.employee_name}</td>
                <td className="py-2">{row.assessment_type}</td>
                <td className="py-2">{row.dominant_trait}</td>
                <td className="py-2">{row.learning_style}</td>
                <td className="py-2 text-slate-500">{row.completed_at ? new Date(row.completed_at).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!(summary?.length ?? 0) && <p className="mt-3 text-xs text-slate-500">No records yet.</p>}
      </div>
    </div>
  );
}
