"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { employeeApi, readStoredUser } from "@/lib/api";
import { formInputClass, formLabelClass } from "@/lib/ui";

export default function EmployeeOnboardingStep1() {
  const router = useRouter();
  const user = readStoredUser();
  const id = user?.employee_id;
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);

  const next = async () => {
    if (!id) {
      toast.error("Missing employee profile on your account.");
      return;
    }
    setLoading(true);
    try {
      await employeeApi.onboardingStep1(id, { full_name: fullName.trim(), phone: phone || undefined, location_city: city || undefined, location_state: state || undefined });
      toast.success("Saved");
      router.push("/employee/onboarding/step2");
    } catch (e) {
      if (isAxiosError(e)) toast.error(String(e.response?.data?.detail ?? e.message));
      else toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  };

  if (!id) return <p className="text-sm text-slate-600 dark:text-tw-muted">This flow is for employee accounts with a linked profile.</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-tw-muted">Tell us a bit about yourself.</p>
      <div>
        <label className={formLabelClass}>Full name *</label>
        <input className={formInputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div>
        <label className={formLabelClass}>Phone</label>
        <input className={formInputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={formLabelClass}>City</label>
          <input className={formInputClass} value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <label className={formLabelClass}>State / region</label>
          <input className={formInputClass} value={state} onChange={(e) => setState(e.target.value)} />
        </div>
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
