# Design skills — attribution

The design skills vendored in this directory are **not original work of this repo**.
They are copied here only so `setup.sh` can restore them to `~/.claude/skills/` on a
fresh machine. All credit belongs to the upstream authors below.

## Sources

| Skill(s) | Upstream | License |
|----------|----------|---------|
| `frontend-design` | Anthropic — [claude-plugins-official / frontend-design](https://github.com/anthropics/claude-plugins-official) | Apache 2.0 |
| `adapt`, `animate`, `arrange`, `audit`, `bolder`, `clarify`, `colorize`, `critique`, `delight`, `distill`, `extract`, `harden`, `normalize`, `onboard`, `optimize`, `overdrive`, `polish`, `quieter`, `teach-impeccable`, `typeset` | [impeccable](https://github.com/pbakaus/impeccable) by [@pbakaus](https://github.com/pbakaus) | see upstream |

The `impeccable` suite extends Anthropic's `frontend-design` skill (Apache 2.0) with a
Context Gathering Protocol and a family of focused design-review skills.

## How they work

These skills trigger automatically when Claude does frontend/design work. For non-generic
output they need **project-specific Design Context** (audience, use cases, brand tone) —
run the `teach-impeccable` skill per project, or drop a `.impeccable.md` in the project root.
Design context is intentionally **not** baked in globally: a one-size context produces the
generic "AI slop" these skills exist to avoid.

To update: re-run the upstream install and re-copy into `files/skills/`, or track upstream
directly. This repo does not pin a version.
