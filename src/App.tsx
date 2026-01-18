import * as React from "react";
import { loadKB } from "@/kb/loadKb";
import { useAppStore } from "@/store/appStore";
import { GuidanceFinderTab } from "@/features/finder/GuidanceFinderTab";
import { DecisionWizardTab } from "@/features/wizard/DecisionWizardTab";
import { PacketDraftDrawer } from "@/features/packet/PacketDraftDrawer";

export default function App() {
  const actions = useAppStore((s) => s.actions);
  const kb = useAppStore((s) => s.kb);

  const activeTab = useAppStore((s) => s.ui.activeTab ?? "finder");
  const setTab = useAppStore((s) => s.actions.setActiveTab);

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
              onClick={() => setTab("finder")}
            >
              Guidance Finder
            </button>
            <button
              className={`kbTab ${activeTab === "wizard" ? "kbTabActive" : ""}`}
              onClick={() => setTab("wizard")}
            >
              Decision Wizard
            </button>
          </div>

          <div className="kbRight">
            {kb ? <>KB v{kb.manifest.kb_version} • {kb.manifest.approval.status}</> : "Loading KB…"}
          </div>
        </div>
      </div>

      <div className="kbMain">
        <div className="panel panelPad">
          {activeTab === "finder" ? <GuidanceFinderTab /> : <DecisionWizardTab />}
        </div>

        <div className="panel panelPad stickyTop">
          <PacketDraftDrawer />
        </div>
      </div>
    </div>
  );
}
