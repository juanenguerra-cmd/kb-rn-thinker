import * as React from "react";
import { PacketDraftDrawer } from "@/features/packet/PacketDraftDrawer";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PacketDraftModal({ open, onClose }: Props) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Packet Draft"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        padding: 12,
        zIndex: 70
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(980px, 100%)",
          height: "min(92vh, 980px)",
          background: "var(--surface)",
          borderRadius: 18,
          border: "1px solid var(--border)",
          overflow: "hidden",
          display: "grid",
          gridTemplateRows: "1fr"
        }}
      >
        <PacketDraftDrawer onClose={onClose} />
      </div>
    </div>
  );
}
