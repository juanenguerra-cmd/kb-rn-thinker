import { useAppStore } from "@/store/appStore";

export function OverviewPanel() {
  const actions = useAppStore((s) => s.actions);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 20 }}>All-Around Knowledge Base</div>
        <div style={{ color: "var(--muted)", marginTop: 6 }}>
          Start with the decision wizard for guided, step-by-step clinical decision support.
        </div>
      </div>

      <div className="toolGrid">
        <div className="toolCard">
          <div className="toolCardHeader">
            <div>
              <div className="toolCardTitle">Decision Tree Wizard</div>
              <div className="toolCardSubtitle">Step-by-step clinical decision support.</div>
            </div>
            <span className="toolBadge">Decision Tree</span>
          </div>
          <div className="toolCardBody">
            Build a guided assessment, answer prompts, and generate a concise summary.
          </div>
          <div className="toolCardActions">
            <button className="btn btnPrimary" onClick={() => actions.setTab("wizard")}>Open Wizard</button>
          </div>
        </div>
      </div>
    </div>
  );
}
