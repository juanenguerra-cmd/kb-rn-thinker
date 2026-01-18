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
    <div style={{ display: "grid", gap: 12 }}>
      <div className="row">
        <input
          value={finder.query}
          onChange={(e) => actions.setQuery(e.target.value)}
          placeholder="Search policies, CMS, CDC, NYSDOH guidance…"
          className="input grow"
        />
        <button onClick={actions.runSearch} className="btn btnPrimary">Search</button>
      </div>

      <div className="panel panelPad" style={{ boxShadow: "none" }}>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <label className="row" style={{ gap: 8 }}>
            <input type="checkbox" checked={finder.exactPhrase} onChange={(e) => actions.setExactPhrase(e.target.checked)} />
            <span className="muted">Exact phrase</span>
          </label>

          <label className="row" style={{ gap: 8 }}>
            <input type="checkbox" checked={finder.approvedOnly} onChange={(e) => actions.setApprovedOnly(e.target.checked)} />
            <span className="muted">Approved-only</span>
          </label>

          <div className="grow" />

          <span className="muted">Default add section:</span>
          <select
            value={finder.defaultAddSection}
            onChange={(e) => actions.setDefaultAddSection(e.target.value as PacketDraftSection)}
            className="select"
            style={{ width: 180 }}
          >
            <option value="citations">Citations</option>
            <option value="assessment">Assessment</option>
            <option value="interventions">Interventions</option>
            <option value="monitoring">Monitoring</option>
            <option value="documentation">Documentation</option>
            <option value="issue">Issue</option>
          </select>
        </div>

        <div className="divider" />

        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <div className="muted" style={{ marginBottom: 6 }}>Type</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {allTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => actions.setTypeFilter(toggle(finder.typeFilter, t))}
                  className={`pill ${finder.typeFilter.includes(t) ? "pillActive" : ""}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="muted" style={{ marginBottom: 6 }}>Jurisdiction</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {allJur.map((j) => (
                <button
                  key={j}
                  onClick={() => actions.setJurisdictionFilter(toggle(finder.jurisdictionFilter, j))}
                  className={`pill ${finder.jurisdictionFilter.includes(j) ? "pillActive" : ""}`}
                >
                  {j}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="muted" style={{ marginBottom: 6 }}>Top tags</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {topTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => actions.setTagFilter(toggle(finder.tagFilter, tag))}
                  className={`pill ${finder.tagFilter.includes(tag) ? "pillActive" : ""}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <button
              onClick={() => {
                actions.setTypeFilter([]);
                actions.setJurisdictionFilter([]);
                actions.setTagFilter([]);
                actions.setApprovedOnly(true);
              }}
              className="btn"
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {results.length === 0 ? (
          <div className="muted">No results yet. Try “contact precautions”, “reporting”, “hand hygiene”.</div>
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
