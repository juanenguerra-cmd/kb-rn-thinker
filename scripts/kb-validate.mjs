import fs from "node:fs";
import path from "node:path";

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function isObj(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function asStringArray(v, label, warnings) {
  if (v == null) return [];
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) {
    throw new Error(`${label} must be an array of strings`);
  }
  // normalize/trim
  const out = v.map((s) => s.trim()).filter(Boolean);
  if (out.length !== v.length) warnings.push(`${label} had empty/whitespace entries that were ignored`);
  return out;
}

/**
 * Validate the KB files under public/kb.
 * - Ensures required files exist
 * - Validates basic schema for manifest, sources, and sections
 * - Validates cross-references (section.source_id exists in sources)
 * - Enforces a minimum sections count ("index rebuild gate")
 */
export function validateKB({
  rootDir = process.cwd(),
  kbDir = path.join(rootDir, "public", "kb"),
  minDocs = Number(process.env.KB_MIN_DOCS ?? 50)
} = {}) {
  const warnings = [];

  const manifestPath = path.join(kbDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) throw new Error(`KB manifest not found: ${manifestPath}`);

  const manifest = readJson(manifestPath);
  if (!isObj(manifest)) throw new Error("manifest.json must be an object");
  if (typeof manifest.kb_version !== "string" || !manifest.kb_version.trim()) {
    throw new Error("manifest.json: kb_version is required (string)");
  }
  if (!isObj(manifest.files)) throw new Error("manifest.json: files is required (object)");
  if (typeof manifest.files.sources !== "string" || typeof manifest.files.sections !== "string") {
    throw new Error("manifest.json: files.sources and files.sections are required (strings)");
  }

  const sourcesPath = path.join(kbDir, manifest.files.sources);
  const sectionsPath = path.join(kbDir, manifest.files.sections);

  if (!fs.existsSync(sourcesPath)) throw new Error(`Missing KB sources file: ${sourcesPath}`);
  if (!fs.existsSync(sectionsPath)) throw new Error(`Missing KB sections file: ${sectionsPath}`);

  const sourcesJson = readJson(sourcesPath);
  const sectionsJson = readJson(sectionsPath);

  if (!isObj(sourcesJson) || !Array.isArray(sourcesJson.sources)) {
    throw new Error(`${path.basename(sourcesPath)} must be { sources: [...] }`);
  }
  if (!isObj(sectionsJson) || !Array.isArray(sectionsJson.sections)) {
    throw new Error(`${path.basename(sectionsPath)} must be { sections: [...] }`);
  }

  const sources = sourcesJson.sources;
  const sections = sectionsJson.sections;

  const sourceById = new Map();
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    const at = `${path.basename(sourcesPath)}:sources[${i}]`;
    if (!isObj(s)) throw new Error(`${at} must be an object`);
    if (typeof s.source_id !== "string" || !s.source_id.trim()) throw new Error(`${at}.source_id is required`);
    if (sourceById.has(s.source_id)) throw new Error(`Duplicate source_id: ${s.source_id}`);
    if (typeof s.type !== "string" || !s.type.trim()) throw new Error(`${at}.type is required`);
    if (typeof s.title !== "string" || !s.title.trim()) throw new Error(`${at}.title is required`);

    // Optional arrays
    s.tags = asStringArray(s.tags, `${at}.tags`, warnings);
    sourceById.set(s.source_id, s);
  }

  const sectionIdSet = new Set();
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const at = `${path.basename(sectionsPath)}:sections[${i}]`;
    if (!isObj(sec)) throw new Error(`${at} must be an object`);
    if (typeof sec.source_id !== "string" || !sec.source_id.trim()) throw new Error(`${at}.source_id is required`);
    if (!sourceById.has(sec.source_id)) {
      throw new Error(`${at} references missing source_id: ${sec.source_id}`);
    }
    if (typeof sec.section_id !== "string" || !sec.section_id.trim()) throw new Error(`${at}.section_id is required`);
    if (sectionIdSet.has(sec.section_id)) throw new Error(`Duplicate section_id: ${sec.section_id}`);
    sectionIdSet.add(sec.section_id);

    if (typeof sec.heading !== "string") warnings.push(`${at}.heading is missing (recommended)`);
    if (typeof sec.text !== "string" || !sec.text.trim()) throw new Error(`${at}.text is required (non-empty string)`);

    // Optional arrays
    sec.tags = asStringArray(sec.tags, `${at}.tags`, warnings);
    sec.keywords = asStringArray(sec.keywords, `${at}.keywords`, warnings);
  }

  if (!Number.isFinite(minDocs) || minDocs < 0) {
    throw new Error(`KB_MIN_DOCS must be a non-negative number (got: ${process.env.KB_MIN_DOCS})`);
  }

  // The gate: fail fast if KB is too small (prevents shipping an empty/partial index)
  if (sections.length < minDocs) {
    throw new Error(
      `KB validation gate failed: sections count ${sections.length} is below minimum ${minDocs}. ` +
        `This usually means the bulk KB pack was not applied to public/kb/.`
    );
  }

  return {
    manifest,
    sourcesJson,
    sectionsJson,
    sources,
    sections,
    sourceById,
    warnings
  };
}

// CLI usage: node scripts/kb-validate.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const { sources, sections, warnings } = validateKB();
    console.log(`[kb-validate] OK: sources=${sources.length} sections=${sections.length} (min=${Number(process.env.KB_MIN_DOCS ?? 50)})`);
    if (warnings.length) {
      console.log(`[kb-validate] Warnings (${warnings.length}):`);
      for (const w of warnings.slice(0, 25)) console.log(`- ${w}`);
      if (warnings.length > 25) console.log(`- ...and ${warnings.length - 25} more`);
    }
  } catch (err) {
    console.error(`[kb-validate] FAIL: ${err?.message ?? err}`);
    process.exit(1);
  }
}
