---
name: review
description: Review uncommitted changes for quality, security, and correctness
---

Review all uncommitted changes in this repository:

1. Run `git diff` to see all changes (staged + unstaged)
2. Check each change against these criteria:
   - **Security**: No hardcoded secrets, SQL injection, XSS, or OWASP top 10 issues
   - **Quality**: Immutable patterns, proper error handling, no silent failures
   - **Correctness**: Logic errors, edge cases, off-by-one errors
   - **Style**: Consistent naming, no deep nesting, functions under 50 lines
3. If issues found, list them with file:line references and severity (critical/warning/info)
4. If clean, confirm the changes look good with a brief summary

Be concise. Only flag real issues, not style nitpicks.
