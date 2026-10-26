---
name: reference-token-optimization-repos
description: "Known-good external resources for Claude Code token optimization as of 2026-06. RTK proxy, drop-in CLAUDE.md, Anthropic official docs."
metadata: 
  node_type: memory
  type: reference
---

External references the user already trusts for token optimization. Verify URLs are still live before recommending — these are 2026-06 snapshots.

**GitHub repos**
- [rtk-ai/rtk](https://github.com/rtk-ai/rtk) — Rust Token Killer. CLI output compression proxy. Already installed and configured in user's `~/.claude/hooks/rtk-rewrite.sh`. `rtk gain` shows savings analytics.
- [drona23/claude-token-efficient](https://github.com/drona23/claude-token-efficient) — Drop-in CLAUDE.md for terse responses, no code changes.
- [nadimtuhin/claude-token-optimizer](https://github.com/nadimtuhin/claude-token-optimizer) — Reusable setup prompts targeting 90% savings.
- [affaan-m/everything-claude-code/docs/token-optimization.md](https://github.com/affaan-m/everything-claude-code/blob/main/docs/token-optimization.md) — Comprehensive guide.

**Official Anthropic docs**
- [Lessons from building Claude Code: Prompt caching is everything](https://claude.com/blog/lessons-from-building-claude-code-prompt-caching-is-everything) — the core mental model.
- [Manage costs effectively](https://code.claude.com/docs/en/costs) — official cost management.
- [Prompt caching - Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) — TTL, structure, invalidation.

**Community case studies**
- [I saved 10M tokens (89%) on Claude Code sessions](https://github.com/Kilo-Org/kilocode/discussions/5848) — RTK real-world impact.
- [Claude Code Token Optimization: Stop the $1,600 Bill](https://buildtolaunch.substack.com/p/claude-code-token-optimization) — popular substack guide.

**When to use:** When user asks about token savings, cost reduction, or context efficiency, recall these as starting points. RTK is already integrated, so don't re-recommend installing it.

Related: [[feedback-token-optimization]]
