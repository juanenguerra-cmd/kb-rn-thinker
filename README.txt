Cloudflare Build Fix — WizardCategory Maps

Problem:
Cloudflare build fails with TS2739 in src/store/appStore.ts because Record<WizardCategory, ...> maps
only include legacy keys: general/fever/respiratory/fall/abuse, while WizardCategory now includes:
stroke/chest_pain/pain/critical_labs.

This patch fixes it WITHOUT manual edits by running a pre-TS patch step during build.

Files included:
- scripts/patch-wizardcategory-maps.mjs  (patches src/store/appStore.ts)
- scripts/patch-packagejson-pretsc.mjs   (patches package.json scripts.build to run the patch before tsc)

How to apply:
1) Unzip into your repo root (same folder as package.json).
2) Run once locally:
   cmd /c "node scripts/patch-packagejson-pretsc.mjs"
3) Commit + push.
4) Cloudflare will now build successfully.

Optional (one-time patch instead of auto):
- cmd /c "node scripts/patch-wizardcategory-maps.mjs"
- Commit the appStore.ts changes
