"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
    Card, 
    CardHeader, 
    CardTitle, 
    CardContent, 
    Badge, 
    Button,
    Progress
} from "@/components/ui";
import { EvidenceLog } from "@/components/employee/EvidenceLog";
import { 
    Radar, 
    RadarChart, 
    PolarGrid, 
    PolarAngleAxis, 
    ResponsiveContainer 
} from "recharts";
import { 
    TrendingUp, 
    AlertCircle, 
    ChevronRight, 
    FileBadge, 
    Zap,
    ArrowUpRight
} from "lucide-react";

export default function AssessmentResultsPage() {
    const { id } = useParams();

    const { data: results, isLoading } = useQuery({
        queryKey: ["assessment-results", id],
        queryFn: async () => {
            // Placeholder data representing a complex result
            return {
                session: {
                    final_proficiency: 3.8,
                    proficiency_level: "Advanced",
                    time_taken: "4m 12s",
                    questions_served: 18,
                    confidence: 0.92
                },
                gaps: [
                    { skill: "React Architecture", current: 3.8, required: 4.5, priority: "High", criticality: "Essential" },
                    { skill: "State Management", current: 4.2, required: 4.0, status: "Met" },
                    { skill: "TypeScript Depth", current: 3.5, required: 4.0, priority: "Medium", criticality: "Important" },
                ],
                recommendations: [
                    "Complete the 'Advanced Design Patterns' workshop.",
                    "Lead a peer code review focused on hooks optimization.",
                    "Review internal system architecture docs for Project 'TalentMap'."
                ],
                evidence: [
                    { 
                        id: "1", 
                        source_type: "assessment", 
                        source_label: "Current Adaptive Session", 
                        proficiency_raw: 3.8, 
                        confidence_weight: 0.9, 
                        observed_at: new Date().toISOString(),
                        decay_factor: 1.0,
                        evidence_snippet: "Consistent mastery of higher-order component patterns and context API optimization."
                    },
                    { 
                        id: "2", 
                        source_type: "github", 
                        source_label: "PR #142 (Main Repo)", 
                        proficiency_raw: 4.2, 
                        confidence_weight: 0.85, 
                        observed_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
                        decay_factor: 0.95,
                        evidence_snippet: "Successfully refactored entire authentication flow using modern state patterns."
                    }
                ]
            };
        }
    });

    if (isLoading) return <div className="p-8">Loading analysis...</div>;

    const chartData = results?.gaps.map((g: any) => ({
        subject: g.skill,
        A: g.current,
        B: g.required || 0,
        fullMark: 5
    }));

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-1000">
            {/* Header / Summary */}
            <div className="bg-gradient-to-br from-brand-600 to-indigo-700 dark:from-tw-blue dark:to-indigo-900 rounded-[2rem] p-10 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <TrendingUp className="h-40 w-40" />
                </div>
                
                <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <Badge className="mb-4 bg-white/20 text-white border-none backdrop-blur-md">Assessment Report</Badge>
                        <h1 className="text-4xl font-bold mb-4">You are <span className="text-brand-100 underline decoration-indigo-400">Proficient</span></h1>
                        <p className="text-brand-50/80 max-w-sm mb-6">Our engine identifies strong growth toward Senior patterns with specific gaps in system architecture.</p>
                        <div className="flex gap-4">
                            <Button className="bg-white text-brand-700 hover:bg-slate-100 dark:bg-tw-blue dark:text-white rounded-xl shadow-lg">Download PDF</Button>
                            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl">Share with Manager</Button>
                        </div>
                    </div>
                    
                    <div className="flex justify-center md:justify-end">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 text-center w-48 shadow-2xl">
                            <div className="text-5xl font-black mb-1">{results?.session.final_proficiency.toFixed(1)}</div>
                            <div className="text-[10px] uppercase tracking-widest font-bold opacity-60">Overall Score</div>
                            <div className="mt-4 pt-4 border-t border-white/10 text-xs">
                                <span className="text-emerald-300 font-bold">Top 15%</span> vs Peers
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Skill Analysis */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Gap Matrix */}
                    <Card className="border-slate-200 dark:border-tw-border bg-white dark:bg-tw-card border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Zap className="h-5 w-5 text-amber-500" />
                                Skill Gap Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {results?.gaps.map((gap: any) => (
                                    <div key={gap.skill} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-semibold">{gap.skill}</span>
                                            <div className="flex items-center gap-2">
                                                {gap.priority && (
                                                    <Badge className={gap.priority === "High" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}>
                                                        {gap.priority} Priority
                                                    </Badge>
                                                )}
                                                <span className="text-xs font-mono">{gap.current.toFixed(1)} / {gap.required?.toFixed(1) || "-"}</span>
                                            </div>
                                        </div>
                                        <div className="relative h-2 bg-slate-100 dark:bg-tw-raised rounded-full overflow-hidden">
                                            <div 
                                                className="absolute top-0 left-0 h-full bg-brand-500 transition-all duration-1000" 
                                                style={{ width: `${(gap.current / 5) * 100}%` }}
                                            />
                                            {gap.required && (
                                                <div 
                                                    className="absolute top-0 h-full w-1 bg-amber-400 z-10" 
                                                    style={{ left: `${(gap.required / 5) * 100}%` }}
                                                    title={`Target: ${gap.required}`}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recommendations */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card className="bg-brand-50/50 dark:bg-tw-blue/5 border-brand-100 dark:border-tw-blue/20">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                                    <ArrowUpRight className="h-4 w-4 text-brand-600 dark:text-tw-blue" />
                                    Personalized Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-4">
                                    {results?.recommendations.map((rec: string, i: number) => (
                                        <li key={i} className="text-sm flex gap-3 text-slate-700 dark:text-tw-text">
                                            <div className="h-5 w-5 rounded-full bg-brand-100 dark:bg-tw-blue/20 text-brand-700 dark:text-tw-blue flex items-center justify-center shrink-0 text-[10px] font-bold">
                                                {i + 1}
                                            </div>
                                            {rec}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        <div className="h-full min-h-[300px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                    <PolarGrid stroke="#94a3b8" strokeOpacity={0.2} />
                                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                                    <Radar
                                        name="Current"
                                        dataKey="A"
                                        stroke="#0f172a"
                                        fill="#0f172a"
                                        fillOpacity={0.1}
                                    />
                                    <Radar
                                        name="Required"
                                        dataKey="B"
                                        stroke="#f59e0b"
                                        fill="#f59e0b"
                                        fillOpacity={0.1}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Right Column: Evidence Log */}
                <div className="lg:col-span-1">
                    <EvidenceLog evidence={results?.evidence || []} />
                    
                    <div className="mt-8 p-6 rounded-3xl bg-slate-100 dark:bg-tw-raised/30 border border-slate-200 dark:border-tw-border text-center">
                       <FileBadge className="h-8 w-8 mx-auto mb-3 text-brand-600 dark:text-tw-blue" />
                       <h4 className="font-bold text-slate-900 dark:text-tw-text mb-1">Verify on Chain</h4>
                       <p className="text-xs text-slate-500 mb-4">This profile and all identifying evidence are hashed and stored for credential verification.</p>
                       <Button variant="outline" size="sm" className="w-full">View Audit Log</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
