// src/features/wizard/useCocCatalog.ts
import { useEffect, useMemo, useState } from "react";

export type CocCatalogItem = {
  id: string;
  label: string;
  category?: string;
  synonyms?: string[];
  tags?: string[];
  ladder?: string;
  pathway?: string;
  minimumData?: string[];
};

type Catalog = {
  schema?: string;
  updatedAt?: string;
  count?: number;
  items: CocCatalogItem[];
};

function tokenize(q: string): string[] {
  return (q || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreItem(q: string, it: CocCatalogItem): number {
  const qq = (q || "").toLowerCase().trim();
  if (!qq) return 0;

  const hay = [it.label, it.category || "", ...(it.synonyms || []), ...(it.tags || [])]
    .join(" ")
    .toLowerCase();

  let score = 0;
  if (hay.includes(qq)) score += 50;

  const toks = tokenize(qq);
  for (const t of toks) {
    if (!t) continue;
    if (hay.includes(t)) score += 6;
    if (it.label.toLowerCase().startsWith(t)) score += 3;
  }

  if (it.pathway) score += 2;
  return score;
}

export function useCocCatalog(query: string) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/kb/coc/coc_catalog.json")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} loading /kb/coc/coc_catalog.json`);
        return (await r.json()) as Catalog;
      })
      .then((c) => {
        if (cancelled) return;
        setCatalog(c);
        setError(null);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(String(e?.message || e));
        setCatalog(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const ranked = useMemo(() => {
    const items = catalog?.items || [];
    const scored = items
      .map((it) => ({ it, score: scoreItem(query, it) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.it);

    if (scored.length) return scored;

    const fallbackIds = [
      "coc_acute_confusion_delirium",
      "coc_fever",
      "coc_sob",
      "coc_chest_pain",
      "coc_stroke_tia",
      "coc_pain_new",
      "coc_refusal_meds",
      "coc_behavior_change",
      "coc_critical_labs",
      "coc_fall"
    ];
    const fallback = fallbackIds.map((id) => items.find((x) => x.id === id)).filter(Boolean);
    return (fallback.length ? fallback : items.slice(0, 10)) as CocCatalogItem[];
  }, [catalog, query]);

  return { catalog, ranked, loading, error };
}
