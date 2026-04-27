"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAuth, fetchMe, persistAuth, readStoredUser, refreshSession, type AuthUser } from "@/lib/api";

export function useRequireAuth(allowedRoles?: string[]): { user: AuthUser | null; ready: boolean } {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const rolesKey = allowedRoles?.join("|") ?? "";

  useEffect(() => {
    let cancelled = false;
    const resolvedRoles = rolesKey ? rolesKey.split("|") : [];

    async function ensureAuth() {
      const u = readStoredUser();
      const access = sessionStorage.getItem("tm_access_token");
      const refresh = sessionStorage.getItem("tm_refresh_token");

      if (!u) {
        clearAuth();
        router.replace("/login");
        return;
      }

      if (!access && refresh) {
        try {
          const refreshed = await refreshSession(refresh);
          persistAuth(refreshed);
        } catch {
          clearAuth();
          router.replace("/login");
          return;
        }
      } else if (!access) {
        clearAuth();
        router.replace("/login");
        return;
      }

      // Ensure the current access token is truly valid before enabling protected pages.
      // If it has expired, refresh once and retry /me.
      try {
        await fetchMe();
      } catch {
        if (!refresh) {
          clearAuth();
          router.replace("/login");
          return;
        }
        try {
          const refreshed = await refreshSession(refresh);
          persistAuth(refreshed);
          await fetchMe();
        } catch {
          clearAuth();
          router.replace("/login");
          return;
        }
      }

      const nextUser = readStoredUser();
      if (!nextUser) {
        clearAuth();
        router.replace("/login");
        return;
      }
      if (nextUser.must_change_password) {
        router.replace("/change-password");
        return;
      }
      if (resolvedRoles.length && !resolvedRoles.includes(nextUser.role)) {
        router.replace("/");
        return;
      }
      if (!cancelled) {
        setUser((prev) => (prev?.id === nextUser.id && prev.role === nextUser.role && prev.org_id === nextUser.org_id ? prev : nextUser));
        setReady(true);
      }
    }

    void ensureAuth();

    return () => {
      cancelled = true;
    };
  }, [rolesKey]);

  return { user, ready };
}
