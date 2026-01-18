import type { PacketDraftSection } from "@/store/appStore";

export type SourceCardModel = {
  id: string;
  title: string;
  heading?: string;
  text?: string;
  type: string;
  jurisdiction?: string;
  effective_date?: string;
  review_by?: string;
  url_or_location?: string;
  tags?: string[];
};

function highlight(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  const before = text.slice(0, idx);
  const mid = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return `${before}[[H]]${mid}[[/H]]${after}`;
}

function renderHighlighted(text: string) {
  const parts = text.split("[[H]]");
  if (parts.length === 1) return <>{text}</>;
  const first = parts[0];
  const rest = parts.slice(1).join("[[H]]");
  const [mid, after] = rest.split("[[/H]]");
  return (
    <>
      {first}
      <mark>{mid}</mark>
      {after}
    </>
  );
}

export function SourceCard(props: {
  model: SourceCardModel;
  query?: string;
  addSection: PacketDraftSection;
  onChangeAddSection: (s: PacketDraftSection) => void;
  onAdd: (section: PacketDraftSection) => void;
  addDisabled?: boolean;
  addDisabledReason?: string;
}) {
  const { model, query, addSection, onChangeAddSection, onAdd, addDisabled, addDisabledReason } = props;

  const snippet = model.text ? highlight(model.text, query ?? "") : "";
  const tags = (model.tags ?? []).slice(0, 12);

  return (
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 16, padding: 12 }}>
      <div style={{ fontWeight: 800 }}>{model.title}</div>
      {model.heading ? <div style={{ opacity: 0.8 }}>{model.heading}</div> : null}

      {model.text ? <div style={{ marginTop: 8, opacity: 0.95 }}>{renderHighlighted(snippet)}</div> : null}

      {tags.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 9999,
                border: "1px solid #eee",
                opacity: 0.85
              }}
              title={t}
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {model.type}
          {model.jurisdiction ? ` • ${model.jurisdiction}` : ""}
          {model.review_by ? ` • Review by: ${model.review_by}` : ""}
        </span>
        <div style={{ flex: 1 }} />

        <select
          value={addSection}
          onChange={(e) => onChangeAddSection(e.target.value as PacketDraftSection)}
          style={{ padding: "7px 10px", borderRadius: 9999 }}
          title="Where should this appear in the packet?"
        >
          <option value="citations">Citations</option>
          <option value="assessment">Assessment</option>
          <option value="interventions">Interventions</option>
          <option value="monitoring">Monitoring</option>
          <option value="documentation">Documentation</option>
          <option value="issue">Issue</option>
        </select>

        <button
          onClick={() => onAdd(addSection)}
          disabled={!!addDisabled}
          title={addDisabled ? addDisabledReason : "Add this reference to the packet draft"}
          style={{ padding: "8px 10px", borderRadius: 9999, opacity: addDisabled ? 0.5 : 1 }}
        >
          Add to Packet
        </button>
      </div>

      {model.url_or_location ? <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>{model.url_or_location}</div> : null}
    </div>
  );
}
