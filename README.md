# My Claude Code Setup

My personal Claude Code configuration for disciplined, efficient AI-assisted development.

Built on top of community repos - [claude-code-tips](https://github.com/ykdojo/claude-code-tips), [everything-claude-code](https://github.com/affaan-m/everything-claude-code), [claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice), and [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) - with my own customizations on top.

[한국어 버전은 여기](#한국어)

---

## What this gives me

- **Real-time cost & context tracking** in the status line (model, git branch, token usage, estimated cost)
- **Automatic context overflow warning** - suggests `/half-clone` when context hits 85%
- **Auto-compact at 80%** - automatically compresses context before it gets too large
- **40+ pre-approved permissions** - git, npm, python, docker, gh CLI commands auto-allowed (no popup fatigue)
- **Dangerous command deny list** - `rm -rf`, `git push --force`, `git reset --hard` etc. blocked
- **5 custom slash commands** - `/review`, `/quick-commit`, `/verify`, `/handoff`, `/parallel-plan`
- **Always-on coding rules** - immutability, security checks, TDD, conventional commits
- **Python-specific rules** that activate only on `*.py` files (PEP 8, pytest, bandit, ruff)
- **3 plugins** for structured workflows (brainstorming, planning, debugging, code review, etc.)
- **Shell shortcuts** - `c` for claude, `ch` for chrome mode, `--fs` for fork-session
- **Mode-based contexts** - switch between dev/review/research mindsets

---

## Quick start

```bash
git clone https://github.com/alton15/claude-code-setup.git ~/claude-code-setup
cd ~/claude-code-setup
bash setup.sh
```

The script copies files to `~/.claude/`, adds shell aliases, and prints plugin install commands.

---

## File structure

```
~/.claude/
├── CLAUDE.md                     # Global instructions (all projects)
├── settings.json                 # Plugins, hooks, statusline, permissions
├── statusline-command.sh         # Status bar script
├── scripts/
│   └── check-context.sh          # Stop hook: warns at 85% context
├── commands/                     # Custom slash commands
│   ├── review.md                 # /review - pre-commit quality & security check
│   ├── quick-commit.md           # /quick-commit - stage, review, commit
│   ├── verify.md                 # /verify - prove work actually works
│   ├── handoff.md                # /handoff - create HANDOFF.md for next session
│   └── parallel-plan.md          # /parallel-plan - break task into parallel subtasks
├── rules/
│   ├── common/                   # Universal rules
│   │   ├── coding-style.md       # Immutability, small files, error handling
│   │   ├── security.md           # Pre-commit security checklist
│   │   ├── testing.md            # 80% coverage, TDD workflow
│   │   ├── git-workflow.md       # Conventional commits, PR workflow
│   │   └── patterns.md           # Repository pattern, API envelope
│   ├── python/                   # Python-only rules (path: **/*.py)
│   │   ├── coding-style.md       # PEP 8, type hints, black/ruff
│   │   ├── testing.md            # pytest, coverage, markers
│   │   ├── security.md           # env vars, bandit scanning
│   │   └── patterns.md           # Protocol, dataclass DTOs
│   └── react/                    # React-only rules (path: **/*.tsx, **/*.jsx, ...)
│       ├── coding-style.md       # Components, props, JSX style
│       ├── hooks.md              # useState/useEffect/custom hooks discipline
│       ├── patterns.md           # Composition, container/presentational, context
│       ├── security.md           # XSS, dangerouslySetInnerHTML, sanitization
│       └── testing.md            # RTL, MSW, user-centric assertions
├── contexts/                     # Optional mode switching
│   ├── dev.md                    # Code first, explain later
│   ├── review.md                 # Security/quality checklist
│   └── research.md               # Investigate before coding
├── agents/                       # Specialized subagents (from wshobson/agents)
│   ├── observability-engineer.md # Prometheus/Grafana/OTel/SLO design
│   ├── database-admin.md         # Cloud Postgres ops, HA/DR, performance
│   ├── mlops-engineer.md         # MLflow/Kubeflow/Airflow, drift monitoring
│   └── threat-modeling-expert.md # STRIDE/PASTA, attack trees (opus-tier)
└── skills/                       # Custom skills (add your own here)
```

---

## Plugins

Three plugins provide structured development workflows.

| Plugin | Marketplace | What it does |
|--------|-------------|--------------|
| **superpowers** | [obra/superpowers](https://github.com/obra/superpowers) | Core workflows: brainstorming, TDD, debugging, code review, planning, parallel agents. Includes [impeccable](https://github.com/pbakaus/impeccable) design skills for high-quality frontend UI. |
| **dx** | [ykdojo](https://github.com/ykdojo/claude-code-tips) | Context management: /clone, /half-clone, /handoff, /gha, /review-claudemd |
| **cli-anything** | [CLI-Anything](https://github.com/HKUDS/CLI-Anything) | Auto-connect CLI tools |

### Available slash commands

**From superpowers:**

| Command | Purpose |
|---------|---------|
| `/brainstorm` | Explore requirements before building |
| `/tdd` | Write tests first, then implement |
| `/debug` | Systematic root cause analysis |
| `/code-review` | Request structured code review |
| `/plan` | Write implementation plan |
| `/execute` | Execute a written plan |
| `/verify` | Verify before claiming done |
| `/dispatch` | Run parallel agents |
| `/worktree` | Isolated git worktree work |
| `/simplify` | Review code for simplification |
| `/finish` | Wrap up a development branch |
| `/skill-create` | Create new skills |

**From superpowers - [impeccable](https://github.com/pbakaus/impeccable) design skills:**

| Command | Purpose |
|---------|---------|
| `/frontend-design` | Create production-grade frontend UI with high design quality |
| `/teach-impeccable` | One-time setup to gather design context for a project |
| `/audit` | Comprehensive audit: accessibility, performance, theming, responsive |
| `/critique` | Evaluate design effectiveness from a UX perspective |
| `/polish` | Final quality pass: alignment, spacing, consistency |
| `/animate` | Add purposeful animations and micro-interactions |
| `/colorize` | Add strategic color to monochromatic interfaces |
| `/typeset` | Fix typography: hierarchy, sizing, weight, readability |
| `/arrange` | Improve layout, spacing, and visual rhythm |
| `/harden` | Error handling, i18n, text overflow, edge cases |
| `/adapt` | Make designs work across screen sizes and devices |
| `/distill` | Strip designs to their essence, remove unnecessary complexity |
| `/normalize` | Match your design system for consistency |
| `/extract` | Consolidate reusable components and design tokens |
| `/bolder` | Amplify safe designs to be more visually interesting |
| `/quieter` | Tone down overly bold designs |
| `/delight` | Add moments of joy and personality |
| `/overdrive` | Push interfaces with technically ambitious implementations |
| `/clarify` | Improve UX copy, error messages, and labels |
| `/onboard` | Design onboarding flows and first-time experiences |
| `/optimize` | Improve loading speed, rendering, animations, bundle size |

**From dx:**

| Command | Purpose |
|---------|---------|
| `/clone` | Clone conversation (branch off) |
| `/half-clone` | Clone only the later half (save context) |
| `/handoff` | Generate HANDOFF.md for next session |
| `/gha` | Analyze GitHub Actions failures |
| `/review-claudemd` | Analyze CLAUDE.md for improvements |
| `/reddit-fetch` | Fetch Reddit content |

### Installation

```bash
# Register marketplaces
claude plugin marketplace add anthropics/claude-plugins-official
claude plugin marketplace add ykdojo/claude-code-tips
claude plugin marketplace add HKUDS/CLI-Anything

# Install plugins
claude plugin install superpowers@claude-plugins-official
claude plugin install dx@ykdojo
claude plugin install cli-anything@cli-anything
```

---

## MCP servers

### Global (in `~/.claude.json` top-level `mcpServers`)

Paths are machine-specific - adjust after cloning.

| Server | Purpose | Auto-allowed |
|--------|---------|--------------|
| **atlassian-agent** | Jira issue lookup, Confluence page search | Yes |
| **firecrawl-mcp** | Web search/scraping via local Firecrawl (`localhost:3002`) | Yes |
| **pencil** | .pen file design editing, screenshots, layout inspection | Yes |

```json
{
  "mcpServers": {
    "atlassian-agent": {
      "type": "stdio",
      "command": "uv",
      "args": ["run", "--directory", "<path-to>/aitrics-agent", "python", "mcp_server.py"]
    },
    "firecrawl-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["firecrawl-mcp"],
      "env": { "FIRECRAWL_API_URL": "http://localhost:3002" }
    },
    "pencil": {
      "type": "stdio",
      "command": "<path-to>/mcp-server-darwin-arm64",
      "args": ["--app", "cursor"]
    }
  }
}
```

### Project-scoped — personal (`~/.claude.json` `projects.<path>.mcpServers`)

Per-directory, only active when launched from that path. Not git-tracked. Not installed by `setup.sh`.

| Project | Server | Type | Purpose |
|---------|--------|------|---------|
| `~/Downloads/resume` | **gmail-mcp** | http (`localhost:3000/mcp`) | Gmail integration via local HTTP server |
| `~/Downloads/resume` | **gmail** | stdio (`gmail-mcp` binary) | Gmail via stdio fallback |
| `~/Downloads/resume` | **browser-fetch** | stdio (`@anthropic/mcp-server-puppeteer`) | Browser-driven page fetch |
| `~/vc/vc-monorepo` | **figma** | http (`mcp.figma.com/mcp`) | Figma official MCP |
| `~/vc/vc-monorepo` | **figma-mcp** | stdio (`npx figma-mcp`, key via `env.FIGMA_API_KEY`) | Figma community MCP |
| `~/project/oncall-bot` | **atlassian-agent** | stdio | Same binary as global; concrete path |

Related sibling key — `disabledMcpServers` (array of names) turns a global MCP off for one project. Example: `vc-monorepo` disables `figma` while keeping `figma-mcp`.

### Project-scoped — committed (`<project-root>/.mcp.json`)

Separate mechanism: lives in the repo and is shared with whoever clones it. Same schema as the `mcpServers` block above.

| Repo | Servers |
|------|---------|
| `~/vc/vc-monorepo/.mcp.json` | datadog (http) |
| `~/project/oncall-bot/.mcp.json` | atlassian-agent (duplicate of `~/.claude.json` entry) |
| `~/project/everything-claude-code/.mcp.json` | github, context7, exa, memory, playwright, sequential-thinking |

### MCP secrets

⚠️ Do **not** put API keys in `args` — they appear in process lists and any config dump. Use `env`:

```json
"figma-mcp": {
  "command": "npx",
  "args": ["figma-mcp"],
  "env": { "FIGMA_API_KEY": "..." }
}
```

If you must avoid even storing the key in the JSON file, set the env var in your shell and reference it as `${FIGMA_API_KEY}` (when the MCP client supports expansion).

---

## Project-scoped settings (non-MCP)

Two layers stack on top of the global `~/.claude/settings.json`:

| Layer | File | Git status | Purpose |
|-------|------|-----------|---------|
| **Project (shared)** | `<repo>/.claude/settings.json` | Commit | Team-wide permissions/hooks |
| **Project (personal)** | `<repo>/.claude/settings.local.json` | gitignored | Per-machine overrides |

Precedence (later wins): global → project shared → project local. Each layer can set `permissions`, `hooks`, `enabledPlugins`, etc.

Examples from this user's projects (illustrative, not installed by `setup.sh`):

| Project | What's set | Why |
|---------|-----------|-----|
| `~/project/auto-card-news-ver2/.claude/settings.json` | `PreToolUse` hook reminding to run pytest before `git push`; warn on `.md` writes outside CLAUDE/README/AGENT_HANDOFF | Project-specific test discipline |
| `~/vc/vc-smart-simulator/.claude/settings.json` | `PreToolUse` hook running `.claude/hooks/lint-check.sh` before every Bash command | Enforce lint before shell actions |
| `~/project/oncall-bot/.claude/settings.json`, `~/vc/be-oncall-bot/.claude/settings.json` | Empty `permissions` scaffold | Reserved for future allowlist |

What can live under `<repo>/.claude/` besides `settings*.json`:

- `commands/` — project-only slash commands
- `agents/` — project-only subagents
- `skills/` — project-only skills
- `hooks/` — scripts referenced by `settings.json` hooks (e.g., `lint-check.sh` above)

---

## Settings

`~/.claude/settings.json` - full config with explanations:

| Setting | What it does |
|---------|--------------|
| `ENABLE_TOOL_SEARCH` | Enables deferred tool search |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=80` | Auto-compress context at 80% usage |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW=400000` | Token budget the % is calculated against (400K window) |
| `permissions.allow` (40+ commands) | Auto-allow git, npm, python, docker, gh, file ops, MCP servers |
| `permissions.deny` (6 commands) | Block `rm -rf`, `git push --force`, `git reset --hard`, `docker rm/rmi`, `kubectl delete` |
| `statusLine` | Custom bash script showing model/git/context/cost |
| `enabledPlugins` | superpowers + dx + cli-anything |
| `skipDangerousModePermissionPrompt` | Skip dangerous mode confirmation |
| `hooks.Stop` | Run context check on every conversation stop |

---

## Status line

`statusline-command.sh` displays in real time:

- **Model name** (Opus / Sonnet / Haiku) in purple
- **Working directory** in blue
- **Git branch + dirty status** (green = clean, yellow = uncommitted changes)
- **Context usage** (green >50% remaining, yellow 20-50%, red <20%)
- **Estimated cost** (calculated from model-specific token pricing)
- **Token counts** (input/output with K/M suffixes)
- **Output style** (default/concise/verbose)

---

## Stop hook

`scripts/check-context.sh` runs every time Claude stops:

- If context usage **exceeds 85%** of 1M tokens, blocks the stop and suggests `/half-clone`
- Prevents infinite loops with `stop_hook_active` guard
- Source: adapted from [claude-code-tips](https://github.com/ykdojo/claude-code-tips/blob/main/scripts/check-context.sh)

---

## Custom commands

Custom slash commands in `~/.claude/commands/` - type `/command-name` to use.

**Custom (this repo)**

| Command | Purpose |
|---------|---------|
| `/review` | Review uncommitted changes for security, quality, correctness before committing |
| `/quick-commit` | Stage, review for secrets, and commit with conventional commit format |
| `/verify` | Run tests/build/lint to prove work actually works before claiming done |
| `/handoff` | Generate HANDOFF.md for continuing work in a new session |
| `/parallel-plan` | Break a task into independent subtasks for parallel subagent execution |

**From [wshobson/agents](https://github.com/wshobson/agents)** — fill gaps in observability, DB ops, incident response, security:

| Command | Purpose |
|---------|---------|
| `/slo-implement` | Design SLI/SLO frameworks with error budgets, multi-window burn-rate alerts, Prometheus recording rules |
| `/sql-migrations` | Zero-downtime SQL migration generator (Alembic/Flyway/Liquibase) with rollback + validation gates |
| `/incident-response` | Multi-agent SRE incident orchestrator with severity gating, state files, postmortem generation |
| `/security-sast` | Multi-language SAST sweep (bandit/semgrep/CodeQL) with fix-ranked vulnerability reports |

---

## Agents

Specialized subagents in `~/.claude/agents/`. Invoked via `Agent` tool with the subagent name.

**From [wshobson/agents](https://github.com/wshobson/agents)** — chosen to fill gaps superpowers/dx/cli-anything don't cover:

| Agent | When to use |
|-------|-------------|
| `observability-engineer` | Production monitoring/logging/tracing (Prometheus, Grafana, OTel, ELK, Jaeger). Pairs with oncall bot + backend services |
| `database-admin` | Cloud Postgres ops — RDS/Aurora/Cloud SQL setup, HA/DR, backup, replication, perf tuning |
| `mlops-engineer` | MLflow/Kubeflow/Airflow pipelines, model registry, experiment tracking, drift monitoring |
| `threat-modeling-expert` | STRIDE/PASTA threat modeling, attack trees, architectural security review (opus-tier) |

---

## Rules

Always-on rules that Claude follows automatically. No need to mention them - they're loaded via `~/.claude/rules/`.

### Common (all languages)

| Rule | Key points |
|------|------------|
| **coding-style** | Immutability first. KISS/DRY/YAGNI principles. Small files (200-400 lines, 800 max). Naming conventions (camelCase/PascalCase/UPPER_SNAKE_CASE). Code smells: deep nesting, magic numbers, long functions. |
| **security** | 8-point pre-commit checklist. No hardcoded secrets. Parameterized queries. XSS/CSRF prevention. Security Response Protocol (STOP → fix → rotate → sweep). |
| **testing** | 80% minimum coverage. TDD: RED -> GREEN -> REFACTOR. Unit + integration + E2E. AAA pattern (Arrange-Act-Assert). Descriptive test naming. |
| **git-workflow** | Conventional commits (feat/fix/refactor/docs/test/chore). Full-history PR analysis. |
| **patterns** | Repository pattern. API response envelope. Skeleton projects evaluated by parallel agents (security/extensibility/relevance/planning). |

### Python (activates on `**/*.py` files only)

| Rule | Key points |
|------|------------|
| **coding-style** | PEP 8. Type annotations on all signatures. `frozen=True` dataclasses. black + isort + ruff. |
| **testing** | pytest. `--cov` for coverage. `pytest.mark` categorization (unit/integration). |
| **security** | `os.environ["KEY"]` (fail-fast). bandit for static analysis. |
| **patterns** | `Protocol` for duck typing. Dataclass DTOs. Context managers. Generators for lazy eval. |

---

## Contexts

Optional mode-based system prompts. Use with `--system-prompt` flag or shell aliases.

| Context | Mode | Behavior |
|---------|------|----------|
| `dev.md` | Development | Code first, explain after. Working > Perfect > Clean. |
| `review.md` | Code review | Read thoroughly. Prioritize by severity. Suggest fixes, not just problems. |
| `research.md` | Research | Investigate before acting. Hypothesis -> evidence -> findings. Favor Read / Grep / Glob / WebSearch / Explore agent. |

```bash
# Optional aliases
alias claude-dev='claude --system-prompt "$(cat ~/.claude/contexts/dev.md)"'
alias claude-review='claude --system-prompt "$(cat ~/.claude/contexts/review.md)"'
alias claude-research='claude --system-prompt "$(cat ~/.claude/contexts/research.md)"'
```

---

## Shell aliases

Added to `~/.zshrc`:

```bash
alias c='claude'              # Short form
alias ch='claude --chrome'    # Chrome mode

# --fs shortcut for --fork-session
claude() {
  local args=()
  for arg in "$@"; do
    if [[ "$arg" == "--fs" ]]; then
      args+=("--fork-session")
    else
      args+=("$arg")
    fi
  done
  command claude "${args[@]}"
}

# claude-code-templates CLI (davila7) — component installer + monitoring
alias cct='npx claude-code-templates@latest'
alias cct-analytics='npx claude-code-templates@latest --analytics'   # real-time session dashboard
alias cct-chats='npx claude-code-templates@latest --chats'           # conversation monitor
alias cct-health='npx claude-code-templates@latest --health-check'   # installation diagnostics
```

`cct` uses `npx` (no global install needed) — always pulls the latest version. Components install into the current project's `.claude/` directory, not globally.

---

## Global CLAUDE.md

`~/.claude/CLAUDE.md` - instructions that apply to every conversation:

- **Behavior** - Break complex bash into simple steps. No `2>&1`. Summarize large pastes.
- **Code quality** - Immutability. Small files. Feature-based organization. Explicit error handling.
- **Safety** - No hardcoded secrets. OWASP top 10 review before completing.
- **Workflow** - Research first. Plan before implementing. Test critical paths. Conventional commits.
- **Verification** - Never claim done without proof. Run tests/build/lint. Use `/verify`.
- **Planning & Parallel** - Plan mode for complex tasks. Subagents for independent work. Re-plan on failure.
- **Context** - `/compact` at 50%. `/half-clone` at 80%. Subagents preserve main context.
- **Skill Building** - skill-creator for scaffolding. kebab-case folders, exact `SKILL.md` filename. Description formula + trigger phrases. Bundle validation scripts.
- **Gotchas** - Living section for repeated mistakes. Finish migrations before adding new patterns.

---

## Source repos

This setup is built on top of these community repos. Clone them for additional agents, skills, hooks, and configs beyond what's included here.

| Repo | What's in it |
|------|-------------|
| [ykdojo/claude-code-tips](https://github.com/ykdojo/claude-code-tips) | 45 Claude Code tips, dx plugin source, statusline/context scripts, Boris Cherny's tips, agentic coding spectrum guide |
| [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code) | 18 agents (planner, architect, tdd-guide, security-reviewer...), 94 skills, 48 commands, hooks, 21 MCP configs, language-specific rules (TypeScript, Go, Kotlin, Swift, PHP, Perl) |
| [shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice) | 21.7k stars. CLAUDE.md sizing guide, permission wildcards, hook patterns, settings hierarchy, 35 prompting tips from Boris Cherny, 7 workflow framework comparisons |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | 32k stars. Curated directory of 200+ tools: orchestrators (Claude Squad, TSK), usage monitors, IDE integrations, security hooks (parry), config managers, statuslines |

### What I picked from each

**From everything-claude-code:**
- `rules/common/`, `rules/python/`, `rules/react/` - coding standards, security, testing, patterns
- `contexts/` - dev/review/research mode definitions

**From claude-code-tips:**
- `scripts/check-context.sh` - context overflow warning hook
- dx plugin - /clone, /half-clone, /handoff, /gha, /review-claudemd

**From claude-code-best-practice & awesome-claude-code:**
- Permission pre-approval pattern (40+ allow, 6 deny) - eliminates popup fatigue
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=80` - proactive context management
- Verification-first workflow - never claim done without proof
- Plan mode + re-plan on failure pattern
- Subagent delegation for context preservation
- Gotchas section in CLAUDE.md for learning from mistakes

### What's available but not applied (grab as needed)

**From everything-claude-code:**
- `agents/` - 18 specialized agents (planner, architect, tdd-guide, security-reviewer, etc.)
- `skills/` - 94 skills (django-patterns, docker-patterns, golang-patterns, etc.)
- `commands/` - 48 commands (/tdd, /plan, /code-review, /e2e, /orchestrate, etc.)
- `hooks/hooks.json` - 13+ hooks (auto-format, type-check, quality gate, PR logger, etc.)
- `mcp-configs/` - 21 MCP servers (GitHub, Supabase, Playwright, Vercel, Cloudflare, etc.)
- `rules/typescript/`, `rules/golang/`, `rules/kotlin/` - language-specific rules

**From claude-code-tips:**
- `scripts/context-bar.sh` - richer statusline with 10 color themes
- `content/` - guides on agentic coding spectrum, 10 tips for newer users
- `system-prompt/` - version-specific system prompt patches

**From wshobson/agents (added 2026-06):**
- `agents/observability-engineer.md`, `database-admin.md`, `mlops-engineer.md`, `threat-modeling-expert.md`
- `commands/slo-implement.md`, `sql-migrations.md`, `incident-response.md`, `security-sast.md`
- Selected to fill observability/SRE/DB ops/MLOps/threat-modeling gaps not covered by superpowers, dx, or python rules

### External references — when to reach for them

Not synced into this repo. Bookmarked for the specific situation in the right column.

**Building your own agent harness**

| Repo | When to use |
|------|-------------|
| [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) | Before forking anything — 20-lesson walkthrough of CC-style harness internals |
| [ljw1004/mini_agent](https://github.com/ljw1004/mini_agent) | Absolute floor harness skeleton (~280 LOC agent + 400 tools + 1200 prompts) |
| [earendil-works/pi](https://github.com/earendil-works/pi) | Minimal terminal harness with "lazy skills" (sub-1k-token system prompt, 4 core tools). Best minimal-but-serious base |
| [sst/opencode](https://github.com/sst/opencode) | Production-grade TS/Bun harness — LSP, multi-session, 75+ providers, plan/build agents. Read for architecture |
| [charmbracelet/crush](https://github.com/charmbracelet/crush) | Go-based TUI agent (LSP + MCP + TUI cleanly separated). Use if your harness should be in Go |

**LLM internals + agent patterns** (Karpathy)

| Repo | When to use |
|------|-------------|
| [karpathy/nanochat](https://github.com/karpathy/nanochat) | Learn end-to-end LLM training ($100 ChatGPT clone). Successor to nanoGPT |
| [karpathy/autoresearch](https://github.com/karpathy/autoresearch) | Reference for autonomous "edit → train → keep-or-revert" loops. Pattern generalizes beyond ML |
| [karpathy/llm-council](https://github.com/karpathy/llm-council) | Multi-model arbitration (cross-review + Chairman synthesis). For subagent voting pipelines |
| [karpathy/rustbpe](https://github.com/karpathy/rustbpe) | Roll your own BPE tokenizer in Rust |

*Avoid*: `karpathy/nanoGPT` (Karpathy himself deprecated it in favor of nanochat). `karpathy/llm.c` stalled since 2024-08.

**Extending the CC setup itself**

| Repo | When to use |
|------|-------------|
| [disler/claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery) | Reference for all 12+ hook lifecycle events with runnable examples |
| [disler/claude-code-hooks-multi-agent-observability](https://github.com/disler/claude-code-hooks-multi-agent-observability) | Real-time dashboard when running multiple agents simultaneously. This setup has no observability layer yet |
| [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates) ✅ | CLI for configuring + monitoring CC with templates, hooks, MCPs. **Installed as `cct` alias** — see [Shell aliases](#shell-aliases) |
| [wshobson/agents](https://github.com/wshobson/agents) ✅ partial | Cross-harness plugins (CC + Codex + Cursor + OpenCode + Gemini CLI + Copilot). 87 plugins / 191+ agents / 155 skills / 102 commands. **4 agents + 4 commands cherry-picked** — see [Agents](#agents) and [Custom commands](#custom-commands) |
| [poshan0126/dotclaude](https://github.com/poshan0126/dotclaude) | Compare `.claude/` layout — has code/security/perf/doc reviewer plugins worth checking against this setup |
| [shareAI-lab/mini-claude-code](https://github.com/shareAI-lab/mini-claude-code) | 5-version progressive tutorial (~1100 LOC). For teaching colleagues how CC actually works |

> ⚠️ Star counts and last-commit dates in these descriptions are from a 2026-06-01 research snapshot. Verify on GitHub before committing to a fork.

---

## Prerequisites

```bash
# Claude Code
curl -fsSL https://claude.ai/install.sh | bash

# Required tools
brew install jq git

# Python toolchain (if using uv)
curl -LsSf https://astral.sh/uv/install.sh | sh
```

---

## After setup - adjust for your environment

| Item | File | What to change |
|------|------|----------------|
| MCP server paths | `~/.claude.json` | Update binary/project paths for atlassian-agent, pencil; set `FIRECRAWL_API_URL` for firecrawl-mcp |
| MCP permissions | `~/.claude/settings.json` | Adjust `permissions.allow` for your MCP servers |

---

---

# 한국어

내가 사용하는 Claude Code 세팅과 가이드.

체계적이고 효율적인 AI 기반 개발을 위해 [claude-code-tips](https://github.com/ykdojo/claude-code-tips), [everything-claude-code](https://github.com/affaan-m/everything-claude-code), [claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice), [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) 커뮤니티 레포를 기반으로, 내 커스텀 설정을 얹어서 사용 중.

## 이 세팅으로 얻는 것

- **실시간 비용 & 컨텍스트 추적** - 상태바에 모델, git 브랜치, 토큰 사용량, 예상 비용 표시
- **컨텍스트 오버플로우 자동 경고** - 85% 도달 시 `/half-clone` 안내
- **80%에서 자동 컨텍스트 압축** - `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`
- **40+ 퍼미션 사전 허용** - git, npm, python, docker, gh 등 팝업 없이 자동 승인
- **위험 명령어 차단** - `rm -rf`, `git push --force`, `git reset --hard` 등 deny 처리
- **커스텀 커맨드 9개** - 자체 5개 (`/review`, `/quick-commit`, `/verify`, `/handoff`, `/parallel-plan`) + wshobson 4개 (`/slo-implement`, `/sql-migrations`, `/incident-response`, `/security-sast`)
- **특화 에이전트 4개** - observability-engineer, database-admin, mlops-engineer, threat-modeling-expert (wshobson/agents에서 cherry-pick)
- **항상 적용되는 코딩 규칙** - 불변성, 보안 체크, TDD, conventional commits
- **Python 전용 규칙** - `*.py` 파일에서만 활성화 (PEP 8, pytest, bandit, ruff)
- **React 전용 규칙** - `*.tsx`/`*.jsx` 파일에서만 활성화 (컴포넌트, hooks, XSS, RTL)
- **플러그인 3개** - 브레인스토밍, 플래닝, 디버깅, 코드 리뷰 등 체계적 워크플로우
- **Shell 단축키** - `c` (claude), `ch` (chrome 모드), `--fs` (fork-session)
- **모드별 컨텍스트** - dev/review/research 마인드셋 전환

## 빠른 설치

```bash
git clone https://github.com/alton15/claude-code-setup.git ~/claude-code-setup
cd ~/claude-code-setup
bash setup.sh
```

스크립트가 파일 복사 후, 플러그인 설치 명령을 출력함. MCP 서버는 로컬 경로 의존이라 별도 설정 필요.

## 상세 내용

각 항목의 상세 설명은 [영문 섹션](#my-claude-code-setup) 참고. 주요 구성:

| 구성 요소 | 설명 |
|----------|------|
| **플러그인** | superpowers (핵심 워크플로우 + [impeccable](https://github.com/pbakaus/impeccable) 디자인 스킬 21개), dx (컨텍스트 관리), cli-anything (CLI 연동) |
| **MCP 서버 (글로벌)** | atlassian-agent (Jira/Confluence), firecrawl-mcp (웹 검색/스크래핑), pencil (디자인 편집) |
| **MCP 서버 (프로젝트 전용, `~/.claude.json`)** | `~/Downloads/resume`: gmail, gmail-mcp, browser-fetch · `~/vc/vc-monorepo`: figma, figma-mcp · `~/project/oncall-bot`: atlassian-agent |
| **MCP 서버 (커밋용, `.mcp.json`)** | vc-monorepo: datadog · everything-claude-code: github/context7/exa/memory/playwright/sequential-thinking |
| **프로젝트 스코프 설정** | `<repo>/.claude/settings.json` (팀 공유) + `settings.local.json` (개인) - hooks/permissions를 프로젝트별로. 예: auto-card-news-ver2는 git push 전 pytest 알림, vc-smart-simulator는 Bash 전 lint 실행 |
| **상태바** | 모델/git/컨텍스트 사용률/예상 비용/토큰 실시간 표시 |
| **Stop Hook** | 컨텍스트 85% 초과 시 /half-clone 안내 |
| **커스텀 커맨드 (자체 5개)** | /review, /quick-commit, /verify, /handoff, /parallel-plan |
| **커스텀 커맨드 (wshobson 4개)** | /slo-implement (SLO/burn-rate), /sql-migrations (zero-downtime), /incident-response (SRE 오케스트레이션), /security-sast (다언어 SAST) |
| **특화 에이전트 (wshobson 4개)** | observability-engineer, database-admin (Postgres ops), mlops-engineer (MLflow/Kubeflow), threat-modeling-expert (STRIDE/PASTA, opus) |
| **공통 규칙 (5개)** | 코딩 스타일 (불변성, KISS/DRY/YAGNI, 네이밍, 코드 스멜), 보안 (Response Protocol 포함), 테스트 (80%+, AAA 패턴), git 워크플로우, 디자인 패턴 (parallel agents 평가) |
| **Python 규칙 (4개)** | PEP 8, pytest, bandit, Protocol/dataclass 패턴 |
| **React 규칙 (5개)** | 코딩 스타일, hooks 규율, 패턴(composition/context), 보안(XSS/sanitization), 테스트(RTL/MSW) |
| **컨텍스트 (3개)** | dev (코드 우선), review (보안/품질), research (조사 우선) |
| **Shell 별칭** | `c`, `ch`, `--fs` 단축키 |
| **Global CLAUDE.md** | bash 분리, 불변성, 시크릿 금지, 검증 필수, 계획 우선, 서브에이전트 활용, 스킬 빌딩 가이드, Gotchas |

## 출처 레포

| 레포 | 내용 |
|------|------|
| [ykdojo/claude-code-tips](https://github.com/ykdojo/claude-code-tips) | 45개 팁, dx 플러그인 원본, 상태바/컨텍스트 스크립트 |
| [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code) | 18 에이전트, 94 스킬, 48 커맨드, 훅, 21 MCP 설정, 언어별 규칙 |
| [shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice) | 21.7k stars. CLAUDE.md 작성법, 퍼미션 와일드카드, 훅 패턴, Boris Cherny 35개 팁, 워크플로우 프레임워크 7개 비교 |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | 32k stars. 200+ 도구 모음: 오케스트레이터, 사용량 모니터, IDE 통합, 보안 훅, 설정 관리자 |

더 많은 agents/skills/hooks/configs가 필요하면 위 레포를 클론해서 골라 쓰면 됨.

### 외부 레퍼런스 — 상황별

직접 sync하지 않고 북마크. 자세한 설명은 [영문 "External references" 섹션](#external-references--when-to-reach-for-them) 참고.

| 상황 | 레포 |
|------|------|
| 하네스 학습 → 미니멀 → 진지하게 | [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) → [mini_agent](https://github.com/ljw1004/mini_agent) → [earendil-works/pi](https://github.com/earendil-works/pi) → [sst/opencode](https://github.com/sst/opencode), Go면 [crush](https://github.com/charmbracelet/crush) |
| LLM 내부/패턴 학습 (Karpathy) | [nanochat](https://github.com/karpathy/nanochat), [autoresearch](https://github.com/karpathy/autoresearch), [llm-council](https://github.com/karpathy/llm-council), [rustbpe](https://github.com/karpathy/rustbpe) |
| CC 훅·옵저버빌리티·템플릿 | [disler/hooks-mastery](https://github.com/disler/claude-code-hooks-mastery), [disler/observability](https://github.com/disler/claude-code-hooks-multi-agent-observability), [davila7/templates](https://github.com/davila7/claude-code-templates) |
| 크로스 하네스 plugin | [wshobson/agents](https://github.com/wshobson/agents) |
| `.claude/` 레이아웃 비교 | [poshan0126/dotclaude](https://github.com/poshan0126/dotclaude) |
| 동료 교육 | [mini-claude-code](https://github.com/shareAI-lab/mini-claude-code) |
