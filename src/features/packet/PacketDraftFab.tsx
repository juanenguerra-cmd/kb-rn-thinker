import { useAppStore } from "@/store/appStore";

type Props = {
  onOpen: () => void;
};

export function PacketDraftFab({ onOpen }: Props) {
  const draft = useAppStore((s) => s.packetDraft);
  const allowedCount = draft.allowedIds.length;
  const totalCount = draft.items.length;

  const label = allowedCount > 0 ? `Packet (${allowedCount})` : totalCount > 0 ? `Packet (${totalCount})` : "Packet";

  return (
    <button
      aria-label="Open packet draft"
      onClick={onOpen}
      style={{
        position: "fixed",
        right: 14,
        bottom: "calc(14px + env(safe-area-inset-bottom))",
        zIndex: 9998,
        height: 46,
        padding: "0 14px",
        borderRadius: 9999,
        border: "1px solid rgba(0,0,0,0.12)",
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 10px 22px rgba(15,23,42,0.10)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontWeight: 900,
        letterSpacing: 0.2
      }}
      title="Open Packet Draft"
    >
      <span style={{ fontSize: 12, opacity: 0.85 }}>📎</span>
      <span style={{ fontSize: 13 }}>{label}</span>
      {allowedCount > 0 ? (
        <span
          style={{
            marginLeft: 2,
            minWidth: 22,
            height: 22,
            borderRadius: 9999,
            background: "rgba(37, 99, 235, 0.12)",
            color: "var(--primary-2)",
            display: "grid",
            placeItems: "center",
            fontSize: 12
          }}
        >
          {allowedCount}
        </span>
      ) : null}
    </button>
  );
}
