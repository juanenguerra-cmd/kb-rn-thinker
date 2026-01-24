KB Critical Labs + COC Decision Tree (PatchOnly)

Adds:
- public/kb/clinical/critical_values_defaults.json
- public/kb/docs/coc/coc_critical_labs.json
- public/kb/coc/pathways/critical_labs_decision_tree.json

Apply:
1) Unzip into your repo root (same folder as package.json), preserving paths.
2) Rebuild/deploy:
   cmd /c "npm run build"
3) Wizard wiring:
   - If your wizard auto-loads /kb/coc/pathways/*.json, it will appear automatically.
   - Otherwise, add a wizard entry that points to:
     /kb/coc/pathways/critical_labs_decision_tree.json

Important:
- Replace defaults with your contracted lab’s official critical value table when available.
