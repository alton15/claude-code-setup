---
name: verify
description: Verify current work actually works before claiming completion
---

Before claiming any work is complete, verify it:

1. **Find and run tests**: Look for test files related to changed code. Run them.
2. **Type/lint check**: Run the project's linter or type checker if configured
3. **Build check**: Run the build command if applicable
4. **Manual verification**: If no tests exist, verify the change works by:
   - Reading the changed code paths end-to-end
   - Checking edge cases and error paths
   - Running a quick smoke test if possible

Report results honestly. If something fails, fix it before claiming done.
Never say "it should work" - prove it works.
