import axios, { type AxiosInstance } from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("tm_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export type AuthUser = {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
  org_id: string;
  employee_id?: string | null;
  onboarding_completed: boolean;
  onboarding_step: number;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: AuthUser;
};

export type RegisterPayload = {
  organization_name: string;
  sector: string;
  admin_email: string;
  admin_password: string;
  admin_full_name: string;
  sub_sector?: string;
  country?: string;
  state?: string;
  domain?: string;
  employee_count_range?: string;
  primary_use_case?: string;
  primary_use_cases?: string[];
  admin_designation?: string;
  admin_phone?: string;
};

export async function registerOrganization(payload: RegisterPayload): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/api/v1/auth/register", payload);
  return data;
}

export type LoginPayload = { email: string; password: string };

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/api/v1/auth/login", payload);
  return data;
}

export async function refreshSession(refreshToken: string): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/api/v1/auth/refresh", { refresh_token: refreshToken });
  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>("/api/v1/auth/me");
  return data;
}

export const orgApi = {
  get: (orgId: string) => api.get(`/api/v1/organizations/${orgId}`),
  setupStep2: (orgId: string, body: { departments: unknown[] }) =>
    api.post(`/api/v1/organizations/${orgId}/setup/step2`, body),
  setupStep3: (orgId: string, body: { roles?: unknown[]; role_titles?: string[] }) =>
    api.post(`/api/v1/organizations/${orgId}/setup/step3`, body),
  setupStep4: (orgId: string, body: Record<string, unknown>) =>
    api.post(`/api/v1/organizations/${orgId}/setup/step4`, body),
  completeOnboarding: (orgId: string) => api.post(`/api/v1/organizations/${orgId}/setup/complete`),
  getDepartments: (orgId: string) => api.get(`/api/v1/organizations/${orgId}/departments`),
  inviteEmployee: (orgId: string, body: { email: string; full_name: string; job_title?: string; role: string }) =>
    api.post(`/api/v1/organizations/${orgId}/invite-employee`, body),
};

export const employeeApi = {
  list: (params?: Record<string, unknown>) => api.get("/api/v1/employees", { params }),
  create: (body: Record<string, unknown>) => api.post("/api/v1/employees", body),
  get: (id: string) => api.get(`/api/v1/employees/${id}`),
  update: (id: string, body: Record<string, unknown>) => api.put(`/api/v1/employees/${id}`, body),
  getProfile: (id: string) => api.get(`/api/v1/employees/${id}/profile`),
  bulkImport: (employees: unknown[]) => api.post("/api/v1/employees/bulk-import", { employees }),
  onboardingStep1: (id: string, body: Record<string, unknown>) => api.put(`/api/v1/employees/${id}/onboarding/step1`, body),
  onboardingStep2: (id: string, body: Record<string, unknown>) => api.put(`/api/v1/employees/${id}/onboarding/step2`, body),
  onboardingStep3: (id: string, body: Record<string, unknown>) => api.put(`/api/v1/employees/${id}/onboarding/step3`, body),
  onboardingStep4: (id: string, body: Record<string, unknown>) => api.put(`/api/v1/employees/${id}/onboarding/step4`, body),
};

export const skillApi = {
  search: (q: string) => api.get("/api/v1/skills/search", { params: { q } }),
  byRole: (title: string) => api.get("/api/v1/skills/by-role", { params: { title } }),
};

export const reportApi = {
  hrDashboard: () => api.get("/api/v1/reports/hr/dashboard"),
  hrDashboardStats: () => api.get("/api/v1/reports/hr/dashboard-stats"),
  employeeDashboard: (employeeId: string) => api.get(`/api/v1/reports/employee/dashboard-stats/${employeeId}`),
};

export function persistAuth(tokens: TokenResponse) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("tm_access_token", tokens.access_token);
  sessionStorage.setItem("tm_refresh_token", tokens.refresh_token);
  sessionStorage.setItem("tm_user", JSON.stringify(tokens.user));
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("tm_access_token");
  sessionStorage.removeItem("tm_refresh_token");
  sessionStorage.removeItem("tm_user");
}

export function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("tm_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}
