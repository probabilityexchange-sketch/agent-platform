#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_DIR/.env"
COMPOSE_FILE="$REPO_DIR/docker-compose.prod.yml"
IMAGE_TAG="ghcr.io/probabilityexchange-sketch/agent-platform:latest"

MINT=""
DECIMALS=""
RPC_URL="https://api.mainnet-beta.solana.com"
NETWORK="mainnet-beta"
NO_REDEPLOY=0

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/set-payment-token.sh \
    --mint <TOKEN_MINT> \
    [--decimals 6] \
    [--rpc https://api.mainnet-beta.solana.com] \
    [--network mainnet-beta] \
    [--no-redeploy]

What it updates in .env:
  PAYMENT_ASSET="spl"
  NEXT_PUBLIC_SOLANA_NETWORK=<network>
  SOLANA_RPC_URL=<rpc>
  NEXT_PUBLIC_SOLANA_RPC_URL=<rpc>
  TOKEN_MINT=<mint>
  NEXT_PUBLIC_TOKEN_MINT=<mint>
  TOKEN_DECIMALS=<decimals>

If --decimals is omitted, it attempts to fetch decimals from RPC getTokenSupply.
By default it rebuilds and restarts app. Use --no-redeploy to skip.
USAGE
}

log() {
  printf '[set-payment-token] %s\n' "$*"
}

fatal() {
  printf '[set-payment-token] ERROR: %s\n' "$*" >&2
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

fetch_decimals() {
  local mint="$1"
  local rpc="$2"
  local resp

  resp="$(curl -s "$rpc" \
    -H 'content-type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getTokenSupply\",\"params\":[\"$mint\"]}")"

  local decimals
  decimals="$(echo "$resp" | sed -n 's/.*"decimals":\([0-9]\+\).*/\1/p' | head -n 1)"

  if [[ -z "$decimals" ]]; then
    fatal "Could not fetch token decimals from RPC. Response: $resp"
  fi

  echo "$decimals"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mint)
      MINT="${2:-}"
      shift
      ;;
    --decimals)
      DECIMALS="${2:-}"
      shift
      ;;
    --rpc)
      RPC_URL="${2:-}"
      shift
      ;;
    --network)
      NETWORK="${2:-}"
      shift
      ;;
    --no-redeploy)
      NO_REDEPLOY=1
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

need_cmd sed
need_cmd grep
need_cmd curl
need_cmd docker

[[ -f "$ENV_FILE" ]] || fatal "Missing $ENV_FILE"
[[ -f "$COMPOSE_FILE" ]] || fatal "Missing $COMPOSE_FILE"
[[ -n "$MINT" ]] || {
  usage
  fatal "--mint is required"
}

if [[ -z "$DECIMALS" ]]; then
  log "Fetching token decimals from RPC"
  DECIMALS="$(fetch_decimals "$MINT" "$RPC_URL")"
fi

if ! [[ "$DECIMALS" =~ ^[0-9]+$ ]]; then
  fatal "Invalid decimals value: $DECIMALS"
fi

log "Applying payment token settings to $ENV_FILE"
set_env_key PAYMENT_ASSET spl
set_env_key NEXT_PUBLIC_SOLANA_NETWORK "$NETWORK"
set_env_key SOLANA_RPC_URL "$RPC_URL"
set_env_key NEXT_PUBLIC_SOLANA_RPC_URL "$RPC_URL"
set_env_key TOKEN_MINT "$MINT"
set_env_key NEXT_PUBLIC_TOKEN_MINT "$MINT"
set_env_key TOKEN_DECIMALS "$DECIMALS"

log "Effective values"
grep -nE '^(PAYMENT_ASSET|NEXT_PUBLIC_SOLANA_NETWORK|SOLANA_RPC_URL|NEXT_PUBLIC_SOLANA_RPC_URL|TOKEN_MINT|NEXT_PUBLIC_TOKEN_MINT|TOKEN_DECIMALS)=' "$ENV_FILE" || true

if [[ "$NO_REDEPLOY" -eq 1 ]]; then
  log "Skipping redeploy (--no-redeploy)"
  exit 0
fi

log "Loading build-time env vars"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

  : "${NEXT_PUBLIC_PRIVY_APP_ID:?Missing NEXT_PUBLIC_PRIVY_APP_ID in .env}"

log "Building image"
docker build \
  --build-arg "NEXT_PUBLIC_PRIVY_APP_ID=$NEXT_PUBLIC_PRIVY_APP_ID" \
  --build-arg "NEXT_PUBLIC_X_URL=${NEXT_PUBLIC_X_URL:-https://x.com/RandiAgent}" \
  --build-arg "NEXT_PUBLIC_COMPOSIO_TOOLS_URL=${NEXT_PUBLIC_COMPOSIO_TOOLS_URL:-https://composio.dev/tools}" \
  -t "$IMAGE_TAG" \
  "$REPO_DIR"
log "Restarting app"
docker compose -f "$COMPOSE_FILE" up -d app
docker logs agent-platform-web --tail 60 || true

log "Done"
