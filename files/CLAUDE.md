# Global Instructions

## Behavior
- For complex bash commands, break into multiple simple commands or use a script file
- Avoid complex pipes - run each step individually
- Never use `2>&1` in bash - keep stderr and stdout separate
- When large content is pasted with no instructions, just summarize it
- When asked to research, focus on the past 3 months for up-to-date info

## Writing for Others (CRITICAL)
- Jira/PR/Confluence comments and Slack shares: invoke the `my-voice` skill FIRST, even when it's one buried step in a longer request
- Show the draft and get approval before posting

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

## Context Management & Token Optimization
- Run `/compact` proactively at ~50% context usage (auto-compact backstop set to 60%)
- When context usage exceeds 80%, use `/half-clone` or `/handoff` instead
- Keep conversations focused on single topics — switching topics nukes prompt cache
- Offload exploration to Explore agent → reads 20 files, returns summary only
- Prompt cache TTL is 5 min — long idle pauses cost more than continuous work
- Don't switch models mid-phase (cache invalidates); pick model per phase
- Use Haiku 4.5 for cheap mechanical work, Sonnet for default, Opus 4.8 only for hard reasoning
- Cap tool output — never `cat`/`tail` large files; use `Read` with `limit`/`offset` or `grep` with filters
- Disable unused MCP servers — each adds 100~500 tokens per turn (`/mcp` to manage)
- Per-project: drop a `.claudeignore` to block `node_modules`, `dist`, `build`, `*.lock`, `__pycache__`

## Skill Building
- When building custom skills, use `skill-creator` skill first for scaffolding
- Folder: kebab-case only. File: exactly `SKILL.md` (case-sensitive). No README.md inside skill folder
- Description formula: `[What it does] + [When to use it] + [Key capabilities]` (under 1024 chars)
- Include specific trigger phrases users would actually say in description
- No XML tags (`< >`) in frontmatter, no "claude"/"anthropic" in name field
- Keep SKILL.md under 5,000 words - move detailed docs to `references/`
- Always include error handling and concrete examples in instructions
- Be specific and actionable (not "validate data" but exact commands + common errors)
- Test 3 areas: triggering accuracy, functional correctness, performance vs baseline
- Use 5 patterns as needed: Sequential Workflow, Multi-MCP Coordination, Iterative Refinement, Context-Aware Tool Selection, Domain-Specific Intelligence
- For critical validations, bundle scripts (`scripts/`) rather than relying on language instructions

## Gotchas
- When Claude makes a repeated mistake, add a rule here so it doesn't happen again
- Mixed old/new patterns in codebase confuse Claude - finish migrations before adding new patterns
