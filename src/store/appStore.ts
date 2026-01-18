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
    suggestedTopic: "General change in condition"
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
          suggestedTopic: "General change in condition"
        }
      })),

    wizardNext: () =>
      set((s) => ({
        wizard: {
          ...s.wizard,
          step: (s.wizard.step === 3 ? 3 : ((s.wizard.step + 1) as 1 | 2 | 3))
        }
      })),

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

    wizardApplyToPacket: () => {
      const { kb, wizard } = get();
      if (!kb) return;

      // Populate section notes with a standard clinical structure
      const flags = Object.entries(wizard.redFlags)
        .filter(([, val]) => val)
        .map(([k]) => k)
        .join(", ");

      const assessmentNote =
        wizard.changeOfCondition === "yes"
          ? "Change in condition noted. Compare to baseline. Obtain focused assessment and full vitals."
          : "No clear change in condition reported. Verify baseline, assess resident, and document findings.";

      const monitoringNote = flags
        ? `Red flags present (${flags}). Increase monitoring and escalate per protocol/provider orders.`
        : "Monitoring per facility protocol and provider orders as applicable.";

      const documentationNote =
        "Document objective findings, interventions, resident response, and notifications (provider + family/EC if applicable).";

      set((s) => ({
        packetDraft: {
          ...s.packetDraft,
          meta: { ...s.packetDraft.meta, updated_at: new Date().toISOString() },
          sectionNotes: {
            ...s.packetDraft.sectionNotes,
            assessment: assessmentNote,
            monitoring: monitoringNote,
            documentation: documentationNote
          }
        }
      }));

      // Add a small set of starter citations from your curated KB (demo)
      const pickIds = [
        "POL_IP_01::POL_IP_01_outbreak_reporting",
        "CDC_IC_01::CDC_IC_01_standard_precautions",
        "CMS_FTAG_SAMPLE::CMS_FTAG_SAMPLE_infection_control"
      ];

      for (const id of pickIds) {
        const doc = kb.searchIndex.docs.find((d) => d.id === id);
        if (doc) get().actions.addToDraftFromDoc(doc, "citations", "wizard");
      }

      get().actions.recomputeGating();
      set(() => ({ activeTab: "finder" }));
    },

    openNoteModal: () => set(() => ({ ui: { noteModalOpen: true } })),
    closeNoteModal: () => set(() => ({ ui: { noteModalOpen: false } })),
  }
}));
