#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_DIR/.env"
COMPOSE_FILE="$REPO_DIR/docker-compose.prod.yml"
IMAGE_TAG="ghcr.io/probabilityexchange-sketch/agent-platform:latest"

SWAP_SIZE_GB=4
SKIP_PULL=0
SKIP_BUILD=0
SKIP_SWAP=0
ENABLE_WATCH=0

usage() {
  cat <<'USAGE'
Usage: ./scripts/launch-hardening.sh [options]

Options:
  --skip-pull       Skip git pull origin main
  --skip-build      Skip docker build step
  --skip-swap       Skip swapfile setup/check
  --watch           Start live resource watch after deploy
  -h, --help        Show this help

What this script does:
  1) Applies safer launch defaults in .env
  2) Ensures /swapfile exists and is enabled (4G default)
  3) Pulls latest main
  4) Prunes Docker build/image cache
  5) Builds app image with required build args
  6) Restarts app service and prints logs
USAGE
}

log() {
  printf '[launch-hardening] %s\n' "$*"
}

fatal() {
  printf '[launch-hardening] ERROR: %s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fatal "Missing required command: $1"
}

set_env_key() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=\"${value}\"|" "$ENV_FILE"
  else
    echo "${key}=\"${value}\"" >>"$ENV_FILE"
  fi
}

ensure_swap() {
  local sudo_cmd=""
  if [[ "${EUID}" -ne 0 ]]; then
    need_cmd sudo
    sudo_cmd="sudo"
  fi

  if swapon --show=NAME | grep -qx "/swapfile"; then
    log "Swap already enabled at /swapfile"
    return
  fi

  log "Setting up ${SWAP_SIZE_GB}G swapfile at /swapfile"
  if ! $sudo_cmd fallocate -l "${SWAP_SIZE_GB}G" /swapfile 2>/dev/null; then
    $sudo_cmd dd if=/dev/zero of=/swapfile bs=1M count=$((SWAP_SIZE_GB * 1024)) status=progress
  fi
  $sudo_cmd chmod 600 /swapfile
  $sudo_cmd mkswap /swapfile >/dev/null
  $sudo_cmd swapon /swapfile

  if ! grep -q '^/swapfile ' /etc/fstab; then
    echo '/swapfile swap swap defaults 0 0' | $sudo_cmd tee -a /etc/fstab >/dev/null
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-pull) SKIP_PULL=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --skip-swap) SKIP_SWAP=1 ;;
    --watch) ENABLE_WATCH=1 ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fatal "Unknown option: $1"
      ;;
  esac
  shift
done

need_cmd git
need_cmd docker
need_cmd sed
need_cmd grep
need_cmd swapon

[[ -f "$ENV_FILE" ]] || fatal "Missing $ENV_FILE"
[[ -f "$COMPOSE_FILE" ]] || fatal "Missing $COMPOSE_FILE"

log "Applying safer launch defaults to $ENV_FILE"
set_env_key CONTAINER_MAX_MEMORY 805306368
set_env_key CONTAINER_MAX_CPU 300000000
set_env_key RATE_LIMIT_PROVISION_MAX_REQUESTS 2
set_env_key RATE_LIMIT_PROVISION_WINDOW_MS 60000
set_env_key AGENT_PERSISTENT_STORAGE true
set_env_key NEXT_PUBLIC_X_URL "https://x.com/RandiAgent"
set_env_key NEXT_PUBLIC_COMPOSIO_TOOLS_URL "https://composio.dev/tools"

if [[ "$SKIP_SWAP" -eq 0 ]]; then
  ensure_swap
else
  log "Skipping swap setup (--skip-swap)"
fi

if [[ "$SKIP_PULL" -eq 0 ]]; then
  log "Pulling latest main"
  git -C "$REPO_DIR" pull --ff-only origin main
else
  log "Skipping git pull (--skip-pull)"
fi

log "Pruning docker cache (safe cleanup)"
docker builder prune -f >/dev/null || true
docker image prune -f >/dev/null || true

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  log "Loading build-time env vars"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a

  : "${NEXT_PUBLIC_PRIVY_APP_ID:?Missing NEXT_PUBLIC_PRIVY_APP_ID in .env}"
  : "${NEXT_PUBLIC_X_URL:?Missing NEXT_PUBLIC_X_URL in .env}"
  : "${NEXT_PUBLIC_COMPOSIO_TOOLS_URL:?Missing NEXT_PUBLIC_COMPOSIO_TOOLS_URL in .env}"

  log "Building image: $IMAGE_TAG"
  docker build \
    --build-arg "NEXT_PUBLIC_PRIVY_APP_ID=$NEXT_PUBLIC_PRIVY_APP_ID" \
    --build-arg "NEXT_PUBLIC_X_URL=$NEXT_PUBLIC_X_URL" \
    --build-arg "NEXT_PUBLIC_COMPOSIO_TOOLS_URL=$NEXT_PUBLIC_COMPOSIO_TOOLS_URL" \
    -t "$IMAGE_TAG" \
    "$REPO_DIR"
else
  log "Skipping docker build (--skip-build)"
fi

log "Restarting app container"
docker compose -f "$COMPOSE_FILE" up -d app

log "Current app logs (tail 80)"
docker logs agent-platform-web --tail 80 || true

log "Effective runtime limits"
docker compose -f "$COMPOSE_FILE" exec -T app sh -lc \
  'echo CONTAINER_MAX_MEMORY=$CONTAINER_MAX_MEMORY; echo CONTAINER_MAX_CPU=$CONTAINER_MAX_CPU; echo RATE_LIMIT_PROVISION_MAX_REQUESTS=$RATE_LIMIT_PROVISION_MAX_REQUESTS; echo RATE_LIMIT_PROVISION_WINDOW_MS=$RATE_LIMIT_PROVISION_WINDOW_MS'

log "Disk and memory snapshot"
df -h /
free -h
swapon --show

if [[ "$ENABLE_WATCH" -eq 1 ]]; then
  log "Starting live watch (Ctrl+C to stop)"
  watch -n 5 'free -h; echo; docker stats --no-stream | head -n 20'
else
  log "Run this to monitor live:"
  echo "watch -n 5 'free -h; echo; docker stats --no-stream | head -n 20'"
fi

log "Done"
