# 💳 Randi Payments Infrastructure

Randi is designed to be a fully autonomous agent platform, which means it needs the ability to not just *think*, but to **transact**. Our architecture supports three distinct "payment tiers" that allow Randi to operate across the native platform, the machine-to-machine web, and the traditional human web.

---

## 🏗️ The Three-Tier Payment Architecture

### 1. Platform Economy: $RANDI Credits
This is the "internal" currency of the Randi ecosystem, used to fund the agent's reasoning and hosting.

- **How it works**: Users deposit **$RANDI tokens** (on Solana) into their platform wallet.
- **Conversion**: On-chain tokens are locked/verified, and the user's dashboard is credited with platform credits.
- **Usage**: Every time Randi makes an LLM call or uses a high-compute tool, a small amount of credits is deducted from the ledger.
- **Deflationary Burn**: A portion of $RANDI used for platform fees is periodically "burned" or moved to a treasury, following our [Burn Schedule](/BURN_SCHEDULE.md).
- **Best For**: Native agent operations and reasoning.

### 2. Agentic Web (M2M): x402 Protocol
x402 is an emerging standard for "402 Payment Required" HTTP flows, allowing agents to pay each other or infrastructure providers directly.

- **How it works**: When Randi hits an external API (like Alchemy) that requires payment, the API returns a `402` error with a payment request.
- **Settlement**: Randi's autonomous wallet (powered by Alchemy Agentic Gateway) settles the request using **USDC on Base** Mainnet.
- **Auth**: Uses **SIWE (Sign-In With Ethereum)** to authenticate the agent's identity without static API keys.
- **Best For**: Machine-to-machine data access, specialized RPC calls, and cross-agent services.

### 3. Traditional Web (B2C): AgentCard
For interacting with the "Human Web"—merchants that only accept credit cards—Randi uses the **AgentCard** system.

- **How it works**: Randi can programmatically provision a **Virtual Visa Card**.
- **Funding**: When a purchase is needed, Randi generates a **Stripe Checkout** link for the user to fund the specific card with fiat (USD).
- **Execution**: Once funded, Randi retrieves the card details (PAN, CVV, Expiry) and "types" them into the merchant's checkout form.
- **Best For**: Buying domain names, subscribing to SaaS (OpenAI, Midjourney), or purchasing physical goods.

---

## 🔄 Lifecycle of a Transaction

| Scenario | Tier Used | Source of Funds | Settlement Layer |
| :--- | :--- | :--- | :--- |
| **"Write a blog post"** | $RANDI Credits | User's internal balance | Platform Ledger (Off-chain) |
| **"Fetch NFT floor prices"** | x402 Protocol | Agent's USDC Wallet | Base Network (On-chain) |
| **"Buy a .com domain"** | AgentCard | User's Credit Card (via Stripe) | Visa Network (Fiat) |

---

## 🛡️ Security & Guardrails

- **Spending Limits**: Users can set hard caps on how much an agent is allowed to spend per transaction or per day.
- **Funding Gating**: For fiat purchases, a human must *always* approve and fund the Stripe session before the Visa card becomes active.
- **Non-Custodial**: Platform authentication is managed via **Privy**, ensuring users maintain ultimate control over their keys while granting Randi scoped execution permissions.

---

## 🔗 Related Resources
- [Payment Operator Runbook](/PAYMENTS.md)
- [Tokenomics & Burn Schedule](/BURN_SCHEDULE.md)
- [Solana Integration Guide](/src/lib/solana/README.md)
