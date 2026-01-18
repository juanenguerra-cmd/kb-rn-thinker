import * as React from "react";
import { useAppStore } from "@/store/appStore";
import { docToCitationCard, canIncludeInPacket } from "@/lib/citations";
import { buildPacketModel } from "@/packet/buildPacketModel";
import type { PacketDraftSection } from "@/store/appStore";

export function PacketPrintPage() {
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

  if (!kb || !model) return <div style={{ padding: 20 }}>Loading packet…</div>;

  const sectionsOrder: PacketDraftSection[] = ["assessment", "interventions", "monitoring", "documentation", "citations"];

  return (
    <div className="printPage">
      <div className="noPrint" style={{ display: "flex", gap: 8, padding: 12, borderBottom: "1px solid #eee" }}>
        <button onClick={() => window.print()} style={{ padding: "10px 12px", borderRadius: 9999 }}>
          Print / Save PDF
        </button>
        <a href="/" style={{ padding: "10px 12px", borderRadius: 9999, textDecoration: "none", border: "1px solid #eee" }}>
          Back
        </a>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          KB v{model.kb.kb_version} • {model.kb.approval_status}
        </div>
      </div>

      {model.mode.watermark ? <div className="watermark">{model.mode.watermark}</div> : null}

      <div className="sheet">
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

          {sectionsOrder.map((sec) => {
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
  );
}
