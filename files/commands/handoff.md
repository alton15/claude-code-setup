---
name: handoff
description: Create a handoff document for continuing work in a new session
---

Create a HANDOFF.md in the project root summarizing the current state for a fresh session:

## Structure:
```
# Handoff: [brief task description]

## What was done
- Bullet list of completed work

## Current state
- What's working, what's not
- Any failing tests or known issues

## What's left
- Remaining tasks in priority order

## Key decisions
- Important architectural or design decisions made and why

## Files changed
- List of files modified/created with brief description
```

Keep it concise but complete enough for a new agent to continue without re-reading everything.
