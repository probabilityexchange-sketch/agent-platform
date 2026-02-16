# Deployment Guide

This project uses GitHub Actions to build and push Docker images to GHCR, then deploys to EC2 via SSH.

## Architecture

```text
GitHub Push → GitHub Actions → Build Image → Push to GHCR → SSH to EC2 → Pull & Restart
```

## Required GitHub Secrets

Configure these in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `EC2_HOST` | EC2 public IP or DNS |
| `EC2_USER` | SSH user for deployment |
| `EC2_SSH_KEY` | Private SSH key for deploy user |
| `GHCR_PAT` | GitHub PAT with `read:packages` scope (optional fallback) |

## Runtime secrets model

**Do not pass runtime secrets as Docker build args.**

- Build pipeline only builds/pushes image.
- Runtime configuration (`JWT_SECRET`, API keys, Solana RPC, etc.) is injected on EC2 through `.env` + `docker-compose.prod.yml`.
- Keep `/home/ec2-user/agent-platform/.env` permissions strict (`chmod 600`).

## Routing config

- Use `APP_HOST` for Traefik `Host()` rules (host only, no scheme/port).
- `NEXT_PUBLIC_DOMAIN` may include scheme/port for client-facing URL construction, but should not be used in Traefik host matching.

## Manual deployment

```bash
ssh deploy@<EC2_HOST>
cd /home/ec2-user/agent-platform
export GHCR_TOKEN="<pat>"
/usr/local/bin/deploy_agent_platform.sh
```

## Operational warning

The app compose service currently mounts `/var/run/docker.sock`. This is equivalent to root-level host control if the app container is compromised. Keep this only if dynamic container lifecycle management is required.
