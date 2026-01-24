KB Critical Labs (Extended) + COC Decision Tree (PatchOnly)

Adds/updates:
- public/kb/clinical/critical_values_defaults.json
  Includes: BUN, Creatinine, Total CO2/Bicarbonate, Ammonia, Troponin (hs), ANC (plus existing items).
- public/kb/docs/coc/coc_critical_labs.json
  Expanded guidance sections for renal labs, CO2/bicarb, ammonia, troponin, ANC.
- public/kb/coc/pathways/critical_labs_decision_tree.json
  Extended options and prompts, same triage structure.

Apply:
1) Unzip into repo root (same folder as package.json), preserving paths.
2) Rebuild/deploy:
   cmd /c "npm run build"
3) Wizard wiring:
   - If wizard auto-loads /kb/coc/pathways/*.json, it will appear automatically.
   - Otherwise add a wizard entry pointing to:
     /kb/coc/pathways/critical_labs_decision_tree.json

Notes:
- Replace defaults with your contracted lab’s official critical value table when available.
- Troponin cutoffs are assay-specific; treat any "positive" or above cutoff as urgent per protocol.
