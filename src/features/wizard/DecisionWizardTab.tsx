// src/features/wizard/DecisionWizardTab.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../../store/appStore";

type Option = { value: string; label: string; next?: string };

type ChecklistItem = { id: string; text: string };
type ChecklistSection = { key: string; label: string; items: ChecklistItem[] };

type WizardNode =
  | {
      id: string;
      type: "question_single";
      prompt: string;
      helpText?: string;
      options: Option[];
      next?: string;
    }
  | {
      id: string;
      type: "question_multi";
      prompt: string;
      helpText?: string;
      options: Option[];
      next?: string;
    }
  | {
      id: string;
      type: "lab_numeric" | "text_short";
      prompt: string;
      helpText?: string;
      next?: string;
    }
  | {
      id: string;
      type: "info";
      title: string;
      body: string;
      next?: string;
    }
  | {
      id: string;
      type: "checklist";
      title: string;
      sections: ChecklistSection[];
      next?: string;
    }
  | {
      id: string;
      type: "summary";
      outputs?: Record<string, any>;
    };

type Pathway = {
  id: string;
  title: string;
  version?: string;
  startNodeId: string;
  nodes: WizardNode[];
};

function lower(s: string) {
  return (s || "").toLowerCase();
}

function detectProtocol(issueText: string) {
  const t = lower(issueText);

  if (t.includes("stroke") || t.includes("tia") || t.includes("face droop") || t.includes("arm weakness")) return "stroke";
  if (t.includes("chest pain") || t.includes("heart attack") || t.includes("acs")) return "chest_pain";
  if (t.includes("pain protocol") || t === "pain" || t.startsWith("pain ")) return "pain";

  // Critical labs triggers
  if (
    t.includes("potassium") ||
    t.includes("troponin") ||
    t.includes("anc") ||
    t.includes("ammonia") ||
    t.includes("bun") ||
    t.includes("creatinine") ||
    t.includes("bicarbonate") ||
    t.includes("co2") ||
    t.includes("critical lab")
  ) {
    return "critical_labs";
  }

  return "unknown";
}

const PATHWAY_PATHS: Record<string, string> = {
  stroke: "/kb/coc/pathways/stroke_protocol_decision_tree.json",
  chest_pain: "/kb/coc/pathways/chest_pain_protocol_decision_tree.json",
  pain: "/kb/coc/pathways/pain_protocol_decision_tree.json",
  critical_labs: "/kb/coc/pathways/critical_labs_decision_tree.json",
};

function buildNarrativeFromChecklist(sections: ChecklistSection[], selected: Record<string, Record<string, boolean>>) {
  const parts: string[] = [];
  for (const sec of sections) {
    const picked = sec.items.filter((it) => selected?.[sec.key]?.[it.id]).map((it) => it.text);
    if (picked.length) parts.push(`${sec.label}: ${picked.join("; ")}`);
  }
  return parts.length ? parts.join(". ") + "." : "";
}

function Btn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { style, ...rest } = props;
  return (
    <button
      {...rest}
      style={{
        padding: "10px 12px",
        borderRadius: 9999,
        border: "1px solid #e5e7eb",
        background: "#fff",
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.6 : 1,
        ...(style || {}),
      }}
    />
  );
}

export default function DecisionWizardTab() {
  // Pull state/actions from your store (safe selectors)
  const wizard = useAppStore((s: any) => s.wizard);
  const actions = useAppStore((s: any) => s.actions);

  const step: number = wizard?.step ?? 1;

  const issueText: string = wizard?.issueText ?? wizard?.issue ?? "";

  const setIssueText =
    actions?.setWizardIssueText ||
    actions?.setIssueText ||
    actions?.setWizardIssue ||
    ((_: string) => {});

  const wizardBack = actions?.wizardBack || (() => {});
  const wizardNext = actions?.wizardNext || (() => {});

  const [protocol, setProtocol] = useState<string>(() => detectProtocol(issueText));
  const [pathwayPath, setPathwayPath] = useState<string | null>(null);
  const [pathway, setPathway] = useState<Pathway | null>(null);
  const [pathwayError, setPathwayError] = useState<string | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  // Answers + checklist selections
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [selected, setSelected] = useState<Record<string, Record<string, boolean>>>({});

  // detect protocol from issue text
  useEffect(() => {
    const p = detectProtocol(issueText);
    setProtocol(p);
    setPathwayPath(PATHWAY_PATHS[p] || null);
  }, [issueText]);

  // load pathway whenever Step 2 is reached and we have a pathwayPath
  useEffect(() => {
    if (step !== 2) return;
    if (!pathwayPath) {
      setPathway(null);
      setActiveNodeId(null);
      setPathwayError(null);
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
        setSelected({});
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
  }, [step, pathwayPath]);

  const nodesById = useMemo(() => {
    const m: Record<string, WizardNode> = {};
    for (const n of pathway?.nodes || []) m[n.id] = n;
    return m;
  }, [pathway]);

  const node = activeNodeId ? nodesById[activeNodeId] : null;

  const checklistNode = useMemo(() => {
    if (!pathway?.nodes) return null;
    return (pathway.nodes.find((n) => n.type === "checklist") as Extract<WizardNode, { type: "checklist" }>) || null;
  }, [pathway]);

  const narrative = useMemo(() => {
    if (!checklistNode) return "";
    return buildNarrativeFromChecklist(checklistNode.sections, selected);
  }, [checklistNode, selected]);

  function goNextExplicit(next?: string) {
    if (next) setActiveNodeId(next);
    else setActiveNodeId(null);
  }

  function onSinglePick(n: Extract<WizardNode, { type: "question_single" }>, val: string) {
    setAnswers((p) => ({ ...p, [n.id]: val }));
    const opt = n.options.find((o) => o.value === val);
    if (opt?.next) setActiveNodeId(opt.next);
    else if (n.next) setActiveNodeId(n.next);
    else setActiveNodeId(null);
  }

  function toggleMulti(n: Extract<WizardNode, { type: "question_multi" }>, val: string) {
    setAnswers((p) => {
      const cur: string[] = Array.isArray(p[n.id]) ? p[n.id] : [];
      const next = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val];
      return { ...p, [n.id]: next };
    });
  }

  function setText(n: Extract<WizardNode, { type: "lab_numeric" | "text_short" }>, val: string) {
    setAnswers((p) => ({ ...p, [n.id]: val }));
  }

  function toggleChecklist(sectionKey: string, itemId: string) {
    setSelected((p) => {
      const sec = p?.[sectionKey] || {};
      return { ...(p || {}), [sectionKey]: { ...sec, [itemId]: !sec[itemId] } };
    });
  }

  function selectAll(section: ChecklistSection) {
    setSelected((p) => {
      const nextSec: Record<string, boolean> = {};
      section.items.forEach((it) => (nextSec[it.id] = true));
      return { ...(p || {}), [section.key]: nextSec };
    });
  }

  function clearAll(sectionKey: string) {
    setSelected((p) => ({ ...(p || {}), [sectionKey]: {} }));
  }

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
        <div style={{ fontWeight: 900, fontSize: 16 }}>Decision Wizard</div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12 }}>
          <span style={{ border: "1px solid #e5e7eb", borderRadius: 9999, padding: "6px 10px" }}>Step: {step}</span>
          <span style={{ border: "1px solid #e5e7eb", borderRadius: 9999, padding: "6px 10px" }}>
            Protocol: {protocol}
          </span>
          {pathwayPath ? (
            <span style={{ border: "1px solid #e5e7eb", borderRadius: 9999, padding: "6px 10px" }}>
              Path: {pathwayPath}
            </span>
          ) : null}
        </div>

        {/* STEP 1 */}
        {step === 1 ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>Step 1: Enter the problem</div>
            <textarea
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              placeholder='Try: "stroke symptoms", "chest pain", "pain protocol", or "potassium 2.5"'
              style={{
                width: "100%",
                minHeight: 90,
                padding: 10,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }} />
              <Btn onClick={wizardNext} disabled={!issueText.trim()}>
                Next
              </Btn>
            </div>
          </div>
        ) : null}

        {/* STEP 2 */}
        {step === 2 ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>Step 2: Cascading questions</div>

            {protocol === "unknown" ? (
              <div style={{ border: "1px solid #fca5a5", borderRadius: 14, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>No protocol detected</div>
                <div style={{ opacity: 0.9 }}>
                  Use one of these triggers: <b>stroke symptoms</b>, <b>chest pain</b>, <b>pain protocol</b>,{" "}
                  <b>potassium 2.5</b>
                </div>
              </div>
            ) : null}

            {pathwayError ? (
              <div style={{ border: "1px solid #fca5a5", borderRadius: 14, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>Could not load decision tree</div>
                <div style={{ opacity: 0.9 }}>{pathwayError}</div>
              </div>
            ) : null}

            {pathway && (
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>{pathway.title}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Loaded node: {activeNodeId || "(end)"}</div>

                {node ? (
                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    {"prompt" in node && node.prompt ? <div style={{ fontWeight: 800 }}>{node.prompt}</div> : null}
                    {"helpText" in node && node.helpText ? (
                      <div style={{ fontSize: 12, opacity: 0.8 }}>{node.helpText}</div>
                    ) : null}

                    {node.type === "question_single" ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {node.options.map((o) => {
                          const checked = answers[node.id] === o.value;
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
                                name={node.id}
                                checked={checked}
                                onChange={() => onSinglePick(node, o.value)}
                                style={{ marginTop: 3 }}
                              />
                              <div style={{ fontWeight: 700 }}>{o.label}</div>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}

                    {node.type === "question_multi" ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {node.options.map((o) => {
                          const cur: string[] = Array.isArray(answers[node.id]) ? answers[node.id] : [];
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
                                onChange={() => toggleMulti(node, o.value)}
                                style={{ marginTop: 3 }}
                              />
                              <div style={{ fontWeight: 700 }}>{o.label}</div>
                            </label>
                          );
                        })}
                        <Btn onClick={() => goNextExplicit(node.next)}>Continue</Btn>
                      </div>
                    ) : null}

                    {node.type === "lab_numeric" || node.type === "text_short" ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <input
                          value={String(answers[node.id] ?? "")}
                          onChange={(e) => setText(node, e.target.value)}
                          placeholder="Enter value"
                          style={{
                            width: "100%",
                            padding: 10,
                            borderRadius: 12,
                            border: "1px solid #e5e7eb",
                            fontFamily: "inherit",
                          }}
                        />
                        <Btn onClick={() => goNextExplicit(node.next)} disabled={!String(answers[node.id] ?? "").trim()}>
                          Continue
                        </Btn>
                      </div>
                    ) : null}

                    {node.type === "info" ? (
                      <div style={{ border: "1px solid #fde68a", borderRadius: 14, padding: 10 }}>
                        <div style={{ fontWeight: 900 }}>{node.title}</div>
                        <div style={{ opacity: 0.9, marginTop: 6 }}>{node.body}</div>
                        <Btn onClick={() => goNextExplicit(node.next)} style={{ marginTop: 10 }}>
                          Continue
                        </Btn>
                      </div>
                    ) : null}

                    {node.type === "checklist" ? (
                      <div style={{ display: "grid", gap: 12 }}>
                        <div style={{ fontWeight: 900 }}>{node.title}</div>

                        {node.sections.map((sec) => (
                          <div key={sec.key} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                              <div style={{ fontWeight: 800 }}>{sec.label}</div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <Btn onClick={() => selectAll(sec)} style={{ padding: "6px 10px" }}>
                                  Select all
                                </Btn>
                                <Btn onClick={() => clearAll(sec.key)} style={{ padding: "6px 10px" }}>
                                  Clear
                                </Btn>
                              </div>
                            </div>

                            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                              {sec.items.map((it) => {
                                const checked = !!selected?.[sec.key]?.[it.id];
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

                        <Btn onClick={() => goNextExplicit(node.next)}>Continue</Btn>
                      </div>
                    ) : null}

                    {node.type === "summary" ? (
                      <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 10 }}>
                        <div style={{ fontWeight: 900 }}>Decision tree complete</div>
                        <Btn onClick={wizardNext} style={{ marginTop: 10 }}>
                          Next
                        </Btn>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ opacity: 0.9 }}>End of decision tree reached.</div>
                    <Btn onClick={wizardNext} style={{ marginTop: 10 }}>
                      Next
                    </Btn>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={wizardBack}>Back</Btn>
              <div style={{ flex: 1 }} />
              <Btn onClick={wizardNext} disabled={!pathway || !!pathwayError}>
                Next
              </Btn>
            </div>
          </div>
        ) : null}

        {/* STEP 3 */}
        {step === 3 ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>Step 3: Suggested actions + narrative</div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 10 }}>
              <div style={{ fontWeight: 900 }}>Narrative (only checked items)</div>
              <textarea
                value={narrative}
                readOnly
                style={{
                  width: "100%",
                  minHeight: 110,
                  marginTop: 8,
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Btn
                  onClick={() => {
                    navigator.clipboard.writeText(narrative || "");
                  }}
                  disabled={!narrative}
                >
                  Copy Note
                </Btn>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={wizardBack}>Back</Btn>
              <div style={{ flex: 1 }} />
              <Btn
                onClick={() => {
                  try {
                    actions?.wizardFinish?.();
                  } catch {}
                }}
              >
                Finish
              </Btn>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
