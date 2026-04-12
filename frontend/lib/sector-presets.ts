/** Presets for HR registration and onboarding (Talent Map). */

export const SUB_SECTORS: Record<string, { value: string; label: string }[]> = {
  corporate: [
    { value: "saas", label: "SaaS" },
    { value: "fintech", label: "Fintech" },
    { value: "ecommerce", label: "E-commerce" },
    { value: "consulting", label: "Consulting" },
    { value: "other", label: "Other" },
  ],
  government: [
    { value: "central", label: "Central Government" },
    { value: "state", label: "State Government" },
    { value: "municipal", label: "Municipal Body" },
    { value: "psu", label: "PSU" },
    { value: "defence", label: "Defence" },
  ],
  hospital: [
    { value: "private_hospital", label: "Private Hospital" },
    { value: "gov_hospital", label: "Government Hospital" },
    { value: "clinic", label: "Clinic / Polyclinic" },
    { value: "diagnostic", label: "Diagnostic Center" },
  ],
  manufacturing: [
    { value: "automotive", label: "Automotive" },
    { value: "pharma", label: "Pharma" },
    { value: "fmcg", label: "FMCG" },
    { value: "electronics", label: "Electronics" },
    { value: "textiles", label: "Textiles" },
  ],
  retail: [
    { value: "modern_retail", label: "Modern Retail" },
    { value: "qsr", label: "QSR" },
    { value: "hospitality", label: "Hospitality" },
    { value: "ecommerce", label: "E-commerce" },
    { value: "banking_fs", label: "Banking / Financial Services" },
  ],
};

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export const DEPARTMENT_PRESETS: Record<string, string[]> = {
  corporate: [
    "Engineering",
    "Product",
    "Design",
    "Marketing",
    "Sales",
    "HR & People",
    "Finance",
    "Operations",
    "Customer Success",
    "Legal",
  ],
  government: [
    "Administration",
    "Finance & Accounts",
    "Human Resources",
    "Information Technology",
    "Legal",
    "Operations",
    "Planning",
    "Public Relations",
    "Procurement",
    "Vigilance",
  ],
  hospital: [
    "Medicine",
    "Surgery",
    "Nursing",
    "Pharmacy",
    "Radiology",
    "ICU / Critical Care",
    "OPD / Outpatient",
    "Emergency",
    "HR & Administration",
    "IT",
    "Accounts",
    "Billing",
  ],
  manufacturing: [
    "Production",
    "Quality Assurance",
    "Safety & EHS",
    "Maintenance",
    "Engineering",
    "Supply Chain",
    "HR & Admin",
    "Finance",
  ],
  retail: [
    "Sales Floor",
    "Customer Service",
    "Inventory Management",
    "HR & Admin",
    "Finance",
    "Operations",
    "Marketing",
    "Loss Prevention",
  ],
};

export const ROLE_PRESETS: Record<string, string[]> = {
  corporate: [
    "Software Engineer",
    "Senior Software Engineer",
    "Product Manager",
    "Data Analyst",
    "UX Designer",
    "DevOps Engineer",
    "QA Engineer",
    "Business Analyst",
    "Project Manager",
    "Engineering Manager",
    "HR Manager",
    "Marketing Manager",
    "Sales Executive",
    "Customer Success Manager",
  ],
  government: [
    "District Collector / DM",
    "Section Officer",
    "Assistant Commissioner",
    "Audit Officer",
    "IT Officer",
    "Finance Officer",
    "HR Officer",
    "Planning Officer",
    "Legal Advisor",
    "PRO Officer",
    "Deputy Collector",
    "Under Secretary",
  ],
  hospital: [
    "Medical Officer (Doctor)",
    "Resident Doctor",
    "Senior Nursing Officer",
    "Junior Nursing Officer",
    "Staff Nurse",
    "Pharmacist",
    "Radiologist",
    "Lab Technician",
    "Hospital Administrator",
    "Medical Records Officer",
    "Billing Executive",
    "Ward Boy / Attendant",
  ],
  manufacturing: [
    "Plant Manager",
    "Production Engineer",
    "Quality Inspector",
    "Safety Officer",
    "Maintenance Technician",
    "Machine Operator",
    "Shift Supervisor",
    "Supply Chain Manager",
    "EHS Manager",
    "CNC Operator",
  ],
  retail: [
    "Store Manager",
    "Sales Associate",
    "Customer Service Executive",
    "Inventory Manager",
    "Cash Counter Executive",
    "Visual Merchandiser",
    "Loss Prevention Officer",
  ],
};

/** Short department codes for preset rows (max 10 chars). */
export function suggestDeptCode(name: string): string {
  const words = name
    .split(/[\s/&,-]+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ""))
    .filter(Boolean);
  if (!words.length) return "";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 10);
}
