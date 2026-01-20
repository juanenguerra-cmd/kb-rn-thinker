import * as React from "react";

export type FTagRef = {
  title?: string;
  definition?: string;
  surveyFocus?: string[];
  docCues?: string[];
  relatedDocIds?: string[];
};

export type CategoryRef = {
  title?: string;
  definition?: string;
  relatedDocIds?: string[];
};

export type SourceTypeRef = {
  title?: string;
  definition?: string;
  relatedDocIds?: string[];
};

type KBRefsState = {
  ftags: Record<string, FTagRef>;
  categories: Record<string, CategoryRef>;
  sourceTypes: Record<string, SourceTypeRef>;
  loading: boolean;
  error?: string;
};

async function tryFetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Loads optional KB reference dictionaries used for "filter info" modals.
 * These files are optional by design: missing files should not break the app.
 */
export function useKBRefs() {
  const [state, setState] = React.useState<KBRefsState>({
    ftags: {},
    categories: {},
    sourceTypes: {},
    loading: true
  });

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const bust = Date.now();
      const [ftags, categories, sourceTypes] = await Promise.all([
        tryFetchJson<Record<string, FTagRef>>(`/kb/ftags.json?v=${bust}`),
        tryFetchJson<Record<string, CategoryRef>>(`/kb/categories.json?v=${bust}`),
        tryFetchJson<Record<string, SourceTypeRef>>(`/kb/source_types.json?v=${bust}`)
      ]);

      if (!alive) return;
      setState({
        ftags: ftags ?? {},
        categories: categories ?? {},
        sourceTypes: sourceTypes ?? {},
        loading: false
      });
    })().catch((e) => {
      if (!alive) return;
      setState((s) => ({ ...s, loading: false, error: String(e?.message ?? e) }));
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
