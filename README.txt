COC Protocols — Cascading Decision Trees (PatchOnly)

Adds 3 problem-driven cascading pathways:
- Stroke/TIA protocol
- Chest pain / suspected ACS protocol
- Pain assessment protocol

Files added:
- public/kb/coc/pathways/stroke_protocol_decision_tree.json
- public/kb/coc/pathways/chest_pain_protocol_decision_tree.json
- public/kb/coc/pathways/pain_protocol_decision_tree.json
- public/kb/docs/coc/coc_stroke_protocol.json
- public/kb/docs/coc/coc_chest_pain_protocol.json
- public/kb/docs/coc/coc_pain_protocol.json

Apply:
1) Unzip into repo root (same folder as package.json), preserving paths.
2) Rebuild (regenerates search_index.json so these become searchable):
   cmd /c "npm run build"
3) Wizard wiring:
   - If your wizard auto-loads /kb/coc/pathways/*.json, these appear automatically.
   - Otherwise, add wizard entries pointing to the 3 pathway JSON files above.

Sources referenced:
- American Heart Association / American Stroke Association (FAST + stroke warning signs; call 911 guidance)
- American Heart Association heart attack warning signs
- Pain assessment in older adults (open access review)
