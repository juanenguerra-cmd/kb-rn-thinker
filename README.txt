COC Critical Labs — Cascading Decision Tree (PatchOnly)

This updates the critical labs pathway into a true cascading decision tree:
Problem -> Value -> Symptom checker -> Contributing factors -> Follow-through questions -> Actions -> Outputs.

Contains:
- public/kb/coc/pathways/critical_labs_decision_tree.json (v2.0.0)

Apply:
1) Unzip into repo root (same folder as package.json), preserving paths.
2) Rebuild/deploy:
   cmd /c "npm run build"
3) Ensure wizard points to /kb/coc/pathways/critical_labs_decision_tree.json (or auto-loads that directory).
