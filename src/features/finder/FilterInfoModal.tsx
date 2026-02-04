import * as React from "react";
import type { SearchDoc } from "@/kb/loadKb";
import { useKBRefs } from "@/hooks/useKBRefs";
import { MatchedText } from "@/features/finder/MatchedText";

export type FilterRef =
  | { kind: "type"; value: string }
  | { kind: "jurisdiction"; value: string }
  | { kind: "tag"; value: string };

function isFTag(tag: string): boolean {
  return /^F\d{3,4}$/i.test((tag || "").trim());
}

export function FilterInfoModal(props: {
  open: boolean;
  onClose: () => void;
  filter: FilterRef | null;
  docs: SearchDoc[];
  query?: string;
  onOpenDoc: (doc: SearchDoc) => void;
}) {
  const { open, onClose, filter, docs, query, onOpenDoc } = props;
  const refs = useKBRefs();

  const related = React.useMemo(() => {
    if (!filter) return [] as SearchDoc[];
    if (filter.kind === "type") return docs.filter((d) => d.type === filter.value);
    if (filter.kind === "jurisdiction") return docs.filter((d) => d.jurisdiction === filter.value);
    // tag
    return docs.filter((d) => (d.tags ?? []).includes(filter.value));
  }, [filter, docs]);

  const sorted = React.useMemo(() => {
    return [...related].sort((a, b) => a.title.localeCompare(b.title)).slice(0, 40);
  }, [related]);

  const ftagKey = filter?.kind === "tag" && isFTag(filter.value) ? filter.value.toUpperCase() : null;
  const ftag = ftagKey ? refs.ftags[ftagKey] : null;

  if (!open || !filter) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Filter information"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 9999
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="panel panelPad"
        style={{
          width: "min(980px, 100%)",
          height: "min(86vh, 820px)",
          background: "white",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          overflow: "hidden"
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Filter</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            {filter.kind}: <strong>{filter.value}</strong>
          </div>
          <div style={{ flex: 1 }} />
          <button className="kbTab" onClick={onClose} style={{ cursor: "pointer" }}>
            Close
          </button>
        </div>

        <div style={{ overflow: "auto", paddingTop: 12 }}>
          <div style={{ height: 1, background: "#e5e5e5", marginBottom: 12 }} />

          {filter.kind === "tag" && ftagKey ? (
            <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, padding: 12, background: "#fafafa" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>{ftagKey}</div>
                <div style={{ opacity: 0.8 }}>{ftag?.title ?? "(No definition found yet)"}</div>
              </div>
              {ftag?.definition ? <div style={{ marginTop: 8, lineHeight: 1.45 }}>{ftag.definition}</div> : null}

              {ftag?.surveyFocus?.length ? (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, opacity: 0.9 }}>Survey focus</div>
                  <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                    {ftag.surveyFocus.map((x, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {ftag?.docCues?.length ? (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, opacity: 0.9 }}>Documentation cues</div>
                  <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                    {ftag.docCues.map((x, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {!ftag && !refs.loading ? (
                <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                  Add definitions by creating <strong>/public/kb/ftags.json</strong>.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="muted" style={{ fontSize: 12, lineHeight: 1.45 }}>
              Tip: Add optional reference dictionaries under <strong>/public/kb</strong> (ftags/categories/source_types) to show
              definitions here.
            </div>
          )}

          <div style={{ height: 1, background: "#e5e5e5", margin: "12px 0" }} />

          <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
            <div style={{ fontWeight: 900 }}>Related guidance</div>
            <div className="muted" style={{ fontSize: 12 }}>Top {sorted.length} matches</div>
          </div>

          <div style={{ display: "grid", gap: 8, marginTop: 10, paddingBottom: 6 }}>
            {sorted.length === 0 ? (
              <div className="muted">No related items found.</div>
            ) : (
              sorted.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="card"
                  style={{ textAlign: "left", cursor: "pointer" }}
                  onClick={() => onOpenDoc(d)}
                >
                  <div style={{ fontWeight: 900 }}>
                    <MatchedText text={d.title} query={query} />
                  </div>
                  {d.heading ? (
                    <div className="muted" style={{ marginTop: 4 }}>
                      <MatchedText text={d.heading} query={query} />
                    </div>
                  ) : null}
                  {d.text ? (
                    <div className="muted" style={{ marginTop: 6, fontSize: 12, lineHeight: 1.4 }}>
                      <MatchedText text={d.text.slice(0, 220) + (d.text.length > 220 ? "…" : "")} query={query} />
                    </div>
                  ) : null}
                  <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                    {d.type}{d.jurisdiction ? ` • ${d.jurisdiction}` : ""}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
