#!/usr/bin/env bash
set -euo pipefail

npx tsx scripts/swap-db.ts postgresql
npx prisma generate

# Strip accidental "VAR_NAME=" prefixes that can creep in from
# copy-paste errors when setting env vars in dashboards.
sanitize_url() {
  local raw="$1"
  # Remove any leading KEY= prefix (e.g. "DIRECT_URL=postgresql://...")
  local cleaned="${raw#*=postgresql://}"
  if [[ "$cleaned" != "$raw" ]]; then
    cleaned="postgresql://${cleaned}"
  fi
  # Validate it looks like a postgres URL
  if [[ "$cleaned" =~ ^postgres(ql)?:// ]]; then
    echo "$cleaned"
  else
    echo ""
  fi
}

# Prefer non-pooling URL for schema push (DDL needs direct connection)
# We will iterate through candidates and pick the first one that has a password.
# If none have a password, we'll pick the first non-empty one and try to inject.
CANDIDATES=("POSTGRES_URL_NON_POOLING" "DIRECT_URL" "POSTGRES_PRISMA_URL" "DATABASE_URL")
RAW_URL=""
SELECTED_NAME=""
FALLBACK_URL=""
FALLBACK_NAME=""

for name in "${CANDIDATES[@]}"; do
  val="${!name:-}"
  if [[ -n "$val" ]]; then
    # Check if it has a password (postgresql://user:pass@host)
    if [[ "$val" =~ postgresql://[^:]+:[^@]+@ ]]; then
      RAW_URL="$val"
      SELECTED_NAME="$name"
      break
    fi
    # If it's the first non-empty one, save as fallback
    if [[ -z "$FALLBACK_URL" ]]; then
      FALLBACK_URL="$val"
      FALLBACK_NAME="$name"
    fi
  fi
done

if [[ -z "$SELECTED_NAME" && -n "$FALLBACK_NAME" ]]; then
  RAW_URL="$FALLBACK_URL"
  SELECTED_NAME="$FALLBACK_NAME"
fi

DB_PUSH_URL="$(sanitize_url "$RAW_URL")"

if [[ -z "$DB_PUSH_URL" ]]; then
  echo "WARNING: No valid database URL found for prisma db push" >&2
  echo "  Checked: POSTGRES_URL_NON_POOLING, DIRECT_URL, POSTGRES_PRISMA_URL, DATABASE_URL" >&2
  echo "  Skipping schema push — tables must exist already" >&2
else
  echo "Selected database connection source: $SELECTED_NAME" >&2
  # Debug: Check if the URL contains a password (look for colon after postgresql:// and before @host)
  if [[ "$DB_PUSH_URL" =~ postgresql://[^:]+:@ ]]; then
    echo "CRITICAL: Detected empty password in $SELECTED_NAME!" >&2
    if [[ -n "${POSTGRES_PASSWORD:-}" ]]; then
      echo "  Attempting to inject POSTGRES_PASSWORD..." >&2
      # Inject password between colon and @ (matches the :@ pattern)
      DB_PUSH_URL="${DB_PUSH_URL/:@/:${POSTGRES_PASSWORD}@}"
      echo "  Injection successful (URL hint: ${DB_PUSH_URL%%@*}@...)" >&2
    else
      echo "  ERROR: POSTGRES_PASSWORD is also missing. Auth will likely fail." >&2
      echo "  Set POSTGRES_PASSWORD in your Vercel environment variables." >&2
      exit 1
    fi
  fi
  echo "Running prisma db push (source: ${DB_PUSH_URL%%@*}@...)" >&2
  if PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1 \
     DATABASE_URL="$DB_PUSH_URL" \
     DIRECT_URL="$DB_PUSH_URL" \
     npx prisma db push --accept-data-loss; then
    echo "Schema push succeeded" >&2
    echo "Regenerating Prisma Client from latest schema..." >&2
    DATABASE_URL="$DB_PUSH_URL" npx prisma generate
    echo "Seeding database..." >&2
    DATABASE_URL="$DB_PUSH_URL" npx prisma db seed
  else
    echo "WARNING: prisma db push failed (tables may already exist) — continuing build" >&2
  fi
fi

next build
