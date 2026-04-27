"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Plus, Trash2, FileText } from "lucide-react";

import { Button, Input } from "@/components/ui";
import { api, employeeApi, orgApi, readStoredUser } from "@/lib/api";
import { cardSurfaceClass, formInputClass, formLabelClass } from "@/lib/ui";

type TeamMemberRow = { employee_id: string; position: string };
type EmployeeOption = { id: string; full_name: string; email: string; job_title?: string | null };

const STAGE_OPTIONS = [
  "Discovery",
  "Planning",
  "Design",
  "Development",
  "Testing",
  "UAT",
  "Deployment",
  "Maintenance",
];

export default function NewHrProjectPage() {
  const router = useRouter();
  const user = readStoredUser();
  const orgId = user?.org_id;

  const [form, setForm] = useState({
    name: "",
    code: "",
    client_name: "",
    client_email: "",
    description: "",
    project_type: "external",
    priority: "medium",
    status: "planning",
    start_date: "",
    end_date: "",
    deadline: "",
    budget: "",
    currency: "USD",
    delivery_model: "hybrid",
    tech_stack: "",
    jd_id: "",
    stage: "Planning",
    stages: ["Planning"] as string[],
    delivery_notes: "",
  });
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [teamRows, setTeamRows] = useState<TeamMemberRow[]>([{ employee_id: "", position: "member" }]);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-project-form"],
    queryFn: async () => {
      const { data } = await employeeApi.list({ limit: 300 });
      return (data as EmployeeOption[]).filter((e) => e?.id && e?.full_name);
    },
    enabled: Boolean(orgId),
  });

  const { data: jds = [] } = useQuery({
    queryKey: ["project-form-jds"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/job-descriptions/");
      return data as Array<{ id: string; title: string; domain?: string | null }>;
    },
    enabled: Boolean(orgId),
  });

  const employeeOptions = useMemo(
    () => [...employees].sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [employees]
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Organization not found");

      const extraNotes = [
        form.delivery_notes.trim(),
        form.client_email.trim() ? `Client Email: ${form.client_email.trim()}` : "",
        agreementFile ? `Agreement (reference): ${agreementFile.name}` : "",
        `Project Stage: ${form.stage}`,
        form.stages.length ? `Lifecycle Stages: ${form.stages.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        client_name: form.client_name.trim() || undefined,
        description: form.description.trim() || undefined,
        project_type: form.project_type.trim() || undefined,
        status: form.status,
        priority: form.priority,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        deadline: form.deadline || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        currency: form.currency.trim() || undefined,
        delivery_model: form.delivery_model.trim() || undefined,
        tech_stack: form.tech_stack.trim() || undefined,
        jd_id: form.jd_id || undefined,
        delivery_notes: extraNotes || undefined,
      };

      const { data: created } = await orgApi.createProject(orgId, payload);
      const projectId = String(created?.id);
      if (!projectId) throw new Error("Project creation response missing id");

      const validAssignments = teamRows
        .map((row) => ({ employee_id: row.employee_id.trim(), position: row.position.trim() || "member" }))
        .filter((row) => row.employee_id);

      const uniqueIds = new Set(validAssignments.map((row) => row.employee_id));
      if (uniqueIds.size !== validAssignments.length) {
        throw new Error("Duplicate team members found. Keep each employee only once.");
      }

      for (const assignment of validAssignments) {
        await orgApi.assignProjectMember(orgId, projectId, assignment);
      }
    },
    onSuccess: () => {
      toast.success("Project created successfully");
      router.push("/hr/projects");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Could not create project";
      toast.error(message);
    },
  });

  const toggleStage = (stage: string) => {
    setForm((prev) => {
      const exists = prev.stages.includes(stage);
      const nextStages = exists ? prev.stages.filter((s) => s !== stage) : [...prev.stages, stage];
      return { ...prev, stages: nextStages.length ? nextStages : [prev.stage] };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Create New Project</h1>
          <p className="text-sm text-slate-500 dark:text-tw-muted mt-1">Set project details, assign team members, and capture delivery context.</p>
        </div>
        <Link href="/hr/projects">
          <Button variant="ghost" size="icon" aria-label="Close create project page">
            <X className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <section className={cardSurfaceClass + " p-6 space-y-6"}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={formLabelClass}>Project Name *</label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
          <div><label className={formLabelClass}>Project Code</label><Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} /></div>
          <div><label className={formLabelClass}>Client Name</label><Input value={form.client_name} onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))} /></div>
          <div><label className={formLabelClass}>Client Email</label><Input type="email" value={form.client_email} onChange={(e) => setForm((p) => ({ ...p, client_email: e.target.value }))} /></div>
          <div><label className={formLabelClass}>Project Type</label><Input value={form.project_type} onChange={(e) => setForm((p) => ({ ...p, project_type: e.target.value }))} /></div>
          <div><label className={formLabelClass}>Priority</label><select className={formInputClass} value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
          <div><label className={formLabelClass}>Stage</label><select className={formInputClass} value={form.stage} onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value }))}>{STAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className={formLabelClass}>Status</label><select className={formInputClass} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}><option value="planning">Planning</option><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option></select></div>
          <div><label className={formLabelClass}>Start Date</label><Input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} /></div>
          <div><label className={formLabelClass}>End Date</label><Input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} /></div>
          <div><label className={formLabelClass}>Deadline</label><Input type="date" value={form.deadline} onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))} /></div>
          <div><label className={formLabelClass}>Delivery Model</label><Input value={form.delivery_model} onChange={(e) => setForm((p) => ({ ...p, delivery_model: e.target.value }))} /></div>
          <div><label className={formLabelClass}>Budget</label><Input type="number" min={0} value={form.budget} onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))} /></div>
          <div><label className={formLabelClass}>Currency</label><Input value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} /></div>
          <div className="md:col-span-2"><label className={formLabelClass}>Linked JD (Optional)</label><select className={formInputClass} value={form.jd_id} onChange={(e) => setForm((p) => ({ ...p, jd_id: e.target.value }))}><option value="">None</option>{jds.map((jd) => <option key={jd.id} value={jd.id}>{jd.title}{jd.domain ? ` (${jd.domain})` : ""}</option>)}</select></div>
          <div className="md:col-span-2"><label className={formLabelClass}>Tech Stack</label><Input value={form.tech_stack} onChange={(e) => setForm((p) => ({ ...p, tech_stack: e.target.value }))} placeholder="React, FastAPI, PostgreSQL..." /></div>
          <div className="md:col-span-2"><label className={formLabelClass}>Description</label><textarea className={formInputClass + " min-h-[110px] py-3"} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
        </div>

        <div>
          <label className={formLabelClass}>Lifecycle Stages</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {STAGE_OPTIONS.map((stage) => (
              <button key={stage} type="button" onClick={() => toggleStage(stage)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${form.stages.includes(stage) ? "bg-brand-50 border-brand-300 text-brand-700" : "bg-white border-slate-200 text-slate-600 dark:bg-tw-card dark:border-tw-border dark:text-tw-muted"}`}>
                {stage}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={formLabelClass}>Agreement PDF (Reference Only)</label>
          <div className="flex items-center gap-3 mt-2">
            <Input type="file" accept="application/pdf" onChange={(e) => setAgreementFile(e.target.files?.[0] ?? null)} />
            {agreementFile && <span className="text-xs text-slate-500 flex items-center gap-1"><FileText className="h-3 w-3" /> {agreementFile.name}</span>}
          </div>
        </div>

        <div>
          <label className={formLabelClass}>Project Notes</label>
          <textarea className={formInputClass + " min-h-[90px] py-3"} value={form.delivery_notes} onChange={(e) => setForm((p) => ({ ...p, delivery_notes: e.target.value }))} placeholder="Milestones, risks, dependencies, SLA notes..." />
        </div>
      </section>

      <section className={cardSurfaceClass + " p-6 space-y-4"}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-tw-text">Team Assignment & Designation</h2>
          <Button type="button" variant="outline" onClick={() => setTeamRows((prev) => [...prev, { employee_id: "", position: "member" }])}><Plus className="h-4 w-4 mr-1" /> Add Employee</Button>
        </div>

        <div className="space-y-3">
          {teamRows.map((row, idx) => (
            <div key={`team-${idx}`} className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3 items-end">
              <div>
                <label className={formLabelClass}>Employee</label>
                <select className={formInputClass} value={row.employee_id} onChange={(e) => setTeamRows((prev) => prev.map((r, i) => (i === idx ? { ...r, employee_id: e.target.value } : r)))}>
                  <option value="">Select employee</option>
                  {employeeOptions.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.email})</option>)}
                </select>
              </div>
              <div><label className={formLabelClass}>Designation In Project</label><Input value={row.position} onChange={(e) => setTeamRows((prev) => prev.map((r, i) => (i === idx ? { ...r, position: e.target.value } : r)))} placeholder="Lead / Developer / QA / PM" /></div>
              <Button type="button" variant="ghost" className="text-red-600" onClick={() => setTeamRows((prev) => prev.filter((_, i) => i !== idx))} disabled={teamRows.length === 1}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 pb-2">
        <Link href="/hr/projects"><Button variant="outline">Cancel</Button></Link>
        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name.trim()} className="bg-brand-600 hover:bg-brand-700 text-white">
          {createMutation.isPending ? "Creating Project..." : "Create Project"}
        </Button>
      </div>
    </div>
  );
}
