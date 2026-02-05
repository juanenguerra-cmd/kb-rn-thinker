import * as React from "react";
import { loadKB } from "@/kb/loadKb";
import { useAppStore } from "@/store/appStore";
import { OverviewPanel } from "@/features/home/OverviewPanel";
import { DecisionWizardTab } from "@/features/wizard/DecisionWizardTab";
import { GuidanceFinderTab } from "@/features/finder/GuidanceFinderTab";
import { PacketDraftFab } from "@/features/packet/PacketDraftFab";
import { PacketDraftModal } from "@/features/packet/PacketDraftModal";
import { ReleaseNotesButton } from "@/components/ReleaseNotesButton"; // ✅ ADD THIS

export default function App() {
  const kb = useAppStore((s) => s.kb);
  const actions = useAppStore((s) => s.actions);
  const activeTab = useAppStore((s) => s.activeTab);
  const [packetOpen, setPacketOpen] = React.useState(false);

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
              className={`kbTab ${activeTab === "home" ? "kbTabActive" : ""}`}
              onClick={() => actions.setTab("home")}
            >
              Overview
            </button>
            <button
              className={`kbTab ${activeTab === "wizard" ? "kbTabActive" : ""}`}
              onClick={() => actions.setTab("wizard")}
            >
              Decision Wizard
            </button>
            <button
              className={`kbTab ${activeTab === "finder" ? "kbTabActive" : ""}`}
              onClick={() => actions.setTab("finder")}
            >
              Guidance Finder
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
          {activeTab === "home" ? <OverviewPanel /> : null}
          {activeTab === "wizard" ? <DecisionWizardTab /> : null}
          {activeTab === "finder" ? <GuidanceFinderTab /> : null}
        </div>
      </div>

      <PacketDraftFab onOpen={() => setPacketOpen(true)} />
      <PacketDraftModal open={packetOpen} onClose={() => setPacketOpen(false)} />

      {/* ✅ ADD THIS (bottom-left fixed button + modal) */}
      <ReleaseNotesButton />
    </div>
  );
}
