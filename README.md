<div align="center">
  <img src=".github/assets/banner.png" alt="Randi Agent Banner" width="100%">

  # 🤖 Randi Agent Platform
  
  **The enterprise-grade AI agent orchestration layer powered by Solana and Composio.**

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
  [![Solana](https://img.shields.io/badge/Solana-Protocol-blue?logo=solana)](https://solana.com/)
  [![Auth: Privy](https://img.shields.io/badge/Auth-Privy-indigo)](https://www.privy.io/)
  [![Docker](https://img.shields.io/badge/Docker-Enabled-blue?logo=docker)](https://www.docker.com/)

  [Explore Docs](docs/USER_GUIDE.md) · [Report Bug](../../issues/new?template=bug_report.yml) · [Request Feature](../../issues/new?template=feature_request.yml) · [Support on Ko-fi](https://ko-fi.com/randiagent)
</div>

---

## 🌟 Overview

Randi Agent is a powerful, token-powered AI agent platform designed for seamless orchestration, secure wallet authentication, and containerized agent execution. It bridges the gap between high-level AI workflows and low-level system integrations using **Composio** and **Solana**.

### 💎 Token Economy & Open Source

This project is built with a dual-purpose mission:
1.  **Hosted Platform**: We provide a managed version of this platform at [randi.chat](https://www.randi.chat/), funded and powered by the **$RANDI** token on Pump.fun. Holding and using $RANDI fuels the development and operations of the ecosystem.
2.  **Fully Self-Hostable**: In the spirit of true decentralization and open source, anyone can clone this repository and run their own instance of the Randi Agent platform for personal or enterprise use.

### 🛡️ The Randi Difference

Randi Agent was inspired by the rapid evolution of open-source AI frameworks like OpenClaw, but it adopts a fundamentally different, **security-first** approach:

*   **Hardened Isolation**: While many frameworks execute agent tools directly on the host system or in shared process spaces, Randi mandates the use of **isolated Docker containers** for every agent lifecycle. This ensures that even if an agent is compromised or behaves unexpectedly, the host infrastructure remains safe.
*   **Trustless Orchestration**: By strictly enforcing **Privy-only authentication**, we eliminate common auth "footguns" and ensure that agent fleet management is governed by hardware-secured wallet keys.
*   **Infrastructure over Interfaces**: Rather than just building a chat UI, Randi is designed as an **orchestration layer**. It focuses on the "plumbing"—fleet health, container recycling, and verified credit ledgers—needed to run AI agents at professional scale.

### 🚀 Key Features

- **🔐 Privy Auth Only**: Secure, web3-native authentication architecture using Privy (strictly enforced).
- **🔗 Composio Integration**: Out-of-the-box access to hundreds of tools and integrations for AI agents.
- **🏗️ Containerized Agents**: Launch agents in isolated Docker containers for maximum security and scalability.
- **💳 Credit System**: Token-gated access and credit management for agent usage.
- **💬 Real-time Chat**: Unified interface for interacting with launched agents.
- **⛓️ Solana Native**: Deep integration with Solana for payments ($RANDI token) and verified deposits.

---

## 🛠️ Current State & Progress

The platform is currently in **Phase 1: Foundation & Orchestration**.

- [x] **Core Architecture**: Next.js 15 frontend with Prisma/Supabase backend.
- [x] **Agent Lifecycle**: Docker orchestration for dynamic agent spawning.
- [x] **Auth Migration**: Successfully migrated to Privy as the sole sign-in provider.
- [x] **Solana Integration**: Verified deposit workflow and $RANDI burn schedules implemented.
- [ ] **Phase 2 (Upcoming)**: Enhanced agent memory layers and multi-agent coordination.

---

## 🚦 Quick Start

### Prerequisites

- Node.js 20+
- Docker (running)
- Solana Wallet

### Installation

1. **Clone and Install**
   ```bash
   git clone https://github.com/Randi-Agent/agent-platform.git
   cd agent-platform
   npm install
   ```

2. **Environment Setup**
   Copy `.env.example` to `.env.local` and fill in your credentials (Privy, Supabase, Solana RPC).

3. **Initialize Database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Launch Development Server**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to see the platform in action.

---

## 📦 Documentation

Deep dive into the architecture and workflows:

- 📖 **[User Guide](docs/USER_GUIDE.md)**: How to use the platform.
- 💳 **[Payments Explainer](docs/PAYMENTS_EXPLAINER.md)**: How Randi spends money (Credits, x402, AgentCard).
- 🛠️ **[Developer Guide](docs/PRIVATE_CODE_PUBLIC_SUPPORT_MIGRATION.md)**: Working with the codebase.
- 🚀 **[Deployment Runbook](DEPLOYMENT.md)**: AWS/EC2 rollout procedures.
- 💸 **[Payment Ops](PAYMENTS.md)**: Managing the $RANDI token economy.

---

## 🤝 Contributing

We love contributions! Please read our **[Contributing Guidelines](.github/CONTRIBUTING.md)** and **[Code of Conduct](.github/CODE_OF_CONDUCT.md)** before submitting a Pull Request.

---

## 🛡️ Security

If you discover a security vulnerability, please refer to our **[Security Policy](.github/SECURITY.md)**.

---

## ☕ Support the Mission

If you believe in secure, decentralized AI orchestration, consider supporting the Randi Agent platform on Ko-fi. Your contributions directly fund our open-source development and managed hosting infrastructure.

<a href='https://ko-fi.com/O4O31AYXW8' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi3.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

---

## 📜 Attributions & Acknowledgments

Randi Agent stands on the shoulders of giants. We are proud to build upon and integrate with the following open-source projects and platforms:

*   **[Anthropic Agent Skills](https://github.com/anthropics/skills)**: The foundational logic for our specialized agent skill system was derived from Anthropic's open-source skills repository.
*   **[Alchemy Skills](https://github.com/alchemyplatform/skills)**: Powers our high-performance Web3 infrastructure and autonomous wallet authentication layers.
*   **[Composio](https://github.com/composiohq/composio)**: Provides the robust connectivity layer allowing our agents to interact with 1000+ external tools and SaaS platforms.
*   **[OpenClaw](https://github.com/openclaw/openclaw)**: A major inspiration for the open-source agent movement and decentralized AI infrastructure.
*   **[Solana](https://github.com/solana-labs/solana)**: The core protocol enabling our secure payments, $RANDI token economy, and verified deposit workflows.
*   **[Privy](https://www.privy.io/)**: Our primary authentication provider, enabling secure, non-custodial wallet connections.
*   **[Vercel Agent Browser](https://github.com/vercel/agent-browser)**: Optimized web browsing capabilities for our autonomous research agents.
*   **[Traefik](https://github.com/traefik/traefik)**: The edge router and reverse proxy managing our containerized agent fleet.
*   **[Aider](https://github.com/paul-gauthier/aider)**: Inspires our autonomous developer agent logic.
*   **[Clawnch](https://clawn.ch)**: Partner integration for token launch and agent network matching.

---

<div align="center">
  <sub>Built with ❤️ by the Randi Agent Team. &copy; 2026</sub>
  <br />
  <a href="https://t.me/RandiAgent">Join our Telegram</a>
</div>
