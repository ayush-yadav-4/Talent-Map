"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { Building2, Loader2, Lock, Mail, Phone, User } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { persistAuth, registerOrganization } from "@/lib/api";
import {
  EMPLOYEE_COUNT_RANGE_VALUES,
  onboardingSchema,
  PRIMARY_USE_CASE_OPTIONS,
  SECTOR_VALUES,
  type OnboardingFormValues,
} from "@/lib/onboarding-schema";
import { INDIAN_STATES, SUB_SECTORS } from "@/lib/sector-presets";
import { cardSurfaceClass, formInputClass, formLabelClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-600 dark:text-red-400">{message}</p>;
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof Building2; title: string; subtitle: string }) {
  return (
    <div className="mb-6 flex gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-tw-raised dark:text-tw-blue dark:ring-tw-border">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-tw-text">{title}</h2>
        <p className="text-sm text-slate-600 dark:text-tw-muted">{subtitle}</p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      organization_name: "",
      sector: "corporate",
      sub_sector: "",
      country: "IN",
      state_region: "",
      company_domain: "",
      employee_count_range: "1-50",
      primary_use_cases: [],
      data_residency: "cloud",
      admin_full_name: "",
      admin_job_title: "",
      admin_email: "",
      admin_phone: "",
      admin_password: "",
      admin_password_confirm: "",
      accept_privacy: false,
      accept_terms: false,
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const sector = watch("sector");
  const country = watch("country");
  const primaryCases = watch("primary_use_cases") ?? [];
  const pw = watch("admin_password") || "";

  const passwordStrength = (() => {
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
    if (/\d/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;
    if (pw.length >= 12) score += 1;
    if (score <= 2) return { label: "Weak", cls: "bg-amber-500" };
    if (score <= 3) return { label: "Medium", cls: "bg-amber-400" };
    return { label: "Strong", cls: "bg-emerald-500" };
  })();

  const onSubmit = async (values: OnboardingFormValues) => {
    setApiError(null);
    try {
      const tokens = await registerOrganization({
        organization_name: values.organization_name.trim(),
        sector: values.sector,
        sub_sector: values.sub_sector || undefined,
        admin_email: values.admin_email.trim().toLowerCase(),
        admin_password: values.admin_password,
        admin_full_name: values.admin_full_name.trim(),
        country: values.country,
        state: values.state_region || undefined,
        domain: values.company_domain || undefined,
        employee_count_range: values.employee_count_range,
        primary_use_cases: values.primary_use_cases?.length ? values.primary_use_cases : undefined,
        admin_phone: values.admin_phone || undefined,
        admin_designation: values.admin_job_title || undefined,
      });
      persistAuth(tokens);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "tm_onboarding_meta",
          JSON.stringify({
            country: values.country,
            state_region: values.state_region,
            company_domain: values.company_domain,
            employee_count_range: values.employee_count_range,
            primary_use_cases: values.primary_use_cases,
            data_residency: values.data_residency,
            admin_job_title: values.admin_job_title,
            admin_phone: values.admin_phone,
          }),
        );
      }
      router.push("/hr/onboarding/step2");
    } catch (e: unknown) {
      if (isAxiosError(e)) {
        const detail = (e.response?.data as { detail?: string | unknown })?.detail;
        if (typeof detail === "string") setApiError(detail);
        else if (Array.isArray(detail)) setApiError(detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(" "));
        else setApiError(e.message || "Registration failed");
      } else {
        setApiError("Something went wrong. Try again.");
      }
    }
  };

  const inputClass = formInputClass;
  const labelClass = formLabelClass;

  return (
    <div className="min-h-screen bg-hero-mesh dark:bg-hero-mesh-dark">
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-tw-border dark:bg-tw-card dark:backdrop-blur-none">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-brand-700 dark:text-tw-muted dark:hover:text-tw-blue">
              ← Back to site
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-tw-blue">HR onboarding</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-tw-text sm:text-4xl">
            Create your organization
          </h1>
          <p className="mt-3 text-slate-600 dark:text-tw-muted">
            Tell us about your employer and the primary HR / L&D owner. Fields marked with <span className="text-red-600 dark:text-red-400">*</span>{" "}
            are required to provision your tenant today.
          </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          <section className={cn(cardSurfaceClass, "p-6 sm:p-8")}>
            <SectionTitle
              icon={Building2}
              title="Organization profile"
              subtitle="Used for tenancy, sector defaults, and how we prioritize compliance-style skills."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="organization_name">
                  Legal or brand name <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input id="organization_name" className={inputClass} placeholder="e.g. Acme Healthcare Ltd." {...register("organization_name")} />
                <FieldError message={errors.organization_name?.message} />
              </div>

              <div className="sm:col-span-2">
                <p className={labelClass}>
                  Primary sector <span className="text-red-600 dark:text-red-400">*</span>
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {SECTOR_VALUES.map((s) => {
                    const active = sector === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => {
                          setValue("sector", s.value);
                          setValue("sub_sector", "");
                        }}
                        className={cn(
                          "rounded-xl border p-4 text-left text-sm transition",
                          active
                            ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200 dark:border-tw-blue dark:bg-tw-raised dark:ring-tw-blue/40"
                            : "border-slate-200 bg-white/60 hover:border-brand-200 dark:border-tw-border dark:bg-tw-card dark:hover:border-tw-blue/50",
                        )}
                      >
                        <p className="font-semibold text-slate-900 dark:text-tw-text">{s.label}</p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-tw-muted">{s.description}</p>
                      </button>
                    );
                  })}
                </div>
                <FieldError message={errors.sector?.message} />
              </div>

              {SUB_SECTORS[sector as keyof typeof SUB_SECTORS]?.length ? (
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="sub_sector">
                    Sub-sector
                  </label>
                  <select id="sub_sector" className={inputClass} {...register("sub_sector")}>
                    <option value="">Select…</option>
                    {SUB_SECTORS[sector as keyof typeof SUB_SECTORS].map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className={labelClass} htmlFor="country">
                  Country (ISO) <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input id="country" className={inputClass} placeholder="IN" maxLength={10} {...register("country")} />
                <FieldError message={errors.country?.message} />
              </div>

              <div>
                <label className={labelClass} htmlFor="state_region">
                  State / UT {country === "IN" ? <span className="text-red-600 dark:text-red-400">*</span> : null}
                </label>
                {country === "IN" ? (
                  <select id="state_region" className={inputClass} {...register("state_region")}>
                    <option value="">Select state…</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input id="state_region" className={inputClass} placeholder="Region" {...register("state_region")} />
                )}
                <FieldError message={errors.state_region?.message} />
              </div>

              <div>
                <label className={labelClass} htmlFor="company_domain">
                  Company email domain
                </label>
                <input id="company_domain" className={inputClass} placeholder="acme.com" {...register("company_domain")} />
                <FieldError message={errors.company_domain?.message} />
              </div>

              <div className="sm:col-span-2">
                <p className={labelClass}>
                  Employee count range <span className="text-red-600 dark:text-red-400">*</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {EMPLOYEE_COUNT_RANGE_VALUES.map((r) => (
                    <label
                      key={r}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-tw-border dark:bg-tw-card"
                    >
                      <input type="radio" value={r} className="accent-brand-600" {...register("employee_count_range")} />
                      {r === "2000+" ? "2000+" : r.replace("-", "–")}
                    </label>
                  ))}
                </div>
                <FieldError message={errors.employee_count_range?.message} />
              </div>

              <div className="sm:col-span-2">
                <p className={labelClass}>Primary use cases (optional, multi-select)</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {PRIMARY_USE_CASE_OPTIONS.map((opt) => {
                    const checked = primaryCases.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-tw-border dark:bg-tw-raised"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-brand-600"
                          checked={checked}
                          onChange={() => {
                            const next = new Set(primaryCases);
                            if (checked) next.delete(opt.id);
                            else next.add(opt.id);
                            setValue("primary_use_cases", [...next]);
                          }}
                        />
                        <span className="text-slate-800 dark:text-tw-text">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="data_residency">
                  Data residency preference
                </label>
                <select id="data_residency" className={inputClass} {...register("data_residency")}>
                  <option value="cloud">Cloud (managed SaaS)</option>
                  <option value="on_premise">On-premise / private cloud</option>
                  <option value="govt_cloud">Government-approved cloud (e.g. NIC)</option>
                </select>
                <p className="mt-1 text-xs text-slate-500 dark:text-tw-muted">
                  Selection is stored with your session metadata; infrastructure routing is finalized during enterprise
                  setup.
                </p>
              </div>
            </div>
          </section>

          <section className={cn(cardSurfaceClass, "p-6 sm:p-8")}>
            <SectionTitle
              icon={User}
              title="Primary HR / org admin"
              subtitle="This person receives the first admin login and can invite managers and employees."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="admin_full_name">
                  Full name <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <div className="relative mt-1">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-tw-muted" />
                  <input id="admin_full_name" className={cn(inputClass, "pl-9")} placeholder="Priya Sharma" {...register("admin_full_name")} />
                </div>
                <FieldError message={errors.admin_full_name?.message} />
              </div>

              <div>
                <label className={labelClass} htmlFor="admin_job_title">
                  Admin designation
                </label>
                <input id="admin_job_title" className={inputClass} placeholder="e.g. HR Director" {...register("admin_job_title")} />
              </div>

              <div>
                <label className={labelClass} htmlFor="admin_phone">
                  Work phone
                </label>
                <div className="relative mt-1">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-tw-muted" />
                  <input id="admin_phone" className={cn(inputClass, "pl-9")} placeholder="+91 …" {...register("admin_phone")} />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="admin_email">
                  Work email <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-tw-muted" />
                  <input
                    id="admin_email"
                    type="email"
                    autoComplete="email"
                    className={cn(inputClass, "pl-9")}
                    placeholder="priya.sharma@company.com"
                    {...register("admin_email")}
                  />
                </div>
                <FieldError message={errors.admin_email?.message} />
              </div>

              <div>
                <label className={labelClass} htmlFor="admin_password">
                  Password <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-tw-muted" />
                  <input
                    id="admin_password"
                    type="password"
                    autoComplete="new-password"
                    className={cn(inputClass, "pl-9")}
                    {...register("admin_password")}
                  />
                </div>
                <FieldError message={errors.admin_password?.message} />
                {pw ? (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-tw-muted">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-tw-border">
                      <span
                        className={cn("block h-full origin-left transition", passwordStrength.cls)}
                        style={{
                          width: `${Math.min(100, (pw.length >= 8 ? 20 : 0) + (/[a-z]/.test(pw) ? 15 : 0) + (/[A-Z]/.test(pw) ? 15 : 0) + (/\d/.test(pw) ? 20 : 0) + (/[^A-Za-z0-9]/.test(pw) ? 20 : 0) + (pw.length >= 12 ? 10 : 0))}%`,
                        }}
                      />
                    </span>
                    <span>Strength: {passwordStrength.label}</span>
                  </div>
                ) : null}
              </div>

              <div>
                <label className={labelClass} htmlFor="admin_password_confirm">
                  Confirm password <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-tw-muted" />
                  <input
                    id="admin_password_confirm"
                    type="password"
                    autoComplete="new-password"
                    className={cn(inputClass, "pl-9")}
                    {...register("admin_password_confirm")}
                  />
                </div>
                <FieldError message={errors.admin_password_confirm?.message} />
              </div>
            </div>
          </section>

          <section className={cn(cardSurfaceClass, "p-6 sm:p-8")}>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-tw-text">Policies</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">
              Talent Map is designed for DPDP-aware and GDPR-ready deployments. Full legal packs ship with enterprise
              contracts; for the MVP preview, confirm you understand how we process signup data.
            </p>
            <div className="mt-5 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white/60 p-3 hover:border-brand-200 dark:border-tw-border dark:bg-tw-raised dark:hover:border-tw-blue/50">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-tw-border dark:bg-tw-card dark:text-tw-blue dark:focus:ring-tw-blue"
                  {...register("accept_privacy")}
                />
                <span className="text-sm text-slate-700 dark:text-tw-text">
                  I agree to the{" "}
                  <span className="font-medium text-brand-700 dark:text-tw-blue">privacy notice</span> for account creation and product
                  communications. <span className="text-red-600 dark:text-red-400">*</span>
                </span>
              </label>
              <FieldError message={errors.accept_privacy?.message as string | undefined} />
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white/60 p-3 hover:border-brand-200 dark:border-tw-border dark:bg-tw-raised dark:hover:border-tw-blue/50">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-tw-border dark:bg-tw-card dark:text-tw-blue dark:focus:ring-tw-blue"
                  {...register("accept_terms")}
                />
                <span className="text-sm text-slate-700 dark:text-tw-text">
                  I accept the <span className="font-medium text-brand-700 dark:text-tw-blue">terms of use</span> for this preview
                  environment. <span className="text-red-600 dark:text-red-400">*</span>
                </span>
              </label>
              <FieldError message={errors.accept_terms?.message as string | undefined} />
            </div>
          </section>

          {apiError && (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {apiError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-tw-muted">
              By submitting, we create your tenant via the live API. Use a real inbox you control — this becomes your
              login.
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-tw-blue dark:shadow-none dark:hover:bg-tw-blue-hover"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Creating tenant…
                </>
              ) : (
                "Create organization"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
