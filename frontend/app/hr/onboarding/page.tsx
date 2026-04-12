"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readStoredUser } from "@/lib/api";

export default function HrOnboardingIndexPage() {
  const router = useRouter();
  useEffect(() => {
    const u = readStoredUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    if (u.onboarding_completed) {
      router.replace("/hr/dashboard");
      return;
    }
    const step = Math.min(5, Math.max(2, u.onboarding_step || 2));
    router.replace(`/hr/onboarding/step${step}`);
  }, [router]);
  return null;
}
