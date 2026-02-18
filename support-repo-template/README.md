# Public Support Repository Template

Use this template to run public ticket intake while keeping your code repository private.

## Recommended setup

1. Create a new public repo (example: `randi-support`).
2. Copy everything from this folder into that repo root.
3. Enable Issues in repo settings.
4. Keep your main code repo private.
5. Share the support issue link publicly:

`https://github.com/<your-org>/<support-repo>/issues/new/choose`

## What this template includes

- Structured GitHub Issue Forms
- Anti-abuse triage workflow (`needs-info` + `invalid-report` gating)
- Auto-close workflow for unresolved low-quality tickets
- Maintainer moderation playbook

## Minimal launch checklist

1. Update `.github/ISSUE_TEMPLATE/config.yml` URLs to your real repo/org.
2. Create labels if needed (workflows also auto-create core labels).
3. Pin a “How to file support” issue or README.
4. Optionally disable Discussions and Wiki to keep support focused.
