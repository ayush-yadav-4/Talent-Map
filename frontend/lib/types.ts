export type Sector = "corporate" | "government" | "hospital" | "manufacturing" | "retail";

export const SECTORS: { value: Sector; label: string }[] = [
  { value: "corporate", label: "Corporate / IT" },
  { value: "government", label: "Government / Public Sector" },
  { value: "hospital", label: "Hospital / Healthcare" },
  { value: "manufacturing", label: "Manufacturing / Industrial" },
  { value: "retail", label: "Retail / Service" },
];

export const EMPLOYEE_COUNT_RANGES = ["1-50", "51-200", "201-500", "501-2000", "2000+"] as const;

export const PRIMARY_USE_CASES = [
  { value: "skill_gap", label: "Skill gap analysis" },
  { value: "compliance", label: "Compliance & certifications" },
  { value: "succession", label: "Succession planning" },
  { value: "all", label: "All of the above" },
] as const;

export const SENIORITY_LEVELS = [
  { value: "junior", label: "Junior (0–2 yrs)" },
  { value: "mid", label: "Mid-level (2–5 yrs)" },
  { value: "senior", label: "Senior (5–10 yrs)" },
  { value: "lead", label: "Lead / Manager" },
  { value: "principal", label: "Principal / Architect" },
  { value: "executive", label: "Executive / Director" },
] as const;

export const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "contract", label: "Contract" },
  { value: "frontline", label: "Frontline" },
] as const;
