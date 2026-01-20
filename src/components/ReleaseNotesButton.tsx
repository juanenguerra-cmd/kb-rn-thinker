import * as React from "react";
import { useAppStore } from "@/store/appStore";
import { ReleaseNotesModal } from "@/components/ReleaseNotesModal";

export function ReleaseNotesButton() {
  const kb = useAppStore((s) => s.kb);
  const [open, setOpen] = React.useState(false);

  // Button-only (per requirements). Keep it compact so it doesn't cover content on mobile.

  return (
    <>
      <button
        aria-label="Release notes"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          left: 14,
          bottom: "calc(14px + env(safe-area-inset-bottom))",
          zIndex: 9998,
          width: 46,
          height: 46,
          borderRadius: 9999,
          border: "1px solid rgba(0,0,0,0.12)",
          background: "rgba(255,255,255,0.92)",
          boxShadow: "0 10px 22px rgba(15,23,42,0.10)",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          fontWeight: 900,
          letterSpacing: 0.2
        }}
        title={kb?.manifest?.kb_version ? `KB v${kb.manifest.kb_version}` : "Release Notes"}
      >
        RN
      </button>

      <ReleaseNotesModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
