import * as React from "react";
import { useAppStore } from "@/store/appStore";

export function ReleaseNotesModal(props: { open: boolean; onClose: () => void }) {
  const { open, onClose } = props;
  const kb = useAppStore((s) => s.kb);
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const changelog = kb?.manifest?.changelog ?? [];
  const latest = changelog.length ? changelog[0] : null;
  const totalPages = Math.max(1, Math.ceil(changelog.length / pageSize));
  const paged = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return changelog.slice(start, start + pageSize);
  }, [changelog, page, pageSize]);

  React.useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [open]);

  React.useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Release Notes"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 9999
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="panel panelPad"
        style={{
          width: "min(980px, 100%)",
          height: "min(80vh, 760px)",
          background: "white",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          overflow: "hidden"
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Release Notes</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>From /kb/manifest.json</div>
          <div style={{ flex: 1 }} />
          <button className="kbTab" onClick={onClose} style={{ cursor: "pointer" }}>
            Close
          </button>
        </div>

        <div style={{ overflow: "auto", paddingTop: 12 }}>
          <div style={{ height: 1, background: "#e5e5e5", marginBottom: 12 }} />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              <strong>KB:</strong> v{kb?.manifest?.kb_version ?? "—"}
            </span>
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              <strong>Effective:</strong> {kb?.manifest?.effective_date ?? "—"}
            </span>
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              <strong>Status:</strong> {kb?.manifest?.approval?.status ?? "—"}
            </span>
            {kb?.manifest?.approval?.approved_date ? (
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                <strong>Approved:</strong> {kb.manifest.approval.approved_date}
              </span>
            ) : null}
          </div>

          <div style={{ height: 1, background: "#e5e5e5", margin: "12px 0" }} />

          {latest ? (
            <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, padding: 12, background: "#fafafa" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>{latest.summary}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>{latest.date}</div>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85, lineHeight: 1.4 }}>
                <div>
                  <strong>Files changed:</strong> {(latest.files_changed ?? []).join(", ")}
                </div>
                <div>
                  <strong>Reason:</strong> {latest.ticket_or_reason ?? "—"}
                </div>
              </div>

            {changelog.length > 1 ? (
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: "pointer", fontSize: 12, opacity: 0.8 }}>
                  View full changelog ({changelog.length}) • Page {page} of {totalPages}
                </summary>
                <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                  {paged.map((c: any, idx: number) => (
                    <div key={`${c.summary}-${c.date ?? idx}`} style={{ border: "1px solid #e5e5e5", borderRadius: 14, padding: 12, background: "white" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 900 }}>{c.summary}</div>
                        <div style={{ opacity: 0.7, fontSize: 12 }}>{c.date}</div>
                        </div>
                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85, lineHeight: 1.4 }}>
                          <div>
                            <strong>Files changed:</strong> {(c.files_changed ?? []).join(", ")}
                          </div>
                          <div>
                            <strong>Reason:</strong> {c.ticket_or_reason ?? "—"}
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
                {changelog.length > pageSize ? (
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </details>
            ) : null}
            </div>
          ) : (
            <div style={{ opacity: 0.7 }}>(No changelog entries found.)</div>
          )}
        </div>
      </div>
    </div>
  );
}
