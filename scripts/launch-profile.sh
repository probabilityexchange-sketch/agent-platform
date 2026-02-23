#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_DIR/.env"
COMPOSE_FILE="$REPO_DIR/docker-compose.prod.yml"
IMAGE_TAG="ghcr.io/probabilityexchange-sketch/agent-platform:latest"

MODE="${1:-}"
SKIP_BUILD=0
SKIP_PULL=0

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/launch-profile.sh surge [--skip-build] [--skip-pull]
  bash scripts/launch-profile.sh normal [--skip-build] [--skip-pull]

Modes:
  surge   conservative per-container limits + stricter launch rate
  normal  default higher limits + relaxed launch rate

Notes:
  - Edits ~/agent-platform/.env in-place.
  - Rebuilds image and restarts app unless --skip-build is used.
USAGE
}

log() {
  printf '[launch-profile] %s\n' "$*"
}

fatal() {
  printf '[launch-profile] ERROR: %s\n' "$*" >&2
  exit 1
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

while [[ $# -gt 0 ]]; do
  case "$1" in
    surge|normal)
      MODE="$1"
      ;;
    --skip-build)
      SKIP_BUILD=1
      ;;
    --skip-pull)
      SKIP_PULL=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fatal "Unknown argument: $1"
      ;;
  esac
  shift
done

[[ -f "$ENV_FILE" ]] || fatal "Missing $ENV_FILE"
[[ -f "$COMPOSE_FILE" ]] || fatal "Missing $COMPOSE_FILE"
[[ "$MODE" == "surge" || "$MODE" == "normal" ]] || {
  usage
  fatal "Mode must be 'surge' or 'normal'"
}

if [[ "$SKIP_PULL" -eq 0 ]]; then
  log "Pulling latest main"
  git -C "$REPO_DIR" pull --ff-only origin main
fi

if [[ "$MODE" == "surge" ]]; then
  log "Applying surge profile"
  set_env_key CONTAINER_MAX_MEMORY 805306368
  set_env_key CONTAINER_MAX_CPU 300000000
  set_env_key RATE_LIMIT_PROVISION_MAX_REQUESTS 2
  set_env_key RATE_LIMIT_PROVISION_WINDOW_MS 60000
else
  log "Applying normal profile"
  set_env_key CONTAINER_MAX_MEMORY 4294967296
  set_env_key CONTAINER_MAX_CPU 2000000000
  set_env_key RATE_LIMIT_PROVISION_MAX_REQUESTS 6
  set_env_key RATE_LIMIT_PROVISION_WINDOW_MS 60000
fi

set_env_key AGENT_PERSISTENT_STORAGE true

log "Effective profile values:"
grep -nE '^CONTAINER_MAX_MEMORY=|^CONTAINER_MAX_CPU=|^RATE_LIMIT_PROVISION_MAX_REQUESTS=|^RATE_LIMIT_PROVISION_WINDOW_MS=|^AGENT_PERSISTENT_STORAGE=' "$ENV_FILE" || true

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  log "Loading build env from .env"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a

  : "${NEXT_PUBLIC_PRIVY_APP_ID:?Missing NEXT_PUBLIC_PRIVY_APP_ID}"

  log "Building image $IMAGE_TAG"
  docker build \
    --build-arg "NEXT_PUBLIC_PRIVY_APP_ID=$NEXT_PUBLIC_PRIVY_APP_ID" \
    --build-arg "NEXT_PUBLIC_X_URL=${NEXT_PUBLIC_X_URL:-https://x.com/RandiAgent}" \
    --build-arg "NEXT_PUBLIC_COMPOSIO_TOOLS_URL=${NEXT_PUBLIC_COMPOSIO_TOOLS_URL:-https://composio.dev/tools}" \
    -t "$IMAGE_TAG" \
    "$REPO_DIR"
else
  log "Skipping build (--skip-build)"
fi

log "Restarting app container"
docker compose -f "$COMPOSE_FILE" up -d app
docker logs agent-platform-web --tail 60 || true

log "Done: profile '$MODE' applied"
