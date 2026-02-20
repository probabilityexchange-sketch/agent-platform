# 🚀 Randi Agent Platform: Roadmap to randi.chat

This roadmap outlines the strategic phases for evolving the Randi Agent Platform from a functional MVP to a high-scale, distributed AI ecosystem.

## 📍 Phase 1: Launch Foundations (Current Focus)
**Objective**: Stabilize the user experience and secure the primary domain.
- [x] **Universal Auth**: Social + Wallet login via Privy.
- [x] **Web Performance**: Next.js 16 + Turbopack optimization.
- [x] **Transparency Hub**: Real-time token burn and platform stats dashboard.
- [x] **Vercel/Supabase Migration**: Cloud-native hosting with localized Ohio latency tuning.
- [ ] **Custom Domain**: Launch `randi.chat` with Cloudflare SSL.
- [ ] **Credits 1.0**: Finalize internal credit purchasing and balance tracking.

## 🏗️ Phase 2: The "Body" (Compute Layer)
**Objective**: Connect the Vercel "Brain" to the AWS "Body" for code execution.
- [ ] **Secure Docker Bridge**: Implement a secure API gateway between Vercel and AWS EC2.
- [ ] **Ephemeral Sandboxing**: Automated lifecycle management for user containers (Auto-start/Auto-stop).
- [ ] **Persistent Storage**: S3/Supabase Storage integration for agent-generated files.
- [ ] **Resource Monitoring**: Dashboard tracking for EC2 CPU/RAM usage per user session.

## 💰 Phase 3: Financial & Tokenomics Layer
**Objective**: Integrate the $RANDI token deeply into the platform's DNA.
- [ ] **On-Chain Verification**: Robust Solana transaction scanning for credit top-ups.
- [ ] **Automated Burn Mechanics**: Real-time $RANDI burning on every agent tool execution.
- [ ] **Subscription Tiers**: Managed permissions for "Free" vs "Pro" compute models (e.g., Llama-3-70b vs GPT-4o).
- [ ] **Referral System**: Token-based incentives for user growth.

## 🧠 Phase 4: Advanced Intelligence & UI
**Objective**: Transform from simple chat to complex agentic workflows.
- [ ] **Composio Expansion**: Add 50+ specialized toolkits (GitHub, Google Workspace, Financial APIs).
- [ ] **Multi-Agent Orchestration**: Allow "Lead" agents to delegate sub-tasks to "Specialist" agents.
- [ ] **Streaming 2.0**: Enhanced markdown rendering with code execution previews.
- [ ] **Human-in-the-loop**: Approval UI for sensitive agent actions (e.g., "Allow Randi to send this email?").

## 🌎 Phase 5: Ecosystem Expansion
**Objective**: Scale beyond a single web application.
- [ ] **Ohio Migration**: Move AWS EC2 nodes to `us-east-2` for sub-10ms DB latency.
- [ ] **Public API**: Allow third-party developers to rent Randi containers via API.
- [ ] **Progressive Web App (PWA)**: Mobile-optimized chat experience.
- [ ] **Governance Interface**: Allow $RANDI holders to vote on new agent "Personalities" or "Tools."

---
*Note: This is a living document and will be updated as the Randi ecosystem evolves.*
