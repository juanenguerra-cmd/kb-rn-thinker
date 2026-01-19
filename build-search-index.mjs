import fs from "node:fs";
import path from "node:path";
import { validateKB } from "./kb-validate.mjs";

const ROOT = process.cwd();
const KB_DIR = path.join(ROOT, "public", "kb");

// Validate KB + enforce minimum size before generating the search index.
// Gate override: set KB_MIN_DOCS (default 50).
const { manifest, sourcesJson, sectionsJson, sourceById } = validateKB({ rootDir: ROOT, kbDir: KB_DIR });

const docs = sectionsJson.sections.map((sec) => {
  const src = sourceById.get(sec.source_id);
  if (!src) throw new Error(`Missing source for section: ${sec.source_id}::${sec.section_id}`);

  const tags = new Set([...(src.tags ?? []), ...(sec.tags ?? []), ...(sec.keywords ?? [])]);

  return {
    id: `${sec.source_id}::${sec.section_id}`,
    source_id: sec.source_id,
    section_id: sec.section_id,
    title: src.title,
    heading: sec.heading,
    type: src.type,
    jurisdiction: src.jurisdiction ?? "",
    effective_date: src.effective_date ?? "",
    review_by: src.review_by ?? "",
    url_or_location: src.url_or_location ?? "",
    tags: Array.from(tags),
    text: sec.text
  };
});

const out = {
  kb_version: manifest.kb_version,
  generated_at: new Date().toISOString(),
  docs
};

fs.writeFileSync(path.join(KB_DIR, "search_index.json"), JSON.stringify(out, null, 2), "utf8");
console.log(`[build-search-index] wrote ${docs.length} docs -> public/kb/search_index.json`);

// Secondary safety check: ensure we wrote a non-trivial index.
const minDocs = Number(process.env.KB_MIN_DOCS ?? 50);
if (docs.length < minDocs) {
  throw new Error(
    `Index build gate failed: wrote ${docs.length} docs (min ${minDocs}). ` +
      `Confirm public/kb/ contains the full KB pack and rerun.`
  );
}
