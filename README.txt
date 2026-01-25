PatchOnly — Fix TS6133 (unused React import) in ProblemPickerStep.tsx

Cloudflare build error:
src/features/wizard/ProblemPickerStep.tsx(2,1): TS6133: 'React' is declared but its value is never read.

Fix:
- Remove `import React from "react";` because the project uses the new JSX transform.

Apply:
1) Unzip into repo root, overwrite.
2) Commit + push.
