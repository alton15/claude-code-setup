# My Claude Code Setup

My personal Claude Code configuration for disciplined, efficient AI-assisted development.

Built on top of two excellent community repos - [claude-code-tips](https://github.com/ykdojo/claude-code-tips) and [everything-claude-code](https://github.com/anthropics/everything-claude-code) - with my own customizations on top.

[한국어 버전은 여기](#한국어)

---

## What this gives me

- **Real-time cost & context tracking** in the status line (model, git branch, token usage, estimated cost)
- **Automatic context overflow warning** - suggests `/half-clone` when context hits 85%
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
├── rules/
│   ├── common/                   # Universal rules
│   │   ├── coding-style.md       # Immutability, small files, error handling
│   │   ├── security.md           # Pre-commit security checklist
│   │   ├── testing.md            # 80% coverage, TDD workflow
│   │   ├── git-workflow.md       # Conventional commits, PR workflow
│   │   └── patterns.md           # Repository pattern, API envelope
│   └── python/                   # Python-only rules (path: **/*.py)
│       ├── coding-style.md       # PEP 8, type hints, black/ruff
│       ├── testing.md            # pytest, coverage, markers
│       ├── security.md           # env vars, bandit scanning
│       └── patterns.md           # Protocol, dataclass DTOs
├── contexts/                     # Optional mode switching
│   ├── dev.md                    # Code first, explain later
│   ├── review.md                 # Security/quality checklist
│   └── research.md               # Investigate before coding
└── skills/                       # Custom skills (add your own here)
```

---

## Plugins

Three plugins provide structured development workflows.

| Plugin | Marketplace | What it does |
|--------|-------------|--------------|
| **superpowers** | [claude-plugins-official](https://github.com/anthropics/claude-plugins-official) | Core workflows: brainstorming, TDD, debugging, code review, planning, parallel agents |
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

Configured in `~/.claude.json`. Paths are machine-specific - adjust after cloning.

| Server | Purpose | Auto-allowed |
|--------|---------|--------------|
| **atlassian-agent** | Jira issue lookup, Confluence page search | Yes |
| **pencil** | .pen file design editing, screenshots, layout inspection | Yes |

```json
{
  "mcpServers": {
    "atlassian-agent": {
      "type": "stdio",
      "command": "uv",
      "args": ["run", "--directory", "<path-to>/aitrics-agent", "python", "mcp_server.py"]
    },
    "pencil": {
      "type": "stdio",
      "command": "<path-to>/mcp-server-darwin-arm64",
      "args": ["--app", "cursor"]
    }
  }
}
```

---

## Settings

`~/.claude/settings.json` - full config with explanations:

| Setting | What it does |
|---------|--------------|
| `ENABLE_TOOL_SEARCH` | Enables deferred tool search |
| `permissions.allow` | Auto-allow MCP servers + reading ~/.claude |
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

- If context usage **exceeds 85%** of 200K tokens, blocks the stop and suggests `/half-clone`
- Prevents infinite loops with `stop_hook_active` guard
- Source: adapted from [claude-code-tips](https://github.com/ykdojo/claude-code-tips/blob/main/scripts/check-context.sh)

---

## Rules

Always-on rules that Claude follows automatically. No need to mention them - they're loaded via `~/.claude/rules/`.

### Common (all languages)

| Rule | Key points |
|------|------------|
| **coding-style** | Immutability first. Small files (200-400 lines, 800 max). No deep nesting. No hardcoded values. |
| **security** | 8-point pre-commit checklist. No hardcoded secrets. Parameterized queries. XSS/CSRF prevention. |
| **testing** | 80% minimum coverage. TDD: RED -> GREEN -> REFACTOR. Unit + integration + E2E. |
| **git-workflow** | Conventional commits (feat/fix/refactor/docs/test/chore). Full-history PR analysis. |
| **patterns** | Repository pattern. API response envelope. Skeleton project approach. |

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
| `research.md` | Research | Investigate before acting. Hypothesis -> evidence -> findings. |

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
```

---

## Global CLAUDE.md

`~/.claude/CLAUDE.md` - instructions that apply to every conversation:

- **Behavior** - Break complex bash into simple steps. No `2>&1`. Summarize large pastes.
- **Code quality** - Immutability. Small files. Feature-based organization. Explicit error handling.
- **Safety** - No hardcoded secrets. OWASP top 10 review before completing.
- **Workflow** - Research first. Plan before implementing. Test critical paths. Conventional commits.
- **Context** - Use /compact or /half-clone at 80%. Keep conversations focused.

---

## Source repos

This setup is built on top of these community repos. Clone them for additional agents, skills, hooks, and configs beyond what's included here.

| Repo | What's in it |
|------|-------------|
| [ykdojo/claude-code-tips](https://github.com/ykdojo/claude-code-tips) | 45 Claude Code tips, dx plugin source, statusline/context scripts, Boris Cherny's tips, agentic coding spectrum guide |
| [anthropics/everything-claude-code](https://github.com/anthropics/everything-claude-code) | 18 agents (planner, architect, tdd-guide, security-reviewer...), 94 skills, 48 commands, hooks, 21 MCP configs, language-specific rules (TypeScript, Go, Kotlin, Swift, PHP, Perl) |

### What I picked from each

**From everything-claude-code:**
- `rules/common/` and `rules/python/` - coding standards, security, testing, patterns
- `contexts/` - dev/review/research mode definitions

**From claude-code-tips:**
- `scripts/check-context.sh` - context overflow warning hook
- dx plugin - /clone, /half-clone, /handoff, /gha, /review-claudemd

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
| MCP server paths | `~/.claude.json` | Update binary/project paths for atlassian-agent, pencil |
| MCP permissions | `~/.claude/settings.json` | Adjust `permissions.allow` for your MCP servers |

---

---

# 한국어

내가 사용하는 Claude Code 세팅과 가이드.

체계적이고 효율적인 AI 기반 개발을 위해 [claude-code-tips](https://github.com/ykdojo/claude-code-tips)와 [everything-claude-code](https://github.com/anthropics/everything-claude-code) 두 커뮤니티 레포를 기반으로, 내 커스텀 설정을 얹어서 사용 중.

## 이 세팅으로 얻는 것

- **실시간 비용 & 컨텍스트 추적** - 상태바에 모델, git 브랜치, 토큰 사용량, 예상 비용 표시
- **컨텍스트 오버플로우 자동 경고** - 85% 도달 시 `/half-clone` 안내
- **항상 적용되는 코딩 규칙** - 불변성, 보안 체크, TDD, conventional commits
- **Python 전용 규칙** - `*.py` 파일에서만 활성화 (PEP 8, pytest, bandit, ruff)
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
| **플러그인** | superpowers (핵심 워크플로우), dx (컨텍스트 관리), cli-anything (CLI 연동) |
| **MCP 서버** | atlassian-agent (Jira/Confluence), pencil (디자인 편집) |
| **상태바** | 모델/git/컨텍스트 사용률/예상 비용/토큰 실시간 표시 |
| **Stop Hook** | 컨텍스트 85% 초과 시 /half-clone 안내 |
| **공통 규칙 (5개)** | 코딩 스타일, 보안, 테스트 (80%+), git 워크플로우, 디자인 패턴 |
| **Python 규칙 (4개)** | PEP 8, pytest, bandit, Protocol/dataclass 패턴 |
| **컨텍스트 (3개)** | dev (코드 우선), review (보안/품질), research (조사 우선) |
| **Shell 별칭** | `c`, `ch`, `--fs` 단축키 |
| **Global CLAUDE.md** | bash 분리, 불변성, 시크릿 금지, 리서치 우선, conventional commits |

## 출처 레포

| 레포 | 내용 |
|------|------|
| [ykdojo/claude-code-tips](https://github.com/ykdojo/claude-code-tips) | 45개 팁, dx 플러그인 원본, 상태바/컨텍스트 스크립트 |
| [anthropics/everything-claude-code](https://github.com/anthropics/everything-claude-code) | 18 에이전트, 94 스킬, 48 커맨드, 훅, 21 MCP 설정, 언어별 규칙 |

더 많은 agents/skills/hooks/configs가 필요하면 위 레포를 클론해서 골라 쓰면 됨.
