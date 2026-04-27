"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeApi } from "@/lib/api";
import { InviteEmployeeForm } from "@/components/hr/InviteEmployeeForm";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cardSurfaceClass, formInputClass } from "@/lib/ui";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import Link from "next/link";
import { Eye } from "lucide-react";

type Emp = {
  id: string;
  email: string;
  full_name: string;
  job_title?: string | null;
  notes?: string | null;
  project_status?: string;
  invitation_status?: string;
  employment_status: string;
  resume_url?: string | null;
};

export default function HrEmployeesPage() {
  const { ready, user } = useRequireAuth(["org_admin", "hr_manager", "manager"]);
  const orgId = user?.org_id;
  const hasAccessToken = typeof window !== "undefined" && Boolean(sessionStorage.getItem("tm_access_token"));
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => {
      const { data: rows } = await employeeApi.list({ limit: 100 });
      return rows as Emp[];
    },
    enabled: ready && Boolean(orgId) && hasAccessToken,
  });

  if (!ready) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Employees</h1>
      
      <div className={cardSurfaceClass + " p-4 shadow-sm"}>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-tw-text">Add employee</h2>
        {orgId ? <InviteEmployeeForm orgId={orgId} /> : <p className="text-sm text-slate-500 dark:text-tw-muted">Missing organization context.</p>}
      </div>

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
                <th className="px-4 py-3">Resume</th>
                <th className="px-4 py-3">Invitation status</th>
                <th className="px-4 py-3">Project status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-tw-border">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-slate-500 dark:text-tw-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading &&
                (data ?? []).map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-tw-raised transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-tw-text">{e.full_name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-tw-muted">{e.email}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-tw-muted">{e.job_title ?? "—"}</td>
                    <td className="px-4 py-3">
                      {e.resume_url ? (
                        <a 
                          href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}${e.resume_url}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:underline flex items-center gap-1 text-xs"
                        >
                          View PDF
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Not uploaded</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        e.invitation_status === 'invited' 
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {e.invitation_status ?? "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        e.project_status === 'allocated' 
                          ? 'bg-brand-100 text-brand-700 dark:bg-tw-blue/20 dark:text-tw-blue' 
                          : 'bg-slate-100 text-slate-600 dark:bg-tw-raised dark:text-tw-muted'
                      }`}>
                        {e.project_status ?? "bench"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/hr/employees/${e.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-brand-600 hover:bg-brand-50">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <DeleteEmployeeAction employee={e} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["employees"] })} />
                      </div>
                    </td>
                  </tr>
                ))}
              {!isLoading && isError && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-red-600 dark:text-red-400">
                    Could not load employees. Please sign in again.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DeleteEmployeeAction({ employee, onSuccess }: { employee: Emp, onSuccess: () => void }) {
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");

  const deleteMutation = useMutation({
    mutationFn: async (force: boolean) => {
      const { data } = await employeeApi.delete(employee.id, force);
      return data;
    },
    onSuccess: (data) => {
      if (data.warning === "assigned_to_projects") {
        setWarningMsg(data.message);
        setShowWarning(true);
      } else {
        toast.success(`Employee ${employee.full_name} deleted successfully`);
        onSuccess();
        setShowWarning(false);
      }
    },
    onError: () => {
      toast.error("Failed to delete employee");
    }
  });

  if (showWarning) {
    return (
      <div className="flex items-center justify-end gap-2 animate-in slide-in-from-right-2">
        <div className="flex flex-col items-end mr-2">
           <span className="text-[10px] text-red-600 font-bold flex items-center gap-1 uppercase">
             <AlertTriangle className="h-3 w-3" /> Assigned to Projects
           </span>
           <span className="text-[9px] text-slate-500 dark:text-tw-muted">Remove from all projects?</span>
        </div>
        <Button 
          variant="destructive" 
          size="sm" 
          className="h-7 text-[10px] px-2"
          onClick={() => deleteMutation.mutate(true)}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm Delete"}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-[10px] px-2"
          onClick={() => setShowWarning(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      onClick={() => {
        if (confirm(`Are you sure you want to delete ${employee.full_name}?`)) {
          deleteMutation.mutate(false);
        }
      }}
      disabled={deleteMutation.isPending}
    >
      {deleteMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
