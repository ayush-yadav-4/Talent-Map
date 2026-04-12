"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { employeeApi, readStoredUser } from "@/lib/api";
import { formInputClass, formLabelClass } from "@/lib/ui";

export default function EmployeeOnboardingStep3() {
  const router = useRouter();
  const user = readStoredUser();
  const id = user?.employee_id;
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(false);

  const next = async () => {
    if (!id) return;
    const declared_skills = skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setLoading(true);
    try {
      await employeeApi.onboardingStep3(id, { declared_skills });
      toast.success("Saved");
      router.push("/employee/onboarding/step4");
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
      <p className="text-sm text-slate-600 dark:text-tw-muted">List a few skills (comma-separated). Resume upload arrives in a later drop.</p>
      <div>
        <label className={formLabelClass}>Declared skills</label>
        <textarea className={formInputClass} rows={3} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. Patient care, IV insertion, EMR documentation" />
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
