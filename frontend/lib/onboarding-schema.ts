import { z } from "zod";

export const SECTOR_VALUES = [
  { value: "corporate", label: "Corporate / IT", description: "Software, consulting, and digital services." },
  { value: "government", label: "Government / public sector", description: "Central, state, and municipal bodies." },
  { value: "hospital", label: "Hospital / healthcare", description: "Hospitals, clinics, and diagnostics." },
  { value: "manufacturing", label: "Manufacturing / industrial", description: "Plants, quality, and supply chain." },
  { value: "retail", label: "Retail / services", description: "Stores, hospitality, and frontline ops." },
] as const;

export const EMPLOYEE_COUNT_RANGE_VALUES = ["1-50", "51-200", "201-500", "501-2000", "2000+"] as const;

export const PRIMARY_USE_CASE_OPTIONS = [
  { id: "gaps", label: "Identify and close skill gaps" },
  { id: "compliance", label: "Track compliance and certifications" },
  { id: "succession", label: "Succession planning" },
  { id: "marketplace", label: "Build internal talent marketplace" },
] as const;

export const onboardingSchema = z
  .object({
    organization_name: z.string().min(2, "Organization name is required").max(255),
    sector: z.enum(["corporate", "government", "hospital", "manufacturing", "retail"], {
      required_error: "Select a sector",
    }),
    sub_sector: z.string().max(100).optional().or(z.literal("")),
    country: z.string().min(2).max(10).default("IN"),
    state_region: z.string().max(100).optional().or(z.literal("")),
    company_domain: z
      .string()
      .max(255)
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v), "Enter a valid domain"),
    employee_count_range: z.enum(EMPLOYEE_COUNT_RANGE_VALUES, {
      required_error: "Select an employee count range",
    }),
    primary_use_cases: z.array(z.string()).optional().default([]),

    data_residency: z.enum(["cloud", "on_premise", "govt_cloud"]).default("cloud"),

    admin_full_name: z.string().min(2, "Full name is required").max(255),
    admin_job_title: z.string().max(255).optional().or(z.literal("")),
    admin_email: z.string().email("Enter a valid work email"),
    admin_phone: z.string().max(32).optional().or(z.literal("")),
    admin_password: z.string().min(8, "Use at least 8 characters").max(128),
    admin_password_confirm: z.string().min(8, "Confirm your password"),

    accept_privacy: z.boolean().refine((v) => v === true, { message: "You must accept the privacy notice" }),
    accept_terms: z.boolean().refine((v) => v === true, { message: "You must accept the terms" }),
  })
  .refine((d) => d.admin_password === d.admin_password_confirm, {
    message: "Passwords do not match",
    path: ["admin_password_confirm"],
  })
  .superRefine((d, ctx) => {
    if (d.country === "IN" && !(d.state_region || "").trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Select a state when country is India",
        path: ["state_region"],
      });
    }
  });

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
