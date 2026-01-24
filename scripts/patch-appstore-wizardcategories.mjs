// scripts/patch-appstore-wizardcategories.mjs
// Auto-patches src/store/appStore.ts to add missing WizardCategory keys:
// stroke, chest_pain, pain, critical_labs
//
// Usage (Windows PowerShell-safe):
//   node scripts/patch-appstore-wizardcategories.mjs
//
// Then commit the changes and push.

import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "src", "store", "appStore.ts");
if (!fs.existsSync(FILE)) {
  console.error("ERROR: src/store/appStore.ts not found at:", FILE);
  process.exit(1);
}

let txt = fs.readFileSync(FILE, "utf8");

// Helpers to insert keys into object literals that already contain the legacy keys.
// We keep formatting conservative: add new keys right before the closing } of the object.
function patchRecordStringObjects(src) {
  // Match: const X: Record<WizardCategory, string> = { ... };
  // Capture the object body.
  const reObj = /Record<\s*WizardCategory\s*,\s*string\s*>\s*=\s*\{([\s\S]*?)\}\s*;/g;

  return src.replace(reObj, (m, body) => {
    // Only patch maps that look like the wizard category label maps (contain the legacy keys)
    const hasLegacy =
      body.includes("general:") &&
      body.includes("fever:") &&
      body.includes("respiratory:") &&
      body.includes("fall:") &&
      body.includes("abuse:");

    if (!hasLegacy) return m;

    // If already has new keys, skip
    if (body.includes("stroke:") || body.includes("chest_pain:") || body.includes("critical_labs:")) return m;

    const insert =
      `\n  stroke: "Stroke/TIA",\n` +
      `  chest_pain: "Chest Pain / Suspected ACS",\n` +
      `  pain: "Pain",\n` +
      `  critical_labs: "Critical Labs",\n`;

    // Insert before the final closing brace, but keep trailing commas safe.
    // Ensure body ends with newline.
    const b = body.endsWith("\n") ? body : body + "\n";
    return m.replace(body, b + insert);
  });
}

function patchRecordStringArrayObjects(src) {
  const reObj = /Record<\s*WizardCategory\s*,\s*string\[\]\s*>\s*=\s*\{([\s\S]*?)\}\s*;/g;

  return src.replace(reObj, (m, body) => {
    const hasLegacy =
      body.includes("general:") &&
      body.includes("fever:") &&
      body.includes("respiratory:") &&
      body.includes("fall:") &&
      body.includes("abuse:");

    if (!hasLegacy) return m;

    if (body.includes("stroke:") || body.includes("chest_pain:") || body.includes("critical_labs:")) return m;

    const insert =
      `\n  stroke: ["stroke", "tia", "face droop", "arm weakness", "slurred speech", "be-fast", "fast"],\n` +
      `  chest_pain: ["chest pain", "acs", "heart attack", "pressure", "radiating", "sob", "diaphoresis"],\n` +
      `  pain: ["pain", "new pain", "worsening pain", "pain protocol"],\n` +
      `  critical_labs: ["critical lab", "potassium", "troponin", "anc", "ammonia", "bun", "creatinine", "bicarbonate", "co2"],\n`;

    const b = body.endsWith("\n") ? body : body + "\n";
    return m.replace(body, b + insert);
  });
}

// Apply patches
const before = txt;
txt = patchRecordStringObjects(txt);
txt = patchRecordStringArrayObjects(txt);

if (txt === before) {
  console.log("No changes made. Either the file is already patched, or patterns did not match.");
  process.exit(0);
}

fs.writeFileSync(FILE, txt, "utf8");
console.log("Patched:", FILE);
console.log("Next: run `npm run build`, then commit and push.");
