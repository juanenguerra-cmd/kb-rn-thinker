export type KBManifest = {
  kb_version: string;
  effective_date: string;
  approval: { status: "draft" | "pending" | "approved" | "retired"; approved_by_role: string; approved_date: string };
  files: { sources: string; sections: string; search_index: string };
};

export type KBSource = {
  source_id: string;
  type: string;
  title: string;
  jurisdiction?: string;
  effective_date?: string;
  review_by?: string;
  url_or_location?: string;
  tags?: string[];
};

export type SearchDoc = {
  id: string;
  source_id: string;
  section_id: string;
  title: string;
  heading: string;
  type: string;
  jurisdiction: string;
  effective_date: string;
  review_by: string;
  url_or_location: string;
  tags: string[];
  text: string;
};

export type KBLoaded = {
  manifest: KBManifest;
  sources: KBSource[];
  searchIndex: { kb_version: string; generated_at: string; docs: SearchDoc[] };
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return (await res.json()) as T;
}

export async function loadKB(): Promise<KBLoaded> {
  const bust = Date.now();
  const manifest = await fetchJson<KBManifest>(`/kb/manifest.json?v=${bust}`);
  const sourcesJson = await fetchJson<{ sources: KBSource[] }>(`/kb/${manifest.files.sources}`);
  const searchIndex = await fetchJson<KBLoaded["searchIndex"]>(`/kb/${manifest.files.search_index}`);
  return { manifest, sources: sourcesJson.sources, searchIndex };
}
