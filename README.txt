Patch Set — COC catalog + problem picker + scored matching + wizard flow update

Adds:
- public/kb/coc/coc_catalog.json  (starter catalog with 46 problems)
- public/kb/coc/pathways/general_change_in_condition_decision_tree.json  (starter universal ladder)
- src/features/wizard/useCocCatalog.ts  (loads + scores)
- src/features/wizard/ProblemPickerStep.tsx  (ranked matches UI)
Updates:
- src/features/wizard/DecisionWizardTab.tsx  (Problem → Pick Match → Cascading Tree → Note)

Apply:
1) Unzip into repo root (same folder as package.json), overwrite.
2) npm run build
3) git add -A && git commit -m "COC catalog + picker + ladder wizard" && git push
