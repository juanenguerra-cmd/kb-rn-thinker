// scripts/patch-wizardcategory-maps.mjs
// Runs before TypeScript build to ensure src/store/appStore.ts wizard category maps
// include: stroke, chest_pain, pain, critical_labs

import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "src", "store", "appStore.ts");
if (!fs.existsSync(FILE)) {
  console.error("ERROR: src/store/appStore.ts not found at:", FILE);
  process.exit(1);
}

let src = fs.readFileSync(FILE, "utf8");

function insertAfterAbuse(block, insertText) {
  const abuseLineRe = /(\n\s*abuse\s*:\s*[^,\n]+,\s*\n)/;
  if (abuseLineRe.test(block)) {
    return block.replace(abuseLineRe, `$1${insertText}`);
  }
  return block.replace(/\n(\s*\}\s*)$/, `\n${insertText}$1`);
}

function patchRecordStringMaps(text) {
  const re = /(Record<\s*WizardCategory\s*,\s*string\s*>\s*=\s*\{)([\s\S]*?)(\}\s*;)/g;
  return text.replace(re, (m, head, body, tail) => {
    const hasLegacy =
      body.includes("general:") &&
      body.includes("fever:") &&
      body.includes("respiratory:") &&
      body.includes("fall:") &&
      body.includes("abuse:");
    if (!hasLegacy) return m;
    if (body.includes("stroke:") || body.includes("chest_pain:") || body.includes("critical_labs:")) return m;

    const insert =
      `  stroke: "Stroke/TIA",\n` +
      `  chest_pain: "Chest Pain / Suspected ACS",\n` +
      `  pain: "Pain",\n` +
      `  critical_labs: "Critical Labs",\n`;

    const patchedBody = insertAfterAbuse(body, insert);
    return `${head}${patchedBody}${tail}`;
  });
}

function patchRecordStringArrayMaps(text) {
  const re = /(Record<\s*WizardCategory\s*,\s*string\[\]\s*>\s*=\s*\{)([\s\S]*?)(\}\s*;)/g;
  return text.replace(re, (m, head, body, tail) => {
    const hasLegacy =
      body.includes("general:") &&
      body.includes("fever:") &&
      body.includes("respiratory:") &&
      body.includes("fall:") &&
      body.includes("abuse:");
    if (!hasLegacy) return m;
    if (body.includes("stroke:") || body.includes("chest_pain:") || body.includes("critical_labs:")) return m;

    const insert =
      `  stroke: ["stroke", "tia", "face droop", "arm weakness", "slurred speech", "be-fast", "fast"],\n` +
      `  chest_pain: ["chest pain", "acs", "heart attack", "pressure", "radiating", "sob", "diaphoresis"],\n` +
      `  pain: ["pain", "new pain", "worsening pain", "pain protocol"],\n` +
      `  critical_labs: ["critical lab", "potassium", "troponin", "anc", "ammonia", "bun", "creatinine", "bicarbonate", "co2"],\n`;

    const patchedBody = insertAfterAbuse(body, insert);
    return `${head}${patchedBody}${tail}`;
  });
}

const before = src;
src = patchRecordStringMaps(src);
src = patchRecordStringArrayMaps(src);

if (src === before) {
  console.log("[patch-wizardcategory-maps] No changes needed.");
  process.exit(0);
}

fs.writeFileSync(FILE, src, "utf8");
console.log("[patch-wizardcategory-maps] Patched src/store/appStore.ts");
