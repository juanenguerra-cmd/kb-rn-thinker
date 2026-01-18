import * as React from "react";
import { useAppStore } from "@/store/appStore";
import { ReleaseNotesModal } from "@/components/ReleaseNotesModal";

export function ReleaseNotesButton() {
  const kb = useAppStore((s) => s.kb);
  const [open, setOpen] = React.useState(false);

  const latest = React.useMemo(() => {
    const log = kb?.manifest?.changelog ?? [];
    return log.length ? log[0] : null;
  }, [kb]);

  return (
    <>
      <div
        style={{
          position: "fixed",
          left: 14,
          bottom: 14,
          zIndex: 9998,
          display: "flex",
          gap: 10,
          alignItems: "center",
          padding: "10px 12px",
          borderRadius: 14,
          border: "1px solid rgba(0,0,0,0.12)",
          background: "rgba(255,255,255,0.92)",
          boxShadow: "0 10px 22px rgba(15,23,42,0.10)"
        }}
      >
        <button
          onClick={() => setOpen(true)}
          style={{
            padding: "8px 12px",
            borderRadius: 9999,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "white",
            cursor: "pointer",
            fontWeight: 800
          }}
        >
          Release Notes
        </button>

        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {kb?.manifest?.kb_version ? `KB v${kb.manifest.kb_version}` : "KB —"}
          {latest?.date ? ` • ${latest.date}` : ""}
        </div>
      </div>

      <ReleaseNotesModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
