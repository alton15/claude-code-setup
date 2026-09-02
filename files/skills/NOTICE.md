# Vendored skills — attribution

The skills listed below are **not original work of this repo**.
They are copied here only so `setup.sh` can restore them to `~/.claude/skills/` on a
fresh machine. All credit belongs to the upstream authors below.

(`my-voice` is original to this repo and is not covered by this notice.)

## Sources

| Skill(s) | Upstream | License |
|----------|----------|---------|
| `frontend-design` | Anthropic — [claude-plugins-official / frontend-design](https://github.com/anthropics/claude-plugins-official) | Apache 2.0 |
| `adapt`, `animate`, `arrange`, `audit`, `bolder`, `clarify`, `colorize`, `critique`, `delight`, `distill`, `extract`, `harden`, `normalize`, `onboard`, `optimize`, `overdrive`, `polish`, `quieter`, `teach-impeccable`, `typeset` | [impeccable](https://github.com/pbakaus/impeccable) by [@pbakaus](https://github.com/pbakaus) | see upstream |
| `stop-slop` | [stop-slop](https://github.com/hardikpandya/stop-slop) by [@hardikpandya](https://github.com/hardikpandya) | MIT (`stop-slop/LICENSE`) |

### Local modification to `stop-slop`

Vendored at upstream commit `8da1f03`. Three changes, all in `SKILL.md` only:

1. **Frontmatter `description` narrowed** to English prose (job application answers, cover
   letters, CVs, recruiter replies, English docs). Upstream reads "Remove AI writing patterns
   from prose … when drafting, editing, or reviewing text", which is broad enough to fire on
   Korean Jira comments and collide with `my-voice`.
2. **Frontmatter `metadata.trigger`** narrowed to match.
3. **A `## Scope` section added** stating that `my-voice` wins for Korean output.

The eight core rules, quick checks, scoring rubric and all three `references/` files are
byte-identical to upstream. Re-vendoring means re-applying only those two edits.

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
