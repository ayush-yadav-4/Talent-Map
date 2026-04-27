"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { employeeApi, orgApi, readStoredUser } from "@/lib/api";
import { cardSurfaceClass, formInputClass, formLabelClass } from "@/lib/ui";

export default function HrProjectAddEmployeePage() {
  const params = useParams<{ id: string }>();
  const user = readStoredUser();
  const orgId = user?.org_id;
  const projectId = String(params?.id ?? "");
  const [employeeId, setEmployeeId] = useState("");
  const [position, setPosition] = useState("member");

  const { data: project } = useQuery({
    queryKey: ["hr-project-add-employee", orgId, projectId],
    queryFn: async () => (await orgApi.getProject(orgId!, projectId)).data as any,
    enabled: Boolean(orgId && projectId),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-project-assignment", orgId],
    queryFn: async () => (await employeeApi.list({ limit: 300 })).data as any[],
    enabled: Boolean(orgId),
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !employeeId) return;
      await orgApi.assignProjectMember(orgId, projectId, { employee_id: employeeId, position });
    },
    onSuccess: () => toast.success("Employee assigned to project"),
    onError: () => toast.error("Could not assign employee"),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Add Employee to Project</h1>
        <Link href={`/hr/projects/${projectId}`}><Button variant="outline">Back</Button></Link>
      </div>
      <div className={cardSurfaceClass + " p-6 space-y-4"}>
        <p className="text-sm text-slate-500">Project: <span className="font-semibold text-slate-900 dark:text-tw-text">{project?.name || "..."}</span></p>
        <div>
          <label className={formLabelClass}>Employee</label>
          <select className={formInputClass} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Select employee</option>
            {employees.map((e: any) => (
              <option key={e.id} value={e.id}>
                {e.full_name} ({e.email})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={formLabelClass}>Project Designation</label>
          <input className={formInputClass} value={position} onChange={(e) => setPosition(e.target.value)} placeholder="lead / manager / developer" />
        </div>
        <div className="flex justify-end">
          <Button onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending || !employeeId}>
            {assignMutation.isPending ? "Assigning..." : "Add Employee"}
          </Button>
        </div>
      </div>
    </div>
  );
}
