"use client";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeApi, api } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cardSurfaceClass, formInputClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { 
  FileUp, 
  Plus, 
  Trash2, 
  Sparkles, 
  BrainCircuit, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";

interface ExtractedSkill {
  skill_name: string;
  proficiency_estimate: number;
  evidence_found: string;
  is_technical: boolean;
}

function toRenderableText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.skill_name === "string") {
      const details: string[] = [obj.skill_name];
      if (typeof obj.proficiency === "number") details.push(`(Proficiency: ${obj.proficiency})`);
      if (typeof obj.note === "string" && obj.note.trim()) details.push(`- ${obj.note}`);
      return details.join(" ");
    }
    const firstString = Object.values(obj).find((v) => typeof v === "string");
    if (typeof firstString === "string") return firstString;
  }
  return "N/A";
}

export default function EmployeeSkillsPage() {
  const { ready, user } = useRequireAuth();
  const employeeId = user?.employee_id;
  const queryClient = useQueryClient();

  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<ExtractedSkill[]>([]);
  const [manualSkillsText, setManualSkillsText] = useState("");
  const [manualProficiency, setManualProficiency] = useState(3);
  const [manualExperience, setManualExperience] = useState(1);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["employee-profile", employeeId],
    queryFn: async () => {
      const { data } = await employeeApi.getProfile(employeeId!);
      return data;
    },
    enabled: ready && !!employeeId,
  });

  const { data: currentSkills } = useQuery({
    queryKey: ["employee-skills", employeeId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/employee-skills/${employeeId}/analysis`);
      return data;
    },
    enabled: ready && !!employeeId,
  });

  const uploadResumeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post(`/api/v1/employee-skills/${employeeId}/resume`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return data;
    },
    onSuccess: (data) => {
      const newSkills = data.extracted_skills.map((s: any) => ({
        ...s,
        years_of_experience: s.years_of_experience || 1
      }));
      setExtractedSkills(newSkills);
      queryClient.invalidateQueries({ queryKey: ["employee-profile"] });
      toast.success(`Successfully extracted ${data.extracted_skills.length} skills from your resume!`);
    },
    onError: () => toast.error("Failed to parse resume. Please try again with a PDF or text file.")
  });

  const saveSkillsMutation = useMutation({
    mutationFn: async (skillsToSave: any[]) => {
      await api.post(`/api/v1/employee-skills/${employeeId}/skills/bulk`, {
        skills: skillsToSave.map(s => ({
          skill_name: s.skill_name || s.name,
          proficiency: s.proficiency_estimate || s.proficiency,
          years_of_experience: s.years_of_experience || 0,
          is_technical: s.is_technical || false
        }))
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-skills"] });
      queryClient.invalidateQueries({ queryKey: ["employee-profile"] });
      setExtractedSkills([]);
      toast.success("Skills saved to your profile!");
    }
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.get(`/api/v1/employee-skills/${employeeId}/analysis`);
      return data.analysis;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast.success("AI Profile Analysis complete!");
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadResumeMutation.mutate(file);
    }
  };

  const addManualSkills = () => {
    if (!manualSkillsText.trim()) return;
    const skillNames = manualSkillsText.split(",").map(s => s.trim()).filter(s => s.length > 0);
    const newSkills: ExtractedSkill[] = skillNames.map(name => ({
      skill_name: name,
      proficiency_estimate: manualProficiency,
      years_of_experience: manualExperience,
      evidence_found: "Self-declared",
      is_technical: false
    }));
    setExtractedSkills(prev => [...prev, ...newSkills]);
    setManualSkillsText("");
  };

  if (!ready) return null;

  if (!employeeId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-10 w-10 text-amber-500" />
        <p className="text-slate-600">Your account is not linked to an employee profile. Please contact HR.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-tw-text tracking-tight">
            My Skills & Expertise
          </h1>
          <p className="mt-2 text-slate-600 dark:text-tw-muted flex items-center gap-2">
            <span className="px-2 py-0.5 bg-brand-100 text-brand-700 dark:bg-tw-blue/20 dark:text-tw-blue rounded-md text-sm font-bold uppercase tracking-wider">
              {profile?.employee.job_title || "Professional Role"}
            </span>
            <span className="text-slate-400">|</span>
            Building your professional profile
          </p>
        </div>
        
        <div className="flex gap-3">
          {profile?.employee.resume_url && (
            <a 
              href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}${profile.employee.resume_url}`} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="gap-2">
                <FileUp className="h-4 w-4" /> View Current Resume
              </Button>
            </a>
          )}
          <Button 
            variant="outline"
            className="gap-2 border-brand-200 dark:border-tw-border dark:hover:bg-tw-raised"
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
          >
            {analyzeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4 text-brand-600 dark:text-tw-blue" />}
            Analyze My Profile
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Input & Upload */}
        <div className="lg:col-span-1 space-y-6">
          {/* Resume Upload */}
          <div className={cn(cardSurfaceClass, "p-6 border-dashed border-2 border-slate-200 dark:border-tw-border text-center hover:border-brand-400 dark:hover:border-tw-blue transition-all group")}>
            <input 
              type="file" 
              id="resume-upload" 
              className="hidden" 
              onChange={handleFileUpload}
              accept=".pdf,.txt"
            />
            <label htmlFor="resume-upload" className="cursor-pointer space-y-3 block">
              <div className="h-12 w-12 bg-slate-100 dark:bg-tw-raised rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                {uploadResumeMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileUp className="h-6 w-6 text-slate-500 dark:text-tw-muted" />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-tw-text">Scan & Upload Resume</p>
                <p className="text-xs text-slate-500 dark:text-tw-muted mt-1">Upload PDF to update and extract skills</p>
              </div>
            </label>
          </div>

          {/* Manual Entry */}
          <div className={cn(cardSurfaceClass, "p-6 space-y-4")}>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-600" /> Add Skills
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Skill names (comma separated)</label>
                <textarea 
                  className={cn(formInputClass, "min-h-[80px] text-sm")} 
                  placeholder="e.g. Python, SQL, Project Management" 
                  value={manualSkillsText}
                  onChange={(e) => setManualSkillsText(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Proficiency: {manualProficiency}</label>
                  <input 
                    type="range" 
                    min="1" max="5" step="1" 
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600" 
                    value={manualProficiency}
                    onChange={(e) => setManualProficiency(parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Exp (Years): {manualExperience}</label>
                  <input 
                    type="number" 
                    className={cn(formInputClass, "h-8 text-sm")}
                    min="0" max="50"
                    value={manualExperience}
                    onChange={(e) => setManualExperience(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <Button className="w-full h-9 gap-2" onClick={addManualSkills} disabled={!manualSkillsText.trim()}>
                <Plus className="h-4 w-4" /> Add to Batch
              </Button>
            </div>
          </div>
        </div>

        {/* Center: Extracted/Current Skills List */}
        <div className="lg:col-span-2 space-y-6">
          {/* New Skills To Save */}
          {extractedSkills.length > 0 ? (
            <div className={cn(cardSurfaceClass, "overflow-hidden border-brand-200 dark:border-tw-blue/30")}>
              <div className="bg-brand-50 dark:bg-tw-blue/10 px-6 py-3 border-b border-brand-100 dark:border-tw-blue/20 flex justify-between items-center">
                <span className="text-xs font-bold text-brand-700 dark:text-tw-blue flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Detected/Added Skills ({extractedSkills.length})
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] text-slate-500" onClick={() => setExtractedSkills([])}>
                    Clear
                  </Button>
                  <Button size="sm" className="h-7 px-3 text-[10px]" onClick={() => saveSkillsMutation.mutate(extractedSkills)}>
                    Save to Profile
                  </Button>
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {extractedSkills.map((s, idx) => (
                  <div key={idx} className="p-3 bg-white dark:bg-tw-raised rounded-xl border border-slate-100 dark:border-tw-border flex justify-between items-center group">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-tw-text">{s.skill_name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-500 dark:text-tw-muted">Exp: {s.years_of_experience || 0}y</span>
                        <span className="text-[10px] text-slate-300">|</span>
                        <span className="text-[10px] text-slate-500 dark:text-tw-muted truncate max-w-[100px]">
                          {s.evidence_found}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-tw-dim rounded text-brand-700 dark:text-tw-blue">
                        {s.proficiency_estimate}
                      </span>
                      <button 
                        onClick={() => setExtractedSkills(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            currentSkills?.current_skills_count === 0 && (
              <div className={cn(cardSurfaceClass, "p-8 text-center border-amber-200 bg-amber-50/30")}>
                <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
                <h3 className="font-bold text-slate-900">Your profile is missing skills</h3>
                <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                  We couldn't find many skills on your profile. Upload a resume or add them manually above to get started with assessments.
                </p>
              </div>
            )
          )}

          {/* Current Skills Table */}
          <div className={cn(cardSurfaceClass, "overflow-hidden")}>
             <div className="px-6 py-4 border-b border-slate-100 dark:border-tw-border flex justify-between items-center">
                <h2 className="text-sm font-bold text-slate-900 dark:text-tw-text flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Current Skill Profile
                </h2>
                <span className="text-xs text-slate-500">
                  {currentSkills?.current_skills_count || 0} Skills Active
                </span>
             </div>
             <div className="overflow-x-auto">
               <table className="min-w-full text-left text-sm">
                 <thead className="bg-slate-50 dark:bg-tw-dim text-xs uppercase text-slate-500">
                   <tr>
                     <th className="px-6 py-3">Skill Name</th>
                     <th className="px-6 py-3">Domain</th>
                     <th className="px-6 py-3">Exp (Years)</th>
                     <th className="px-6 py-3">Self-Rating</th>
                     <th className="px-6 py-3">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-tw-border">
                   {currentSkills?.current_skills_count > 0 ? (
                     (profile?.skill_scores || []).map((s: any) => (
                       <tr key={s.skill_id} className="hover:bg-slate-50 dark:hover:bg-tw-raised transition-colors">
                         <td className="px-6 py-4 font-medium text-slate-900 dark:text-tw-text">{s.skill_name}</td>
                         <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{s.skill_domain}</td>
                         <td className="px-6 py-4 font-bold text-slate-700 dark:text-tw-muted">{s.years_of_experience || 0}y</td>
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                             <div className="flex-1 h-1.5 max-w-[60px] bg-slate-200 dark:bg-tw-dim rounded-full overflow-hidden">
                               <div className="h-full bg-emerald-500" style={{ width: `${(s.proficiency_score / 5) * 100}%` }} />
                             </div>
                             <span className="font-bold">{s.proficiency_score}</span>
                           </div>
                         </td>
                         <td className="px-6 py-4">
                            <Link href="/employee/assessments">
                              <Button variant="ghost" size="sm" className="h-8 text-[10px] gap-1 hover:text-brand-600">
                                Verify <ChevronRight className="h-3 w-3" />
                              </Button>
                            </Link>
                         </td>
                       </tr>
                     ))
                   ) : (
                     <tr>
                       <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-tw-muted">
                         <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                         Your skill profile is empty. Scan your resume to get started!
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      </div>

      {/* Profile Analysis Result */}
      {analysisResult && (
        <section className={cn(cardSurfaceClass, "p-8 border-l-4 border-brand-500 bg-gradient-to-r from-brand-50/30 to-transparent dark:from-brand-900/10 animate-in slide-in-from-bottom-4")}>
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="h-6 w-6 text-brand-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-tw-text">AI Skill Gap Deep-Dive</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-brand-700 dark:text-tw-blue uppercase tracking-wider">Summary</h3>
              <p className="text-sm text-slate-700 dark:text-tw-muted leading-relaxed">
                {analysisResult.summary}
              </p>
              
              <div className="space-y-2 pt-4">
                <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider">Top Strengths</h3>
                <div className="flex flex-wrap gap-2">
                  {(analysisResult.strengths ?? []).map((s: unknown, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-full text-xs font-medium border border-emerald-100 dark:border-emerald-800">
                      {toRenderableText(s)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider">Growth Focus Areas</h3>
                <ul className="space-y-2">
                  {(analysisResult.growth_areas ?? []).map((a: unknown, idx: number) => (
                    <li key={idx} className="text-sm text-slate-600 dark:text-tw-muted flex items-start gap-2">
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      {toRenderableText(a)}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 bg-slate-900 rounded-2xl text-white">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Recommended Assessment Plan</h3>
                <div className="space-y-3">
                  {(analysisResult.suggested_assessment_plan ?? []).map((plan: unknown, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <div className="h-6 w-6 rounded-full bg-brand-500/20 border border-brand-500 flex items-center justify-center flex-shrink-0 text-[10px]">
                        {idx + 1}
                      </div>
                      <span className="text-slate-300">{toRenderableText(plan)}</span>
                    </div>
                  ))}
                </div>
                <Link href="/employee/assessments" className="mt-6 block">
                  <Button className="w-full bg-brand-600 hover:bg-brand-500 text-white">
                    Start Assessment Path
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
