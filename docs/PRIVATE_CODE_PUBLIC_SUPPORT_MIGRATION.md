# Private Code Repo + Public Support Repo Migration

Use this when you want to make `agent-platform` private but keep public ticket intake.

## Target architecture

- Private repo: source code, internal engineering work
- Public repo: support issues only, no sensitive code

## Step-by-step

1. Create a new public repository (example: `randi-support`).
2. Copy `support-repo-template/` contents into that repo root.
3. Commit and push support repo.
4. Verify Issues are enabled and forms appear at:
   - `/issues/new/choose`
5. Post your public support link in X profile/pinned post:
   - `https://github.com/<org>/<support-repo>/issues/new/choose`
6. Make this code repo private.

## Optional: quick bootstrap commands

Run from this repo:

```bash
mkdir -p /tmp/randi-support
cp -R support-repo-template/. /tmp/randi-support/
```

Then initialize `/tmp/randi-support` as a new Git repo and push to GitHub.

## After cutover

1. Keep public issue discussion in support repo only.
2. Link each valid support issue to a private internal issue/PR.
3. Post user-facing status updates in support issue without exposing private internals.

## Moderation defaults

- Missing details => `needs-info` + `invalid-report`
- Auto-close `needs-info` after 5 days
- Only triage tickets labeled `valid-report`
