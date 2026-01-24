// src/features/wizard/DecisionWizardTab.tsx
// Drop-in replacement to enable true cascading decision trees.
//
// Notes:
// - This file uses a Zustand-style store hook "useAppStore" from ../../store/appStore
// - It expects wizard state under `wizard` and actions under `actions` (as in your snippet).
// - If your store exports differ, adjust the 2 selector lines near the top.

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../../store/appStore";

type NodeType =
  | "question_single"
  | "question_multi"
  | "lab_numeric"
  | "text_short"
  | "info"
  | "checklist"
  | "summary";

type Option = { value: string; label: string; next?: string };
type ChecklistItem = { id: string; text: string };
type ChecklistSection = { key: string; label: string; items: ChecklistItem[] };

type WizardNode = {
  id: string;
  type: NodeType;
  title?: string;
  prompt?: string;
  helpText?: string;
  body?: string;
  options?: Option[];
  defaultsPath?: string;
  sections?: ChecklistSection[];
  next?: string;
  outputs?: {
    noteTemplate?: string;
    kbAdd?: string[];
    packetAdd?: string[];
  };
};

type Pathway = {
  schema?: string;
  id: string;
  title: string;
  version?: string;
  startNodeId: string;
  assets?: Record<string, any>;
  nodes: WizardNode[];
};

type FilterKey = "assessment" | "monitoring" | "documentation" | "interventions";

function safeLower(s: string) {
  return (s || "").toLowerCase();
}

function detectProtocol(issueText: string) {
  const t = safeLower(issueText);

  // Very explicit triggers:
  if (t.includes("stroke") || t.includes("tia") || t.includes("face droop") || t.includes("arm weakness")) {
    return "stroke";
  }
  if (t.includes("chest pain") || t.includes("heart attack") || t.includes("acs") || t.includes("pressure")) {
    return "chest_pain";
  }
  if (t.includes("pain protocol") || t.startsWith("pain ") || t === "pain") {
    return "pain";
  }
  // Labs: "potassium 2.5", "troponin", "anc", etc.
  if (
    /\bpotassium\b|\bk\b|\btroponin\b|\banc\b|\bammonia\b|\bcreatinine\b|\bbun\b|\bbicarbonate\b|\bco2\b|\bcritical lab\b/.test(
      t
    )
  ) {
    return "critical_labs";
  }

  return "unknown";
}

// Pathway file paths (must exist under public/kb/coc/pathways/)
const PATHWAY_PATHS: Record<string, string> = {
  stroke: "/kb/coc/pathways/stroke_protocol_decision_tree.json",
  chest_pain: "/kb/coc/pathways/chest_pain_protocol_decision_tree.json",
  pain: "/kb/coc/pathways/pain_protocol_decision_tree.json",
  critical_labs: "/kb/coc/pathways/critical_labs_decision_tree.json",
};

function buildNarrativeFromChecklist(sections: ChecklistSection[], selected: Record<string, Record<string, boolean>>) {
  const parts: string[] = [];
  for (const s of sections) {
    const picked = s.items.filter((it) => selected?.[s.key]?.[it.id]).map((it) => it.text);
    if (picked.length) parts.push(`${s.label}: ${picked.join("; ")}`);
  }
  return parts.length ? parts.join(". ") + "." : "";
}

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        padding: "10px 12px",
        borderRadius: 9999,
        border: "1px solid #e5e7eb",
        background: "#fff",
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.6 : 1,
        ...(props.style || {}),
      }}
    />
  );
}

function Chip({
  text,
  onClick,
}: {
  text: string;
  onClick?: () => void;
}) {
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 9999,
        border: "1px solid #e5e7eb",
        background: "#fff",
        fontSize: 12,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {text}
    </span>
  );
}

export default function DecisionWizardTab() {
  // If your store doesn't support selectors, change to: const { wizard, actions } = useAppStore();
  const wizard: any = useAppStore((s: any) => s.wizard);
  const actions: any = useAppStore((s: any) => s.actions);

  const issueText: string = wizard?.issueText || "";
  const step: number = wizard?.step || 1;

  const [protocol, setProtocol] = useState<string>(() => detectProtocol(issueText));
  const [pathwayPath, setPathwayPath] = useState<string | null>(null);
  const [pathway, setPathway] = useState<Pathway | null>(null);
  const [pathwayError, setPathwayError] = useState<string | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  // Decision-tree answer state
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [checklistSelected, setChecklistSelected] = useState<Record<string, Record<string, boolean>>>({});
  const [lastLoaded, setLastLoaded] = useState<{ protocol: string; path: string } | null>(null);

  // Red flags (simple heuristic from answers)
  const redFlagPresent = useMemo(() => {
    // Any explicit node answer "yes" on a redflag question or a stop node visited:
    for (const k of Object.keys(answers)) {
      if (k.toLowerCase().includes("red") && answers[k] === "yes") return true;
    }
    return false;
  }, [answers]);

  // Keep protocol updated from issue text
  useEffect(() => {
    const next = detectProtocol(issueText);
    setProtocol(next);
  }, [issueText]);

  // Determine pathway path
  useEffect(() => {
    const path = PATHWAY_PATHS[protocol] || null;
    setPathwayPath(path);
  }, [protocol]);

  // Load pathway JSON when Step 2 starts (or whenever pathwayPath changes)
  useEffect(() => {
    if (!pathwayPath) {
      setPathway(null);
      setPathwayError(null);
      setActiveNodeId(null);
      return;
    }

    let cancelled = false;
    setPathwayError(null);

    fetch(pathwayPath)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} loading ${pathwayPath}`);
        return (await r.json()) as Pathway;
      })
      .then((p) => {
        if (cancelled) return;
        setPathway(p);
        setActiveNodeId(p.startNodeId);
        setAnswers({});
        setChecklistSelected({});
        setLastLoaded({ protocol, path: pathwayPath });
      })
      .catch((e: any) => {
        if (cancelled) return;
        setPathway(null);
        setActiveNodeId(null);
        setPathwayError(String(e?.message || e));
      });

    return () => {
      cancelled = true;
    };
  }, [pathwayPath, protocol]);

  const nodesById = useMemo(() => {
    const map: Record<string, WizardNode> = {};
    for (const n of pathway?.nodes || []) map[n.id] = n;
    return map;
  }, [pathway]);

  const activeNode = activeNodeId ? nodesById[activeNodeId] : null;

  const canRunTree = protocol !== "unknown" && !!pathwayPath;

  function goNextFromNode(node: WizardNode, chosenValue?: any) {
    // If option has next
    if (node.type === "question_single") {
      const opt = (node.options || []).find((o) => o.value === chosenValue);
      if (opt?.next) return setActiveNodeId(opt.next);
    }
    if (node.next) return setActiveNodeId(node.next);

    // If no explicit next, try to end
    setActiveNodeId(null);
  }

  function setAnswer(nodeId: string, value: any) {
    setAnswers((prev) => ({ ...prev, [nodeId]: value }));
  }

  function toggleMulti(nodeId: string, value: string) {
    setAnswers((prev) => {
      const cur: string[] = Array.isArray(prev[nodeId]) ? prev[nodeId] : [];
      if (cur.includes(value)) return { ...prev, [nodeId]: cur.filter((x) => x !== value) };
      return { ...prev, [nodeId]: [...cur, value] };
    });
  }

  function sectionControls(sectionKey: string) {
    return {
      selectAll: (section: ChecklistSection) => {
        setChecklistSelected((prev) => {
          const next = { ...(prev || {}) };
          next[sectionKey] = {};
          for (const it of section.items) next[sectionKey][it.id] = true;
          return next;
        });
      },
      clear: () => {
        setChecklistSelected((prev) => {
          const next = { ...(prev || {}) };
          next[sectionKey] = {};
          return next;
        });
      },
    };
  }

  function toggleChecklist(sectionKey: string, itemId: string) {
    setChecklistSelected((prev) => {
      const sec = prev?.[sectionKey] || {};
      const nextSec = { ...sec, [itemId]: !sec[itemId] };
      return { ...(prev || {}), [sectionKey]: nextSec };
    });
  }

  // Derived narrative (Step 3)
  const checklistNode = useMemo(() => {
    if (!pathway?.nodes) return null;
    return pathway.nodes.find((n) => n.type === "checklist") || null;
  }, [pathway]);

  const narrative = useMemo(() => {
    if (!checklistNode?.sections) return "";
    return buildNarrativeFromChecklist(checklistNode.sections, checklistSelected);
  }, [checklistNode, checklistSelected]);

  // Hook up wizard step navigation with existing store actions if present
  const wizardBack = actions?.wizardBack || (() => {});
  const wizardNext = actions?.wizardNext || (() => {});
  const setWizardIssueText = actions?.setWizardIssueText || actions?.setIssueText || (() => {});
  const setWizardNote = actions?.setWizardNote || actions?.setProgressNote || (() => {});
  const setWizardRedFlags = actions?.setWizardRedFlags || (() => {});
  const setWizardProtocol = actions?.setWizardProtocol || (() => {});

  // Keep store in sync lightly (safe)
  useEffect(() => {
    try {
      setWizardProtocol(protocol);
    } catch {
      // ignore
    }
  }, [protocol, setWizardProtocol]);

  useEffect(() => {
    try {
      setWizardRedFlags({ any: redFlagPresent });
    } catch {
      // ignore
    }
  }, [redFlagPresent, setWizardRedFlags]);

  useEffect(() => {
    // Update note preview in store (optional)
    if (narrative) {
      try {
        setWizardNote(narrative);
      } catch {
        // ignore
      }
    }
  }, [narrative, setWizardNote]);

  // UI helpers
  const panelStyle: React.CSSProperties = {
    border: "1px solid #eee",
    borderRadius: 16,
    padding: 12,
    display: "grid",
    gap: 12,
    background: "#fff",
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={panelStyle}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Event-driven Wizard (COC)</div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Chip text={`Step: ${step}`} />
          <Chip text={`Detected: ${protocol}`} />
          {lastLoaded ? <Chip text={`Loaded: ${lastLoaded.path}`} /> : null}
        </div>

        {/* STEP 1 */}
        {step === 1 ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>Step 1: Describe the problem</div>
            <textarea
              value={issueText}
              onChange={(e) => setWizardIssueText(e.target.value)}
              placeholder='Try: "stroke symptoms" or "chest pain" or "pain protocol" or "potassium 2.5"'
              style={{
                width: "100%",
                minHeight: 90,
                padding: 10,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                fontFamily: "inherit",
              }}
            />
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              This will auto-detect a protocol and load a cascading decision tree in Step 2.
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }} />
              <Button
                onClick={() => {
                  // Move to step 2 via your store action
                  wizardNext();
                }}
                disabled={!issueText.trim()}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}

        {/* STEP 2 */}
        {step === 2 ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>Step 2: Cascading triage questions</div>

            {!canRunTree ? (
              <div style={{ border: "1px solid #fca5a5", borderRadius: 14, padding: 10 }}>
                <div style={{ fontWeight: 800 }}>No protocol detected</div>
                <div style={{ opacity: 0.9 }}>
                  Try typing: <b>stroke symptoms</b>, <b>chest pain</b>, <b>pain protocol</b>, or <b>potassium 2.5</b>
                </div>
              </div>
            ) : null}

            {pathwayError ? (
              <div style={{ border: "1px solid #fca5a5", borderRadius: 14, padding: 10 }}>
                <div style={{ fontWeight: 800 }}>Could not load decision tree</div>
                <div style={{ opacity: 0.9 }}>{pathwayError}</div>
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                  Expected file at: <code>{pathwayPath}</code>
                </div>
              </div>
            ) : null}

            {pathway && (
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>{pathway.title}</div>
                {activeNode ? (
                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    {activeNode.prompt ? <div style={{ fontWeight: 800 }}>{activeNode.prompt}</div> : null}
                    {activeNode.helpText ? <div style={{ fontSize: 12, opacity: 0.8 }}>{activeNode.helpText}</div> : null}

                    {/* Render node types */}
                    {activeNode.type === "question_single" ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {(activeNode.options || []).map((o) => {
                          const checked = answers[activeNode.id] === o.value;
                          return (
                            <label
                              key={o.value}
                              style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "flex-start",
                                padding: 10,
                                border: "1px solid #e5e7eb",
                                borderRadius: 12,
                                cursor: "pointer",
                                background: checked ? "#f1f5f9" : "#fff",
                              }}
                            >
                              <input
                                type="radio"
                                name={activeNode.id}
                                checked={checked}
                                onChange={() => {
                                  setAnswer(activeNode.id, o.value);
                                  goNextFromNode(activeNode, o.value);
                                }}
                                style={{ marginTop: 3 }}
                              />
                              <div>
                                <div style={{ fontWeight: 700 }}>{o.label}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}

                    {activeNode.type === "question_multi" ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {(activeNode.options || []).map((o) => {
                          const cur: string[] = Array.isArray(answers[activeNode.id]) ? answers[activeNode.id] : [];
                          const checked = cur.includes(o.value);
                          return (
                            <label
                              key={o.value}
                              style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "flex-start",
                                padding: 10,
                                border: "1px solid #e5e7eb",
                                borderRadius: 12,
                                cursor: "pointer",
                                background: checked ? "#f1f5f9" : "#fff",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleMulti(activeNode.id, o.value)}
                                style={{ marginTop: 3 }}
                              />
                              <div>
                                <div style={{ fontWeight: 700 }}>{o.label}</div>
                              </div>
                            </label>
                          );
                        })}

                        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                          <Button
                            onClick={() => {
                              // advance using explicit next if provided
                              if (activeNode.next) setActiveNodeId(activeNode.next);
                              else setActiveNodeId(null);
                            }}
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {activeNode.type === "lab_numeric" || activeNode.type === "text_short" ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <input
                          value={String(answers[activeNode.id] ?? "")}
                          onChange={(e) => setAnswer(activeNode.id, e.target.value)}
                          placeholder={activeNode.type === "lab_numeric" ? "Enter value" : "Enter text"}
                          style={{
                            width: "100%",
                            padding: 10,
                            borderRadius: 12,
                            border: "1px solid #e5e7eb",
                            fontFamily: "inherit",
                          }}
                        />
                        <Button
                          onClick={() => {
                            if (activeNode.next) setActiveNodeId(activeNode.next);
                            else setActiveNodeId(null);
                          }}
                          disabled={!String(answers[activeNode.id] ?? "").trim()}
                        >
                          Continue
                        </Button>
                      </div>
                    ) : null}

                    {activeNode.type === "info" ? (
                      <div style={{ border: "1px solid #fcd34d", borderRadius: 14, padding: 10 }}>
                        <div style={{ fontWeight: 900 }}>{activeNode.title || "Info"}</div>
                        <div style={{ marginTop: 6, opacity: 0.9 }}>{activeNode.body}</div>
                        <div style={{ marginTop: 10 }}>
                          <Button onClick={() => (activeNode.next ? setActiveNodeId(activeNode.next) : setActiveNodeId(null))}>
                            Continue
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {activeNode.type === "checklist" ? (
                      <div style={{ display: "grid", gap: 12 }}>
                        <div style={{ fontWeight: 900 }}>{activeNode.title || "Checklist"}</div>

                        {(activeNode.sections || []).map((sec) => (
                          <div key={sec.key} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 10 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 10,
                              }}
                            >
                              <div style={{ fontWeight: 800 }}>{sec.label}</div>

                              <div style={{ display: "flex", gap: 8 }}>
                                <Button
                                  onClick={() => sectionControls(sec.key).selectAll(sec)}
                                  style={{ padding: "6px 10px", borderRadius: 9999 }}
                                >
                                  Select all
                                </Button>
                                <Button
                                  onClick={() => sectionControls(sec.key).clear()}
                                  style={{ padding: "6px 10px", borderRadius: 9999 }}
                                >
                                  Clear
                                </Button>
                              </div>
                            </div>

                            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                              {sec.items.map((it) => {
                                const checked = !!checklistSelected?.[sec.key]?.[it.id];
                                return (
                                  <label key={it.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleChecklist(sec.key, it.id)}
                                      style={{ marginTop: 3 }}
                                    />
                                    <div>{it.text}</div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        <Button
                          onClick={() => {
                            if (activeNode.next) setActiveNodeId(activeNode.next);
                            else setActiveNodeId(null);
                          }}
                        >
                          Continue
                        </Button>
                      </div>
                    ) : null}

                    {activeNode.type === "summary" ? (
                      <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 10 }}>
                        <div style={{ fontWeight: 900 }}>Done</div>
                        <div style={{ marginTop: 6, opacity: 0.9 }}>
                          Decision tree complete. Proceed to Step 3 to generate narrative and suggested actions.
                        </div>
                        <Button
                          onClick={() => {
                            wizardNext();
                          }}
                          style={{ marginTop: 10 }}
                        >
                          Next
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ opacity: 0.9 }}>End of decision tree reached.</div>
                    <Button
                      onClick={() => {
                        wizardNext();
                      }}
                      style={{ marginTop: 10 }}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={wizardBack}>Back</Button>
              <div style={{ flex: 1 }} />
              <Button
                onClick={() => wizardNext()}
                disabled={!pathway || !!pathwayError}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}

        {/* STEP 3 */}
        {step === 3 ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>Step 3: Suggested actions + narrative</div>

            {redFlagPresent ? (
              <div style={{ border: "1px solid #fb7185", borderRadius: 14, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>Red flag present</div>
                <div style={{ opacity: 0.9 }}>
                  Prioritize immediate safety assessment, obtain vital signs, notify provider per protocol, and escalate to EMS/ED when indicated.
                </div>
              </div>
            ) : null}

            {/* If we saw a checklist node, render a compact summary and the narrative */}
            {checklistNode?.sections ? (
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>Narrative (only checked items)</div>
                <textarea
                  value={narrative}
                  readOnly
                  style={{
                    width: "100%",
                    minHeight: 100,
                    marginTop: 8,
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    fontFamily: "inherit",
                  }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(narrative || "");
                    }}
                    disabled={!narrative}
                  >
                    Copy Note
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ border: "1px solid #fcd34d", borderRadius: 14, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>No checklist selections found</div>
                <div style={{ opacity: 0.9 }}>
                  Complete Step 2 until you reach the checklist node. If Step 2 ended early, the pathway may be missing a checklist step.
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={wizardBack}>Back</Button>
              <div style={{ flex: 1 }} />
              <Button
                onClick={() => {
                  // finalize
                  try {
                    actions?.wizardFinish?.();
                  } catch {
                    // ignore
                  }
                }}
              >
                Finish
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
