import { useAppStore } from "@/store/appStore";

export function OverviewPanel() {
  const actions = useAppStore((s) => s.actions);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 20 }}>All-Around Knowledge Base</div>
        <div style={{ color: "var(--muted)", marginTop: 6 }}>
          Start with the tool you need. The decision tree wizard is now one of the tools inside this all-around page.
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
            Build a guided assessment, answer prompts, and generate a summary you can add to a packet draft.
          </div>
          <div className="toolCardActions">
            <button className="btn btnPrimary" onClick={() => actions.setTab("wizard")}>Open Wizard</button>
          </div>
        </div>

        <div className="toolCard">
          <div className="toolCardHeader">
            <div>
              <div className="toolCardTitle">Guidance Finder</div>
              <div className="toolCardSubtitle">Search policies, CMS, CDC, and NYSDOH guidance.</div>
            </div>
            <span className="toolBadge">Search</span>
          </div>
          <div className="toolCardBody">
            Filter by type, jurisdiction, or tags and save key citations directly into the packet draft.
          </div>
          <div className="toolCardActions">
            <button className="btn" onClick={() => actions.setTab("finder")}>Open Finder</button>
          </div>
        </div>

        <div className="toolCard">
          <div className="toolCardHeader">
            <div>
              <div className="toolCardTitle">Packet Draft</div>
              <div className="toolCardSubtitle">Collect decisions, notes, and citations.</div>
            </div>
            <span className="toolBadge">Draft</span>
          </div>
          <div className="toolCardBody">
            Use the floating Draft button any time to review and export your packet materials.
          </div>
          <div className="toolCardActions">
            <button className="btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Got it</button>
          </div>
        </div>
      </div>
    </div>
  );
}
