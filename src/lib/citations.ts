import type { KBSource, SearchDoc } from "@/kb/loadKb";

export type CitationRef = { source_id: string; section_id?: string; pin?: string; note?: string };

export type CitationCard = {
  key: string;
  origin: "curated" | "external";
  approval: "approved" | "pending" | "unapproved" | "expired";

  source_id: string;
  section_id?: string;

  title: string;
  heading?: string;
  excerpt?: string;

  type: string;
  jurisdiction?: string;
  effective_date?: string;
  review_by?: string;
  url_or_location?: string;

  pin?: string;
  note?: string;

  allow_in_packet_default: boolean;
  reason_blocked?: string;
};

function isExpired(reviewBy?: string): boolean {
  if (!reviewBy) return false;
  const rb = new Date(`${reviewBy}T00:00:00Z`).getTime();
  return Number.isFinite(rb) && rb < Date.now();
}

export function docToCitationCard(doc: SearchDoc, src?: KBSource): CitationCard {
  const expired = isExpired(doc.review_by || src?.review_by);
  const approval: CitationCard["approval"] = expired ? "expired" : "approved";

  return {
    key: `${doc.source_id}::${doc.section_id}`,
    origin: "curated",
    approval,
    source_id: doc.source_id,
    section_id: doc.section_id,
    title: doc.title,
    heading: doc.heading,
    excerpt: doc.text,
    type: doc.type,
    jurisdiction: doc.jurisdiction,
    effective_date: doc.effective_date,
    review_by: doc.review_by,
    url_or_location: doc.url_or_location,
    allow_in_packet_default: approval === "approved",
    reason_blocked: approval === "expired" ? "Source is past review date" : undefined
  };
}

export function canIncludeInPacket(
  card: CitationCard,
  opts: { allowExternal: boolean; allowUnapproved: boolean }
): { ok: true } | { ok: false; reason: string } {
  if (card.origin === "external" && !opts.allowExternal) {
    return { ok: false, reason: "External references not allowed in packets" };
  }
  if (card.approval !== "approved" && !opts.allowUnapproved) {
    return { ok: false, reason: "Citation not approved for packets" };
  }
  if (card.reason_blocked) return { ok: false, reason: card.reason_blocked };
  return { ok: true };
}
