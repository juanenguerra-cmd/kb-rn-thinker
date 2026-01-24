KB RN Thinker — WizardCategory Build Fix (Auto-Patch)

Your Cloudflare build is failing because src/store/appStore.ts contains Record<WizardCategory, ...> maps
that only define the legacy keys:
  general, fever, respiratory, fall, abuse

But WizardCategory now includes:
  stroke, chest_pain, pain, critical_labs

This auto-patch script updates appStore.ts by inserting the missing keys into:
- Record<WizardCategory, string> maps (3 places)
- Record<WizardCategory, string[]> map (keywords)

How to apply:
1) Unzip this ZIP into your repo root (same folder as package.json).
2) Run:
   node scripts/patch-appstore-wizardcategories.mjs
3) Verify:
   git diff src/store/appStore.ts
4) Rebuild:
   npm run build
5) Commit + push.

If you prefer a manual edit, add these keys to each Record map:
  stroke: "Stroke/TIA"
  chest_pain: "Chest Pain / Suspected ACS"
  pain: "Pain"
  critical_labs: "Critical Labs"
And for keywords map, use arrays of trigger terms.
