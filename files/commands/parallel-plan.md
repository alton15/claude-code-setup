---
name: parallel-plan
description: Break a task into parallelizable subtasks for subagents
---

Analyze the current task and break it into independent subtasks that can be executed in parallel:

1. **Identify independence**: Find subtasks with no shared state or sequential dependencies
2. **Create a plan** listing each subtask with:
   - Description of what to do
   - Files involved
   - Whether it can run in parallel or must be sequential
3. **Suggest execution**: Recommend which tasks to dispatch as parallel subagents vs sequential work
4. **Estimate context**: Flag any task that might exceed 50% context window and should be a subagent

Present the plan and ask for confirmation before executing.
