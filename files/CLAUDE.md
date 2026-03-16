# Global Instructions

## Behavior
- For complex bash commands, break into multiple simple commands or use a script file
- Avoid complex pipes - run each step individually
- Never use `2>&1` in bash - keep stderr and stdout separate
- When large content is pasted with no instructions, just summarize it
- When asked to research, focus on the past 3 months for up-to-date info

## Code Quality
- Prefer immutable data structures - create new objects, never mutate
- Many small files > few large files (200-400 lines typical, 800 max)
- Organize by feature/domain, not by type
- Validate inputs at system boundaries, trust internal code
- Handle errors explicitly - never silently swallow them

## Safety
- NEVER commit hardcoded secrets (API keys, passwords, tokens)
- Use environment variables or secret managers for secrets
- Validate required secrets are present at startup
- Review for OWASP top 10 vulnerabilities before completing

## Development Workflow
- Research & reuse first - prefer battle-tested libraries over hand-rolled
- Plan before implementing complex features
- Write tests for critical paths
- Keep commits atomic with conventional commit format (feat, fix, refactor, docs, test, chore)

## Context Management
- When context usage exceeds 80%, consider using /compact or /half-clone
- Keep conversations focused on single topics
- Use handoff docs for multi-session work
