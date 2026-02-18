# Support and Ticketing

## Ticketing System

This project uses GitHub Issues with structured forms in `.github/ISSUE_TEMPLATE/`.

Supported ticket types:

- Bug report
- Integration issue
- Payment and credits issue
- Feature request

Automated guardrails:

- New/edited issues are auto-checked for required diagnostics.
- Low-information tickets are labeled `needs-info` and `invalid-report`.
- `needs-info` tickets auto-close after 5 days without updates.

## How Users Should File Issues

1. Open the Issues tab and click `New issue`.
2. Choose the matching template.
3. Fill all required fields.
4. Include exact errors, timestamps, and reproduction steps.

## Required Diagnostics by Ticket Type

## Bug report

- Exact page and action
- Expected vs actual behavior
- Browser and device
- Screenshot or screen recording

## Integration issue

- Toolkit name
- Auth config id
- Connection status shown in app
- Error text from app/logs

## Payment and credits issue

- Wallet address
- Network (`mainnet` or `devnet`)
- Transaction signature
- Package selected and expected credits
- Any on-screen error message

## Triage Flow (Maintainers)

1. Confirm template completeness.
2. Reproduce the issue.
3. Apply labels and priority.
4. Request missing diagnostics when needed.
5. Link fix PR and close ticket with release/deploy reference.

## Anti-Abuse Policy

- Tickets missing required diagnostics are not triaged until completed.
- Repeated low-signal reports are auto-gated via labels.
- Closed `needs-info` tickets must be re-opened as a fresh report with full details.

## Suggested Priority Levels

- `P0`: outage, funds at risk, auth completely broken
- `P1`: core flow broken for many users
- `P2`: partial degradation or workaround exists
- `P3`: low-impact bug or polish

## Response Targets

- First triage response: within 24 hours
- Critical (`P0`) acknowledgment: within 1 hour
- Status updates on open incidents: every 24 hours minimum
