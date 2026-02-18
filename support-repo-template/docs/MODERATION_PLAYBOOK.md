# Moderation Playbook

## Intake policy

- Only triage tickets labeled `valid-report`.
- Tickets labeled `needs-info` are waiting on reporter details.
- Tickets labeled `invalid-report` are low-signal until corrected.

## Daily triage queue

Use this filter in support repo:

`is:issue is:open label:triage label:valid-report`

## Priority rubric

- `P0`: outage, auth broken, funds risk
- `P1`: core feature broken for many users
- `P2`: partial degradation, workaround exists
- `P3`: minor bug or UX polish

## Abuse controls

- Do not engage with abusive spam threads.
- Lock conversation for repeated abuse.
- Convert repeated non-actionable reports to closed with reason.
- Keep all bugfix details in private engineering repo.

## Escalation to private engineering repo

1. Reproduce and validate in support repo ticket.
2. Open internal issue/PR in private code repo.
3. Link public support ticket in internal notes.
4. Post status update in public ticket without exposing sensitive internals.
