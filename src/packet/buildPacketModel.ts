import type { KBLoaded } from "@/kb/loadKb";
import type { CitationCard } from "@/lib/citations";
import type { PacketDraftSection } from "@/store/appStore";

export type PacketModel = {
  packet_id: string;
  generated_at: string;

  kb: {
    kb_version: string;
    effective_date: string;
    approval_status: "draft" | "pending" | "approved" | "retired";
    approved_date?: string;
  };

  mode: {
    packet_type: "guidance_packet" | "decision_support_packet";
    watermark?: "DRAFT";
    allow_external_in_packet: boolean;
    allow_unapproved_in_packet: boolean;
  };

  subject: {
    issue_title?: string;
    issue_text?: string;
    unit?: string;
    resident_label?: string;
    room?: string;
    event_datetime?: string;
  };

  sections: Array<{ kind: "text"; title: string; body: string }>;

  citations: {
    included_by_section: Record<PacketDraftSection, Array<{ key: string; title: string; heading?: string; excerpt?: string; type: string; jurisdiction?: string; effective_date?: string; url_or_location?: string }>>;
    excluded?: Array<{ label: string; reason: string }>;
  };

  appendices?: {
    nursing_progress_note?: {
      title: "Nursing Progress Note";
      generated_note_template: string;
    };
  };

  footer: {
    disclaimer_lines: string[];
    page_numbering: boolean;
  };
};

const sectionLabels: Record<PacketDraftSection, string> = {
  issue: "Issue",
  assessment: "Assessment",
  interventions: "Interventions",
  monitoring: "Monitoring",
  documentation: "Documentation",
  citations: "Citations"
};

export function buildPacketModel(args: {
  kb: KBLoaded;
  issue_text?: string;
  sectionNotes: Record<PacketDraftSection, string>;
  included: Array<{ card: CitationCard; section: PacketDraftSection }>;
  excluded: Array<{ label: string; reason: string }>;
  nursingNoteTemplate?: string;
}): PacketModel {
  const { kb, issue_text, sectionNotes, included, excluded, nursingNoteTemplate } = args;

  const watermark = kb.manifest.approval.status !== "approved" ? "DRAFT" : undefined;

  const included_by_section: PacketModel["citations"]["included_by_section"] = {
    issue: [],
    assessment: [],
    interventions: [],
    monitoring: [],
    documentation: [],
    citations: []
  };

  for (const { card, section } of included) {
    included_by_section[section].push({
      key: card.key,
      title: card.title,
      heading: card.heading,
      excerpt: card.excerpt,
      type: card.type,
      jurisdiction: card.jurisdiction,
      effective_date: card.effective_date,
      url_or_location: card.url_or_location
    });
  }

  const sections: PacketModel["sections"] = [];
  sections.push({ kind: "text", title: "Issue / Reason for Packet", body: issue_text?.trim() ? issue_text.trim() : "(Not specified)" });

  (Object.keys(sectionNotes) as PacketDraftSection[])
    .filter((s) => s !== "issue" && s !== "citations")
    .forEach((sec) => {
      const body = sectionNotes[sec]?.trim();
      if (body) sections.push({ kind: "text", title: sectionLabels[sec], body });
    });

  return {
    packet_id: crypto.randomUUID(),
    generated_at: new Date().toISOString(),

    kb: {
      kb_version: kb.manifest.kb_version,
      effective_date: kb.manifest.effective_date,
      approval_status: kb.manifest.approval.status,
      approved_date: kb.manifest.approval.approved_date || undefined
    },

    mode: {
      packet_type: "guidance_packet",
      watermark,
      allow_external_in_packet: false,
      allow_unapproved_in_packet: false
    },

    subject: {
      issue_title: "Guidance / Decision Support Packet",
      issue_text: issue_text || ""
    },

    sections,

    citations: {
      included_by_section,
      excluded: excluded.length ? excluded : undefined
    },

    appendices: nursingNoteTemplate
      ? {
          nursing_progress_note: {
            title: "Nursing Progress Note",
            generated_note_template: nursingNoteTemplate
          }
        }
      : undefined,

    footer: {
      disclaimer_lines: [
        "Decision support and reference tool only. Follow facility policy, scope of practice, and provider orders.",
        "Use clinical judgment and escalate for change in condition."
      ],
      page_numbering: true
    }
  };
}
