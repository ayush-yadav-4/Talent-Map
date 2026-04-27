"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui";
import { orgApi, readStoredUser } from "@/lib/api";
import { cardSurfaceClass } from "@/lib/ui";

export default function EmployeeProjectViewPage() {
  const params = useParams<{ id: string }>();
  const user = readStoredUser();
  const orgId = user?.org_id;
  const projectId = String(params?.id ?? "");

  const { data: project, isLoading } = useQuery({
    queryKey: ["employee-project-view", orgId, projectId],
    queryFn: async () => (await orgApi.getProject(orgId!, projectId)).data as any,
    enabled: Boolean(orgId && projectId),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Project View</h1>
        <Link href="/employee/projects"><Button variant="outline">Back</Button></Link>
      </div>
      {isLoading && <div className={cardSurfaceClass + " p-5 text-sm text-slate-500"}>Loading project...</div>}
      {!isLoading && project && (
        <div className={cardSurfaceClass + " p-6 space-y-3"}>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-tw-text">{project.name}</h2>
          <p className="text-sm text-slate-500">{project.client_name || "Internal Project"} · {project.status}</p>
          {project.description && <p className="text-sm text-slate-700 dark:text-tw-muted">{project.description}</p>}
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span>Priority: {project.priority || "—"}</span>
            <span>Start: {project.start_date || "TBD"}</span>
            <span>End: {project.end_date || "TBD"}</span>
            <span>Deadline: {project.deadline || "TBD"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
