import type { PacketDraftSection } from "@/store/appStore";
import type { SearchDoc } from "@/kb/loadKb";
import { useKBDoc } from "@/hooks/useKBDoc";
import { SectionViewer } from "@/features/finder/SectionViewer";

export function DocReaderModal(props: {
  open: boolean;
  onClose: () => void;
  result: SearchDoc | null;
  query?: string;
  addSection: PacketDraftSection;
  onChangeAddSection: (s: PacketDraftSection) => void;
  onAdd: (doc: SearchDoc, section: PacketDraftSection) => void;
  onOpenRelated: (doc: SearchDoc) => void;
}) {
  const { open, onClose, result, query, addSection, onChangeAddSection, onAdd, onOpenRelated } = props;

  const view = useKBDoc(result);

  if (!open || !result) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="KB Reader"
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
          height: "min(88vh, 820px)",
          background: "white",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          overflow: "hidden"
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Reader</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>{result.type}{result.jurisdiction ? ` • ${result.jurisdiction}` : ""}</div>
          <div style={{ flex: 1 }} />
          <button className="kbTab" onClick={onClose} style={{ cursor: "pointer" }}>
            Close
          </button>
        </div>

        <div style={{ overflow: "auto", paddingTop: 12 }}>
          <div style={{ height: 1, background: "#e5e5e5", marginBottom: 12 }} />

          <SectionViewer doc={result} source={view?.source} query={query} />

          <div style={{ height: 1, background: "#e5e5e5", margin: "12px 0" }} />

          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            <span className="muted">Add to packet:</span>
            <select
              value={addSection}
              onChange={(e) => onChangeAddSection(e.target.value as PacketDraftSection)}
              className="select"
              style={{ width: 190 }}
              title="Where should this appear in the packet?"
            >
              <option value="citations">Citations</option>
              <option value="assessment">Assessment</option>
              <option value="interventions">Interventions</option>
              <option value="monitoring">Monitoring</option>
              <option value="documentation">Documentation</option>
              <option value="issue">Issue</option>
            </select>
            <button className="btn btnPrimary" onClick={() => onAdd(result, addSection)}>
              Add this section
            </button>
          </div>

          {view?.relatedInSource?.length ? (
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: "pointer", fontSize: 12, opacity: 0.85 }}>
                More from this source ({view.relatedInSource.length})
              </summary>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {view.relatedInSource.slice(0, 30).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className="card"
                    style={{ textAlign: "left", cursor: "pointer" }}
                    onClick={() => onOpenRelated(d)}
                  >
                    <div style={{ fontWeight: 800 }}>{d.heading || d.title}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{d.title}</div>
                  </button>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}
