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
RAW_URL="${POSTGRES_URL_NON_POOLING:-${DIRECT_URL:-${POSTGRES_PRISMA_URL:-${DATABASE_URL:-}}}}"
DB_PUSH_URL="$(sanitize_url "$RAW_URL")"

if [[ -z "$DB_PUSH_URL" ]]; then
  echo "WARNING: No valid database URL found for prisma db push" >&2
  echo "  Checked in order: POSTGRES_URL_NON_POOLING, DIRECT_URL, POSTGRES_PRISMA_URL, DATABASE_URL" >&2
  echo "  Current state of variables:" >&2
  [[ -n "${POSTGRES_URL_NON_POOLING:-}" ]] && echo "    POSTGRES_URL_NON_POOLING: detected (len: ${#POSTGRES_URL_NON_POOLING})" >&2
  [[ -n "${DIRECT_URL:-}" ]] && echo "    DIRECT_URL: detected (len: ${#DIRECT_URL})" >&2
  [[ -n "${POSTGRES_PRISMA_URL:-}" ]] && echo "    POSTGRES_PRISMA_URL: detected (len: ${#POSTGRES_PRISMA_URL})" >&2
  [[ -n "${DATABASE_URL:-}" ]] && echo "    DATABASE_URL: detected (len: ${#DATABASE_URL})" >&2
  echo "  Skipping schema push — tables must exist already" >&2
else
  # Debug: Check if the URL contains a password (look for colon after postgresql:// and before @host)
  if [[ "$DB_PUSH_URL" =~ postgresql://[^:]+:@ ]]; then
    echo "CRITICAL: Detected empty password in DB_PUSH_URL!" >&2
    if [[ -n "${POSTGRES_PASSWORD:-}" ]]; then
      echo "  Attempting to inject POSTGRES_PASSWORD..." >&2
      # Inject password between colon and @ (matches the :@ pattern)
      DB_PUSH_URL="${DB_PUSH_URL/:@/:${POSTGRES_PASSWORD}@}"
      echo "  Injection successful (URL hint: ${DB_PUSH_URL%%@*}@...)" >&2
    else
      echo "  ERROR: POSTGRES_PASSWORD is also missing. Auth will likely fail." >&2
    fi
  fi
  echo "Running prisma db push (source: ${DB_PUSH_URL%%@*}@...)" >&2
  if PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1 \
     DATABASE_URL="$DB_PUSH_URL" \
     DIRECT_URL="$DB_PUSH_URL" \
     npx prisma db push --skip-generate; then
    echo "Schema push succeeded" >&2
    echo "Seeding database..." >&2
    DATABASE_URL="$DB_PUSH_URL" npx prisma db seed
  else
    echo "WARNING: prisma db push failed (tables may already exist) — continuing build" >&2
  fi
fi

next build
