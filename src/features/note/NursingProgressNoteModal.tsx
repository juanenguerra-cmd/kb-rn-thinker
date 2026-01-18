import * as React from "react";

type Props = {
  open: boolean;
  onClose: () => void;

  issueText?: string;
  vitals?: { bp?: string; hr?: string; rr?: string; t?: string; spo2?: string; pain?: string };
  assessmentPrompts: string[];
  documentationPrompts: string[];
  interventionPrompts: string[];
};

export function NursingProgressNoteModal(props: Props) {
  const { open, onClose, issueText, vitals, assessmentPrompts, documentationPrompts, interventionPrompts } = props;

  const [providerNotified, setProviderNotified] = React.useState(true);
  const [familyNotified, setFamilyNotified] = React.useState(true);

  const [providerTime, setProviderTime] = React.useState("");
  const [providerOrders, setProviderOrders] = React.useState("");
  const [familyName, setFamilyName] = React.useState("");
  const [familyTime, setFamilyTime] = React.useState("");
  const [familyResponse, setFamilyResponse] = React.useState("");

  const generated = React.useMemo(() => {
    const vs = vitals
      ? `VS: BP ${vitals.bp ?? "__"} HR ${vitals.hr ?? "__"} RR ${vitals.rr ?? "__"} T ${vitals.t ?? "__"} SpO2 ${vitals.spo2 ?? "__"} Pain ${vitals.pain ?? "__"}/10.`
      : "VS: BP __ HR __ RR __ T __ SpO2 __ Pain __/10.";

    const assessLine = `Assessment/Evaluation: ${assessmentPrompts.join("; ")}.`;
    const docLine = `Documentation: ${documentationPrompts.join("; ")}.`;
    const intLine = `Interventions: ${interventionPrompts.join("; ")}.`;

    const providerLine = providerNotified
      ? `Provider notified at ${providerTime || "__"}; orders received: ${providerOrders || "__"} (implemented as appropriate).`
      : `Provider notification: not completed (reason: __).`;

    const familyLine = familyNotified
      ? `Family/EC notified (${familyName || "__"}) at ${familyTime || "__"}; response/instructions: ${familyResponse || "__"}.`
      : `Family/EC notification: not completed (reason: __).`;

    return [
      "Nursing Progress Note:",
      `Issue/Change in condition: ${issueText?.trim() ? issueText.trim() : "__"}`,
      vs,
      assessLine,
      intLine,
      docLine,
      providerLine,
      familyLine,
      "Plan: Continue monitoring per protocol/orders and notify provider for any change in condition."
    ].join("\n");
  }, [
    issueText,
    vitals,
    assessmentPrompts,
    documentationPrompts,
    interventionPrompts,
    providerNotified,
    providerTime,
    providerOrders,
    familyNotified,
    familyName,
    familyTime,
    familyResponse
  ]);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(generated);
    } catch {
      // ignore
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nursing Progress Note"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 50
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ width: "min(980px, 100%)", background: "#fff", borderRadius: 18, border: "1px solid #eee" }}>
        <div style={{ padding: 14, borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Nursing Progress Note</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>Guidance + copy-ready draft</div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ padding: "8px 10px", borderRadius: 9999 }}>
            Close
          </button>
        </div>

        <div style={{ padding: 14, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>What to assess / evaluate</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {assessmentPrompts.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Interventions to document</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {interventionPrompts.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Documentation prompts</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {documentationPrompts.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: "grid", gap: 10, borderTop: "1px solid #eee", paddingTop: 12 }}>
            <div style={{ fontWeight: 900 }}>Notifications (closing lines)</div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={providerNotified} onChange={(e) => setProviderNotified(e.target.checked)} />
                Provider notified and orders documented
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
                <input
                  value={providerTime}
                  onChange={(e) => setProviderTime(e.target.value)}
                  placeholder="Provider notified time (e.g., 14:10)"
                  style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
                  disabled={!providerNotified}
                />
                <input
                  value={providerOrders}
                  onChange={(e) => setProviderOrders(e.target.value)}
                  placeholder="Orders received (brief)"
                  style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
                  disabled={!providerNotified}
                />
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={familyNotified} onChange={(e) => setFamilyNotified(e.target.checked)} />
                Family / Emergency Contact notified
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 8 }}>
                <input
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="Family/EC name"
                  style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
                  disabled={!familyNotified}
                />
                <input
                  value={familyTime}
                  onChange={(e) => setFamilyTime(e.target.value)}
                  placeholder="Time"
                  style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
                  disabled={!familyNotified}
                />
                <input
                  value={familyResponse}
                  onChange={(e) => setFamilyResponse(e.target.value)}
                  placeholder="Response / instructions"
                  style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
                  disabled={!familyNotified}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8, borderTop: "1px solid #eee", paddingTop: 12 }}>
            <div style={{ fontWeight: 900 }}>Generated draft note (copy-ready)</div>
            <textarea
              value={generated}
              readOnly
              style={{ width: "100%", minHeight: 180, padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={copyToClipboard} style={{ padding: "10px 12px", borderRadius: 9999 }}>
                Copy Note
              </button>
              <div style={{ opacity: 0.7, fontSize: 12, alignSelf: "center" }}>
                Tip: This is a draft. Document only what was assessed/performed.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
