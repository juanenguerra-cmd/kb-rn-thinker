Build Fix Patch — DecisionWizardTab exports

Fixes Cloudflare build error:
- App.tsx imports { DecisionWizardTab } but file might only default-export.
This file exports BOTH a named export and a default export.

Apply:
1) Unzip into repo root (same folder as package.json), overwrite.
2) Commit + push.

IMPORTANT:
Your latest build log also shows WizardCategory maps missing keys:
stroke, chest_pain, pain, critical_labs.
You MUST add those keys to the Record<WizardCategory, ...> maps in src/store/appStore.ts.
(If you upload/paste appStore.ts, I can generate an exact appStore.ts patch file too.)
