"use client";

import { motion } from "framer-motion";
import { 
    Github, 
    MessageSquare, 
    CheckSquare, 
    FileText, 
    Award, 
    Calendar,
    Search,
    Info,
    ShieldCheck,
    Clock
} from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";

const SOURCE_ICONS: any = {
    github: { icon: Github, color: "text-slate-900 dark:text-white" },
    teams: { icon: MessageSquare, color: "text-indigo-600 dark:text-indigo-400" },
    jira: { icon: CheckSquare, color: "text-blue-600 dark:text-blue-400" },
    assessment: { icon: Award, color: "text-brand-600 dark:text-tw-blue" },
    apar: { icon: FileText, color: "text-amber-600 dark:text-amber-400" },
    default: { icon: Search, color: "text-slate-400" }
};

interface EvidenceRecord {
    id: string;
    source_type: string;
    source_label: string;
    proficiency_raw: number;
    confidence_weight: number;
    observed_at: string;
    evidence_snippet: string;
    decay_factor: number;
}

export function EvidenceLog({ evidence }: { evidence: EvidenceRecord[] }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Inference & Evidence Chain
                </h3>
                <span className="text-xs text-slate-400">{evidence?.length || 0} signals identified</span>
            </div>

            <div className="space-y-3">
                {evidence?.map((item, index) => {
                    const Config = SOURCE_ICONS[item.source_type] || SOURCE_ICONS.default;
                    const effectiveWeight = item.confidence_weight * item.decay_factor;
                    
                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="p-4 border-slate-100 dark:border-tw-border bg-white dark:bg-tw-raised/30 hover:border-brand-200 dark:hover:border-tw-blue/30 transition-all group">
                                <div className="flex gap-4">
                                    <div className={`p-2 rounded-lg bg-slate-50 dark:bg-tw-raised group-hover:scale-110 transition-transform ${Config.color}`}>
                                        <Config.icon className="h-5 w-5" />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-tw-text">
                                                {item.source_label}
                                            </p>
                                            <Badge variant="outline" className="text-[10px] h-5 border-slate-200 dark:border-tw-border text-slate-500 dark:text-tw-muted">
                                                {item.source_type}
                                            </Badge>
                                        </div>
                                        
                                        <p className="text-xs text-slate-600 dark:text-tw-muted italic mb-3 line-clamp-2">
                                            &quot;{item.evidence_snippet}&quot;
                                        </p>
                                        
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5">
                                                   <Award className="h-3.5 w-3.5 text-brand-500 dark:text-tw-blue" />
                                                   <span className="text-xs font-bold text-slate-700 dark:text-tw-text">
                                                      Level {item.proficiency_raw.toFixed(1)}
                                                   </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                   <Clock className="h-3.5 w-3.5 text-amber-500" />
                                                   <span className="text-xs text-slate-500 dark:text-tw-muted">
                                                      {formatDistanceToNow(new Date(item.observed_at))} ago
                                                   </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="text-[10px] text-slate-400 font-medium">Confidence:</div>
                                                <div className="flex gap-0.5">
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <div 
                                                            key={s} 
                                                            className={`h-1.5 w-3 rounded-full ${
                                                                s <= Math.round(effectiveWeight * 5) 
                                                                ? "bg-brand-500 dark:bg-tw-blue" 
                                                                : "bg-slate-200 dark:bg-tw-raised"
                                                            }`} 
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-tw-blue/5 border border-blue-100 dark:border-tw-blue/20 flex gap-3">
               <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
               <p className="text-[11px] text-blue-800 dark:text-blue-300">
                  Evidence older than 6 months is automatically decayed by 50% to ensure profile freshness. Computer-calculated IRT assessments carry 3x weight compared to self-reports.
               </p>
            </div>
        </div>
    );
}
