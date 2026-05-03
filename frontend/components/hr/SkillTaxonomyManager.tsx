"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, Plus } from "lucide-react";
import { useState } from "react";
import { skillApi } from "@/lib/api";
import { Button, Input } from "@/components/ui";
import { cardSurfaceClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TaxonomyResponse = {
  sector: string;
  page: number;
  limit: number;
  total: number;
  domains: string[];
  items: { id: string; canonical_name: string; domain: string | null; sub_domain: string | null; sector_tags: string[]; is_compliance: boolean }[];
};

type Props = {
  className?: string;
};

export function SkillTaxonomyManager({ className }: Props) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [domainFilter, setDomainFilter] = useState("");
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newSector, setNewSector] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["skills-taxonomy", page, domainFilter],
    queryFn: async () => {
      const { data: d } = await skillApi.taxonomyList({
        page,
        limit: 25,
        domain: domainFilter || undefined,
      });
      return d as TaxonomyResponse;
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await skillApi.taxonomySeed({ count: 60 });
      return res.data as { created?: number; updated?: number };
    },
    onSuccess: (payload) => {
      toast.success(`Seeded: ${payload?.created ?? 0} created, ${payload?.updated ?? 0} updated`);
      void qc.invalidateQueries({ queryKey: ["skills-taxonomy"] });
    },
    onError: () => toast.error("Seed failed — check Gemini key and permissions."),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      skillApi.taxonomyAdd({
        canonical_name: newName.trim(),
        domain: newDomain.trim(),
        sector: newSector.trim() || (data?.sector ?? "corporate"),
        is_compliance: false,
      }),
    onSuccess: () => {
      toast.success("Skill added");
      setNewName("");
      setNewDomain("");
      void qc.invalidateQueries({ queryKey: ["skills-taxonomy"] });
    },
    onError: () => toast.error("Could not add skill (duplicate name?)"),
  });

  return (
    <div className={cn(cardSurfaceClass, "space-y-4 p-4 shadow-sm", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-tw-text">Skill taxonomy</h2>
          <p className="text-xs text-slate-500 dark:text-tw-muted">
            Sector: <span className="font-medium">{data?.sector ?? "—"}</span> · {data?.total ?? 0} skills
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={seedMutation.isPending}
          onClick={() => seedMutation.mutate()}
          className="gap-1.5"
        >
          {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Seed with AI
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Filter domain…"
          value={domainFilter}
          onChange={(e) => {
            setDomainFilter(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
      </div>

      <div className="rounded-lg border border-slate-200 p-3 dark:border-tw-border">
        <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-tw-text">Add skill manually</p>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Skill name" value={newName} onChange={(e) => setNewName(e.target.value)} className="max-w-[200px]" />
          <Input placeholder="Domain" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} className="max-w-[160px]" />
          <Input placeholder="Sector tag" value={newSector} onChange={(e) => setNewSector(e.target.value)} className="max-w-[140px]" />
          <Button
            type="button"
            size="sm"
            disabled={!newName.trim() || !newDomain.trim() || addMutation.isPending}
            onClick={() => addMutation.mutate()}
            className="gap-1"
          >
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-tw-border">
                <th className="py-2 font-semibold">Name</th>
                <th className="py-2 font-semibold">Domain</th>
                <th className="py-2 font-semibold">Tags</th>
                <th className="py-2 font-semibold">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((s) => (
                <tr key={s.id} className="border-b border-slate-100 dark:border-tw-border">
                  <td className="py-2 font-medium text-slate-800 dark:text-tw-text">{s.canonical_name}</td>
                  <td className="py-2 text-slate-600 dark:text-tw-muted">{s.domain ?? "—"}</td>
                  <td className="py-2 text-slate-500">{(s.sector_tags ?? []).join(", ") || "—"}</td>
                  <td className="py-2">{s.is_compliance ? "Yes" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between text-xs text-slate-500">
        <button
          type="button"
          className="font-semibold text-brand-700 disabled:opacity-40 dark:text-tw-blue"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <span>
          Page {page} / {Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 25)))}
        </span>
        <button
          type="button"
          className="font-semibold text-brand-700 disabled:opacity-40 dark:text-tw-blue"
          disabled={!data || page * (data.limit || 25) >= (data.total || 0)}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
