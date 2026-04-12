"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { employeeApi, readStoredUser } from "@/lib/api";
import { EMPLOYMENT_TYPES, SENIORITY_LEVELS } from "@/lib/types";
import { formInputClass, formLabelClass } from "@/lib/ui";

export default function EmployeeOnboardingStep2() {
  const router = useRouter();
  const user = readStoredUser();
  const id = user?.employee_id;
  const [jobTitle, setJobTitle] = useState("");
  const [seniority, setSeniority] = useState("mid");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [years, setYears] = useState(3);
  const [loading, setLoading] = useState(false);

  const next = async () => {
    if (!id) return;
    if (!jobTitle.trim()) {
      toast.error("Job title is required.");
      return;
    }
    setLoading(true);
    try {
      await employeeApi.onboardingStep2(id, {
        job_title: jobTitle.trim(),
        seniority_level: seniority,
        employment_type: employmentType,
        years_of_experience: years,
      });
      toast.success("Saved");
      router.push("/employee/onboarding/step3");
    } catch (e) {
      if (isAxiosError(e)) toast.error(String(e.response?.data?.detail ?? e.message));
      else toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  };

  if (!id) return null;

  return (
    <div className="space-y-4">
      <div>
        <label className={formLabelClass}>Job title *</label>
        <input className={formInputClass} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Staff Nurse" />
      </div>
      <div>
        <label className={formLabelClass}>Seniority</label>
        <select className={formInputClass} value={seniority} onChange={(e) => setSeniority(e.target.value)}>
          {SENIORITY_LEVELS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={formLabelClass}>Employment type</label>
        <select className={formInputClass} value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
          {EMPLOYMENT_TYPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={formLabelClass}>Years of experience</label>
        <input type="number" min={0} max={40} step={0.5} className={formInputClass} value={years} onChange={(e) => setYears(Number(e.target.value))} />
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={next}
        className="mt-4 w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-tw-blue dark:hover:bg-tw-blue-hover"
      >
        {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" aria-hidden /> : "Continue"}
      </button>
    </div>
  );
}
