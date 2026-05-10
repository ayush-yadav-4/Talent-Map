import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toRenderableText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Common AI patterns
    if (typeof obj.skill_name === "string") {
      const details: string[] = [obj.skill_name];
      if (typeof obj.proficiency === "number") details.push(`(Proficiency: ${obj.proficiency})`);
      if (typeof obj.note === "string" && obj.note.trim()) details.push(`- ${obj.note}`);
      return details.join(" ");
    }
    if (typeof obj.skill === "string") return obj.skill;
    if (typeof obj.name === "string") return obj.name;
    
    const firstString = Object.values(obj).find((v) => typeof v === "string");
    if (typeof firstString === "string") return firstString;
    return JSON.stringify(value);
  }
  return "N/A";
}
