"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { Loader2, Lock, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Logo } from "@/components/site/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { login, persistAuth } from "@/lib/api";
import { cardSurfaceClass, formInputClass, formLabelClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type Form = z.infer<typeof schema>;

function postLoginRedirect(role: string, onboarded: boolean, step: number) {
  if (!onboarded) {
    if (role === "org_admin" || role === "hr_manager") {
      const s = Math.min(5, Math.max(2, step || 2));
      return `/hr/onboarding/step${s}`;
    }
    if (role === "employee") {
      const s = Math.min(4, Math.max(1, step || 1));
      return `/employee/onboarding/step${s}`;
    }
  }
  if (role === "org_admin" || role === "hr_manager" || role === "manager") return "/hr/dashboard";
  return "/employee/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: Form) => {
    setApiError(null);
    try {
      const res = await login({ email: values.email.trim().toLowerCase(), password: values.password });
      persistAuth(res);
      router.push(postLoginRedirect(res.user.role, res.user.onboarding_completed, res.user.onboarding_step));
    } catch (e: unknown) {
      if (isAxiosError(e)) {
        const detail = (e.response?.data as { detail?: string })?.detail;
        setApiError(typeof detail === "string" ? detail : "Invalid credentials");
      } else {
        setApiError("Sign-in failed");
      }
    }
  };

  const inputClass = cn(formInputClass, "pl-9");

  return (
    <div className="min-h-screen bg-hero-mesh dark:bg-hero-mesh-dark">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className={cn(cardSurfaceClass, "p-8 shadow-xl")}>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Sign in</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-tw-muted">
            Use your work email and password. New organization?{" "}
            <Link href="/onboarding" className="font-medium text-brand-700 hover:underline dark:text-tw-blue">
              Create your org
            </Link>
            .
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className={formLabelClass} htmlFor="email">
                Email
              </label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-tw-muted" />
                <input id="email" type="email" autoComplete="username" className={inputClass} {...register("email")} />
              </div>
              {formState.errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <label className={formLabelClass} htmlFor="password">
                Password
              </label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-tw-muted" />
                <input id="password" type="password" autoComplete="current-password" className={inputClass} {...register("password")} />
              </div>
              {formState.errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formState.errors.password.message}</p>
              )}
            </div>
            {apiError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                {apiError}
              </div>
            )}
            <button
              type="submit"
              disabled={formState.isSubmitting}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 dark:bg-tw-blue dark:hover:bg-tw-blue-hover",
                formState.isSubmitting && "opacity-70",
              )}
            >
              {formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Signing in…
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
