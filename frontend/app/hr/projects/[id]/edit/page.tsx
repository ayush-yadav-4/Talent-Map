"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui";
import { orgApi, readStoredUser, type ProjectPayload } from "@/lib/api";
import { cardSurfaceClass, formInputClass, formLabelClass } from "@/lib/ui";

export default function HrProjectEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = readStoredUser();
  const orgId = user?.org_id;
  const projectId = String(params?.id ?? "");

  const { data: project, isLoading } = useQuery({
    queryKey: ["hr-project-edit", orgId, projectId],
    queryFn: async () => {
      const { data } = await orgApi.getProject(orgId!, projectId);
      return data as any;
    },
    enabled: Boolean(orgId && projectId),
  });

  const [form, setForm] = useState<ProjectPayload | null>(null);
  useEffect(() => {
    if (project && !form) {
      setForm({
        name: project.name ?? "",
        code: project.code ?? "",
        client_name: project.client_name ?? "",
        description: project.description ?? "",
        project_type: project.project_type ?? "",
        status: project.status ?? "planning",
        priority: project.priority ?? "",
        start_date: project.start_date ?? "",
        end_date: project.end_date ?? "",
        budget: project.budget ?? undefined,
        currency: project.currency ?? "",
        delivery_model: project.delivery_model ?? "",
        tech_stack: project.tech_stack ?? "",
        deadline: project.deadline ?? "",
        delivery_notes: project.delivery_notes ?? "",
        jd_id: project.jd_id ?? "",
      });
    }
  }, [project, form]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !form) return;
      await orgApi.updateProject(orgId, projectId, { ...form, name: (form.name || "").trim() });
    },
    onSuccess: () => {
      toast.success("Project updated");
      router.push(`/hr/projects/${projectId}`);
    },
    onError: () => toast.error("Could not update project"),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Edit Project</h1>
        <Link href={`/hr/projects/${projectId}`}><Button variant="outline">Cancel</Button></Link>
      </div>
      {isLoading && <div className={cardSurfaceClass + " p-5 text-sm text-slate-500"}>Loading project...</div>}
      {form && (
        <div className={cardSurfaceClass + " p-6 grid grid-cols-1 md:grid-cols-2 gap-4"}>
          <div><label className={formLabelClass}>Project Name</label><Input value={form.name || ""} onChange={(e) => setForm((p) => ({ ...(p as ProjectPayload), name: e.target.value }))} /></div>
          <div><label className={formLabelClass}>Code</label><Input value={form.code || ""} onChange={(e) => setForm((p) => ({ ...(p as ProjectPayload), code: e.target.value }))} /></div>
          <div><label className={formLabelClass}>Client Name</label><Input value={form.client_name || ""} onChange={(e) => setForm((p) => ({ ...(p as ProjectPayload), client_name: e.target.value }))} /></div>
          <div><label className={formLabelClass}>Status</label><select className={formInputClass} value={form.status || "planning"} onChange={(e) => setForm((p) => ({ ...(p as ProjectPayload), status: e.target.value }))}><option value="planning">Planning</option><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option></select></div>
          <div><label className={formLabelClass}>Priority</label><Input value={form.priority || ""} onChange={(e) => setForm((p) => ({ ...(p as ProjectPayload), priority: e.target.value }))} /></div>
          <div><label className={formLabelClass}>Deadline</label><Input type="date" value={form.deadline || ""} onChange={(e) => setForm((p) => ({ ...(p as ProjectPayload), deadline: e.target.value }))} /></div>
          <div className="md:col-span-2"><label className={formLabelClass}>Description</label><textarea className={formInputClass + " min-h-[110px] py-3"} value={form.description || ""} onChange={(e) => setForm((p) => ({ ...(p as ProjectPayload), description: e.target.value }))} /></div>
          <div className="md:col-span-2 flex justify-end"><Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !(form.name || "").trim()}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button></div>
        </div>
      )}
    </div>
  );
}
