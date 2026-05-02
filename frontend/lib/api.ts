import axios, { type AxiosInstance } from "axios";

/**
 * Dev (browser): same-origin (`""`) → Next.js rewrites `/api/v1/*` to FastAPI (see next.config.mjs).
 * Production (browser): `NEXT_PUBLIC_API_URL` origin when set; else same-origin + rewrite.
 * SSR: `INTERNAL_API_URL` or http://127.0.0.1:8000
 */
function resolveApiBaseUrl(): string {
  if (typeof window === "undefined") {
    const internal = process.env.INTERNAL_API_URL || "http://127.0.0.1:8000";
    return internal.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "development") {
    return "";
  }
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (raw == null || String(raw).trim() === "") {
    return "";
  }
  try {
    return new URL(String(raw).trim()).origin;
  } catch {
    return "";
  }
}

const baseURL = resolveApiBaseUrl();

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

let refreshInFlight: Promise<TokenResponse> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config as { _retry?: boolean; headers?: Record<string, string>; url?: string } | undefined;
    if (typeof window === "undefined" || !originalRequest) {
      return Promise.reject(error);
    }
    const requestUrl = String(originalRequest?.url ?? "");
    if (error?.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (requestUrl.includes("/api/v1/auth/refresh")) {
      clearAuth();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = sessionStorage.getItem("tm_refresh_token");
    if (!refreshToken) {
      clearAuth();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshInFlight) {
        refreshInFlight = axios
          .post<TokenResponse>(`${baseURL || ""}/api/v1/auth/refresh`, { refresh_token: refreshToken })
          .then((res) => res.data)
          .finally(() => {
            refreshInFlight = null;
          });
      }
      const refreshed = await refreshInFlight;
      persistAuth(refreshed);
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${refreshed.access_token}`;
      return api.request(originalRequest);
    } catch (refreshError) {
      clearAuth();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    }
  },
);

export type AuthUser = {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
  org_id: string;
  employee_id?: string | null;
  onboarding_completed: boolean;
  onboarding_step: number;
  must_change_password: boolean;
};

export type OrgStructureNode = {
  department: { id: string; name: string; code?: string | null };
  roles: { id: string; title: string; seniority_level?: string | null }[];
  employees: { id: string; full_name: string; email: string; job_title?: string | null }[];
};

export type DepartmentPayload = {
  name: string;
  code?: string;
  description?: string;
  color?: string;
  parent_dept_id?: string;
};

export type RolePayload = {
  title: string;
  seniority_level: string;
  dept_id?: string;
};

export type ProjectPayload = {
  name: string;
  code?: string;
  client_name?: string;
  description?: string;
  project_type?: string;
  status?: string;
  priority?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  currency?: string;
  delivery_model?: string;
  tech_stack?: string;
  jd_id?: string;
  deadline?: string;
  delivery_notes?: string;
};

export type ProjectAssignPayload = {
  employee_id: string;
  position: string;
};

export type OrganizationUpdatePayload = {
  name?: string;
  domain?: string;
  country?: string;
  state?: string;
  sub_sector?: string;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: AuthUser;
};

type InviteEmployeeResponse = {
  employee_id: string;
  temp_password: string;
  email_sent: boolean;
  email_error?: string | null;
  message: string;
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
  update: (orgId: string, body: OrganizationUpdatePayload) => api.put(`/api/v1/organizations/${orgId}`, body),
  getStructure: (orgId: string) => api.get<{ departments: OrgStructureNode[] }>(`/api/v1/organizations/${orgId}/structure`),
  setupStep2: (orgId: string, body: { departments: unknown[] }) =>
    api.post(`/api/v1/organizations/${orgId}/setup/step2`, body),
  setupStep3: (orgId: string, body: { roles?: unknown[]; role_titles?: string[] }) =>
    api.post(`/api/v1/organizations/${orgId}/setup/step3`, body),
  setupStep4: (orgId: string, body: Record<string, unknown>) =>
    api.post(`/api/v1/organizations/${orgId}/setup/step4`, body),
  completeOnboarding: (orgId: string) => api.post(`/api/v1/organizations/${orgId}/setup/complete`),
  getDepartments: (orgId: string) => api.get(`/api/v1/organizations/${orgId}/departments`),
  createDepartment: (orgId: string, body: DepartmentPayload) => api.post(`/api/v1/organizations/${orgId}/departments`, body),
  updateDepartment: (orgId: string, departmentId: string, body: DepartmentPayload) =>
    api.put(`/api/v1/organizations/${orgId}/departments/${departmentId}`, body),
  deleteDepartment: (orgId: string, departmentId: string) => api.delete(`/api/v1/organizations/${orgId}/departments/${departmentId}`),
  createRole: (orgId: string, body: RolePayload) => api.post(`/api/v1/organizations/${orgId}/roles`, body),
  updateRole: (orgId: string, roleId: string, body: RolePayload) => api.put(`/api/v1/organizations/${orgId}/roles/${roleId}`, body),
  deleteRole: (orgId: string, roleId: string) => api.delete(`/api/v1/organizations/${orgId}/roles/${roleId}`),
  listProjects: (orgId: string) => api.get(`/api/v1/organizations/${orgId}/projects`),
  getProject: (orgId: string, projectId: string) => api.get(`/api/v1/organizations/${orgId}/projects/${projectId}`),
  createProject: (orgId: string, body: ProjectPayload) => api.post(`/api/v1/organizations/${orgId}/projects`, body),
  updateProject: (orgId: string, projectId: string, body: ProjectPayload) =>
    api.put(`/api/v1/organizations/${orgId}/projects/${projectId}`, body),
  assignProjectMember: (orgId: string, projectId: string, body: ProjectAssignPayload) =>
    api.post(`/api/v1/organizations/${orgId}/projects/${projectId}/assignments`, body),
  removeProjectMember: (orgId: string, projectId: string, employeeId: string) =>
    api.delete(`/api/v1/organizations/${orgId}/projects/${projectId}/assignments/${employeeId}`),
  inviteEmployee: (
    orgId: string,
    body: { email: string; full_name: string; job_title?: string; notes?: string; role: string },
  ) => api.post<InviteEmployeeResponse>(`/api/v1/organizations/${orgId}/invite-employee`, body),
};

export const employeeApi = {
  list: (params?: Record<string, unknown>) => api.get("/api/v1/employees/", { params }),
  create: (body: Record<string, unknown>) => api.post("/api/v1/employees/", body),
  get: (id: string) => api.get(`/api/v1/employees/${id}`),
  update: (id: string, body: Record<string, unknown>) => api.put(`/api/v1/employees/${id}`, body),
  getProfile: (id: string) => api.get(`/api/v1/employees/${id}/profile`),
  bulkImport: (employees: unknown[]) => api.post("/api/v1/employees/bulk-import", { employees }),
  onboardingStep1: (id: string, body: Record<string, unknown>) => api.put(`/api/v1/employees/${id}/onboarding/step1`, body),
  onboardingStep2: (id: string, body: Record<string, unknown>) => api.put(`/api/v1/employees/${id}/onboarding/step2`, body),
  onboardingStep3: (id: string, body: Record<string, unknown>) => api.put(`/api/v1/employees/${id}/onboarding/step3`, body),
  onboardingStep4: (id: string, body: Record<string, unknown>) => api.put(`/api/v1/employees/${id}/onboarding/step4`, body),
  delete: (id: string, force = false) => api.delete(`/api/v1/employees/${id}`, { params: { force } }),
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

export const agentApi = {
  role: {
    extract: (jdText: string) => api.post("/api/v1/agent/role/extract", { jd_text: jdText }),
    create: (extraction: any, deptId?: string) => api.post("/api/v1/agent/role/create", { extraction, dept_id: deptId }),
    list: () => api.get("/api/v1/agent/role/list"),
  },
  matching: {
    getMatch: (employeeId: string, roleId: string) => api.get(`/api/v1/agent/matching/employee/${employeeId}/match/${roleId}`),
    getRecommendations: (employeeId: string) => api.get(`/api/v1/agent/matching/employee/${employeeId}/recommendations`),
    getTopEmployees: (roleId: string) => api.get(`/api/v1/agent/matching/role/${roleId}/top-matches`),
  },
  learning: {
    getPath: (skillName: string, currentProf = 1.0, targetProf = 4.0) => 
      api.get(`/api/v1/agent/learning/path/${skillName}`, { params: { current_prof: currentProf, target_prof: targetProf } }),
    getCourses: (skillName: string, roleTitle: string) => 
      api.get<{ gap_courses: any[]; upgrade_courses: any[] }>(`/api/v1/agent/learning/courses/${skillName}`, { params: { role_title: roleTitle } }),
  },
  coach: {
    chat: (message: string, history: any[] = []) => api.post("/api/v1/agent/coach/chat", { message, history }),
  }
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
