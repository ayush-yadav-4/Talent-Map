"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui";
import { orgApi, readStoredUser } from "@/lib/api";
import { cardSurfaceClass } from "@/lib/ui";

export default function HrProjectViewPage() {
  const params = useParams<{ id: string }>();
  const user = readStoredUser();
  const orgId = user?.org_id;
  const projectId = String(params?.id ?? "");

  const { data: project, isLoading } = useQuery({
    queryKey: ["hr-project", orgId, projectId],
    queryFn: async () => {
      const { data } = await orgApi.getProject(orgId!, projectId);
      return data as any;
    },
    enabled: Boolean(orgId && projectId),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Project Details</h1>
        <div className="flex gap-2">
          <Link href="/hr/projects"><Button variant="outline">Back</Button></Link>
          <Link href={`/hr/projects/${projectId}/edit`}><Button>Edit</Button></Link>
          <Link href={`/hr/projects/${projectId}/add-employee`}><Button variant="outline">Add Employee</Button></Link>
        </div>
      </div>

      {isLoading && <div className={cardSurfaceClass + " p-5 text-sm text-slate-500"}>Loading project...</div>}
      {!isLoading && project && (
        <div className={cardSurfaceClass + " p-6 space-y-4"}>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-tw-text">{project.name}</h2>
            <p className="text-sm text-slate-500">{project.client_name || "Internal Project"} · {project.status}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <p><span className="font-semibold">Code:</span> {project.code || "—"}</p>
            <p><span className="font-semibold">Priority:</span> {project.priority || "—"}</p>
            <p><span className="font-semibold">Deadline:</span> {project.deadline || "—"}</p>
          </div>
          {project.description && <p className="text-sm text-slate-700 dark:text-tw-muted">{project.description}</p>}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-tw-text mb-2">Assigned Employees</h3>
            {!project.assignments?.length && <p className="text-sm text-slate-500">No employees assigned yet.</p>}
            <div className="space-y-2">
              {(project.assignments || []).map((a: any) => (
                <div key={a.employee_id} className="rounded-lg border border-slate-200 p-2 text-sm dark:border-tw-border">
                  {a.employee_name} ({a.employee_email}) - {a.position || "member"}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
