"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, orgApi, readStoredUser } from "@/lib/api";
import { 
  FolderKanban, 
  Plus, 
  Calendar, 
  User, 
  Settings, 
  Loader2, 
  Clock,
  Briefcase,
  Link as LinkIcon,
  CheckCircle2,
  Eye,
  Pencil,
  UserPlus,
  FileText,
  Timer
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { cardSurfaceClass, formInputClass } from "@/lib/ui";
import { toast } from "sonner";

export default function HRProjectsPage() {
  const [isAdding, setIsAdding] = useState(false);
  const user = readStoredUser();
  const orgId = user?.org_id;
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["hr-projects", orgId],
    queryFn: async () => {
      const { data } = await orgApi.listProjects(orgId!);
      return data as any[];
    },
    enabled: !!orgId
  });

  const { data: jds } = useQuery({
    queryKey: ["job-descriptions"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/job-descriptions/");
      return data as any[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      await api.post(`/api/v1/organizations/${orgId}/projects`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-projects"] });
      setIsAdding(false);
      toast.success("Project created successfully!");
    }
  });

  const [newProject, setNewProject] = useState({
    name: "",
    code: "",
    client_name: "",
    description: "",
    status: "planning",
    jd_id: "",
    deadline: "",
    delivery_notes: ""
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Projects</h1>
          <p className="text-sm text-slate-500 dark:text-tw-muted mt-1">Manage active projects and assign roles from your JD library.</p>
        </div>
        <Link href="/hr/projects/new">
          <Button className="bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {projects?.map((project: any) => (
            <div key={project.id} className={cn(cardSurfaceClass, "p-6 flex flex-col group hover:border-brand-200 transition-all")}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-tw-text text-lg">{project.name}</h3>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-tw-raised rounded text-[10px] font-bold text-slate-500">{project.code}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{project.client_name || "Internal Project"}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm",
                    project.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : 
                    project.status === "paused" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
                    project.status === "completed" ? "bg-brand-100 text-brand-700 dark:bg-tw-blue/20 dark:text-tw-blue" :
                    "bg-slate-100 text-slate-500 dark:bg-tw-raised dark:text-tw-muted"
                  )}>
                    {project.status === "active" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {project.status}
                  </div>
                  {project.deadline && (
                    <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                      <Timer className="h-3 w-3" /> {new Date(project.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="mt-4 flex-1">
                <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{project.description}</p>
                {project.delivery_notes && (
                  <div className="mt-2 p-2 bg-slate-50 dark:bg-tw-raised rounded-lg text-[11px] text-slate-500 dark:text-tw-muted italic border-l-2 border-slate-200 dark:border-tw-border">
                    &quot;{project.delivery_notes}&quot;
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-tw-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                      {project.assignments?.length || 0}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Team</span>
                  </div>
                  {project.jd_id && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-brand-50 rounded text-brand-600 text-[10px] font-bold uppercase">
                      <Briefcase className="h-3 w-3" /> JD Linked
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Link href={`/hr/projects/${project.id}`}>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                  </Link>
                  <Link href={`/hr/projects/${project.id}/edit`}>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/hr/projects/${project.id}/add-employee`}>
                    <Button size="sm" className="h-8 gap-1.5 text-xs bg-brand-600 hover:bg-brand-700 text-white">
                      <UserPlus className="h-3.5 w-3.5" />
                      Add Employee
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={cn(cardSurfaceClass, "w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200")}>
            <div className="p-6 border-b border-slate-100 dark:border-tw-border">
              <h2 className="text-lg font-bold text-slate-900">Create New Project</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Project Name</label>
                <Input value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Project Code</label>
                  <Input value={newProject.code} onChange={e => setNewProject({...newProject, code: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Client</label>
                  <Input value={newProject.client_name} onChange={e => setNewProject({...newProject, client_name: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Linked Job Description (Optional)</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select 
                    className={cn(formInputClass, "pl-10")}
                    value={newProject.jd_id}
                    onChange={e => setNewProject({...newProject, jd_id: e.target.value})}
                  >
                    <option value="">None / Internal</option>
                    {jds?.map(jd => (
                      <option key={jd.id} value={jd.id}>{jd.title} ({jd.domain})</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Linking a JD helps in automated team matching and skill gap identification.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Deadline</label>
                  <Input type="date" value={newProject.deadline} onChange={e => setNewProject({...newProject, deadline: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                  <select 
                    className={formInputClass}
                    value={newProject.status}
                    onChange={e => setNewProject({...newProject, status: e.target.value})}
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                <textarea 
                  className={cn(formInputClass, "min-h-[80px] py-3")} 
                  value={newProject.description}
                  onChange={e => setNewProject({...newProject, description: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Delivery Notes</label>
                <textarea 
                  className={cn(formInputClass, "min-h-[60px] py-3")} 
                  placeholder="Key milestones or delivery expectations..."
                  value={newProject.delivery_notes}
                  onChange={e => setNewProject({...newProject, delivery_notes: e.target.value})}
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-tw-border flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button 
                onClick={() => createMutation.mutate(newProject)}
                disabled={!newProject.name || createMutation.isPending}
                className="bg-brand-600 hover:bg-brand-700 text-white"
              >
                Create Project
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
