import type { KBSource, SearchDoc } from "@/kb/loadKb";
import { MatchedText } from "@/features/finder/MatchedText";

export function SectionViewer(props: {
  doc: SearchDoc;
  source?: KBSource;
  query?: string;
}) {
  const { doc, source, query } = props;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 16 }}>{doc.title}</div>
        {doc.heading ? <div className="muted" style={{ marginTop: 4 }}>{doc.heading}</div> : null}
      </div>

      <div className="panel" style={{ borderRadius: 14, padding: 12 }}>
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
          <MatchedText text={doc.text || ""} query={query} />
        </div>
      </div>

      <div className="muted" style={{ fontSize: 12, lineHeight: 1.4 }}>
        <div>
          <strong>Type:</strong> {doc.type}
          {doc.jurisdiction ? ` • ${doc.jurisdiction}` : ""}
        </div>
        {doc.effective_date ? (
          <div>
            <strong>Effective:</strong> {doc.effective_date}
          </div>
        ) : null}
        {doc.review_by || source?.review_by ? (
          <div>
            <strong>Review by:</strong> {doc.review_by || source?.review_by}
          </div>
        ) : null}
        {doc.url_or_location || source?.url_or_location ? (
          <div>
            <strong>Location:</strong> {doc.url_or_location || source?.url_or_location}
          </div>
        ) : null}
        <div>
          <strong>Citation key:</strong> {doc.source_id} • {doc.section_id}
        </div>
      </div>
    </div>
  );
}
