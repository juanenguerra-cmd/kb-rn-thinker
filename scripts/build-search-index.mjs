import fs from "node:fs";
import path from "node:path";

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const ROOT = process.cwd();
const KB_DIR = path.join(ROOT, "public", "kb");

const manifest = readJson(path.join(KB_DIR, "manifest.json"));
const sources = readJson(path.join(KB_DIR, manifest.files.sources));
const sections = readJson(path.join(KB_DIR, manifest.files.sections));

const sourceById = new Map(sources.sources.map((s) => [s.source_id, s]));

const docs = sections.sections.map((sec) => {
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
