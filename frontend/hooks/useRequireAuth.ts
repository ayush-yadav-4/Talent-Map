"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { readStoredUser, type AuthUser } from "@/lib/api";

export function useRequireAuth(allowedRoles?: string[]): { user: AuthUser | null; ready: boolean } {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u = readStoredUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    if (allowedRoles?.length && !allowedRoles.includes(u.role)) {
      router.replace("/");
      return;
    }
    setUser(u);
    setReady(true);
  }, [router, allowedRoles]);

  return { user, ready };
}
