#!/bin/bash
# Run promptfoo evals for Randi

# Check for .env file first, then KILO_API_KEY env var
if [ -f "$0.run.sh" ]; then
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
elif [ -f "evals/.env" ]; then
    SCRIPT_DIR="evals"
fi

if [ -f "$SCRIPT_DIR/.env" ]; then
    echo "Loading KILO_API_KEY from $SCRIPT_DIR/.env"
    export $(cat "$SCRIPT_DIR/.env" | grep -v '^#' | xargs)
fi

if [ -z "$KILO_API_KEY" ]; then
    echo "Error: KILO_API_KEY is not set"
    echo ""
    echo "To set your Kilo API key:"
    echo "  1. Get your key from https://kilo.ai"
    echo "  2. Run: export KILO_API_KEY='sk-kilo-...'"
    echo ""
    echo "Or create evals/.env file with:"
    echo "  KILO_API_KEY=sk-kilo-..."
    exit 1
fi

echo "Running Randi prompt evals..."
promptfoo eval --config evals/promptfooconfig.yaml
