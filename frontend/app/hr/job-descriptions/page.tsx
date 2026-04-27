"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { 
  Briefcase, 
  Plus, 
  Search, 
  Trash2, 
  FileText, 
  MapPin, 
  Building2,
  Upload,
  Loader2,
  X,
  Eye,
  PencilLine
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { cardSurfaceClass, formInputClass } from "@/lib/ui";
import { toast } from "sonner";

export default function HRJobDescriptionsPage() {
  const { ready } = useRequireAuth(["org_admin", "hr_manager"]);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [jdReferencePdf, setJdReferencePdf] = useState<File | null>(null);
  const [selectedJdId, setSelectedJdId] = useState<string | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const queryClient = useQueryClient();

  const { data: jds, isLoading } = useQuery({
    queryKey: ["job-descriptions"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/job-descriptions/");
      return data as any[];
    },
    enabled: ready,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post("/api/v1/job-descriptions/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-descriptions"] });
      setIsAdding(false);
      setSkillInput("");
      setRequiredSkills([]);
      setJdReferencePdf(null);
      toast.success("Job Description created and analyzed by AI!");
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail.map((d: any) => d?.msg).filter(Boolean).join(", ") : detail;
      toast.error(msg || "Could not save JD. Please check required fields and permissions.");
    },
  });

  const { data: selectedJd, isLoading: isLoadingSelectedJd } = useQuery({
    queryKey: ["job-description-detail", selectedJdId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/job-descriptions/${selectedJdId}`);
      return data as any;
    },
    enabled: ready && Boolean(selectedJdId),
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.put(`/api/v1/job-descriptions/${selectedJdId}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-descriptions"] });
      queryClient.invalidateQueries({ queryKey: ["job-description-detail", selectedJdId] });
      setIsEditingDetail(false);
      toast.success("Job Description updated");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Could not update Job Description");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/job-descriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-descriptions"] });
      toast.success("JD removed");
    }
  });

  const [newJD, setNewJD] = useState({
    title: "",
    role_type: "Operations",
    domain: "General Business",
    seniority: "Mid-level",
    location: "Remote",
    employment_type: "Full-time",
    qualification_eligibility: "",
    requirements: "",
    responsibilities: "",
    summary: ""
  });

  const addRequiredSkill = () => {
    const value = skillInput.trim();
    if (!value) return;
    if (requiredSkills.some((skill) => skill.toLowerCase() === value.toLowerCase())) {
      setSkillInput("");
      return;
    }
    setRequiredSkills((prev) => [...prev, value]);
    setSkillInput("");
  };

  const removeRequiredSkill = (skillToRemove: string) => {
    setRequiredSkills((prev) => prev.filter((skill) => skill !== skillToRemove));
  };

  const buildJDPayload = () => {
    const skillsLine = requiredSkills.length
      ? `Required Skills: ${requiredSkills.join(", ")}`
      : "";
    const pdfLine = jdReferencePdf
      ? `Attached JD Reference PDF: ${jdReferencePdf.name} (reference only)`
      : "";

    const mergedRequirements = [
      newJD.requirements.trim(),
      newJD.qualification_eligibility.trim()
        ? `Qualification / Eligibility:\n${newJD.qualification_eligibility.trim()}`
        : "",
      skillsLine,
      pdfLine,
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      ...newJD,
      summary: newJD.summary.trim() || undefined,
      responsibilities: newJD.responsibilities.trim() || undefined,
      requirements: mergedRequirements || newJD.requirements,
    };
  };

  if (!ready) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-tw-text">Job Descriptions</h1>
          <p className="text-sm text-slate-500 dark:text-tw-muted mt-1">Manage organization roles and AI-extracted skill requirements.</p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white">
          <Plus className="h-4 w-4" /> Create JD
        </Button>
      </div>

      {/* Search & Filter */}
      <div className={cn(cardSurfaceClass, "p-4 flex items-center gap-4")}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search roles..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* JD Grid */}
      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jds?.filter(j => j.title.toLowerCase().includes(search.toLowerCase())).map(jd => (
            <div key={jd.id} className={cn(cardSurfaceClass, "p-5 hover:border-brand-300 transition-all group relative")}>
              <div className="flex items-start justify-between">
                <div className="p-2 bg-brand-50 dark:bg-tw-blue/10 rounded-xl">
                  <Briefcase className="h-5 w-5 text-brand-600" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setSelectedJdId(jd.id);
                      setIsEditingDetail(false);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-brand-600 transition-all"
                    title="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedJdId(jd.id);
                      setIsEditingDetail(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-emerald-600 transition-all"
                    title="Edit job description"
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => deleteMutation.mutate(jd.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all"
                    title="Delete job description"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-slate-900 dark:text-tw-text">{jd.title}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-tw-raised rounded text-[10px] font-bold text-slate-500 uppercase">{jd.role_type}</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-tw-raised rounded text-[10px] font-bold text-slate-500 uppercase">{jd.domain}</span>
                </div>
                <div className="mt-4 flex items-center text-xs text-slate-500 dark:text-tw-muted gap-4">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {jd.location}</span>
                  <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {jd.seniority}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add JD Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={cn(cardSurfaceClass, "w-full max-w-5xl max-h-[92vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200")}>
            <div className="p-6 border-b border-slate-100 dark:border-tw-border flex items-center justify-between sticky top-0 bg-white/80 dark:bg-tw-card/80 backdrop-blur-md z-10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-tw-text">Create Job Description</h2>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-tw-muted uppercase">Job Title</label>
                  <Input value={newJD.title} onChange={e => setNewJD({...newJD, title: e.target.value})} placeholder="e.g. Senior Frontend Engineer" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-tw-muted uppercase">Role Type / Category</label>
                  <select 
                    className={formInputClass}
                    value={newJD.role_type}
                    onChange={e => setNewJD({...newJD, role_type: e.target.value})}
                  >
                    <option>Operations</option>
                    <option>Administration</option>
                    <option>Human Resources</option>
                    <option>Finance & Accounts</option>
                    <option>Sales</option>
                    <option>Marketing</option>
                    <option>Customer Support</option>
                    <option>Procurement</option>
                    <option>Supply Chain</option>
                    <option>Legal & Compliance</option>
                    <option>Quality Assurance</option>
                    <option>Project Management</option>
                    <option>Business Analyst</option>
                    <option>Data & Reporting</option>
                    <option>Learning & Development</option>
                    <option>Healthcare Admin</option>
                    <option>Clinical Operations</option>
                    <option>Other Non-Technical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-tw-muted uppercase">Domain</label>
                  <Input value={newJD.domain} onChange={e => setNewJD({...newJD, domain: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-tw-muted uppercase">Seniority</label>
                  <Input value={newJD.seniority} onChange={e => setNewJD({...newJD, seniority: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-tw-muted uppercase">Location</label>
                  <Input value={newJD.location} onChange={e => setNewJD({...newJD, location: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-tw-muted uppercase">Employment Type</label>
                  <select
                    className={formInputClass}
                    value={newJD.employment_type}
                    onChange={e => setNewJD({...newJD, employment_type: e.target.value})}
                  >
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Contract</option>
                    <option>Consultant</option>
                    <option>Internship</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-tw-muted uppercase">Attach JD PDF (Reference)</label>
                  <div className="relative">
                    <Upload className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="file"
                      accept="application/pdf"
                      className="pl-10"
                      onChange={(e) => setJdReferencePdf(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  {jdReferencePdf && (
                    <p className="text-[11px] text-slate-500 dark:text-tw-muted flex items-center gap-1">
                      <FileText className="h-3 w-3" /> {jdReferencePdf.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-tw-muted uppercase">Role Summary</label>
                <textarea
                  className={cn(formInputClass, "min-h-[90px] py-3")}
                  placeholder="Briefly describe the business purpose and outcomes expected from this role..."
                  value={newJD.summary}
                  onChange={e => setNewJD({...newJD, summary: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-tw-muted uppercase">Required Skills</label>
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addRequiredSkill();
                      }
                    }}
                    placeholder="Type skill and press Enter (e.g. Stakeholder Management)"
                  />
                  <Button type="button" variant="outline" onClick={addRequiredSkill}>Add</Button>
                </div>
                {requiredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {requiredSkills.map((skill) => (
                      <span key={skill} className="px-2 py-1 rounded bg-slate-100 dark:bg-tw-raised text-xs font-medium text-slate-700 dark:text-tw-text flex items-center gap-1">
                        {skill}
                        <button type="button" onClick={() => removeRequiredSkill(skill)} className="text-slate-500 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-tw-muted uppercase">Detailed Requirements (AI will analyze this)</label>
                <textarea 
                  className={cn(formInputClass, "min-h-[220px] py-3")} 
                  placeholder="Include qualifications, tools/systems exposure, years of experience, certifications, communication expectations, and any industry-specific criteria..."
                  value={newJD.requirements}
                  onChange={e => setNewJD({...newJD, requirements: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-tw-muted uppercase">Core Responsibilities</label>
                <textarea 
                  className={cn(formInputClass, "min-h-[130px] py-3")} 
                  placeholder="List key duties, recurring workflows, decision responsibilities, and reporting/accountability expectations..."
                  value={newJD.responsibilities}
                  onChange={e => setNewJD({...newJD, responsibilities: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-tw-muted uppercase">Qualification / Eligibility</label>
                <textarea
                  className={cn(formInputClass, "min-h-[110px] py-3")}
                  placeholder="Add minimum qualifications, certifications, mandatory eligibility criteria, and preferred educational background..."
                  value={newJD.qualification_eligibility}
                  onChange={e => setNewJD({...newJD, qualification_eligibility: e.target.value})}
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-tw-border flex justify-end gap-3 sticky bottom-0 bg-white/80 dark:bg-tw-card/80 backdrop-blur-md">
              <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button 
                onClick={() => createMutation.mutate(buildJDPayload())}
                disabled={!newJD.title || !newJD.requirements || createMutation.isPending}
                className="bg-brand-600 hover:bg-brand-700 text-white"
              >
                {createMutation.isPending ? "Analyzing..." : "Save & Analyze JD"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedJdId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={cn(cardSurfaceClass, "w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl")}>
            <div className="p-5 border-b border-slate-100 dark:border-tw-border flex items-center justify-between sticky top-0 bg-white/90 dark:bg-tw-card/90 backdrop-blur">
              <h3 className="text-lg font-bold text-slate-900 dark:text-tw-text">
                {isEditingDetail ? "Edit Job Description" : "Job Description Details"}
              </h3>
              <button
                onClick={() => {
                  setSelectedJdId(null);
                  setIsEditingDetail(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-tw-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isLoadingSelectedJd || !selectedJd ? (
              <div className="p-10 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {isEditingDetail ? (
                  <>
                    <Input
                      value={selectedJd.title || ""}
                      onChange={(e) =>
                        queryClient.setQueryData(["job-description-detail", selectedJdId], { ...selectedJd, title: e.target.value })
                      }
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input value={selectedJd.role_type || ""} onChange={(e) => queryClient.setQueryData(["job-description-detail", selectedJdId], { ...selectedJd, role_type: e.target.value })} />
                      <Input value={selectedJd.domain || ""} onChange={(e) => queryClient.setQueryData(["job-description-detail", selectedJdId], { ...selectedJd, domain: e.target.value })} />
                      <Input value={selectedJd.seniority || ""} onChange={(e) => queryClient.setQueryData(["job-description-detail", selectedJdId], { ...selectedJd, seniority: e.target.value })} />
                    </div>
                    <textarea className={cn(formInputClass, "min-h-[90px]")} value={selectedJd.summary || ""} onChange={(e) => queryClient.setQueryData(["job-description-detail", selectedJdId], { ...selectedJd, summary: e.target.value })} />
                    <textarea className={cn(formInputClass, "min-h-[120px]")} value={selectedJd.responsibilities || ""} onChange={(e) => queryClient.setQueryData(["job-description-detail", selectedJdId], { ...selectedJd, responsibilities: e.target.value })} />
                    <textarea className={cn(formInputClass, "min-h-[180px]")} value={selectedJd.requirements || ""} onChange={(e) => queryClient.setQueryData(["job-description-detail", selectedJdId], { ...selectedJd, requirements: e.target.value })} />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setIsEditingDetail(false)}>Cancel</Button>
                      <Button
                        onClick={() =>
                          updateMutation.mutate({
                            title: selectedJd.title,
                            role_type: selectedJd.role_type,
                            domain: selectedJd.domain,
                            seniority: selectedJd.seniority,
                            summary: selectedJd.summary,
                            responsibilities: selectedJd.responsibilities,
                            requirements: selectedJd.requirements,
                          })
                        }
                        disabled={updateMutation.isPending}
                        className="bg-brand-600 hover:bg-brand-700 text-white"
                      >
                        {updateMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-tw-text">{selectedJd.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-tw-muted mt-1">
                        {selectedJd.role_type || "General"} · {selectedJd.domain || "General"} · {selectedJd.seniority || "Not specified"}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="rounded-xl border border-slate-100 dark:border-tw-border bg-slate-50 dark:bg-tw-raised p-4">
                        <p className="text-xs uppercase font-bold text-slate-500 dark:text-tw-muted">Summary</p>
                        <p className="text-sm text-slate-700 dark:text-tw-text mt-1 whitespace-pre-wrap">{selectedJd.summary || "No summary provided."}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 dark:border-tw-border bg-slate-50 dark:bg-tw-raised p-4">
                        <p className="text-xs uppercase font-bold text-slate-500 dark:text-tw-muted">Responsibilities</p>
                        <p className="text-sm text-slate-700 dark:text-tw-text mt-1 whitespace-pre-wrap">{selectedJd.responsibilities || "No responsibilities provided."}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 dark:border-tw-border bg-slate-50 dark:bg-tw-raised p-4">
                        <p className="text-xs uppercase font-bold text-slate-500 dark:text-tw-muted">Requirements</p>
                        <p className="text-sm text-slate-700 dark:text-tw-text mt-1 whitespace-pre-wrap">{selectedJd.requirements || "No requirements provided."}</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => setIsEditingDetail(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                        <PencilLine className="h-4 w-4" /> Edit Job Description
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
