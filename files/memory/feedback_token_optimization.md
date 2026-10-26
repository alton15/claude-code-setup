---
name: feedback-token-optimization
description: "Token-saving conventions applied to user's Claude Code setup (2026-06). Cache-first behavior, auto-compact at 60%, .claudeignore template, model mixing."
metadata: 
  node_type: memory
  type: feedback
---

User wants Claude Code sessions to be token-efficient by default. Apply these patterns without being asked:

**Cache-friendly behavior**
- Treat prompt cache as the primary cost lever. Keep static content (system prompts, CLAUDE.md, early-read files) at the front and stable.
- One topic per conversation — switching topics within a session invalidates the cache.
- Don't switch models mid-phase. The cache is keyed per model.
- Cache TTL is 5 min — prefer continuous work over idle gaps.

**Compact discipline**
- `/compact` proactively at ~50%. Auto-compact backstop is now set to 60% (was 80%) in `~/.claude/settings.json`.
- Past 80%, suggest `/half-clone` or `/handoff` instead of `/compact`.

**Tool output discipline**
- Never `cat`/`tail` huge files. Use `Read` with `limit`/`offset`, or `grep`/`Glob` with narrow patterns.
- Offload exploration to the Explore agent so verbose output doesn't pollute the main context.
- Each MCP server adds 100–500 tokens per turn — recommend `/mcp` to disable unused ones.

**Model mixing**
- Haiku 4.5 for mechanical/classification work (~5× cheaper than Opus).
- Sonnet 4.6 as default for coding.
- Opus 4.8 only for hard reasoning, architecture, debugging.

**Per-project `.claudeignore`**
- Template lives at `~/project/claude-code-setup/files/.claudeignore.template`. Suggest copying it whenever the user starts work in a Node/Python repo with large generated trees.

**Why:** User flagged token cost as a priority on 2026-06-02 and asked to bake the optimization into the global setup. They use Claude Code heavily across multiple projects, so even small per-turn savings compound.

**How to apply:** When working in this user's projects, default to these patterns silently. When the user asks about cost or context, reference these levers explicitly. When starting work in a new repo without `.claudeignore`, proactively suggest dropping the template in.

Related: [[reference-token-optimization-repos]], [[feedback-best-practices-applied]]
