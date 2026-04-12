"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readStoredUser } from "@/lib/api";

export default function EmployeeOnboardingIndex() {
  const router = useRouter();
  useEffect(() => {
    const u = readStoredUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    if (u.role !== "employee") {
      router.replace("/hr/dashboard");
      return;
    }
    const s = Math.min(4, Math.max(1, u.onboarding_step || 1));
    router.replace(`/employee/onboarding/step${s}`);
  }, [router]);
  return null;
}
