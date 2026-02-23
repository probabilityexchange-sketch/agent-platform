# Agent Platform — Handoff Document
**Date**: 2026-02-22
**Project**: `~/projects/agent-platform` (WSL Ubuntu)
**Repository**: probabilityexchange-sketch/agent-platform

---

## 1. What This Project Is

An AI agent orchestration platform built with **Next.js 15** (App Router). Users chat with AI agents (primarily "Randi," the Lead Agent) through a web UI at `localhost:3000`. Randi can:
- Answer questions directly via LLM (OpenRouter)
- Delegate tasks to specialist agents (research, code, productivity)
- **Spawn autonomous coding agents** on a remote EC2 instance via a Compute Bridge
- Execute external tools via **Composio** (GitHub, Slack, Notion, etc.)

The system has a **human-in-the-loop approval gate** — dangerous tool calls require user approval before execution.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  LOCAL MACHINE (localhost:3000)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Next.js UI  │→ │ API Routes   │→ │ OpenRouter    │  │
│  │  (React)     │  │ /api/chat    │  │ (LLM calls)   │  │
│  └──────────────┘  └──────┬───────┘  └───────────────┘  │
│                           │                              │
│                    ┌──────┴───────┐                      │
│                    │ SQLite DB    │                      │
│                    │ prisma/dev.db│                      │
│                    └──────────────┘                      │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP POST /spawn-ao
                            ▼
┌─────────────────────────────────────────────────────────┐
│  EC2 INSTANCE (18.222.178.24)                           │
│  ┌──────────────┐  ┌──────────────────────────────────┐ │
│  │ Bridge       │→ │ Agent Orchestrator (AO)           │ │
│  │ :3001        │  │ - `ao spawn <project>`            │ │
│  │ server.js    │  │ - `ao send <session> <message>`   │ │
│  └──────────────┘  │ - Dashboard on :3000              │ │
│                    └──────────────────────────────────┘ │
│  PEM Key: agent-bridge.pem (in project root)            │
│  SSH: ssh -i agent-bridge.pem ubuntu@18.222.178.24      │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React, CSS |
| Backend API | Next.js API Routes (`/api/chat`, `/api/auth/*`) |
| Database | SQLite via Prisma (`prisma/dev.db`) |
| Auth | Privy (social/wallet login) |
| LLM | OpenRouter API (multiple models) |
| External Tools | Composio SDK |
| Agent Orchestrator | Composio AO CLI (`ao`) on EC2 |
| Compute Bridge | Express.js on EC2 port 3001 |
| EC2 Dashboard | AO web dashboard on EC2 port 3000 |

---

## 4. Key Files

### Core Chat Logic
- **`src/app/api/chat/route.ts`** — The main chat endpoint. Handles:
  - Message routing, tool execution loops (max 4 iterations)
  - History loading from DB (last 40 messages)
  - Human-in-the-loop approval gates
  - Session creation and message persistence
  - Orchestration tool delegation

### Orchestration
- **`src/lib/orchestration/tools.ts`** — Defines `delegate_to_specialist` and `spawn_autonomous_developer` tools. The spawn tool calls the EC2 bridge.

### Auth
- **`src/app/api/auth/privy-session/route.ts`** — Privy JWT session establishment
- **`src/hooks/useAuth.ts`** — Client-side auth hook

### Chat UI
- **`src/components/chat/ChatWindow.tsx`** — Main chat component
- **`src/components/chat/MessageBubble.tsx`** — Message rendering
- **`src/components/chat/ApprovalCard.tsx`** — Tool approval UI cards
- **`src/app/(dashboard)/chat/[sessionId]/page.tsx`** — Chat session page

### Database
- **`prisma/schema.prisma`** — Schema (User, ChatSession, ChatMessage, AgentConfig, ToolApproval)
- **`prisma/seed.ts`** — Seeds agents including Randi with `spawn_autonomous_developer` tool

### EC2 Bridge (on remote server)
- **`~/bridge/server.js`** — Express server that receives spawn requests
- **`~/bridge/spawn.sh`** — Shell script that runs `ao spawn` then `ao send`
- **`~/agent-orchestrator/agent-orchestrator.yaml`** — AO config (only project `ao` is configured)

---

## 5. Environment Variables (`.env.local`)

```env
COMPOSIO_API_KEY="ak_fnC4N8cIKQiVQQtOfJ9V"
JWT_SECRET="V25+gwte4s09YcgYDBOjCscXMqPYBIxSNWlNVKugxKc="
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_PRIVY_APP_ID="cmlmjskmp00zo0dl7qkdoef31"
OPENROUTER_API_KEY="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"
PRIVY_APP_SECRET="privy_app_secret_4GWB2kTrGLnvHF5RX7en29CjBsd5YRfx4v3JPbnh82V1qhwKerW7VnoGnkcFM7CTnUiFQCh13BjAL65M4cvn1eU8"
COMPUTE_BRIDGE_URL="http://18.222.178.24:3001"
COMPUTE_BRIDGE_API_KEY="cFurhrBCurwsPDE/1g89cxKIai4Oxm9V2aJrJKeULXk="
# Supabase URLs commented out — using local SQLite
```

### EC2 Environment
```
BRIDGE_API_KEY="cFurhrBCurwsPDE/1g89cxKIai4Oxm9V2aJrJKeULXk="
```

---

## 6. How to Run

### Local Development
```bash
cd ~/projects/agent-platform
npm run dev
# → localhost:3000
```

### Database Reset (if needed)
```bash
npx prisma db push    # Apply schema to SQLite
npx prisma db seed    # Seed agents (Randi, specialists)
```

### EC2 Services
```bash
# SSH in
ssh -i agent-bridge.pem ubuntu@18.222.178.24

# Start Bridge (Tab 1)
cd ~/bridge
BRIDGE_API_KEY="cFurhrBCurwsPDE/1g89cxKIai4Oxm9V2aJrJKeULXk=" node server.js

# Start Dashboard (Tab 2)
cd ~/agent-orchestrator
pnpm run dev
# → EC2:3000 (dashboard), EC2:3001 (bridge)
```

### Kill all EC2 Node processes
```bash
sudo pkill -9 node
```

---

## 7. What Was Done This Session

### Smoke Test Implementation (Main Goal)
Successfully wired the full pipeline: **User → Randi → Bridge → AO → Agent Session**.

1. **Fixed Bridge server.js** — The heredoc escaping kept corrupting the file. Solved by writing locally then SCP'ing via stdin redirect.
2. **Fixed AO CLI command** — The `ao spawn` command doesn't accept `--aider` or `--message` flags. The correct flow is:
   - `ao spawn <project>` → creates a session (returns `SESSION=ao-N`)
   - `ao send <session-id> "<task>"` → sends the task to that session
   - Created `~/bridge/spawn.sh` to automate this two-step process.
3. **Fixed tool whitelisting** — Added `spawn_autonomous_developer` to Randi's tools in `prisma/seed.ts` and updated `route.ts` to allow it alongside `delegate_to_specialist`.

### Memory / History Fixes
4. **Full conversation history** — Previously only user + final assistant messages were saved. Now all intermediate messages (assistant tool_calls, tool results) are persisted to the database.
5. **History reconstruction** — Updated `toChatMessageParam()` to handle `tool` role messages and reconstruct `tool_calls` on assistant messages from stored JSON.
6. **Prisma field mapping fix** — OpenAI uses `tool_calls` (snake_case) but Prisma uses `toolCalls` (camelCase). Fixed the `createMany` call to explicitly map fields instead of using spread.
7. **Increased history window** — `MAX_HISTORY_MESSAGES` bumped from 20 to 40.

### Auth Fixes (Earlier in Session)
8. **SQLite setup** — Commented out Supabase URLs, ran `prisma db push` and `prisma db seed`.
9. **Fixed NEXT_PUBLIC_APP_URL** — Set to `http://localhost:3000` to prevent auth origin mismatches.

---

## 8. Known Issues / Remaining Work

### Active Bugs
- **`ao session ls` crashes** on EC2 — commander.js error, likely a version mismatch. The sessions themselves work fine; it's just the listing command that fails.
- **EC2 Dashboard port 3000** — Sometimes the Next.js dev server exits immediately after starting. May need `nohup` with proper `tmux` session instead of background process.
- **`ao` only has project `ao` configured** — The `agent-orchestrator.yaml` only defines the `ao` project. To spawn agents for other repos, you'd need to add project entries to this config file.

### Feature Gaps
- **No streaming of intermediate tool results** — The chat streams the final text response, but tool execution happens synchronously in a loop before streaming begins.
- **New session on Chat Hub click** — Clicking Randi in the Chat Hub always creates a new session. There's no "resume last session" UX.
- **Randi's judgment on tool selection** — She sometimes delegates to `code-assistant` instead of using `spawn_autonomous_developer`. Could be improved with system prompt tuning.
- **No token/billing enforcement** — The x402 payment protocol integration is planned but not wired up.

### EC2 Config Notes
- The only configured AO project is `ao` (self-hosting the agent-orchestrator repo).
- To add the `agent-platform` repo as a project, edit `~/agent-orchestrator/agent-orchestrator.yaml` and add a new project entry with the correct `path` and `repo`.
- `ao spawn` requires an issue tracker (Linear) to be configured for issue-based spawning. Without an issue, it creates a generic session.

---

## 9. Database Schema (Key Models)

```prisma
model ChatSession {
  id        String   @id @default(cuid())
  userId    String
  agentId   String
  title     String   @default("New Chat")
  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())
}

model ChatMessage {
  id        String   @id @default(cuid())
  sessionId String
  role      String        // "user" | "assistant" | "system" | "tool"
  content   String
  toolCalls String?       // JSON: tool_calls array (assistant) or tool_call_id (tool)
  createdAt DateTime @default(now())
}

model ToolApproval {
  id              String   @id @default(cuid())
  sessionId       String
  toolCallId      String
  toolName        String
  toolArgs        String
  pendingMessages String   // JSON snapshot of message chain
  status          String   // "PENDING" | "APPROVED" | "REJECTED"
  decidedAt       DateTime?
}
```

---

## 10. Quick Reference Commands

```bash
# Local dev server
npm run dev

# Database operations
npx prisma db push
npx prisma db seed
npx prisma studio  # GUI for DB

# Query DB directly
sqlite3 prisma/dev.db "SELECT role, substr(content, 1, 80) FROM ChatMessage ORDER BY createdAt DESC LIMIT 10;"

# SSH to EC2
ssh -i agent-bridge.pem ubuntu@18.222.178.24

# Check EC2 services
sudo lsof -i -P -n | grep LISTEN

# Bridge logs
tail -f ~/bridge/bridge.log

# AO commands
ao status
ao spawn ao          # Create new session
ao send <session> "task description"
tmux attach -t <session-handle>  # Watch agent work
```

---

*End of handoff. The smoke test is working end-to-end. The main remaining work is UX polish, streaming improvements, and expanding the AO project configuration.*
