# Randi User Guide

## What This App Does

Randi gives you:

- Multi-agent chat
- Optional containerized agent launches with unique URLs
- Credits-based usage and payment flow
- Connected app actions through Composio integrations

## Quick Start

1. Open the app and sign in.
2. Go to `Integrations` and connect the tools you need.
3. Go to `Chat` and start a session with an agent.
4. Go to `Credits` when you need to top up usage balance.
5. Go to `Agents` if you want to launch a dedicated containerized agent instance.

## Pages Overview

## Dashboard

- Shows account summary and recent chats.
- Profile URL username is optional.
- If you do nothing, the system auto-generates a safe username when needed.

## Chat

- Start chat from the Chat page.
- Existing sessions keep message history.
- If an agent has tools configured and connected, the assistant can call those tools.

## Integrations

- Connect third-party tools through Composio.
- Typical toolkits include GitHub, Slack, Notion, Gmail, Google Calendar, Prompmate, and CoinMarketCap.
- Status fields:
  - `NOT_CONNECTED`: no active account connected yet
  - `ACTIVE`: ready for tool execution
  - `FAILED` or `EXPIRED`: reconnect needed

If you see `No auth config found for this toolkit`, the project admin must create or set an auth config for that toolkit.

## Credits

- Packages are shown with USD value.
- Token amount is quoted at checkout time.
- Balance updates after verified on-chain payment.
- If payment fails, capture the error and transaction signature before filing a ticket.

## Agents

- Launches an isolated container for selected hours.
- Each launch gets a unique subdomain URL.
- Launch can fail with rate-limit (HTTP 429) if too many rapid launch attempts are made in a short window.

## Custom URL and Username

- Username is used in generated subdomains.
- Username is optional for users.
- If no username is set, one is auto-generated.
- You can still set a custom username later for branded URLs.

## Common Problems

## I get signed out or see `Unauthorized`

1. Hard refresh your browser.
2. Sign out and sign in again.
3. If still failing, include browser console + network errors in your ticket.

## Integration shows connected in Composio but not in app

1. Go to `Integrations`, click `Refresh`.
2. Confirm correct toolkit and auth config are mapped.
3. Reconnect that toolkit once.

## Payment verification fails

1. Save wallet, network, and transaction signature.
2. Confirm you are on the expected network.
3. File a `Payment and credits issue` ticket with full details.

## Support

Use GitHub Issues and choose the correct issue form. See `docs/SUPPORT_AND_TICKETING.md`.
