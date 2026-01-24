// scripts/patch-packagejson-pretsc.mjs
// Ensures npm run build runs the wizardcategory patch BEFORE tsc.

import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "package.json");
if (!fs.existsSync(FILE)) {
  console.error("ERROR: package.json not found at:", FILE);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(FILE, "utf8"));
pkg.scripts = pkg.scripts || {};
const cur = pkg.scripts.build;

const target = 'node scripts/patch-wizardcategory-maps.mjs && npm run build:search-index && tsc -b && vite build';

if (typeof cur === "string" && cur.includes("patch-wizardcategory-maps.mjs")) {
  console.log("[patch-packagejson-pretsc] build script already patched.");
  process.exit(0);
}

if (typeof cur === "string" && cur.includes("npm run build:search-index") && cur.includes("tsc -b") && cur.includes("vite build")) {
  pkg.scripts.build = target;
  fs.writeFileSync(FILE, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  console.log("[patch-packagejson-pretsc] Patched package.json build script.");
} else {
  console.log("[patch-packagejson-pretsc] Did not patch: build script pattern unexpected.");
  console.log("Current build:", cur);
  console.log("Please manually set scripts.build to:");
  console.log(target);
}
