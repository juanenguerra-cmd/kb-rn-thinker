import * as React from "react";
import { useAppStore } from "@/store/appStore";
import { NursingProgressNoteModal } from "@/features/note/NursingProgressNoteModal";

type PathwayNode =
  | { id: string; type: "question_single"; prompt: string; helpText?: string; options: { value: string; label: string; next: string }[] }
  | { id: string; type: "question_multi"; prompt: string; helpText?: string; options: { value: string; label: string }[]; next: string }
  | { id: string; type: "lab_numeric"; prompt: string; defaultsPath?: string; next: string }
  | { id: string; type: "text_short"; prompt: string; next: string }
  | { id: string; type: "info"; title: string; body: string; next: string }
  | { id: string; type: "checklist"; title: string; sections: { key: string; label: string; items: { id: string; text: string }[] }[]; next: string }
  | { id: string; type: "summary"; outputs: any };

type Pathway = {
  schema: string;
  id: string;
  title: string;
  version: string;
  startNodeId: string;
  assets?: any;
  nodes: PathwayNode[];
};

const PATHWAY_BY_CATEGORY: Record<string, string> = {
  stroke: "/kb/coc/pathways/stroke_protocol_decision_tree.json",
  chest_pain: "/kb/coc/pathways/chest_pain_protocol_decision_tree.json",
  pain: "/kb/coc/pathways/pain_protocol_decision_tree.json",
  critical_labs: "/kb/coc/pathways/critical_labs_decision_tree.json"
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function asNodeMap(p: Pathway) {
  const m = new Map<string, PathwayNode>();
  for (const n of p.nodes) m.set(n.id, n);
  return m;
}
function promptsForCategory(category: string) {
  switch (category) {
    case "fall":
      return {
        assessment: [
          "Full vital signs and pain score; compare to baseline",
          "Neuro check (LOC/orientation, pupils, speech, grip/strength)",
          "Head strike suspected? bleeding/bruising/skin tears",
          "ROM/guarding, deformity, tenderness",
          "Anticoagulant/antiplatelet use and last dose time"
        ],
        interventions: [
          "Ensure resident safety and do not mobilize until assessed",
          "First aid/wound care as needed",
          "Initiate neuro checks per protocol/orders when indicated",
          "Update precautions and supervision level",
          "Notify provider per protocol; follow orders"
        ],
        documentation: [
          "Objective findings (VS, neuro, skin, ROM) and comparison to baseline",
          "Interventions and resident response",
          "Provider notified and orders received/implemented",
          "Family/EC notification",
          "Ongoing monitoring plan and escalation criteria"
        ]
      };
    case "fever":
      return {
        assessment: [
          "Temperature and full vital signs; compare to baseline",
          "Focused infection assessment (respiratory, urinary, GI, wounds)",
          "Hydration status, mental status change",
          "Exposure/outbreak context and vaccination status as applicable"
        ],
        interventions: [
          "Initiate isolation/precautions per protocol when indicated",
          "Obtain ordered tests/specimens",
          "Administer PRN/ordered meds and encourage fluids as appropriate",
          "Notify provider per protocol"
        ],
        documentation: [
          "Objective findings and symptom timeline",
          "Precautions initiated and rationale",
          "Provider notified and orders implemented",
          "Family/EC notification",
          "Monitoring and escalation plan"
        ]
      };
    case "respiratory":
      return {
        assessment: [
          "SpO2, RR, work of breathing, breath sounds",
          "Full vital signs and comparison to baseline",
          "Cough/sputum, wheeze, chest discomfort",
          "Aspiration risk and recent intake/episodes"
        ],
        interventions: [
          "Position for comfort; oxygen per protocol/orders",
          "Infection control precautions as indicated",
          "Notify provider for worsening symptoms or increased O2 need",
          "Monitor closely and escalate per protocol"
        ],
        documentation: [
          "Objective respiratory findings and response to interventions",
          "O2 use/changes and monitoring plan",
          "Provider notified and orders implemented",
          "Family/EC notification",
          "Escalation criteria"
        ]
      };
    case "abuse":
      return {
        assessment: [
          "Ensure immediate safety and assess for injury",
          "Objective description of findings (location/size/color of bruising, skin tears)",
          "Resident statements (quote when possible) and emotional state",
          "Immediate danger yes/no; who was notified"
        ],
        interventions: [
          "Ensure resident safety and remove from harm if needed",
          "Notify supervisor/Administrator/IP immediately",
          "Follow facility reporting/mandated reporting workflow",
          "Provide care for injuries and emotional support"
        ],
        documentation: [
          "Objective facts only (no speculation)",
          "Who/when/what was reported and actions taken",
          "Notifications (leadership/provider/family) as applicable",
          "Ongoing safety plan and monitoring"
        ]
      };
    default:
      return {
        assessment: [
          "Full vital signs and comparison to baseline",
          "Focused assessment related to complaint",
          "Review relevant meds and recent changes",
          "Assess hydration, pain, and functional change"
        ],
        interventions: [
          "Immediate safety measures and symptom management per protocol",
          "Notify provider as indicated",
          "Initiate monitoring and follow orders"
        ],
        documentation: [
          "Objective findings and interventions",
          "Resident response",
          "Provider notification/orders",
          "Family/EC notification",
          "Plan and monitoring"
        ]
      };
  }
}

function monitoringForCategory(category: string): string[] {
  switch (category) {
    case "fall":
      return [
        "Monitor for pain progression and new bleeding",
        "Neuro checks per protocol/orders when head strike/anticoagulants suspected",
        "Escalate immediately for acute neuro change, severe pain, or hypotension"
      ];
    case "fever":
      return [
        "Trend temperature and VS; monitor mental status",
        "Monitor intake/output and hydration",
        "Escalate for sepsis indicators or rapid decline"
      ];
    case "respiratory":
      return [
        "Trend SpO2, RR, work of breathing",
        "Escalate for increasing O2 need or respiratory distress",
        "Monitor for new neuro change or hypotension"
      ];
    case "abuse":
      return [
        "Ensure ongoing safety plan and observe for distress",
        "Monitor injury changes and pain",
        "Follow reporting workflow and leadership direction"
      ];
    default:
      return [
        "Trend VS and symptoms; increase frequency if red flags",
        "Escalate for acute change in condition",
        "Follow provider orders and facility protocol"
      ];
  }
}

export function DecisionWizardTab() {
  const wizard = useAppStore((s) => s.wizard);
  const draft = useAppStore((s) => s.packetDraft);
  const actions = useAppStore((s) => s.actions);
  const ui = useAppStore((s) => s.ui);

  const p = React.useMemo(() => promptsForCategory(wizard.category), [wizard.category]);

  // Step 3: allow selecting which suggested actions are actually performed/documented.
  const [selAssess, setSelAssess] = React.useState<Record<string, boolean>>({});
  const [selInterv, setSelInterv] = React.useState<Record<string, boolean>>({});
  const [selDoc, setSelDoc] = React.useState<Record<string, boolean>>({});
  const [selMon, setSelMon] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (wizard.step !== 3) return;
    const initAll = (arr: string[]) => arr.reduce<Record<string, boolean>>((acc, x) => ((acc[x] = true), acc), {});
    setSelAssess(initAll(p.assessment));
    setSelInterv(initAll(p.interventions));
    setSelDoc(initAll(p.documentation));
    setSelMon(initAll(monitoringForCategory(wizard.category)));
  }, [wizard.step, wizard.category, p.assessment, p.interventions, p.documentation]);

  const picked = React.useMemo(() => {
    const pick = (arr: string[], sel: Record<string, boolean>) => arr.filter((x) => sel[x]);
    return {
      assessment: pick(p.assessment, selAssess),
      interventions: pick(p.interventions, selInterv),
      documentation: pick(p.documentation, selDoc),
      monitoring: pick(monitoringForCategory(wizard.category), selMon)
    };
  }, [p, selAssess, selInterv, selDoc, selMon, wizard.category]);

  function sectionControls(kind: "assessment" | "interventions" | "documentation" | "monitoring") {
    const all = kind === "assessment" ? p.assessment
      : kind === "interventions" ? p.interventions
      : kind === "documentation" ? p.documentation
      : monitoringForCategory(wizard.category);
    const setSel = kind === "assessment" ? setSelAssess
      : kind === "interventions" ? setSelInterv
      : kind === "documentation" ? setSelDoc
      : setSelMon;

    return {
      selectAll: () => setSel(all.reduce<Record<string, boolean>>((acc, x) => ((acc[x] = true), acc), {})),
      clear: () => setSel({}),
      toggle: (x: string, v: boolean) => setSel((prev) => ({ ...prev, [x]: v })),
      checked: (x: string) => {
        const sel = kind === "assessment" ? selAssess : kind === "interventions" ? selInterv : kind === "documentation" ? selDoc : selMon;
        return !!sel[x];
      }
    };
  }

  const narrative = React.useMemo(() => (isTreeCategory ? treeNarrative : buildWizardNarrative(draft.meta.issue_text ?? "", wizard)), [isTreeCategory, treeNarrative, draft.meta.issue_text, wizard]);

  const nodeMap = React.useMemo(() => (pathway ? asNodeMap(pathway) : null), [pathway]);
const currentNode = React.useMemo(() => (nodeMap && nodeId ? nodeMap.get(nodeId) : null), [nodeMap, nodeId]);

const setAnswer = (key: string, value: any) => setTreeAnswers((s) => ({ ...s, [key]: value }));

const goto = (next: string) => setNodeId(next);

const toggleItem = (sectionKey: string, itemId: string) => {
  setTreeSelected((prev) => {
    const sec = { ...(prev[sectionKey] ?? {}) };
    sec[itemId] = !sec[itemId];
    return { ...prev, [sectionKey]: sec };
  });
};

const setAll = (sectionKey: string, itemIds: string[], value: boolean) => {
  setTreeSelected((prev) => {
    const sec: Record<string, boolean> = { ...(prev[sectionKey] ?? {}) };
    for (const id of itemIds) sec[id] = value;
    return { ...prev, [sectionKey]: sec };
  });
};

const pickedFromChecklist = React.useMemo(() => {
  // Build prompts arrays + selected arrays from the checklist node (if present).
  if (!currentNode || currentNode.type !== "checklist") return null;
  const pickTexts = (key: string) => {
    const sec = currentNode.sections.find((s) => s.key === key);
    if (!sec) return { prompts: [], selected: [] };
    const prompts = sec.items.map((it) => it.text);
    const selected = sec.items.filter((it) => treeSelected?.[key]?.[it.id]).map((it) => it.text);
    return { prompts, selected };
  };
  const a = pickTexts("assessment");
  const i = pickTexts("interventions");
  const d = pickTexts("documentation");
  return {
    assessmentPrompts: a.prompts,
    interventionPrompts: i.prompts,
    documentationPrompts: d.prompts,
    selected: { assessment: a.selected, interventions: i.selected, documentation: d.selected }
  };
}, [currentNode, treeSelected]);

const treeNarrative = React.useMemo(() => {
  const issue = (draft.meta.issue_text ?? "").trim() || "__";
  if (!pickedFromChecklist) return `Resident assessed due to ${issue}.`;
  const join = (arr: string[]) => (arr.length ? arr.join("; ") : "");
  const parts = [
    `Resident assessed due to ${issue}.`,
    pickedFromChecklist.selected.assessment.length ? `Assessment: ${join(pickedFromChecklist.selected.assessment)}.` : "",
    pickedFromChecklist.selected.interventions.length ? `Interventions: ${join(pickedFromChecklist.selected.interventions)}.` : "",
    pickedFromChecklist.selected.documentation.length ? `Documentation: ${join(pickedFromChecklist.selected.documentation)}.` : ""
  ].filter(Boolean);
  return parts.join(" ");
}, [draft.meta.issue_text, pickedFromChecklist]);
return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 900, fontSize: 18 }}>Decision Wizard (Starter)</div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        This wizard can run problem-driven cascading protocols (stroke, chest pain, pain, critical labs) from /kb/coc/pathways.
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
  isTreeCategory ? (
    <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 12, display: "grid", gap: 10 }}>
      <div style={{ fontWeight: 800 }}>Protocol: {wizard.suggestedTopic}</div>
      {treeError ? (
        <div style={{ padding: 10, borderRadius: 12, border: "1px solid #fca5a5", background: "#fef2f2" }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Could not load decision tree</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{treeError}</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
            Make sure this file exists on the deployed site:
            <code style={{ padding: "2px 6px", borderRadius: 9999, border: "1px solid #eee" }}>
              {PATHWAY_BY_CATEGORY[wizard.category as any]}
            </code>
          </div>
        </div>
      ) : !currentNode ? (
        <div style={{ padding: 10, borderRadius: 12, border: "1px solid #eee" }}>Loading protocol…</div>
      ) : currentNode.type === "question_single" ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 800 }}>{currentNode.prompt}</div>
          {currentNode.helpText ? <div style={{ fontSize: 12, opacity: 0.75 }}>{currentNode.helpText}</div> : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {currentNode.options.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  setAnswer(currentNode.id, o.value);
                  goto(o.next);
                }}
                style={{ padding: "10px 12px", borderRadius: 9999, border: "1px solid #eee" }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ) : currentNode.type === "question_multi" ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 800 }}>{currentNode.prompt}</div>
          {currentNode.helpText ? <div style={{ fontSize: 12, opacity: 0.75 }}>{currentNode.helpText}</div> : null}
          <div style={{ display: "grid", gap: 6 }}>
            {currentNode.options.map((o) => {
              const arr: string[] = (treeAnswers[currentNode.id] ?? []) as string[];
              const checked = arr.includes(o.value);
              return (
                <label key={o.value} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked ? [...arr, o.value] : arr.filter((x) => x !== o.value);
                      setAnswer(currentNode.id, next);
                    }}
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => goto(currentNode.next)}
              style={{ padding: "10px 12px", borderRadius: 9999, border: "1px solid #eee" }}
            >
              Continue
            </button>
          </div>
        </div>
      ) : currentNode.type === "lab_numeric" ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 800 }}>{currentNode.prompt}</div>
          <input
            value={treeAnswers[currentNode.id] ?? ""}
            onChange={(e) => setAnswer(currentNode.id, e.target.value)}
            placeholder="Enter value"
            inputMode="decimal"
            style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
          />
          <button
            onClick={() => goto(currentNode.next)}
            style={{ padding: "10px 12px", borderRadius: 9999, border: "1px solid #eee", width: "fit-content" }}
          >
            Continue
          </button>
        </div>
      ) : currentNode.type === "text_short" ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 800 }}>{currentNode.prompt}</div>
          <input
            value={treeAnswers[currentNode.id] ?? ""}
            onChange={(e) => setAnswer(currentNode.id, e.target.value)}
            placeholder="Type here"
            style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
          />
          <button
            onClick={() => goto(currentNode.next)}
            style={{ padding: "10px 12px", borderRadius: 9999, border: "1px solid #eee", width: "fit-content" }}
          >
            Continue
          </button>
        </div>
      ) : currentNode.type === "info" ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 900 }}>{currentNode.title}</div>
          <div style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.9 }}>{currentNode.body}</div>
          <button
            onClick={() => goto(currentNode.next)}
            style={{ padding: "10px 12px", borderRadius: 9999, border: "1px solid #eee", width: "fit-content" }}
          >
            Continue
          </button>
        </div>
      ) : currentNode.type === "checklist" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900 }}>{currentNode.title}</div>
          {currentNode.sections.map((sec) => (
            <div key={sec.key} style={{ border: "1px solid #eee", borderRadius: 16, padding: 12, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ fontWeight: 800 }}>{sec.label}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setAll(sec.key, sec.items.map((x) => x.id), true)}
                    style={{ padding: "6px 10px", borderRadius: 9999, border: "1px solid #eee", fontSize: 12 }}
                  >
                    Select all
                  </button>
                  <button
                    onClick={() => setAll(sec.key, sec.items.map((x) => x.id), false)}
                    style={{ padding: "6px 10px", borderRadius: 9999, border: "1px solid #eee", fontSize: 12 }}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {sec.items.map((it) => (
                  <label key={it.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <input
                      type="checkbox"
                      checked={!!treeSelected?.[sec.key]?.[it.id]}
                      onChange={() => toggleItem(sec.key, it.id)}
                      style={{ marginTop: 3 }}
                    />
                    <span>{it.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => goto(currentNode.next)} style={{ padding: "10px 12px", borderRadius: 9999 }}>
              Continue
            </button>
            <button onClick={actions.openNoteModal} style={{ padding: "10px 12px", borderRadius: 9999 }}>
              Nursing Progress Note
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: 10, borderRadius: 12, border: "1px solid #eee" }}>
          Unsupported node type: {(currentNode as any).type}
        </div>
      )}

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
        <button
          onClick={() => actions.wizardNext()}
          style={{ padding: "10px 12px", borderRadius: 9999 }}
        >
          Next
        </button>
      </div>
    </div>
  ) : (

        <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 12, display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 800 }}>Step 2: Exploratory questions</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Suggested topic: <strong>{wizard.suggestedTopic}</strong>
          </div>

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

          {/* Category-specific questions */}
          {wizard.category === "fever" ? (
            <div style={{ display: "grid", gap: 10, borderTop: "1px solid #eee", paddingTop: 10 }}>
              <div style={{ fontWeight: 800 }}>Fever / possible infection</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input
                  value={wizard.answers.tempF ?? ""}
                  onChange={(e) => actions.wizardSetAnswer("tempF", e.target.value)}
                  placeholder="Temperature (F)"
                  style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
                />
                <input
                  value={wizard.answers.onset ?? ""}
                  onChange={(e) => actions.wizardSetAnswer("onset", e.target.value)}
                  placeholder="Onset (e.g., today, 2 days)"
                  style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
                />
              </div>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={!!wizard.answers.cough} onChange={(e) => actions.wizardSetAnswer("cough", e.target.checked)} />
                Cough
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={!!wizard.answers.sob} onChange={(e) => actions.wizardSetAnswer("sob", e.target.checked)} />
                Shortness of breath
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={!!wizard.answers.outbreakConcern} onChange={(e) => actions.wizardSetAnswer("outbreakConcern", e.target.checked)} />
                Outbreak / exposure concern
              </label>
            </div>
          ) : null}

          {wizard.category === "respiratory" ? (
            <div style={{ display: "grid", gap: 10, borderTop: "1px solid #eee", paddingTop: 10 }}>
              <div style={{ fontWeight: 800 }}>Respiratory</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input
                  value={wizard.answers.spo2 ?? ""}
                  onChange={(e) => actions.wizardSetAnswer("spo2", e.target.value)}
                  placeholder="SpO2 (%)"
                  style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
                />
                <input
                  value={wizard.answers.oxygenL ?? ""}
                  onChange={(e) => actions.wizardSetAnswer("oxygenL", e.target.value)}
                  placeholder="O2 (L/min) if used"
                  style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
                />
              </div>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={!!wizard.answers.cough} onChange={(e) => actions.wizardSetAnswer("cough", e.target.checked)} />
                Cough
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={!!wizard.answers.sob} onChange={(e) => actions.wizardSetAnswer("sob", e.target.checked)} />
                Shortness of breath
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={!!wizard.answers.wheeze} onChange={(e) => actions.wizardSetAnswer("wheeze", e.target.checked)} />
                Wheeze
              </label>
            </div>
          ) : null}

          {wizard.category === "fall" ? (
            <div style={{ display: "grid", gap: 10, borderTop: "1px solid #eee", paddingTop: 10 }}>
              <div style={{ fontWeight: 800 }}>Fall</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <select
                  value={wizard.answers.witnessedFall ?? "unknown"}
                  onChange={(e) => actions.wizardSetAnswer("witnessedFall", e.target.value)}
                  style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
                >
                  <option value="unknown">Witnessed?</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <input
                  value={wizard.answers.pain ?? ""}
                  onChange={(e) => actions.wizardSetAnswer("pain", e.target.value)}
                  placeholder="Pain (0-10 or location)"
                  style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
                />
              </div>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={!!wizard.answers.headStrike} onChange={(e) => actions.wizardSetAnswer("headStrike", e.target.checked)} />
                Head strike suspected
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={!!wizard.answers.anticoagulant} onChange={(e) => actions.wizardSetAnswer("anticoagulant", e.target.checked)} />
                On anticoagulants/antiplatelets
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={!!wizard.answers.injury} onChange={(e) => actions.wizardSetAnswer("injury", e.target.checked)} />
                Visible injury / bleeding
              </label>
            </div>
          ) : null}

          {wizard.category === "abuse" ? (
            <div style={{ display: "grid", gap: 10, borderTop: "1px solid #eee", paddingTop: 10 }}>
              <div style={{ fontWeight: 800 }}>Concern: abuse/neglect</div>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={!!wizard.answers.allegation} onChange={(e) => actions.wizardSetAnswer("allegation", e.target.checked)} />
                Allegation reported
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={!!wizard.answers.immediateDanger} onChange={(e) => actions.wizardSetAnswer("immediateDanger", e.target.checked)} />
                Immediate danger / unsafe situation
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={!!wizard.answers.injury} onChange={(e) => actions.wizardSetAnswer("injury", e.target.checked)} />
                Observed injury/bruise
              </label>
            </div>
          ) : null}

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
          <div style={{ fontWeight: 800 }}>Step 3: Suggested actions + narrative</div>

          {Object.values(wizard.redFlags).some(Boolean) ? (
            <div style={{ border: "1px solid #f5c", borderRadius: 14, padding: 10 }}>
              <div style={{ fontWeight: 800 }}>Red flag present</div>
              <div style={{ opacity: 0.9 }}>
                Prioritize immediate safety assessment, obtain vital signs, and notify provider per protocol. Escalate to
                EMS when indicated.
              </div>
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 800 }}>Assessment</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => sectionControls("assessment").selectAll()} style={{ padding: "6px 10px", borderRadius: 9999 }}>
                  Select all
                </button>
                <button onClick={() => sectionControls("assessment").clear()} style={{ padding: "6px 10px", borderRadius: 9999 }}>
                  Clear
                </button>
              </div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {p.assessment.map((x) => (
                <label key={x} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={sectionControls("assessment").checked(x)}
                    onChange={(e) => sectionControls("assessment").toggle(x, e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  <span>{x}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 800 }}>Monitoring</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => sectionControls("monitoring").selectAll()} style={{ padding: "6px 10px", borderRadius: 9999 }}>
                  Select all
                </button>
                <button onClick={() => sectionControls("monitoring").clear()} style={{ padding: "6px 10px", borderRadius: 9999 }}>
                  Clear
                </button>
              </div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {monitoringForCategory(wizard.category).map((x) => (
                <label key={x} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={sectionControls("monitoring").checked(x)}
                    onChange={(e) => sectionControls("monitoring").toggle(x, e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  <span>{x}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 800 }}>Documentation</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => sectionControls("documentation").selectAll()} style={{ padding: "6px 10px", borderRadius: 9999 }}>
                  Select all
                </button>
                <button onClick={() => sectionControls("documentation").clear()} style={{ padding: "6px 10px", borderRadius: 9999 }}>
                  Clear
                </button>
              </div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {p.documentation.map((x) => (
                <label key={x} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={sectionControls("documentation").checked(x)}
                    onChange={(e) => sectionControls("documentation").toggle(x, e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  <span>{x}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 800 }}>Interventions</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => sectionControls("interventions").selectAll()} style={{ padding: "6px 10px", borderRadius: 9999 }}>
                  Select all
                </button>
                <button onClick={() => sectionControls("interventions").clear()} style={{ padding: "6px 10px", borderRadius: 9999 }}>
                  Clear
                </button>
              </div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {p.interventions.map((x) => (
                <label key={x} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={sectionControls("interventions").checked(x)}
                    onChange={(e) => sectionControls("interventions").toggle(x, e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  <span>{x}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8, borderTop: "1px solid #eee", paddingTop: 10 }}>
            <div style={{ fontWeight: 800 }}>Narrative summary (copy-ready)</div>
            <textarea
              value={narrative}
              readOnly
              style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #ddd", minHeight: 90 }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(narrative);
                  } catch {}
                }}
                style={{ padding: "10px 12px", borderRadius: 9999 }}
              >
                Copy Summary
              </button>
              <button onClick={actions.openNoteModal} style={{ padding: "10px 12px", borderRadius: 9999 }}>
                Nursing Progress Note
              </button>
            </div>
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

      <NursingProgressNoteModal
        open={ui.noteModalOpen}
        onClose={actions.closeNoteModal}
        issueText={draft.meta.issue_text}
        assessmentPrompts={isTreeCategory && pickedFromChecklist ? pickedFromChecklist.assessmentPrompts : p.assessment}
        documentationPrompts={isTreeCategory && pickedFromChecklist ? pickedFromChecklist.documentationPrompts : p.documentation}
        interventionPrompts={isTreeCategory && pickedFromChecklist ? pickedFromChecklist.interventionPrompts : p.interventions}
        defaultSelected={
          isTreeCategory && pickedFromChecklist
            ? pickedFromChecklist.selected
            : {
                assessment: picked.assessment,
                documentation: picked.documentation,
                interventions: picked.interventions
              }
        }
      />
    </div>
  );
const [pathway, setPathway] = React.useState<Pathway | null>(null);
const [nodeId, setNodeId] = React.useState<string | null>(null);
const [treeAnswers, setTreeAnswers] = React.useState<Record<string, any>>({});
const [treeSelected, setTreeSelected] = React.useState<Record<string, Record<string, boolean>>>({}); // sectionKey -> itemId -> checked
const [treeError, setTreeError] = React.useState<string | null>(null);

const isTreeCategory = ["stroke", "chest_pain", "pain", "critical_labs"].includes(wizard.category as any);

React.useEffect(() => {
  // Load pathway when user enters Step 2 and category matches a tree.
  const run = async () => {
    if (!isTreeCategory || wizard.step !== 2) return;
    setTreeError(null);
    try {
      const url = PATHWAY_BY_CATEGORY[wizard.category as any];
      if (!url) throw new Error(`No pathway mapped for category: ${wizard.category}`);
      const p = await fetchJson<Pathway>(url);
      setPathway(p);
      setNodeId(p.startNodeId);
      setTreeAnswers({});
      setTreeSelected({});
    } catch (e: any) {
      setTreeError(e?.message ?? String(e));
    }
  };
  run();
}, [isTreeCategory, wizard.step, wizard.category]);
}