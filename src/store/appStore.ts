import { create } from "zustand";
import MiniSearch from "minisearch";
import { nanoid } from "nanoid";
import type { KBLoaded, SearchDoc } from "@/kb/loadKb";
import { canIncludeInPacket, docToCitationCard, type CitationRef } from "@/lib/citations";

export type PacketDraftSection =
  | "issue"
  | "assessment"
  | "interventions"
  | "monitoring"
  | "documentation"
  | "citations";

export type PacketDraftItem = {
  id: string;
  ref: CitationRef;
  added_from: "finder" | "wizard" | "manual";
  section: PacketDraftSection;
  user_note?: string;
  added_at: string;
};

export type NotePrompts = {
  assessment: string[];
  documentation: string[];
  interventions: string[];
};

type FinderState = {
  query: string;
  exactPhrase: boolean;
  approvedOnly: boolean;
  typeFilter: string[];
  jurisdictionFilter: string[];
  tagFilter: string[];
  defaultAddSection: PacketDraftSection;
  results: string[];
};

type PacketDraftState = {
  meta: {
    draft_id: string;
    created_at: string;
    updated_at: string;
    issue_text?: string;
    topic?: string;
    unit?: string;
    created_by_role?: string;
    kb_version?: string;
    approval_status?: string;
  };
  sectionNotes: Record<PacketDraftSection, string>;
  items: PacketDraftItem[];
  allowedIds: string[];
  blockedIds: string[];
  blockedReasons: Record<string, string>;
};

type WizardCategory = "general" | "fever" | "respiratory" | "fall" | "abuse";

type WizardState = {
  step: 1 | 2 | 3;
  changeOfCondition: "unknown" | "yes" | "no";
  redFlags: {
    lowO2: boolean;
    lowBP: boolean;
    chestPain: boolean;
    acuteNeuroChange: boolean;
  };
  suggestedTopic: string;
  category: WizardCategory;
  answers: Record<string, any>;
};

type AppState = {
  kb?: KBLoaded;
  kbError?: string;
  minisearch?: MiniSearch<SearchDoc>;

  activeTab: "finder" | "wizard";

  finder: FinderState;
  wizard: WizardState;

  packetDraft: PacketDraftState;

  ui: { noteModalOpen: boolean };
  notePrompts: NotePrompts;

  actions: {
    loadKb: (kb: KBLoaded) => void;
    setTab: (tab: "finder" | "wizard") => void;

    // Finder
    setQuery: (q: string) => void;
    setExactPhrase: (v: boolean) => void;
    setApprovedOnly: (v: boolean) => void;
    setTypeFilter: (types: string[]) => void;
    setJurisdictionFilter: (j: string[]) => void;
    setTagFilter: (tags: string[]) => void;
    setDefaultAddSection: (s: PacketDraftSection) => void;
    runSearch: () => void;

    // Draft
    setDraftIssueText: (txt: string) => void;
    setSectionNote: (section: PacketDraftSection, txt: string) => void;
    addToDraftFromDoc: (doc: SearchDoc, section?: PacketDraftSection, added_from?: PacketDraftItem["added_from"]) => void;
    removeFromDraft: (itemId: string) => void;
    moveDraftItem: (itemId: string, section: PacketDraftSection) => void;
    recomputeGating: () => void;

    // Wizard
    wizardReset: () => void;
    wizardNext: () => void;
    wizardBack: () => void;
    wizardSetChangeOfCondition: (v: WizardState["changeOfCondition"]) => void;
    wizardToggleRedFlag: (k: keyof WizardState["redFlags"], v: boolean) => void;
    wizardSetAnswer: (key: string, value: any) => void;
    wizardApplyToPacket: () => void;

    // Note modal
    openNoteModal: () => void;
    closeNoteModal: () => void;
  };
};

const emptyNotes = (): Record<PacketDraftSection, string> => ({
  issue: "",
  assessment: "",
  interventions: "",
  monitoring: "",
  documentation: "",
  citations: ""
});

function inferWizardFromIssue(issueText: string): { category: WizardCategory; topic: string } {
  const t = (issueText || "").toLowerCase();
  if (/(fall|fell|slip|trip)/.test(t)) return { category: "fall", topic: "Post-fall assessment / monitoring" };
  if (/(fever|temp|temperature|chills|rigor)/.test(t)) return { category: "fever", topic: "Fever / possible infection" };
  if (/(sob|shortness|dyspnea|o2|oxygen|resp|cough|wheeze)/.test(t)) return { category: "respiratory", topic: "Respiratory symptoms / low O2" };
  if (/(abuse|neglect|mistreat|assault|alleg)/.test(t)) return { category: "abuse", topic: "Allegation/concern: abuse or neglect" };
  return { category: "general", topic: "General change in condition" };
}

function buildWizardNarrative(issueText: string, wizard: WizardState): string {
  const issue = issueText?.trim() ? issueText.trim() : "__";
  const flags = Object.entries(wizard.redFlags).filter(([, v]) => v).map(([k]) => k).join(", ");
  const flagText = flags ? ` Red flags present: ${flags}.` : "";

  const base = `Resident assessed due to ${issue}. Change in condition: ${wizard.changeOfCondition.toUpperCase()}.${flagText}`;

  // Optional fields (from wizard answers)
  const a = wizard.answers || {};
  const bits: string[] = [];
  if (wizard.category === "fever") {
    if (a.tempF) bits.push(`T ${a.tempF}F`);
    if (a.cough) bits.push("cough");
    if (a.sob) bits.push("shortness of breath");
    if (a.onset) bits.push(`onset: ${a.onset}`);
  } else if (wizard.category === "respiratory") {
    if (a.spo2) bits.push(`SpO2 ${a.spo2}%`);
    if (a.cough) bits.push("cough");
    if (a.sob) bits.push("shortness of breath");
    if (a.wheeze) bits.push("wheezing");
  } else if (wizard.category === "fall") {
    if (a.witnessedFall) bits.push(`fall witnessed: ${String(a.witnessedFall)}`);
    if (a.headStrike !== undefined) bits.push(`head strike: ${a.headStrike ? "yes" : "no"}`);
    if (a.anticoagulant !== undefined) bits.push(`anticoagulants: ${a.anticoagulant ? "yes" : "no"}`);
    if (a.pain) bits.push(`pain: ${a.pain}`);
  } else if (wizard.category === "abuse") {
    if (a.immediateDanger !== undefined) bits.push(`immediate danger: ${a.immediateDanger ? "yes" : "no"}`);
    if (a.injury) bits.push("observed injury/bruise");
    if (a.allegation) bits.push("allegation reported");
  }

  const contextLine = bits.length ? `Key details: ${bits.join(", ")}.` : "";

  const assess = "Assessment completed including vital signs and focused assessment relevant to the concern; findings compared to baseline as applicable.";
  const interventions = "Interventions initiated per facility protocol/orders as applicable; resident response/tolerance documented.";
  const notifications = "Provider notified and orders received/implemented as applicable. Family/Emergency Contact notified as applicable.";
  const plan = "Plan: continue monitoring per protocol/orders and notify provider for any change in condition.";

  return [base, contextLine, assess, interventions, notifications, plan].filter(Boolean).join("\n\n");
}

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: "finder",

  finder: {
    query: "",
    exactPhrase: false,
    approvedOnly: true,
    typeFilter: [],
    jurisdictionFilter: [],
    tagFilter: [],
    defaultAddSection: "citations",
    results: []
  },

  wizard: {
    step: 1,
    changeOfCondition: "unknown",
    redFlags: { lowO2: false, lowBP: false, chestPain: false, acuteNeuroChange: false },
    suggestedTopic: "General change in condition",
    category: "general",
    answers: {}
  },

  packetDraft: {
    meta: {
      draft_id: nanoid(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    sectionNotes: emptyNotes(),
    items: [],
    allowedIds: [],
    blockedIds: [],
    blockedReasons: {}
  },

  ui: { noteModalOpen: false },

  notePrompts: {
    assessment: [
      "Compare to baseline mental status and appearance",
      "Vital signs (BP/HR/RR/T/SpO2) and pain score",
      "Focused assessment related to the issue (e.g., neuro/respiratory/wound)",
      "Resident response and tolerance"
    ],
    documentation: [
      "Objective findings + time course",
      "SBAR-style provider notification when applicable",
      "Orders received and implemented (if any)",
      "Family/EC notification (if any)",
      "Plan for monitoring and escalation"
    ],
    interventions: [
      "Immediate safety measures and precautions",
      "Interventions performed and resident response",
      "Monitoring initiated per protocol/orders",
      "Follow-up actions / referrals initiated as applicable"
    ]
  },

  actions: {
    loadKb: (kb) => {
      const ms = new MiniSearch<SearchDoc>({
        fields: ["title", "heading", "text", "tags"],
        storeFields: [
          "id",
          "source_id",
          "section_id",
          "title",
          "heading",
          "type",
          "jurisdiction",
          "effective_date",
          "review_by",
          "url_or_location",
          "tags",
          "text"
        ],
        searchOptions: { prefix: true, fuzzy: 0.2 }
      });
      ms.addAll(kb.searchIndex.docs);

      set((s) => ({
        kb,
        minisearch: ms,
        packetDraft: {
          ...s.packetDraft,
          meta: {
            ...s.packetDraft.meta,
            kb_version: kb.manifest.kb_version,
            approval_status: kb.manifest.approval.status
          }
        }
      }));
    },

    setTab: (tab) => set(() => ({ activeTab: tab })),

    setQuery: (q) => set((s) => ({ finder: { ...s.finder, query: q } })),
    setExactPhrase: (v) => set((s) => ({ finder: { ...s.finder, exactPhrase: v } })),
    setApprovedOnly: (v) => set((s) => ({ finder: { ...s.finder, approvedOnly: v } })),
    setTypeFilter: (types) => set((s) => ({ finder: { ...s.finder, typeFilter: types } })),
    setJurisdictionFilter: (j) => set((s) => ({ finder: { ...s.finder, jurisdictionFilter: j } })),
    setTagFilter: (tags) => set((s) => ({ finder: { ...s.finder, tagFilter: tags } })),
    setDefaultAddSection: (sec) => set((s) => ({ finder: { ...s.finder, defaultAddSection: sec } })),

    runSearch: () => {
      const { minisearch, kb, finder } = get();
      if (!minisearch || !kb) return;

      const q = finder.query.trim();
      if (!q) {
        set((s) => ({ finder: { ...s.finder, results: [] } }));
        return;
      }

      const raw = minisearch.search(q, finder.exactPhrase ? { combineWith: "AND" } : undefined);
      const filtered = raw
        .map((r: any) => r as SearchDoc)
        .filter((doc) => {
          if (finder.typeFilter.length && !finder.typeFilter.includes(doc.type)) return false;
          if (finder.jurisdictionFilter.length && !finder.jurisdictionFilter.includes(doc.jurisdiction)) return false;

          if (finder.tagFilter.length) {
            const docTags = new Set((doc.tags ?? []).map((t) => t.toLowerCase()));
            const wanted = finder.tagFilter.map((t) => t.toLowerCase());
            const any = wanted.some((t) => docTags.has(t));
            if (!any) return false;
          }

          if (finder.approvedOnly) {
            const src = kb.sources.find((x) => x.source_id === doc.source_id);
            const reviewBy = doc.review_by || src?.review_by;
            if (reviewBy) {
              const expired = new Date(`${reviewBy}T00:00:00Z`).getTime() < Date.now();
              if (expired) return false;
            }
          }

          return true;
        });

      set((s) => ({ finder: { ...s.finder, results: filtered.map((d) => d.id) } }));
    },

    setDraftIssueText: (txt) =>
      set((s) => ({
        packetDraft: {
          ...s.packetDraft,
          meta: { ...s.packetDraft.meta, issue_text: txt, updated_at: new Date().toISOString() }
        }
      })),

    setSectionNote: (section, txt) =>
      set((s) => ({
        packetDraft: {
          ...s.packetDraft,
          meta: { ...s.packetDraft.meta, updated_at: new Date().toISOString() },
          sectionNotes: { ...s.packetDraft.sectionNotes, [section]: txt }
        }
      })),

    addToDraftFromDoc: (doc, section, added_from) => {
      const ref: CitationRef = { source_id: doc.source_id, section_id: doc.section_id };
      const item: PacketDraftItem = {
        id: nanoid(),
        ref,
        added_from: added_from ?? "finder",
        section: section ?? get().finder.defaultAddSection,
        added_at: new Date().toISOString()
      };
      set((s) => ({
        packetDraft: {
          ...s.packetDraft,
          meta: { ...s.packetDraft.meta, updated_at: new Date().toISOString() },
          items: [item, ...s.packetDraft.items]
        }
      }));
      get().actions.recomputeGating();
    },

    removeFromDraft: (itemId) => {
      set((s) => ({
        packetDraft: {
          ...s.packetDraft,
          meta: { ...s.packetDraft.meta, updated_at: new Date().toISOString() },
          items: s.packetDraft.items.filter((x) => x.id !== itemId)
        }
      }));
      get().actions.recomputeGating();
    },

    moveDraftItem: (itemId, section) => {
      set((s) => ({
        packetDraft: {
          ...s.packetDraft,
          meta: { ...s.packetDraft.meta, updated_at: new Date().toISOString() },
          items: s.packetDraft.items.map((it) => (it.id === itemId ? { ...it, section } : it))
        }
      }));
      get().actions.recomputeGating();
    },

    recomputeGating: () => {
      const { kb, packetDraft } = get();
      if (!kb) return;

      const options = { allowExternal: false, allowUnapproved: false };

      const allowedIds: string[] = [];
      const blockedIds: string[] = [];
      const blockedReasons: Record<string, string> = {};

      for (const item of packetDraft.items) {
        const doc = kb.searchIndex.docs.find(
          (d) => d.source_id === item.ref.source_id && d.section_id === item.ref.section_id
        );
        if (!doc) {
          blockedIds.push(item.id);
          blockedReasons[item.id] = "Citation not found in current KB version";
          continue;
        }
        const src = kb.sources.find((s) => s.source_id === doc.source_id);
        const card = docToCitationCard(doc, src);
        const gate = canIncludeInPacket(card, options);
        if (gate.ok) allowedIds.push(item.id);
        else {
          blockedIds.push(item.id);
          blockedReasons[item.id] = gate.reason;
        }
      }

      set((s) => ({ packetDraft: { ...s.packetDraft, allowedIds, blockedIds, blockedReasons } }));
    },

    wizardReset: () =>
      set(() => ({
        wizard: {
          step: 1,
          changeOfCondition: "unknown",
          redFlags: { lowO2: false, lowBP: false, chestPain: false, acuteNeuroChange: false },
          suggestedTopic: "General change in condition",
          category: "general",
          answers: {}
        }
      })),

    wizardNext: () => {
      const { wizard, packetDraft } = get();
      if (wizard.step === 1) {
        const inferred = inferWizardFromIssue(packetDraft.meta.issue_text ?? "");
        set((s) => ({
          wizard: {
            ...s.wizard,
            step: 2,
            category: inferred.category,
            suggestedTopic: inferred.topic,
            answers: {}
          }
        }));
        return;
      }
      set((s) => ({
        wizard: {
          ...s.wizard,
          step: (s.wizard.step === 3 ? 3 : ((s.wizard.step + 1) as 1 | 2 | 3))
        }
      }));
    },

    wizardBack: () =>
      set((s) => ({
        wizard: {
          ...s.wizard,
          step: (s.wizard.step === 1 ? 1 : ((s.wizard.step - 1) as 1 | 2 | 3))
        }
      })),

    wizardSetChangeOfCondition: (v) => set((s) => ({ wizard: { ...s.wizard, changeOfCondition: v } })),

    wizardToggleRedFlag: (k, v) =>
      set((s) => ({ wizard: { ...s.wizard, redFlags: { ...s.wizard.redFlags, [k]: v } } })),

    wizardSetAnswer: (key, value) =>
      set((s) => ({ wizard: { ...s.wizard, answers: { ...s.wizard.answers, [key]: value } } })),

    wizardApplyToPacket: () => {
      const { kb, wizard } = get();
      if (!kb) return;

      const issueText = get().packetDraft.meta.issue_text ?? "";
      const flags = Object.entries(wizard.redFlags).filter(([, val]) => val).map(([k]) => k);
      const flagLine = flags.length ? `Red flags present: ${flags.join(", ")}.` : "";

      const assessmentNoteByCategory: Record<WizardCategory, string> = {
        general: `Full vital signs (BP/HR/RR/T/SpO2) and pain score; compare to baseline. Focused assessment based on the complaint. Review recent meds/changes and relevant history. ${flagLine}`.trim(),
        fever: `VS including temperature; assess for infection symptoms (cough, SOB, urinary/GI symptoms), hydration status, mental status compared to baseline, and potential exposure/outbreak context. Consider point-of-care testing per protocol. ${flagLine}`.trim(),
        respiratory: `Assess respiratory status (SpO2, work of breathing, breath sounds), vital signs, and symptom progression. Consider need for oxygen support per protocol/orders. Evaluate for aspiration risk and new neuro changes if present. ${flagLine}`.trim(),
        fall: `Immediate post-fall assessment: VS, pain score, focused neuro check, ROM/guarding, skin/injury check. Determine witnessed/unwitnessed, head strike suspected, anticoagulant/antiplatelet use, and baseline mental status comparison. ${flagLine}`.trim(),
        abuse: `Ensure immediate safety. Assess resident for injury and acute distress; obtain objective findings (location/size of bruising, skin tears, pain). Preserve facts (who/when/what was reported) and notify supervisor/Administrator/IP per facility policy. ${flagLine}`.trim()
      };

      const interventionsNoteByCategory: Record<WizardCategory, string> = {
        general: "Provide immediate safety measures, address symptoms per protocol, and follow provider orders. Initiate monitoring and escalate for change in condition.",
        fever: "Initiate infection control precautions as indicated, obtain ordered tests/specimens, encourage fluids as appropriate, administer PRN per orders, and monitor for deterioration. Notify provider per protocol.",
        respiratory: "Position for comfort, apply oxygen per protocol/orders, monitor SpO2/resp effort, implement infection control precautions if indicated, and notify provider for worsening symptoms.",
        fall: "Ensure safety, assist with positioning/mobility per status, provide first aid/wound care as needed, initiate neuro checks if indicated/orders, update precautions, and notify provider per protocol.",
        abuse: "Ensure safety, notify required leadership immediately, follow mandated reporting/internal reporting policy as applicable, provide care for injuries, and avoid speculation in documentation."
      };

      const monitoringNoteByCategory: Record<WizardCategory, string> = {
        general: flags.length ? "Increase monitoring frequency and escalate per protocol/provider orders." : "Monitor per facility protocol and provider orders as applicable.",
        fever: "Trend temperature, VS, mental status, intake/output, and symptom progression. Monitor for sepsis indicators or rapid decline and escalate per protocol.",
        respiratory: "Trend SpO2, RR, work of breathing, and mental status. Escalate for increasing O2 needs, distress, or new neuro changes.",
        fall: "Monitor for pain progression, neuro changes (especially head strike/anticoagulants), bleeding, and mobility changes. Follow neuro check protocol/orders when indicated.",
        abuse: "Monitor for pain, emotional distress, and injury changes. Ensure ongoing safety plan and follow reporting workflow." 
      };

      const narrative = buildWizardNarrative(issueText, wizard);

      set((s) => ({
        packetDraft: {
          ...s.packetDraft,
          meta: { ...s.packetDraft.meta, updated_at: new Date().toISOString() },
          sectionNotes: {
            ...s.packetDraft.sectionNotes,
            assessment: assessmentNoteByCategory[wizard.category],
            interventions: interventionsNoteByCategory[wizard.category],
            monitoring: monitoringNoteByCategory[wizard.category],
            documentation: narrative
          }
        }
      }));

      // Add starter citations from the curated KB (simple relevance pick)
      const seedTermsByCategory: Record<WizardCategory, string[]> = {
        general: ["standard", "precautions", "infection"],
        fever: ["fever", "outbreak", "reporting", "precautions", "isolation"],
        respiratory: ["resp", "oxygen", "o2", "cough", "precautions", "isolation"],
        fall: ["fall", "accident", "injury"],
        abuse: ["abuse", "neglect", "reporting", "incident"]
      };

      const seeds = seedTermsByCategory[wizard.category] ?? seedTermsByCategory.general;
      const scored = kb.searchIndex.docs
        .map((d) => {
          const hay = `${d.title} ${d.heading} ${d.text} ${(d.tags || []).join(" ")}`.toLowerCase();
          let score = 0;
          for (const s of seeds) if (hay.includes(s)) score += 1;
          return { d, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((x) => x.d);

      const fallbackIds = [
        "POL_IP_01::POL_IP_01_outbreak_reporting",
        "CDC_IC_01::CDC_IC_01_standard_precautions",
        "CMS_FTAG_SAMPLE::CMS_FTAG_SAMPLE_infection_control"
      ];

      const picks = scored.length ? scored : fallbackIds.map((id) => kb.searchIndex.docs.find((d) => d.id === id)).filter(Boolean);

      for (const doc of picks as any[]) {
        get().actions.addToDraftFromDoc(doc, "citations", "wizard");
      }

      get().actions.recomputeGating();
      set(() => ({ activeTab: "finder" }));
    },

    openNoteModal: () => set(() => ({ ui: { noteModalOpen: true } })),
    closeNoteModal: () => set(() => ({ ui: { noteModalOpen: false } })),
  }
}));
