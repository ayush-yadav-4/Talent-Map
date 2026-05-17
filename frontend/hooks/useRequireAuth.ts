"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  homePathForUser,
  loginPathForPortal,
  portalForPathname,
  wrongPortalRedirect,
  type AuthPortal,
} from "@/lib/auth";
import {
  clearAuth,
  fetchMe,
  persistAuth,
  readStoredUser,
  refreshSession,
  type AuthUser,
} from "@/lib/api";

export type UseRequireAuthOptions = {
  /** When set, user must have one of these roles. */
  allowedRoles?: string[];
  /** Portal guard: HR routes reject employees; employee routes reject org admins. */
  portal?: AuthPortal;
  /** Allow /change-password while must_change_password is true. */
  skipPasswordChangeRedirect?: boolean;
  /** Override login redirect (default derived from current path). */
  loginPath?: string;
};

export function useRequireAuth(
  allowedRolesOrOptions?: string[] | UseRequireAuthOptions,
  legacyOptions?: UseRequireAuthOptions,
): { user: AuthUser | null; ready: boolean } {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const options: UseRequireAuthOptions = Array.isArray(allowedRolesOrOptions)
    ? { ...legacyOptions, allowedRoles: allowedRolesOrOptions }
    : (allowedRolesOrOptions ?? {});
  const { allowedRoles, skipPasswordChangeRedirect, loginPath: loginPathOverride } = options;
  const portal = options.portal ?? portalForPathname(pathname ?? "");
  const rolesKey = allowedRoles?.join("|") ?? "";
  const loginPath = loginPathOverride ?? loginPathForPortal(portal === "any" ? "hr" : portal);

  useEffect(() => {
    let cancelled = false;

    async function ensureAuth() {
      const stored = readStoredUser();
      const access = sessionStorage.getItem("tm_access_token");
      const refresh = sessionStorage.getItem("tm_refresh_token");

      if (!stored) {
        clearAuth();
        router.replace(loginPath);
        return;
      }

      if (!access && refresh) {
        try {
          const refreshed = await refreshSession(refresh);
          persistAuth(refreshed);
        } catch {
          clearAuth();
          router.replace(loginPath);
          return;
        }
      } else if (!access) {
        clearAuth();
        router.replace(loginPath);
        return;
      }

      let nextUser: AuthUser;
      try {
        nextUser = await fetchMe();
      } catch {
        if (!refresh) {
          clearAuth();
          router.replace(loginPath);
          return;
        }
        try {
          const refreshed = await refreshSession(refresh);
          persistAuth(refreshed);
          nextUser = await fetchMe();
        } catch {
          clearAuth();
          router.replace(loginPath);
          return;
        }
      }

      if (!skipPasswordChangeRedirect && nextUser.must_change_password) {
        router.replace("/change-password");
        return;
      }

      if (allowedRoles?.length && !allowedRoles.includes(nextUser.role)) {
        router.replace(wrongPortalRedirect(nextUser, portal));
        return;
      }

      if (portal === "hr" && nextUser.role === "employee") {
        router.replace("/employee/dashboard");
        return;
      }
      if (portal === "employee" && nextUser.role === "org_admin") {
        router.replace("/hr/dashboard");
        return;
      }
      if (portal === "employee" && nextUser.role === "hr_manager") {
        router.replace("/hr/dashboard");
        return;
      }

      if (!cancelled) {
        setUser((prev) =>
          prev?.id === nextUser.id && prev.role === nextUser.role && prev.org_id === nextUser.org_id
            ? prev
            : nextUser,
        );
        setReady(true);
      }
    }

    void ensureAuth();

    return () => {
      cancelled = true;
    };
  }, [rolesKey, loginPath, portal, skipPasswordChangeRedirect, router]);

  return { user, ready };
}

/** Validate session on public login pages; redirect home if already signed in. */
export function useRedirectIfAuthenticated(targetLoginPath: "/login" | "/employee/login"): {
  checking: boolean;
} {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const stored = readStoredUser();
      const access = sessionStorage.getItem("tm_access_token");
      const refresh = sessionStorage.getItem("tm_refresh_token");

      if (!stored || (!access && !refresh)) {
        if (!cancelled) setChecking(false);
        return;
      }

      try {
        let user: AuthUser;
        if (!access && refresh) {
          const refreshed = await refreshSession(refresh);
          persistAuth(refreshed);
          user = refreshed.user;
        } else {
          user = await fetchMe();
        }
        if (!cancelled) {
          router.replace(homePathForUser(user));
        }
      } catch {
        clearAuth();
        if (!cancelled) setChecking(false);
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [router, targetLoginPath]);

  return { checking };
}
