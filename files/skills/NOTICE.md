# Vendored skills — attribution

The skills listed below are **not original work of this repo**.
They are copied here only so `setup.sh` can restore them to `~/.claude/skills/` on a
fresh machine. All credit belongs to the upstream authors below.

(`my-voice` is original to this repo and is not covered by this notice.)

## Sources

| Skill(s) | Upstream | License |
|----------|----------|---------|
| `frontend-design` | impeccable's fork of Anthropic's `frontend-design` skill (original: [claude-plugins-official / frontend-design](https://github.com/anthropics/claude-plugins-official)) | Apache 2.0 |
| `adapt`, `animate`, `arrange`, `audit`, `bolder`, `clarify`, `colorize`, `critique`, `delight`, `distill`, `extract`, `harden`, `normalize`, `onboard`, `optimize`, `overdrive`, `polish`, `quieter`, `teach-impeccable`, `typeset` | [impeccable](https://github.com/pbakaus/impeccable) by [@pbakaus](https://github.com/pbakaus) | Apache 2.0 |
| `stop-slop` | [stop-slop](https://github.com/hardikpandya/stop-slop) by [@hardikpandya](https://github.com/hardikpandya) | MIT (`stop-slop/LICENSE`) |

### Pinned versions

| Skill(s) | Upstream path | Commit |
|----------|---------------|--------|
| `frontend-design` + the impeccable skills except `critique` | `pbakaus/impeccable` `.claude/skills/` | [`209444a`](https://github.com/pbakaus/impeccable/commit/209444a9d552c18bcaa74e26bf66a25fc568a767) (2026-03-30, v2.0.2) |
| `critique` | `pbakaus/impeccable` `.claude/skills/critique/` | [`7861a5c`](https://github.com/pbakaus/impeccable/commit/7861a5c796913f0468fde5f0fca88178e0ed8bbe) (2026-03-19) |
| `stop-slop` | `hardikpandya/stop-slop` repo root | [`8da1f03`](https://github.com/hardikpandya/stop-slop/commit/8da1f030185bdfe8471220585162991eaeb970e9) (2026-03-18), still upstream HEAD as of 2026-10-26 |

All vendored files are byte-identical to the pinned commit except the `stop-slop`
edits described below.

**`frontend-design` source.** The vendored `frontend-design` is impeccable's version, not
Anthropic's: it carries the Context Gathering Protocol and the `reference/` folder that the
other impeccable skills depend on ("Invoke /frontend-design ... Context Gathering
Protocol"). Do not refresh it from `anthropics/claude-plugins-official`
(`plugins/frontend-design/skills/frontend-design/`, last checked at `5826794`, 2026-10-23),
because that would drop the protocol and break the suite.

**Why impeccable is pinned at v2.0.2, not upstream HEAD.** `209444a` is the last upstream
commit with this one-skill-per-command layout. On 2026-03-30 (`f683f41`) upstream renamed
`frontend-design` to `impeccable` and folded `teach-impeccable` into it, and on 2026-04-10
(`b0f44f8`) it consolidated everything into a single `impeccable` skill with sub-commands
under `reference/`. As of `3671d50` (2026-10-26, skill v4.7.1) that skill also needs
`scripts/impeccable`, a launcher that downloads a self-contained binary on first run, plus
bundled live-browser JS, hooks and four helper agents. Moving to it means replacing the
whole suite, not refreshing it, so it is a separate decision.

**Why `critique` stays at `7861a5c`.** At `209444a` the critique skill gained scoring,
personas and cognitive-load references, but its "Automated Detection" step is broken in
the shipped build: it calls `node {{scripts_path}}/detect-antipatterns.mjs` with an
unresolved placeholder and a script the build doesn't include, injects a 1.5k-line
`detect-antipatterns-browser.js` into pages over a local HTTP server, and pre-approves
those shell commands via `allowed-tools`. The older critique has none of that.

### Local modification to `stop-slop`

Vendored at upstream commit `8da1f03`. Three changes, all in `SKILL.md` only:

1. **Frontmatter `description` narrowed** to English prose (job application answers, cover
   letters, CVs, recruiter replies, English docs). Upstream reads "Remove AI writing patterns
   from prose … when drafting, editing, or reviewing text", which is broad enough to fire on
   Korean Jira comments and collide with `my-voice`.
2. **Frontmatter `metadata.trigger`** narrowed to match.
3. **A `## Scope` section added** stating that `my-voice` wins for Korean output.

The eight core rules, quick checks, scoring rubric and all three `references/` files are
byte-identical to upstream. Re-vendoring means re-applying only those three edits.

The `impeccable` suite extends Anthropic's `frontend-design` skill (Apache 2.0) with a
Context Gathering Protocol and a family of focused design-review skills.

## How they work

These skills trigger automatically when Claude does frontend/design work. For non-generic
output they need **project-specific Design Context** (audience, use cases, brand tone) —
run the `teach-impeccable` skill per project, or drop a `.impeccable.md` in the project root.
Design context is intentionally **not** baked in globally: a one-size context produces the
generic "AI slop" these skills exist to avoid.

To update: clone each upstream, diff the pinned path against the vendored copy, copy over
what changed, re-apply the `stop-slop` edits, and record the new commit in the table above.
