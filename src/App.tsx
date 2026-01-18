import * as React from "react";
import { loadKB } from "@/kb/loadKb";
import { useAppStore } from "@/store/appStore";
import { GuidanceFinderTab } from "@/features/finder/GuidanceFinderTab";
import { DecisionWizardTab } from "@/features/wizard/DecisionWizardTab";
import { PacketDraftDrawer } from "@/features/packet/PacketDraftDrawer";

function TopTabs() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setTab = useAppStore((s) => s.actions.setTab);

  const tabStyle = (tab: "finder" | "wizard") => ({
    padding: "10px 12px",
    borderRadius: 9999,
    border: "1px solid #eee",
    background: activeTab === tab ? "#111" : "#fff",
    color: activeTab === tab ? "#fff" : "#111",
    cursor: "pointer"
  });

  return (
    <div style={{ display: "flex", gap: 8, padding: 12, borderBottom: "1px solid #eee", alignItems: "center" }}>
      <div style={{ fontWeight: 900 }}>LTC/SNF Knowledge Base</div>
      <div style={{ flex: 1 }} />
      <button style={tabStyle("finder")} onClick={() => setTab("finder")}>Guidance Finder</button>
      <button style={tabStyle("wizard")} onClick={() => setTab("wizard")}>Decision Wizard</button>
    </div>
  );
}

export default function App() {
  const kb = useAppStore((s) => s.kb);
  const actions = useAppStore((s) => s.actions);
  const activeTab = useAppStore((s) => s.activeTab);

  React.useEffect(() => {
    loadKB()
      .then((loaded) => actions.loadKb(loaded))
      .catch((e) => console.error(e));
  }, [actions]);

  if (!kb) return <div style={{ padding: 20 }}>Loading KB…</div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", height: "100vh" }}>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopTabs />
        <div style={{ overflow: "auto" }}>
          {activeTab === "finder" ? <GuidanceFinderTab /> : <DecisionWizardTab />}
        </div>
      </div>
      <PacketDraftDrawer />
    </div>
  );
}
