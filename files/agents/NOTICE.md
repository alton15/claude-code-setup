# Vendored agents — attribution

The agents listed below are **not original work of this repo/config**.
They are copied here (and mirrored in the dotfiles repo at
`claude-code-setup/files/agents/`) so `setup.sh` can restore them to
`~/.claude/agents/` on a fresh machine. All credit belongs to the upstream
author below.

(`database-admin`, `mlops-engineer`, `observability-engineer`,
`threat-modeling-expert` predate this notice and are not covered by it.)

## Sources

| Agent(s) | Upstream | License |
|----------|----------|---------|
| `contrast-master`, `design-system-auditor`, `playwright-scanner`, `playwright-verifier` | [Community-Access/accessibility-agents](https://github.com/Community-Access/accessibility-agents) by Taylor Arndt, vendored from `claude-code-plugin/agents/` at commit [`161c60c`](https://github.com/Community-Access/accessibility-agents/commit/161c60c7493ad657f371ad8f91253d33c3b12044) (2026-08-02) | MIT (`LICENSE`) |

## Why these four

The upstream repo ships 79 agents across 8 teams (accessibility for web, PDF,
Office docs, EPUB, mobile, desktop, plus GitHub/CI integrations). Only these
four were vendored — the ones that actually drive a browser or compute a
number, rather than reasoning about markup in prose (which the existing
`~/.claude/skills/` "impeccable" suite already covers):

- **`contrast-master`** — includes a runnable WCAG relative-luminance/contrast
  formula (Python) invocable via the agent's Bash tool, plus verified
  Tailwind color-ratio tables. Computes exact contrast ratios instead of
  eyeballing them.
- **`design-system-auditor`** — parses real design-token files (Tailwind
  config, CSS custom properties, Style Dictionary, MUI/Chakra theme files)
  and runs the same luminance formula against every token pair, catching
  failures at the source before they reach rendered UI.
- **`playwright-scanner`** — writes and runs real Playwright + @axe-core
  test scripts (via Bash/npx) against a live page: keyboard-trap detection,
  dynamic-state scanning, responsive viewport testing, computed-style
  contrast extraction after CSS cascade, and accessibility-tree snapshots.
- **`playwright-verifier`** — same mechanism, used to verify a specific fix
  with a targeted axe-core assertion and report PASS/FAIL/REGRESSION.

Rejected candidates and why: `wcag-aaa` (pure AAA criteria checklist —
no computation, no browser, duplicates the judgment-only skills already
installed) and `lighthouse-bridge` (reads and correlates pre-existing
Lighthouse CI JSON reports via plain LLM reasoning — no Bash tool, doesn't
run Lighthouse itself, doesn't drive anything). The remaining 73 upstream
agents (PDF/Office/EPUB/mobile/desktop specialists, GitHub/CI orchestration,
issue trackers, etc.) were out of scope for this install.

## Adaptation note

`playwright-scanner` and `playwright-verifier` were vendored **without**
their upstream orchestrators (`web-accessibility-wizard`, `web-issue-fixer`)
and without the `playwright-testing` / `web-severity-scoring` skill modules
they originally referenced (those live under `.github/skills/` and
`.gemini/extensions/` upstream, not under `claude-code-plugin/`, and were not
copied over). Each agent's description and body were lightly edited so they
work as standalone, directly-invocable agents: write and run the
Playwright/@axe-core scripts they describe directly via the Bash tool. They
do **not** use the user's already-connected generic Playwright MCP
(`mcp__playwright__browser_*`) — that MCP exposes interactive browser
actions, not axe-core injection or computed-style extraction, so these
agents instead spawn their own `npx playwright test` runs. Functionally this
still means "drives a real browser," just via a subprocess rather than the
MCP session.

`design-system-auditor`'s "Handoffs" section still references
`accessibility-lead`, `mobile-accessibility`, and `wcag-guide`, which were
not vendored — see the note left in that file.

## How they work

Unlike the `~/.claude/skills/` suite (which triggers automatically on
frontend/design work), these are `~/.claude/agents/` — invoke them
explicitly via the Agent/Task tool, or delegate to them from another agent,
when you need a real browser run or an exact contrast-ratio number rather
than a design critique.

To update: re-clone the upstream repo, diff `claude-code-plugin/agents/` for
the four files above, and re-apply the description/body edits noted here.
This repo does not pin a version beyond the commit SHA recorded above.
