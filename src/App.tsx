import * as React from "react";
import { loadKB } from "@/kb/loadKb";
import { useAppStore } from "@/store/appStore";
import { GuidanceFinderTab } from "@/features/finder/GuidanceFinderTab";
import { DecisionWizardTab } from "@/features/wizard/DecisionWizardTab";
import { PacketDraftDrawer } from "@/features/packet/PacketDraftDrawer";

export default function App() {
  const kb = useAppStore((s) => s.kb);
  const actions = useAppStore((s) => s.actions);
  const activeTab = useAppStore((s) => s.activeTab);

  React.useEffect(() => {
    loadKB().then(actions.loadKb).catch(console.error);
  }, [actions]);

  return (
    <div className="kbApp">
      <div className="kbHeader">
        <div className="kbHeaderInner">
          <div className="kbTitle">LTC/SNF Knowledge Base</div>

          <div className="kbTabs">
            <button
              className={`kbTab ${activeTab === "finder" ? "kbTabActive" : ""}`}
              onClick={() => actions.setTab("finder")}
            >
              Guidance Finder
            </button>
            <button
              className={`kbTab ${activeTab === "wizard" ? "kbTabActive" : ""}`}
              onClick={() => actions.setTab("wizard")}
            >
              Decision Wizard
            </button>
          </div>

          <div className="kbRight">
            {kb ? (
              <span>
                KB v{kb.manifest.kb_version} • {kb.manifest.approval.status}
              </span>
            ) : (
              <span>Loading KB…</span>
            )}
          </div>
        </div>
      </div>

      <div className="kbMain">
        <div className="panel panelPad" style={{ minWidth: 0 }}>
          {activeTab === "finder" ? <GuidanceFinderTab /> : <DecisionWizardTab />}
        </div>

        <div className="panel panelPad stickyTop" style={{ height: "calc(100vh - 110px)", overflow: "auto" }}>
          <PacketDraftDrawer />
        </div>
      </div>
    </div>
  );
}
