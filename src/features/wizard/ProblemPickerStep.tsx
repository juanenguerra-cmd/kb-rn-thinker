// src/features/wizard/ProblemPickerStep.tsx
import type { CocCatalogItem } from "./useCocCatalog";
import { useCocCatalog } from "./useCocCatalog";

export function ProblemPickerStep(props: {
  query: string;
  selectedId?: string | null;
  onSelect: (item: CocCatalogItem) => void;
}) {
  const { query, selectedId, onSelect } = props;
  const { ranked, loading, error } = useCocCatalog(query);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontWeight: 800 }}>Pick the closest problem (ranked)</div>
      <div style={{ fontSize: 12, opacity: 0.8 }}>
        This selection drives the cascading decision tree. If the top match is wrong, pick a better one.
      </div>

      {loading ? <div style={{ fontSize: 12, opacity: 0.75 }}>Loading COC catalog…</div> : null}
      {error ? (
        <div style={{ border: "1px solid #fca5a5", borderRadius: 12, padding: 10 }}>
          <div style={{ fontWeight: 800 }}>Could not load COC catalog</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>{error}</div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 8 }}>
        {ranked.map((it) => {
          const active = it.id === selectedId;
          return (
            <button
              key={it.id}
              onClick={() => onSelect(it)}
              style={{
                textAlign: "left",
                padding: 10,
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                background: active ? "#f1f5f9" : "#fff",
                cursor: "pointer",
                display: "grid",
                gap: 4
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>{it.label}</div>
                {it.category ? <span style={{ fontSize: 12, opacity: 0.75 }}>{it.category}</span> : null}
              </div>
              {it.synonyms?.length ? (
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Matches: {it.synonyms.slice(0, 4).join(", ")}{it.synonyms.length > 4 ? "…" : ""}
                </div>
              ) : null}
              {it.minimumData?.length ? (
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Minimum data: {it.minimumData.slice(0, 5).join(", ")}{it.minimumData.length > 5 ? "…" : ""}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ProblemPickerStep;
