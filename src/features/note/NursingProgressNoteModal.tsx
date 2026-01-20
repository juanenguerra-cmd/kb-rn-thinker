import * as React from "react";

type Props = {
  open: boolean;
  onClose: () => void;

  issueText?: string;
  vitals?: { bp?: string; hr?: string; rr?: string; t?: string; spo2?: string; pain?: string };
  assessmentPrompts: string[];
  documentationPrompts: string[];
  interventionPrompts: string[];

  /**
   * Optional: pre-check only these items (useful when Step 3 already selected items).
   * If omitted, all prompts start checked.
   */
  defaultSelected?: {
    assessment?: string[];
    documentation?: string[];
    interventions?: string[];
  };
};

export function NursingProgressNoteModal(props: Props) {
  const {
    open,
    onClose,
    issueText,
    vitals,
    assessmentPrompts,
    documentationPrompts,
    interventionPrompts,
    defaultSelected
  } = props;

  const [providerNotified, setProviderNotified] = React.useState(true);
  const [familyNotified, setFamilyNotified] = React.useState(true);

  const [providerTime, setProviderTime] = React.useState("");
  const [providerOrders, setProviderOrders] = React.useState("");
  const [familyName, setFamilyName] = React.useState("");
  const [familyTime, setFamilyTime] = React.useState("");
  const [familyResponse, setFamilyResponse] = React.useState("");

  const [selAssess, setSelAssess] = React.useState<Record<string, boolean>>({});
  const [selInterv, setSelInterv] = React.useState<Record<string, boolean>>({});
  const [selDoc, setSelDoc] = React.useState<Record<string, boolean>>({});

  // Initialize checkbox selections on open.
  React.useEffect(() => {
    if (!open) return;

    const init = (prompts: string[], pre?: string[]) => {
      const map: Record<string, boolean> = {};
      const set = new Set((pre ?? []).map((x) => x.trim()));
      for (const p of prompts) map[p] = pre ? set.has(p.trim()) : true;
      return map;
    };

    setSelAssess(init(assessmentPrompts, defaultSelected?.assessment));
    setSelInterv(init(interventionPrompts, defaultSelected?.interventions));
    setSelDoc(init(documentationPrompts, defaultSelected?.documentation));
  }, [open, assessmentPrompts, interventionPrompts, documentationPrompts, defaultSelected]);

  const pickedAssess = React.useMemo(() => assessmentPrompts.filter((p) => selAssess[p]), [assessmentPrompts, selAssess]);
  const pickedInterv = React.useMemo(() => interventionPrompts.filter((p) => selInterv[p]), [interventionPrompts, selInterv]);
  const pickedDoc = React.useMemo(() => documentationPrompts.filter((p) => selDoc[p]), [documentationPrompts, selDoc]);

  const generated = React.useMemo(() => {
    const issue = issueText?.trim() ? issueText.trim() : "__";
    const vs = vitals
      ? `BP ${vitals.bp ?? "__"}, HR ${vitals.hr ?? "__"}, RR ${vitals.rr ?? "__"}, T ${vitals.t ?? "__"}, SpO2 ${vitals.spo2 ?? "__"}, Pain ${vitals.pain ?? "__"}/10`
      : "BP __, HR __, RR __, T __, SpO2 __, Pain __/10";

    const p1 = `Resident assessed due to ${issue}. Vital signs obtained: ${vs}.`;
    const p2 = pickedAssess.length
      ? `Assessment/Evaluation included: ${pickedAssess.join(", ")}. Relevant findings documented and compared to baseline (as applicable).`
      : `Assessment/Evaluation completed; relevant findings documented and compared to baseline (as applicable).`;

    const p3 = pickedInterv.length
      ? `Interventions performed/initiated: ${pickedInterv.join(", ")}. Resident response/tolerance documented.`
      : `Interventions performed/initiated per protocol/orders as applicable; resident response/tolerance documented.`;

    const providerLine = providerNotified
      ? `Provider notified at ${providerTime || "__"}; orders received: ${providerOrders || "__"} and implemented as appropriate.`
      : `Provider notification not completed (reason: __).`;

    const familyLine = familyNotified
      ? `Family/Emergency Contact notified (${familyName || "__"}) at ${familyTime || "__"}; response/instructions: ${familyResponse || "__"}.`
      : `Family/Emergency Contact notification not completed (reason: __).`;

    const p4 = `${providerLine} ${familyLine}`;
    const p5 = pickedDoc.length
      ? `Documentation completed as applicable: ${pickedDoc.join(", ")}. Plan: continue monitoring per protocol/orders and notify provider for any change in condition.`
      : `Documentation completed as applicable. Plan: continue monitoring per protocol/orders and notify provider for any change in condition.`;

    return `Nursing Progress Note:\n\n${p1}\n\n${p2}\n\n${p3}\n\n${p4}\n\n${p5}`;
  }, [
    issueText,
    vitals,
    pickedAssess,
    pickedDoc,
    pickedInterv,
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

  function selectAll(which: "assessment" | "interventions" | "documentation") {
    const makeAll = (prompts: string[]) => prompts.reduce<Record<string, boolean>>((acc, p) => ((acc[p] = true), acc), {});
    if (which === "assessment") setSelAssess(makeAll(assessmentPrompts));
    if (which === "interventions") setSelInterv(makeAll(interventionPrompts));
    if (which === "documentation") setSelDoc(makeAll(documentationPrompts));
  }

  function clearAll(which: "assessment" | "interventions" | "documentation") {
    if (which === "assessment") setSelAssess({});
    if (which === "interventions") setSelInterv({});
    if (which === "documentation") setSelDoc({});
  }

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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 800 }}>What to assess / evaluate</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => selectAll("assessment")} style={{ padding: "6px 10px", borderRadius: 9999 }}>
                  Select all
                </button>
                <button onClick={() => clearAll("assessment")} style={{ padding: "6px 10px", borderRadius: 9999 }}>
                  Clear
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {assessmentPrompts.map((p) => (
                <label key={p} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={!!selAssess[p]}
                    onChange={(e) => setSelAssess((prev) => ({ ...prev, [p]: e.target.checked }))}
                    style={{ marginTop: 3 }}
                  />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 800 }}>Interventions to document</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => selectAll("interventions")} style={{ padding: "6px 10px", borderRadius: 9999 }}>
                  Select all
                </button>
                <button onClick={() => clearAll("interventions")} style={{ padding: "6px 10px", borderRadius: 9999 }}>
                  Clear
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {interventionPrompts.map((p) => (
                <label key={p} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={!!selInterv[p]}
                    onChange={(e) => setSelInterv((prev) => ({ ...prev, [p]: e.target.checked }))}
                    style={{ marginTop: 3 }}
                  />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 800 }}>Documentation prompts</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => selectAll("documentation")} style={{ padding: "6px 10px", borderRadius: 9999 }}>
                  Select all
                </button>
                <button onClick={() => clearAll("documentation")} style={{ padding: "6px 10px", borderRadius: 9999 }}>
                  Clear
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {documentationPrompts.map((p) => (
                <label key={p} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={!!selDoc[p]}
                    onChange={(e) => setSelDoc((prev) => ({ ...prev, [p]: e.target.checked }))}
                    style={{ marginTop: 3 }}
                  />
                  <span>{p}</span>
                </label>
              ))}
            </div>
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
