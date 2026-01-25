PatchOnly — Specialized COC Pathways + Catalog Mapping Updates (NO CODE CHANGES)

Adds these NEW pathway JSON files (same ladder schema: red flags → focused questions → minimum data → checklist → summary):
- public/kb/coc/pathways/behavior_change_decision_tree.json
- public/kb/coc/pathways/refusal_meds_decision_tree.json
- public/kb/coc/pathways/refusal_treatment_decision_tree.json
- public/kb/coc/pathways/delirium_ams_decision_tree.json

Updates mappings in:
- public/kb/coc/coc_catalog.json
  - coc_behavior_change, coc_elopement, coc_suicidal → behavior_change_decision_tree.json
  - coc_refusal_meds → refusal_meds_decision_tree.json
  - coc_refusal_treatment, coc_refusal_isolation → refusal_treatment_decision_tree.json
  - coc_acute_confusion_delirium, coc_over_sedation → delirium_ams_decision_tree.json

Apply:
1) Unzip into repo root (same folder as package.json), overwrite.
2) Commit + push. No React/TS code changes required.

Catalog count in this patch: 45
Updated: 2026-01-25
