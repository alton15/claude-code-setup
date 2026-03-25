---
name: quick-commit
description: Stage, review, and commit changes with conventional commit format
---

1. Run `git status` and `git diff` to understand all changes
2. Review changes for security issues (secrets, vulnerabilities) - block if found
3. Stage relevant files (avoid .env, credentials, large binaries)
4. Generate a conventional commit message (feat/fix/refactor/docs/test/chore)
5. Create the commit

Do NOT push. Just commit locally.
