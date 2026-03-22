# AgentCard — Augmented Virtual Payments for AI Agents

AgentCard allows AI agents to spend money on the internet autonomously.
It provides programmatic virtual Visa cards that can be created, funded, and managed via API.

## Core Capabilities

- **On-demand Card Creation**: Issue new virtual Visa cards for specific tasks or budget limits.
- **Pay with Stripe**: Funding is handled via Stripe Checkout. The agent generates a payment link for the human owner.
- **Polling for Funds**: Agents can periodically check if a funding session has completed.
- **Retrieve Card Details**: Once funded, agents can decrypt and retrieve full card credentials (PAN, CVV, Expiry) to complete purchases.
- **Balance Monitoring**: Keep track of remaining funds without re-decrypting the card.

## Usage Guidelines

1. **Create a Card**: Use `agentcard_create_card` with the desired amount in cents.
2. **Handle Funding**: Provide the returned `stripe_url` to the user.
3. **Wait for Payment**: Use `agentcard_get_funding_status` with the `session_id` to detect when the card is ready.
4. **Execute Purchase**: Retrieve details via `agentcard_get_card_details` and use them on the merchant site.

## Safety & Compliance

- Never share card details in plaintext chat unless requested.
- Use cards for the specific purpose declared in the request.
- Respect the funding limits set by the owner.
