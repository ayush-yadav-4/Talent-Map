"use client";

import { useQuery } from "@tanstack/react-query";
import { employeeApi } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cardSurfaceClass, formInputClass } from "@/lib/ui";

type Emp = {
  id: string;
  email: string;
  full_name: string;
  job_title?: string | null;
  employment_status: string;
};

export default function HrEmployeesPage() {
  const { ready } = useRequireAuth(["org_admin", "hr_manager", "manager"]);
  const { data, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data: rows } = await employeeApi.list({ limit: 100 });
      return rows as Emp[];
    },
    enabled: ready,
  });

  if (!ready) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Employees</h1>
      <div className={cardSurfaceClass + " overflow-hidden shadow-sm"}>
        <div className="border-b border-slate-200 px-4 py-3 dark:border-tw-border">
          <input className={formInputClass + " max-w-sm"} placeholder="Search coming soon" disabled />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-tw-dim dark:text-tw-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Job title</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-slate-500 dark:text-tw-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading &&
                (data ?? []).map((e) => (
                  <tr key={e.id} className="border-t border-slate-100 dark:border-tw-border">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-tw-text">{e.full_name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-tw-muted">{e.email}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-tw-muted">{e.job_title ?? "—"}</td>
                    <td className="px-4 py-3 capitalize text-slate-600 dark:text-tw-muted">{e.employment_status}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
