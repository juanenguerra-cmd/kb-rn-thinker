PatchOnly — Enable real cascading decision trees (problem-driven) in the Wizard

What this patch does
- Adds new wizard categories that auto-trigger decision trees when the issue text contains keywords:
  stroke/TIA, chest pain/ACS, pain protocol, critical labs.
- Wizard Step 2 loads and runs the corresponding JSON pathway from:
  /kb/coc/pathways/*.json
- Supports node types: question_single, question_multi, lab_numeric, text_short, info, checklist.
- Nursing Progress Note modal now uses the checklist prompts + only selected items for tree modes.

Files changed
- src/store/appStore.ts
- src/features/wizard/DecisionWizardTab.tsx

Requirements
- Your deployed site must include these JSON files (added via earlier patches):
  /kb/coc/pathways/stroke_protocol_decision_tree.json
  /kb/coc/pathways/chest_pain_protocol_decision_tree.json
  /kb/coc/pathways/pain_protocol_decision_tree.json
  /kb/coc/pathways/critical_labs_decision_tree.json

How to test (exact triggers)
- Type in Step 1 issue text:
  "stroke symptoms"  -> loads Stroke decision tree
  "chest pain"       -> loads Chest Pain decision tree
  "pain protocol"    -> loads Pain protocol decision tree
  "potassium 2.5"    -> loads Critical Labs decision tree (then pick Potassium, enter value, symptom checker appears)

Deploy
- Unzip into repo root (overwrite), then:
  cmd /c "npm run build"
  git add -A
  git commit -m "Wizard: enable cascading decision trees for stroke/chest pain/pain/critical labs"
  git push
