"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isAxiosError } from "axios";
import { Lock } from "lucide-react";
import { api, fetchMe, readStoredUser } from "@/lib/api";
import { cardSurfaceClass, formInputClass, formLabelClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

function nextRouteForUser(role: string, onboardingCompleted: boolean, onboardingStep: number): string {
  if (!onboardingCompleted) {
    if (role === "employee") {
      const step = Math.min(4, Math.max(1, onboardingStep || 1));
      return `/employee/onboarding/step${step}`;
    }
    if (role === "org_admin" || role === "hr_manager" || role === "manager") {
      const step = Math.min(5, Math.max(2, onboardingStep || 2));
      return `/hr/onboarding/step${step}`;
    }
  }
  return role === "employee" ? "/employee/dashboard" : "/hr/dashboard";
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = readStoredUser();

  const submit = async () => {
    if (!currentPassword || !newPassword) {
      setError("Please fill all required fields.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/v1/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      const refreshedUser = await fetchMe();
      const access = sessionStorage.getItem("tm_access_token");
      const refresh = sessionStorage.getItem("tm_refresh_token");
      if (access && refresh) {
        sessionStorage.setItem("tm_user", JSON.stringify(refreshedUser));
      }
      router.push(nextRouteForUser(refreshedUser.role, refreshedUser.onboarding_completed, refreshedUser.onboarding_step));
    } catch (err) {
      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string })?.detail;
        setError(detail ?? err.message);
      } else {
        setError("Unable to change password");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-mesh dark:bg-hero-mesh-dark">
      <div className="mx-auto max-w-md px-4 py-10">
        <div className={cn(cardSurfaceClass, "p-8")}>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Change password</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">
            {user?.must_change_password
              ? "For security, you must set a new password before continuing."
              : "Update your password to continue."}
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className={formLabelClass}>Current password</label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  className={cn(formInputClass, "pl-9")}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={formLabelClass}>New password</label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  className={cn(formInputClass, "pl-9")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={formLabelClass}>Confirm new password</label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  className={cn(formInputClass, "pl-9")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            )}
            <button
              type="button"
              disabled={submitting}
              onClick={submit}
              className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-tw-blue dark:hover:bg-tw-blue-hover"
            >
              {submitting ? "Updating..." : "Update password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
