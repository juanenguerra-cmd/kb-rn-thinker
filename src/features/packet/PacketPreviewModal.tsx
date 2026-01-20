import * as React from "react";
import { useAppStore } from "@/store/appStore";
import type { PacketDraftSection } from "@/store/appStore";
import { docToCitationCard, canIncludeInPacket } from "@/lib/citations";
import { buildPacketModel } from "@/packet/buildPacketModel";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PacketPreviewModal({ open, onClose }: Props) {
  const kb = useAppStore((s) => s.kb);
  const draft = useAppStore((s) => s.packetDraft);

  const model = React.useMemo(() => {
    if (!kb) return null;

    const options = { allowExternal: false, allowUnapproved: false };
    const included: Array<{ card: any; section: PacketDraftSection }> = [];
    const excluded: Array<{ label: string; reason: string }> = [];

    for (const item of draft.items) {
      const doc = kb.searchIndex.docs.find(
        (d) => d.source_id === item.ref.source_id && d.section_id === item.ref.section_id
      );
      if (!doc) {
        excluded.push({ label: `${item.ref.source_id} / ${item.ref.section_id}`, reason: "Not found in current KB" });
        continue;
      }
      const src = kb.sources.find((s) => s.source_id === doc.source_id);
      const card = docToCitationCard(doc, src);
      const gate = canIncludeInPacket(card, options);
      if (gate.ok) included.push({ card, section: item.section });
      else excluded.push({ label: `${card.title} — ${card.heading ?? ""}`.trim(), reason: gate.reason });
    }

    return buildPacketModel({
      kb,
      issue_text: draft.meta.issue_text,
      sectionNotes: draft.sectionNotes,
      included,
      excluded
    });
  }, [kb, draft.items, draft.meta.issue_text, draft.sectionNotes]);

  React.useEffect(() => {
    if (!open) return;
    const cleanup = () => document.body.classList.remove("printPacketOnly");
    window.addEventListener("afterprint", cleanup);
    return () => window.removeEventListener("afterprint", cleanup);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Packet Preview"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        padding: 12,
        zIndex: 60
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="packetModalPrintArea"
        style={{
          width: "min(980px, 100%)",
          height: "min(92vh, 980px)",
          background: "#fff",
          borderRadius: 18,
          border: "1px solid #eee",
          overflow: "hidden",
          display: "grid",
          gridTemplateRows: "auto 1fr"
        }}
      >
        <div className="noPrint" style={{ padding: 12, borderBottom: "1px solid #eee", display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>Packet Preview</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {kb ? `KB v${kb.manifest.kb_version} • ${kb.manifest.approval.status}` : "Loading KB…"}
          </div>
          <div style={{ flex: 1 }} />
          <button
            className="btn"
            onClick={() => {
              document.body.classList.add("printPacketOnly");
              setTimeout(() => window.print(), 50);
            }}
          >
            Print / Save PDF
          </button>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div style={{ overflow: "auto" }}>
          {!kb || !model ? (
            <div style={{ padding: 20 }}>Loading packet…</div>
          ) : (
            <div className="printPage" style={{ padding: 0 }}>
              <div className="sheet" style={{ margin: 16 }}>
                <header className="sheetHeader">
                  <h1>{model.subject.issue_title}</h1>
                  <div className="meta">
                    <div>
                      <strong>Generated:</strong> {new Date(model.generated_at).toLocaleString()}
                    </div>
                    <div>
                      <strong>KB:</strong> v{model.kb.kb_version} (Effective {model.kb.effective_date})
                    </div>
                    <div>
                      <strong>Approval:</strong> {model.kb.approval_status}
                    </div>
                  </div>
                </header>

                {model.sections.map((sec, idx) => (
                  <section key={idx} className="block">
                    <h2>{sec.title}</h2>
                    <p>{sec.body}</p>
                  </section>
                ))}

                <section className="block">
                  <h2>Citations (Approved Curated Only)</h2>

                  {(["assessment", "interventions", "monitoring", "documentation", "citations"] as PacketDraftSection[]).map((sec) => {
                    const list = model.citations.included_by_section[sec] ?? [];
                    if (!list.length) return null;
                    return (
                      <div key={sec} style={{ marginTop: 10 }}>
                        <div style={{ fontWeight: 900, marginBottom: 6, opacity: 0.9 }}>{sec.toUpperCase()}</div>
                        <div className="citations">
                          {list.map((c: (typeof list)[number]) => (
                            <div key={c.key} className="citationCard">
                              <div className="ctitle">{c.title}</div>
                              {c.heading ? <div className="chead">{c.heading}</div> : null}
                              {c.excerpt ? <div className="cex">{c.excerpt}</div> : null}
                              <div className="cmeta">
                                <span>{c.type}</span>
                                {c.jurisdiction ? <span> • {c.jurisdiction}</span> : null}
                                {c.effective_date ? <span> • Effective {c.effective_date}</span> : null}
                              </div>
                              {c.url_or_location ? <div className="cloc">{c.url_or_location}</div> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {model.citations.excluded?.length ? (
                    <details className="excluded">
                      <summary>Excluded citations ({model.citations.excluded.length})</summary>
                      <ul>
                        {model.citations.excluded.map((x, i) => (
                          <li key={i}>
                            {x.label} — <em>{x.reason}</em>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </section>

                <footer className="sheetFooter">
                  {model.footer.disclaimer_lines.map((l, i) => (
                    <div key={i} className="disclaimer">
                      {l}
                    </div>
                  ))}
                </footer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
