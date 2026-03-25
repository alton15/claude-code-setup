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

## Verification (CRITICAL)
- NEVER claim work is "done" without running tests or proving it works
- Give yourself a way to verify every change - tests, build, lint, or manual check
- "It should work" is not verification. Run the code.
- Use `/verify` command before marking any task complete

## Planning & Parallel Work
- Start complex tasks in Plan mode (Shift+Tab twice) - invest in the plan
- If something goes sideways, stop and re-plan immediately instead of pushing forward
- Use subagents for independent subtasks to keep main context clean
- Break subtasks small enough to complete in under 50% context
- Use `/parallel-plan` to identify parallelizable work

## Context Management
- Run `/compact` proactively at ~50% context usage, don't wait for 80%
- When context usage exceeds 80%, consider using /compact or /half-clone
- Keep conversations focused on single topics
- Use `/handoff` to create handoff docs for multi-session work
- Offload research and exploration to subagents to preserve main context

## Gotchas
- When Claude makes a repeated mistake, add a rule here so it doesn't happen again
- Mixed old/new patterns in codebase confuse Claude - finish migrations before adding new patterns
