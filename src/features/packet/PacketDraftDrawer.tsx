import * as React from "react";
import { useAppStore, type PacketDraftSection } from "@/store/appStore";
import { NursingProgressNoteModal } from "@/features/note/NursingProgressNoteModal";

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

export function PacketDraftDrawer() {
  const kb = useAppStore((s) => s.kb);
  const draft = useAppStore((s) => s.packetDraft);
  const actions = useAppStore((s) => s.actions);
  const ui = useAppStore((s) => s.ui);
  const prompts = useAppStore((s) => s.notePrompts);

  const docsByKey = React.useMemo(() => {
    const map = new Map<string, any>();
    kb?.searchIndex.docs.forEach((d) => map.set(`${d.source_id}::${d.section_id}`, d));
    return map;
  }, [kb]);

  return (
    <div style={{ padding: 16, borderLeft: "1px solid #eee", height: "100vh", overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Packet Draft</div>
        <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.7 }}>
          KB v{draft.meta.kb_version} • {draft.meta.approval_status}
        </div>
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        <button
          onClick={() => window.open("/packet", "_blank")}
          style={{ padding: "10px 12px", borderRadius: 9999 }}
        >
          Preview / Print Packet
        </button>

        <button onClick={actions.openNoteModal} style={{ padding: "10px 12px", borderRadius: 9999 }}>
          Nursing Progress Note
        </button>
      </div>

      <textarea
        value={draft.meta.issue_text ?? ""}
        onChange={(e) => actions.setDraftIssueText(e.target.value)}
        placeholder="Issue / reason for packet (optional)…"
        style={{ width: "100%", marginTop: 12, padding: 10, borderRadius: 12, border: "1px solid #ddd", minHeight: 64 }}
      />

      <div style={{ marginTop: 14, fontWeight: 800 }}>Packet Sections</div>
      <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
        {sectionOrder
          .filter((s) => s !== "issue" && s !== "citations")
          .map((sec) => (
            <div key={sec} style={{ border: "1px solid #eee", borderRadius: 14, padding: 10 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{sectionLabels[sec]}</div>
              <textarea
                value={draft.sectionNotes[sec] ?? ""}
                onChange={(e) => actions.setSectionNote(sec, e.target.value)}
                placeholder={`Notes for ${sectionLabels[sec]}… (you can paste protocols, prompts, monitoring cadence, etc.)`}
                style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #ddd", minHeight: 64 }}
              />
            </div>
          ))}
      </div>

      <div style={{ marginTop: 16, fontWeight: 800 }}>Included Citations (Approved Curated)</div>
      {draft.allowedIds.length === 0 ? <div style={{ opacity: 0.7, marginTop: 6 }}>(None yet)</div> : null}

      {draft.items
        .filter((it) => draft.allowedIds.includes(it.id))
        .map((it) => {
          const doc = docsByKey.get(`${it.ref.source_id}::${it.ref.section_id}`);
          return (
            <div key={it.id} style={{ marginTop: 10, border: "1px solid #e5e5e5", borderRadius: 14, padding: 10 }}>
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

              <button
                onClick={() => actions.removeFromDraft(it.id)}
                style={{ marginTop: 8, borderRadius: 9999, padding: "6px 10px" }}
              >
                Remove
              </button>
            </div>
          );
        })}

      <div style={{ marginTop: 18, fontWeight: 800 }}>Excluded (Blocked)</div>
      {draft.blockedIds.length === 0 ? <div style={{ opacity: 0.7, marginTop: 6 }}>(None)</div> : null}

      {draft.items
        .filter((it) => draft.blockedIds.includes(it.id))
        .map((it) => {
          const doc = docsByKey.get(`${it.ref.source_id}::${it.ref.section_id}`);
          const reason = draft.blockedReasons[it.id] || "Blocked";
          return (
            <div key={it.id} style={{ marginTop: 10, border: "1px solid #f0c", borderRadius: 14, padding: 10 }}>
              <div style={{ fontWeight: 800 }}>{doc?.title ?? it.ref.source_id}</div>
              <div style={{ opacity: 0.8 }}>{doc?.heading ?? it.ref.section_id}</div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>Reason: {reason}</div>
              <button
                onClick={() => actions.removeFromDraft(it.id)}
                style={{ marginTop: 8, borderRadius: 9999, padding: "6px 10px" }}
              >
                Remove
              </button>
            </div>
          );
        })}

      <NursingProgressNoteModal
        open={ui.noteModalOpen}
        onClose={actions.closeNoteModal}
        issueText={draft.meta.issue_text}
        assessmentPrompts={prompts.assessment}
        documentationPrompts={prompts.documentation}
        interventionPrompts={prompts.interventions}
      />
    </div>
  );
}
