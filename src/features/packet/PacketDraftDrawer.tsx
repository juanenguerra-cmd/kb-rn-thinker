import * as React from "react";
import { useAppStore, type PacketDraftSection } from "@/store/appStore";
import { PacketPreviewModal } from "@/features/packet/PacketPreviewModal";

const sectionOrder: PacketDraftSection[] = [
  "issue",
  "assessment",
  "interventions",
  "monitoring",
  "documentation",
  "citations"
];

const sectionLabels: Record<PacketDraftSection, string> = {
  issue: "Issue",
  assessment: "Assessment",
  interventions: "Interventions",
  monitoring: "Monitoring",
  documentation: "Documentation",
  citations: "Citations"
};

type Props = {
  onClose?: () => void;
};

export function PacketDraftDrawer({ onClose }: Props) {
  // NOTE: This component is used inside a modal. Keep it height:100% (not 100vh)
  // so it doesn't create nested viewport scroll traps on mobile.
  const kb = useAppStore((s) => s.kb);
  const draft = useAppStore((s) => s.packetDraft);
  const actions = useAppStore((s) => s.actions);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const docsByKey = React.useMemo(() => {
    const map = new Map<string, any>();
    kb?.searchIndex.docs.forEach((d) => map.set(`${d.source_id}::${d.section_id}`, d));
    return map;
  }, [kb]);

  return (
    <div style={{ height: "100%", maxHeight: "100%", overflow: "auto" }}>
      <div className="actionBar">
        <div className="actionBarInner">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Packet Draft</div>
            <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>
              KB v{draft.meta.kb_version} • {draft.meta.approval_status}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setPreviewOpen(true)} className="btn btnPrimary">
              Preview / Print Packet
            </button>

            {onClose ? (
              <button onClick={onClose} className="btn" aria-label="Close packet draft">
                Close
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <PacketPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} />

      <div style={{ padding: 16 }}>
        <textarea
          value={draft.meta.issue_text ?? ""}
          onChange={(e) => actions.setDraftIssueText(e.target.value)}
          placeholder="Issue / reason for packet (optional)…"
          className="textarea"
          style={{ minHeight: 64 }}
        />

        <div style={{ marginTop: 14, fontWeight: 900 }}>Packet Sections</div>
        <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
        {sectionOrder
          .filter((s) => s !== "issue" && s !== "citations")
          .map((sec) => (
            <div key={sec} className="card">
              <div style={{ fontWeight: 900, marginBottom: 6 }}>{sectionLabels[sec]}</div>
              <textarea
                value={draft.sectionNotes[sec] ?? ""}
                onChange={(e) => actions.setSectionNote(sec, e.target.value)}
                placeholder={`Notes for ${sectionLabels[sec]}… (you can paste protocols, prompts, monitoring cadence, etc.)`}
                className="textarea"
                style={{ minHeight: 64 }}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, fontWeight: 900 }}>Included Citations (Approved Curated)</div>
        {draft.allowedIds.length === 0 ? <div className="muted" style={{ marginTop: 6 }}>(None yet)</div> : null}

      {draft.items
        .filter((it) => draft.allowedIds.includes(it.id))
        .map((it) => {
          const doc = docsByKey.get(`${it.ref.source_id}::${it.ref.section_id}`);
          return (
            <div key={it.id} className="card" style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 800 }}>{doc?.title ?? it.ref.source_id}</div>
              <div style={{ opacity: 0.8 }}>{doc?.heading ?? it.ref.section_id}</div>

              <select
                value={it.section}
                onChange={(e) => actions.moveDraftItem(it.id, e.target.value as PacketDraftSection)}
                style={{ marginTop: 8, padding: "7px 10px", borderRadius: 9999 }}
                title="Move to packet section"
              >
                <option value="citations">Citations</option>
                <option value="assessment">Assessment</option>
                <option value="interventions">Interventions</option>
                <option value="monitoring">Monitoring</option>
                <option value="documentation">Documentation</option>
                <option value="issue">Issue</option>
              </select>

              <button onClick={() => actions.removeFromDraft(it.id)} className="btn" style={{ marginTop: 8 }}>
                Remove
              </button>
            </div>
          );
        })}

        <div style={{ marginTop: 18, fontWeight: 900 }}>Excluded (Blocked)</div>
        {draft.blockedIds.length === 0 ? <div className="muted" style={{ marginTop: 6 }}>(None)</div> : null}

      {draft.items
        .filter((it) => draft.blockedIds.includes(it.id))
        .map((it) => {
          const doc = docsByKey.get(`${it.ref.source_id}::${it.ref.section_id}`);
          const reason = draft.blockedReasons[it.id] || "Blocked";
          return (
            <div key={it.id} className="card" style={{ marginTop: 10, borderColor: "rgba(225, 29, 72, 0.35)", background: "rgba(225, 29, 72, 0.03)" }}>
              <div style={{ fontWeight: 800 }}>{doc?.title ?? it.ref.source_id}</div>
              <div style={{ opacity: 0.8 }}>{doc?.heading ?? it.ref.section_id}</div>
              <div className="muted" style={{ marginTop: 6 }}>Reason: {reason}</div>
              <button onClick={() => actions.removeFromDraft(it.id)} className="btn" style={{ marginTop: 8 }}>
                Remove
              </button>
            </div>
          );
        })}

      </div>
    </div>
  );
}
