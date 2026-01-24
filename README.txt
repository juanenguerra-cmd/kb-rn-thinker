PatchOnly — src/store/appStore.ts (FINAL)

Fixes Cloudflare TS2739 build failures:
- Record<WizardCategory, string> maps were missing: stroke, chest_pain, pain, critical_labs
- Record<WizardCategory, string[]> map was missing the same keys

This file adds those keys to:
- assessmentNoteByCategory
- interventionsNoteByCategory
- monitoringNoteByCategory
- seedTermsByCategory

Also fixes regex word-boundary typos in inferWizardFromIssue using \b (so triggers work reliably).

Apply:
1) Unzip into repo root (same folder as package.json), overwrite.
2) Commit + push.
3) Cloudflare Pages should build cleanly.
