// src/features/wizard/DecisionWizardTab.tsx
// Wizard flow: Problem → Pick Match → Cascading Tree → Note
import React, { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../../store/appStore";
import type { CocCatalogItem } from "./useCocCatalog";
import { ProblemPickerStep } from "./ProblemPickerStep";

type Option = { value: string; label: string; next?: string };
type ChecklistItem = { id: string; text: string };
type ChecklistSection = { key: string; label: string; items: ChecklistItem[] };

type WizardNode =
  | { id: string; type: "question_single"; prompt: string; helpText?: string; options: Option[]; next?: string }
  | { id: string; type: "question_multi"; prompt: string; helpText?: string; options: Option[]; next?: string }
  | { id: string; type: "lab_numeric" | "text_short"; prompt: string; helpText?: string; next?: string }
  | { id: string; type: "info"; title: string; body: string; next?: string }
  | { id: string; type: "checklist"; title: string; sections: ChecklistSection[]; next?: string }
  | { id: string; type: "summary"; outputs?: Record<string, any> };

type Pathway = { id: string; title: string; version?: string; startNodeId: string; nodes: WizardNode[] };

function prettyValue(val: any): string {
  if (val === null || val === undefined) return "";
  if (Array.isArray(val)) return val.filter(Boolean).join(", ");
  return String(val).trim();
}

function summarizeSection(section: ChecklistSection | null, selected: Record<string, Record<string, boolean>>) {
  if (!section) return "";
  const picked = section.items.filter((it) => selected?.[section.key]?.[it.id]).map((it) => it.text);
  return picked.length ? picked.join("; ") : "";
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
        ...(style || {})
      }}
    />
  );
}

export function DecisionWizardTab() {
  const wizard = useAppStore((s: any) => s.wizard);
  const packetDraft = useAppStore((s: any) => s.packetDraft);
  const actions = useAppStore((s: any) => s.actions);

  const step: number = wizard?.step ?? 1;
  const issueText: string = packetDraft?.meta?.issue_text ?? "";
  const setIssueText = actions?.setDraftIssueText || ((_: string) => {});
  const wizardBack = actions?.wizardBack || (() => {});
  const wizardNext = actions?.wizardNext || (() => {});

  const [selectedProblem, setSelectedProblem] = useState<CocCatalogItem | null>(null);

  const [pathwayPath, setPathwayPath] = useState<string | null>(null);
  const [pathway, setPathway] = useState<Pathway | null>(null);
  const [pathwayError, setPathwayError] = useState<string | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [selected, setSelected] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (step === 1) setSelectedProblem(null);
  }, [issueText, step]);

  useEffect(() => {
    setPathwayPath(selectedProblem?.pathway || null);
  }, [selectedProblem]);

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
        const nextSelected: Record<string, Record<string, boolean>> = {};
        const checklist = p.nodes.find((n) => n.type === "checklist") as Extract<WizardNode, { type: "checklist" }> | undefined;
        const assessment = checklist?.sections.find((s) => s.key === "assessment");
        if (assessment) {
          nextSelected[assessment.key] = {};
          assessment.items.forEach((it) => {
            nextSelected[assessment.key][it.id] = true;
          });
        }
        setSelected(nextSelected);
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
    return pathway.nodes.find((n) => n.type === "checklist") as Extract<WizardNode, { type: "checklist" }> | null;
  }, [pathway]);

  const assessmentSection = useMemo(() => {
    return checklistNode?.sections.find((s) => s.key === "assessment") ?? null;
  }, [checklistNode]);

  const interventionSection = useMemo(() => {
    if (!checklistNode) return null;
    const base = checklistNode.sections.find((s) => s.key === "interventions");
    const monitoring = checklistNode.sections.find((s) => s.key === "monitoring");
    if (!base && !monitoring) return null;
    return {
      key: "interventions",
      label: "Interventions",
      items: [...(base?.items ?? []), ...(monitoring?.items ?? [])]
    };
  }, [checklistNode]);

  const notificationSection = useMemo<ChecklistSection>(
    () => ({
      key: "notifications",
      label: "Notifications",
      items: [
        { id: "notify_provider", text: "Notified provider/physician with SBAR and received/implemented orders as applicable" },
        { id: "notify_family", text: "Notified family/responsible party for awareness of the change in condition" }
      ]
    }),
    []
  );

  const actionSections = useMemo(() => {
    const sections: ChecklistSection[] = [];
    if (interventionSection) sections.push(interventionSection);
    sections.push(notificationSection);
    return sections;
  }, [interventionSection, notificationSection]);

  const findingsLine = useMemo(() => {
    if (!pathway) return "";
    const parts: string[] = [];
    const seen = new Set<string>();

    for (const n of pathway.nodes) {
      const v = answers[n.id];
      const pv = prettyValue(v);
      if (!pv) continue;

      if (n.type === "question_single") {
        const opt = (n.options || []).find((o) => o.value === v);
        const label = opt?.label || pv;
        const key = `${n.id}:${label}`;
        if (!seen.has(key)) { seen.add(key); parts.push(label); }
      } else if (n.type === "question_multi") {
        const labels = Array.isArray(v)
          ? v.map((val: string) => (n.options || []).find((o) => o.value === val)?.label || val)
          : [pv];
        const joined = labels.filter(Boolean).slice(0, 6).join(", ") + (labels.length > 6 ? "…" : "");
        const key = `${n.id}:${joined}`;
        if (!seen.has(key)) { seen.add(key); parts.push(joined); }
      } else if (n.type === "lab_numeric" || n.type === "text_short") {
        const label = n.prompt.replace(/^Enter\s+/i, "").replace(/\s*\(.*?\)\s*/g, "").trim();
        const key = `${label}:${pv}`;
        if (!seen.has(key)) { seen.add(key); parts.push(`${label}: ${pv}`); }
      }
    }

    return parts.length ? `Key findings: ${parts.join("; ")}.` : "";
  }, [pathway, answers]);

  const assessmentSummary = useMemo(() => summarizeSection(assessmentSection, selected), [assessmentSection, selected]);
  const interventionsSummary = useMemo(() => summarizeSection(interventionSection, selected), [interventionSection, selected]);
  const notificationsSummary = useMemo(() => summarizeSection(notificationSection, selected), [notificationSection, selected]);

  const finalNote = useMemo(() => {
    const prob = issueText?.trim() ? issueText.trim() : "__";
    const label = selectedProblem?.label || "General change in condition";
    const lines = [
      `Resident assessed for ${prob}.`,
      `Primary concern selected: ${label}.`,
      findingsLine,
      assessmentSummary ? `Assessment completed: ${assessmentSummary}.` : "Assessment: (none selected).",
      interventionsSummary ? `Interventions implemented: ${interventionsSummary}.` : "Interventions: (none selected).",
      notificationsSummary ? `Notifications: ${notificationsSummary}.` : "Notifications: (none selected)."
    ];
    return lines.filter(Boolean).join(" ");
  }, [issueText, selectedProblem, findingsLine, assessmentSummary, interventionsSummary, notificationsSummary]);

  function goNext(next?: string) { setActiveNodeId(next || null); }

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
    background: "#fff"
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={panelStyle}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Decision Wizard</div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12 }}>
          <span style={{ border: "1px solid #e5e7eb", borderRadius: 9999, padding: "6px 10px" }}>Step: {step}</span>
          {selectedProblem?.label ? (
            <span style={{ border: "1px solid #e5e7eb", borderRadius: 9999, padding: "6px 10px" }}>Selected: {selectedProblem.label}</span>
          ) : null}
          {pathwayPath ? (
            <span style={{ border: "1px solid #e5e7eb", borderRadius: 9999, padding: "6px 10px" }}>Path: {pathwayPath}</span>
          ) : null}
        </div>

        {step === 1 ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>Step 1: Describe the change in condition</div>
            <textarea
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              placeholder='Example: "Refusing meds since morning; more confused" or "Potassium 2.5" or "Chest pain radiating to jaw"'
              style={{ width: "100%", minHeight: 90, padding: 10, borderRadius: 12, border: "1px solid #e5e7eb", fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }} />
              <Btn onClick={wizardNext} disabled={!issueText.trim()}>Next</Btn>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div style={{ display: "grid", gap: 12 }}>
            <ProblemPickerStep
              query={issueText}
              selectedId={selectedProblem?.id || null}
              onSelect={(it) => setSelectedProblem(it)}
            />

            {selectedProblem ? (
              <div style={{ borderTop: "1px solid #eef2f7", paddingTop: 12, display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 800 }}>Interactive decision tree</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Start by confirming the suggested assessments below, then walk through the prompts to surface the right interventions and notifications.
                </div>

                {assessmentSection ? (
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 10, display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 900 }}>Potential assessment checklist</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>Select all that apply to this concern.</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Btn onClick={() => selectAll(assessmentSection)} style={{ padding: "6px 10px" }}>Select all</Btn>
                        <Btn onClick={() => clearAll(assessmentSection.key)} style={{ padding: "6px 10px" }}>Clear</Btn>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {assessmentSection.items.map((it) => {
                        const checked = !!selected?.[assessmentSection.key]?.[it.id];
                        return (
                          <label key={it.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            <input type="checkbox" checked={checked} onChange={() => toggleChecklist(assessmentSection.key, it.id)} style={{ marginTop: 3 }} />
                            <div>{it.text}</div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {pathwayError ? (
                  <div style={{ border: "1px solid #fca5a5", borderRadius: 12, padding: 10 }}>
                    <div style={{ fontWeight: 800 }}>Could not load decision tree</div>
                    <div style={{ fontSize: 12, opacity: 0.9 }}>{pathwayError}</div>
                  </div>
                ) : null}

                {pathway ? (
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 10 }}>
                    <div style={{ fontWeight: 900 }}>{pathway.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Loaded node: {activeNodeId || "(end)"}</div>

                    {node ? (
                      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                        {"prompt" in node && (node as any).prompt ? <div style={{ fontWeight: 800 }}>{(node as any).prompt}</div> : null}
                        {"helpText" in node && (node as any).helpText ? <div style={{ fontSize: 12, opacity: 0.8 }}>{(node as any).helpText}</div> : null}

                        {node.type === "question_single" ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            {node.options.map((o) => {
                              const checked = answers[node.id] === o.value;
                              return (
                                <label key={o.value} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 10, border: "1px solid #e5e7eb", borderRadius: 12, cursor: "pointer", background: checked ? "#f1f5f9" : "#fff" }}>
                                  <input type="radio" name={node.id} checked={checked} onChange={() => onSinglePick(node, o.value)} style={{ marginTop: 3 }} />
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
                                <label key={o.value} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 10, border: "1px solid #e5e7eb", borderRadius: 12, cursor: "pointer", background: checked ? "#f1f5f9" : "#fff" }}>
                                  <input type="checkbox" checked={checked} onChange={() => toggleMulti(node, o.value)} style={{ marginTop: 3 }} />
                                  <div style={{ fontWeight: 700 }}>{o.label}</div>
                                </label>
                              );
                            })}
                            <Btn onClick={() => goNext((node as any).next)}>Continue</Btn>
                          </div>
                        ) : null}

                        {node.type === "lab_numeric" || node.type === "text_short" ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            <input value={String(answers[node.id] ?? "")} onChange={(e) => setText(node, e.target.value)} placeholder="Enter value" style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #e5e7eb", fontFamily: "inherit" }} />
                            <Btn onClick={() => goNext((node as any).next)} disabled={!String(answers[node.id] ?? "").trim()}>Continue</Btn>
                          </div>
                        ) : null}

                        {node.type === "info" ? (
                          <div style={{ border: "1px solid #fde68a", borderRadius: 14, padding: 10 }}>
                            <div style={{ fontWeight: 900 }}>{node.title}</div>
                            <div style={{ opacity: 0.9, marginTop: 6 }}>{node.body}</div>
                            <Btn onClick={() => goNext((node as any).next)} style={{ marginTop: 10 }}>Continue</Btn>
                          </div>
                        ) : null}

                        {node.type === "checklist" ? (
                          <div style={{ display: "grid", gap: 12 }}>
                            <div style={{ fontWeight: 900 }}>{node.title}</div>
                            <div style={{ fontSize: 12, opacity: 0.8 }}>
                              Select the interventions and notifications that apply based on the assessment above.
                            </div>
                            {actionSections.map((sec) => (
                              <div key={sec.key} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                  <div style={{ fontWeight: 800 }}>{sec.label}</div>
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <Btn onClick={() => selectAll(sec)} style={{ padding: "6px 10px" }}>Select all</Btn>
                                    <Btn onClick={() => clearAll(sec.key)} style={{ padding: "6px 10px" }}>Clear</Btn>
                                  </div>
                                </div>
                                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                                  {sec.items.map((it) => {
                                    const checked = !!selected?.[sec.key]?.[it.id];
                                    return (
                                      <label key={it.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                        <input type="checkbox" checked={checked} onChange={() => toggleChecklist(sec.key, it.id)} style={{ marginTop: 3 }} />
                                        <div>{it.text}</div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                            <Btn onClick={() => goNext((node as any).next)}>Continue</Btn>
                          </div>
                        ) : null}

                        {node.type === "summary" ? (
                          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 10 }}>
                            <div style={{ fontWeight: 900 }}>Decision tree complete</div>
                            <Btn onClick={wizardNext} style={{ marginTop: 10 }}>Next</Btn>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ opacity: 0.9 }}>End of decision tree reached.</div>
                        <Btn onClick={wizardNext} style={{ marginTop: 10 }}>Next</Btn>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <div style={{ border: "1px solid #fde68a", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 800 }}>Select a problem to start the tree</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  Choose the closest match from the ranked list. If nothing looks right, refine the problem description and try again.
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={wizardBack}>Back</Btn>
              <div style={{ flex: 1 }} />
              <Btn onClick={wizardNext} disabled={!selectedProblem || !!pathwayError}>Next</Btn>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>Step 3: Progress note</div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 10 }}>
              <div style={{ fontWeight: 900 }}>Progress Note (problem + findings + selected actions)</div>
              <textarea value={finalNote} readOnly style={{ width: "100%", minHeight: 130, marginTop: 8, padding: 10, borderRadius: 12, border: "1px solid #e5e7eb", fontFamily: "inherit" }} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Btn onClick={() => navigator.clipboard.writeText(finalNote || "")} disabled={!finalNote}>Copy Note</Btn>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={wizardBack}>Back</Btn>
              <div style={{ flex: 1 }} />
              <Btn onClick={() => { try { actions?.wizardFinish?.(); } catch {} }}>Finish</Btn>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default DecisionWizardTab;
