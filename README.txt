PatchOnly — Wizard Narrative Completeness

Fixes:
- Step 3 note previously showed only the checklist (Assessment/Interventions/Documentation).
Now Step 3 outputs a complete progress note:
  - Problem (from packetDraft.meta.issue_text)
  - Protocol (auto-detected)
  - Key findings (derived from decision-tree answers)
  - Selected actions (only checked checklist items)

Apply:
1) Unzip into repo root, overwrite.
2) Commit + push.
