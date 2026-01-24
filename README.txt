PatchOnly — DecisionWizardTab Typing Fix

Why you couldn't type:
- The wizard textarea was bound to wizard.issueText (which doesn't exist in your appStore).
- Your real issue text lives at packetDraft.meta.issue_text.
- The action to update it is actions.setDraftIssueText.

Fix:
- Step 1 textarea now reads/writes packetDraft.meta.issue_text via actions.setDraftIssueText.

Apply:
1) Unzip into repo root (same folder as package.json), overwrite.
2) Commit + push.
