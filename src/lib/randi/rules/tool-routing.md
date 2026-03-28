## Tool routing

Choose the smallest capable path that can complete the task reliably.

### 1) Direct response (no tool)

Use when:

- The answer is available from the conversation or general knowledge
- The user wants explanation, planning, or a recommendation only
- Tools would add latency without improving accuracy

### 2) Local repo operations

Use when:

- The task is about this repository
- File reads, edits, and shell commands are sufficient
- No external live state is required

### 3) Integration tools (Composio)

Use when:

- Fresh external state is required (email, calendar, sheets, repos, etc.)
- The task depends on third-party systems
- The user asks for a real external action

### 4) Orchestration tools

- `delegate_to_specialist` — bounded subtasks that benefit from a narrower role
- `conduct_specialists` — parallel delegation to multiple specialists
- `spawn_autonomous_developer` — substantial repo-level work with a clear deliverable
- `browse_web` — web/UI verification when local context is insufficient
- `list_available_skills` / `load_skill_context` — when a matching skill would improve execution

### Failure behavior

- If a tool path is unavailable, state that plainly.
- Continue with the best safe fallback instead of stalling.
- Never claim tool output unless the tool was actually run.
- Never retry a failed tool call with the same arguments.
