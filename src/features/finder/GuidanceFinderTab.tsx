import * as React from "react";
import { useAppStore, type PacketDraftSection } from "@/store/appStore";
import { SourceCard } from "@/components/SourceCard";

export function GuidanceFinderTab() {
  const kb = useAppStore((s) => s.kb);
  const finder = useAppStore((s) => s.finder);
  const actions = useAppStore((s) => s.actions);

  const docsById = React.useMemo(() => {
    const map = new Map<string, any>();
    kb?.searchIndex.docs.forEach((d) => map.set(d.id, d));
    return map;
  }, [kb]);

  const results = finder.results.map((id) => docsById.get(id)).filter(Boolean);

  const allTypes = React.useMemo(() => {
    if (!kb) return [] as string[];
    return Array.from(new Set(kb.searchIndex.docs.map((d) => d.type))).sort();
  }, [kb]);

  const allJur = React.useMemo(() => {
    if (!kb) return [] as string[];
    return Array.from(new Set(kb.searchIndex.docs.map((d) => d.jurisdiction).filter(Boolean))).sort();
  }, [kb]);

  const topTags = React.useMemo(() => {
    if (!kb) return [] as string[];
    const counts = new Map<string, number>();
    for (const d of kb.searchIndex.docs) {
      for (const t of d.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 18)
      .map(([t]) => t);
  }, [kb]);

  function toggle(arr: string[], value: string) {
    return arr.includes(value) ? arr.filter((x) => x !== value) : [value, ...arr];
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={finder.query}
          onChange={(e) => actions.setQuery(e.target.value)}
          placeholder="Search policies, CMS, CDC, NYSDOH guidance…"
          style={{ flex: 1, padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
        />
        <button onClick={actions.runSearch} style={{ padding: "10px 12px", borderRadius: 9999 }}>
          Search
        </button>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={finder.exactPhrase} onChange={(e) => actions.setExactPhrase(e.target.checked)} />
            Exact phrase
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={finder.approvedOnly} onChange={(e) => actions.setApprovedOnly(e.target.checked)} />
            Approved-only
          </label>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Default add section:</span>
            <select
              value={finder.defaultAddSection}
              onChange={(e) => actions.setDefaultAddSection(e.target.value as PacketDraftSection)}
              style={{ padding: "7px 10px", borderRadius: 9999 }}
            >
              <option value="citations">Citations</option>
              <option value="assessment">Assessment</option>
              <option value="interventions">Interventions</option>
              <option value="monitoring">Monitoring</option>
              <option value="documentation">Documentation</option>
              <option value="issue">Issue</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Type</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {allTypes.map((t) => (
              <button
                key={t}
                onClick={() => actions.setTypeFilter(toggle(finder.typeFilter, t))}
                style={{
                  padding: "6px 10px",
                  borderRadius: 9999,
                  border: "1px solid #eee",
                  opacity: finder.typeFilter.includes(t) ? 1 : 0.6
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Jurisdiction</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {allJur.map((j) => (
              <button
                key={j}
                onClick={() => actions.setJurisdictionFilter(toggle(finder.jurisdictionFilter, j))}
                style={{
                  padding: "6px 10px",
                  borderRadius: 9999,
                  border: "1px solid #eee",
                  opacity: finder.jurisdictionFilter.includes(j) ? 1 : 0.6
                }}
              >
                {j}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Top tags</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {topTags.map((tag) => (
              <button
                key={tag}
                onClick={() => actions.setTagFilter(toggle(finder.tagFilter, tag))}
                style={{
                  padding: "6px 10px",
                  borderRadius: 9999,
                  border: "1px solid #eee",
                  opacity: finder.tagFilter.includes(tag) ? 1 : 0.6
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              actions.setTypeFilter([]);
              actions.setJurisdictionFilter([]);
              actions.setTagFilter([]);
              actions.setApprovedOnly(true);
            }}
            style={{ padding: "8px 10px", borderRadius: 9999 }}
          >
            Reset filters
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {results.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No results yet. Try “contact precautions”, “reporting”, “hand hygiene”.</div>
        ) : (
          results.map((doc: any) => (
            <SourceCard
              key={doc.id}
              model={{
                id: doc.id,
                title: doc.title,
                heading: doc.heading,
                text: doc.text,
                type: doc.type,
                jurisdiction: doc.jurisdiction,
                effective_date: doc.effective_date,
                review_by: doc.review_by,
                url_or_location: doc.url_or_location,
                tags: doc.tags
              }}
              query={finder.query}
              addSection={finder.defaultAddSection}
              onChangeAddSection={(s) => actions.setDefaultAddSection(s)}
              onAdd={(section) => actions.addToDraftFromDoc(doc, section, "finder")}
            />
          ))
        )}
      </div>
    </div>
  );
}
