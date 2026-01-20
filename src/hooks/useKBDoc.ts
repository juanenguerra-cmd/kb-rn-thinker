import * as React from "react";
import { useAppStore } from "@/store/appStore";
import type { KBSource, SearchDoc } from "@/kb/loadKb";

export type KBDocView = {
  doc: SearchDoc;
  source?: KBSource;
  relatedInSource: SearchDoc[]; // other sections from same source
};

/**
 * Builds a view model for a single search result (which corresponds to a KB section).
 * Uses already-loaded KB search index + sources; no extra fetch required.
 */
export function useKBDoc(result: SearchDoc | null) {
  const kb = useAppStore((s) => s.kb);

  return React.useMemo<KBDocView | null>(() => {
    if (!kb || !result) return null;
    const source = kb.sources.find((s) => s.source_id === result.source_id);
    const relatedInSource = kb.searchIndex.docs
      .filter((d) => d.source_id === result.source_id && d.id !== result.id)
      .sort((a, b) => (a.heading || "").localeCompare(b.heading || ""));
    return { doc: result, source, relatedInSource };
  }, [kb, result]);
}
