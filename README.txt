Wizard Cascading Engine — FIX PATCH

Fixes TypeScript build error:
- src/features/wizard/DecisionWizardTab.tsx had truncated sectionControls(...) strings.
- Replaces them with correct strings: assessment/monitoring/documentation/interventions.

Apply:
1) Unzip into your repo root (same folder as package.json), overwrite.
2) Rebuild: npm run build
