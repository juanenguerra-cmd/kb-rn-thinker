import { useAppStore } from "@/store/appStore";

export function DecisionWizardTab() {
  const wizard = useAppStore((s) => s.wizard);
  const draft = useAppStore((s) => s.packetDraft);
  const actions = useAppStore((s) => s.actions);

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 900, fontSize: 18 }}>Decision Wizard (Starter)</div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        This is a scaffolding wizard. Next phase: load executable trees from /kb/trees and run them.
      </div>

      {wizard.step === 1 ? (
        <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 12, display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 800 }}>Step 1: What’s going on?</div>
          <textarea
            value={draft.meta.issue_text ?? ""}
            onChange={(e) => actions.setDraftIssueText(e.target.value)}
            placeholder="Describe the issue (e.g., fever + cough, fall unwitnessed, low O2)…"
            style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #ddd", minHeight: 80 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={actions.wizardReset} style={{ padding: "10px 12px", borderRadius: 9999 }}>
              Reset
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={actions.wizardNext} style={{ padding: "10px 12px", borderRadius: 9999 }}>
              Next
            </button>
          </div>
        </div>
      ) : null}

      {wizard.step === 2 ? (
        <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 12, display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 800 }}>Step 2: Quick triage</div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 700 }}>Change in condition?</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["unknown", "yes", "no"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => actions.wizardSetChangeOfCondition(v)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 9999,
                    border: "1px solid #eee",
                    opacity: wizard.changeOfCondition === v ? 1 : 0.6
                  }}
                >
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 700 }}>Any red flags right now?</div>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={wizard.redFlags.lowO2}
                onChange={(e) => actions.wizardToggleRedFlag("lowO2", e.target.checked)}
              />
              Low O2 / respiratory distress
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={wizard.redFlags.lowBP}
                onChange={(e) => actions.wizardToggleRedFlag("lowBP", e.target.checked)}
              />
              Low BP / signs of shock
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={wizard.redFlags.chestPain}
                onChange={(e) => actions.wizardToggleRedFlag("chestPain", e.target.checked)}
              />
              Chest pain / acute cardiac symptoms
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={wizard.redFlags.acuteNeuroChange}
                onChange={(e) => actions.wizardToggleRedFlag("acuteNeuroChange", e.target.checked)}
              />
              Acute neuro change (new weakness, slurred speech, etc.)
            </label>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={actions.wizardBack} style={{ padding: "10px 12px", borderRadius: 9999 }}>
              Back
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={actions.wizardNext} style={{ padding: "10px 12px", borderRadius: 9999 }}>
              Next
            </button>
          </div>
        </div>
      ) : null}

      {wizard.step === 3 ? (
        <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 12, display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 800 }}>Step 3: Suggested actions (starter output)</div>

          {Object.values(wizard.redFlags).some(Boolean) ? (
            <div style={{ border: "1px solid #f5c", borderRadius: 14, padding: 10 }}>
              <div style={{ fontWeight: 800 }}>Red flag present</div>
              <div style={{ opacity: 0.9 }}>
                Prioritize immediate safety assessment, obtain vital signs, and notify provider per protocol. Escalate to
                EMS when indicated.
              </div>
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 700 }}>Assessment</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Full vital signs (BP/HR/RR/T/SpO2) and pain score; compare to baseline.</li>
              <li>Focused assessment for the complaint (resp/neuro/wound/skin/etc.).</li>
              <li>Review relevant meds (anticoagulants, insulin, respiratory meds) and recent changes.</li>
            </ul>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 700 }}>Monitoring</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Trend vitals and symptoms; increase frequency when red flags present or per orders.</li>
              <li>Watch for worsening respiratory distress, hypotension, acute neuro changes.</li>
            </ul>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 700 }}>Documentation</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Objective findings + interventions + resident response.</li>
              <li>Provider notified and orders received/implemented (as applicable).</li>
              <li>Family/EC notification (as applicable).</li>
            </ul>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={actions.wizardBack} style={{ padding: "10px 12px", borderRadius: 9999 }}>
              Back
            </button>
            <button onClick={actions.wizardReset} style={{ padding: "10px 12px", borderRadius: 9999 }}>
              Reset
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={actions.wizardApplyToPacket} style={{ padding: "10px 12px", borderRadius: 9999 }}>
              Apply to Packet Draft
            </button>
          </div>

          <div style={{ fontSize: 12, opacity: 0.7 }}>
            “Apply to Packet Draft” fills Assessment/Monitoring/Documentation notes and adds a starter set of IP/CDC/CMS
            citations (approved curated only).
          </div>
        </div>
      ) : null}
    </div>
  );
}
