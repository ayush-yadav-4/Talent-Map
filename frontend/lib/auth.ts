import type { AuthUser } from "@/lib/api";
import { clearAuth } from "@/lib/api";

export const HR_ROLES = ["org_admin", "hr_manager", "manager"] as const;
export const EMPLOYEE_PORTAL_ROLES = ["employee", "manager"] as const;

export type AuthPortal = "hr" | "employee" | "any";

export function isHrRole(role: string): boolean {
  return (HR_ROLES as readonly string[]).includes(role);
}

export function isEmployeePortalRole(role: string): boolean {
  return (EMPLOYEE_PORTAL_ROLES as readonly string[]).includes(role);
}

/** Default home route after a successful session check. */
export function homePathForUser(user: AuthUser): string {
  if (user.must_change_password) return "/change-password";
  if (!user.onboarding_completed) {
    if (user.role === "employee") {
      const step = Math.min(4, Math.max(1, user.onboarding_step || 1));
      return `/employee/onboarding/step${step}`;
    }
    if (isHrRole(user.role)) {
      const step = Math.min(5, Math.max(2, user.onboarding_step || 2));
      return `/hr/onboarding/step${step}`;
    }
  }
  if (user.role === "employee") return "/employee/dashboard";
  if (isHrRole(user.role)) return "/hr/dashboard";
  return "/login";
}

export function loginPathForPortal(portal: AuthPortal): string {
  return portal === "employee" ? "/employee/login" : "/login";
}

export function loginPathForPathname(pathname: string): string {
  if (pathname.startsWith("/employee")) return "/employee/login";
  return "/login";
}

export function portalForPathname(pathname: string): AuthPortal {
  if (pathname.startsWith("/employee")) return "employee";
  if (pathname.startsWith("/hr")) return "hr";
  return "any";
}

/** Where to send a user who hit the wrong portal for their role. */
export function wrongPortalRedirect(user: AuthUser, requiredPortal: AuthPortal): string {
  if (requiredPortal === "hr" && user.role === "employee") {
    return "/employee/dashboard";
  }
  if (requiredPortal === "employee" && isHrRole(user.role) && user.role !== "manager") {
    return "/hr/dashboard";
  }
  return homePathForUser(user);
}

export function redirectToLogin(pathname?: string, message?: string): void {
  if (typeof window === "undefined") return;
  const path = pathname ?? window.location.pathname;
  const login = loginPathForPathname(path);
  if (message) {
    sessionStorage.setItem("tm_auth_message", message);
  }
  const returnTo = path && !path.startsWith("/login") && path !== "/employee/login" ? path : "";
  if (returnTo) {
    sessionStorage.setItem("tm_return_to", returnTo);
  }
  clearAuth();
  const qs = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
  window.location.href = `${login}${qs}`;
}

export function consumeAuthMessage(): string | null {
  if (typeof window === "undefined") return null;
  const msg = sessionStorage.getItem("tm_auth_message");
  sessionStorage.removeItem("tm_auth_message");
  return msg;
}

export function consumeReturnTo(): string | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("tm_return_to") ?? new URLSearchParams(window.location.search).get("returnTo");
  sessionStorage.removeItem("tm_return_to");
  if (!raw || !raw.startsWith("/")) return null;
  return raw;
}
