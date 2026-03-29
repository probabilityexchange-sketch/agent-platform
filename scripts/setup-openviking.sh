#!/bin/bash
# OpenViking Setup Script for EC2 Bridge Node
# Run this on your EC2 instance after setting your OpenAI API key

set -e

# Configuration - UPDATE THESE
export OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
export OPENVIKING_API_KEY="randi-memory-$(openssl rand -hex 16)"

echo "=== Installing OpenViking ==="
pip install openviking -q

echo "=== Creating directories ==="
mkdir -p ~/.openviking /data/openviking_workspace

echo "=== Writing config ==="
cat > ~/.openviking/ov.conf << 'EOF'
{
  "embedding": {
    "dense": {
      "provider": "openai",
      "api_key": "'$OPENAI_API_KEY'",
      "model": "text-embedding-3-small",
      "dimension": 1536
    }
  },
  "vlm": {
    "provider": "openai",
    "api_key": "'$OPENAI_API_KEY'",
    "model": "gpt-4o-mini"
  },
  "storage": {
    "workspace": "/data/openviking_workspace",
    "agfs": { "backend": "local" },
    "vectordb": { "backend": "local" }
  },
  "server": {
    "host": "0.0.0.0",
    "port": 1933,
    "root_api_key": "'$OPENVIKING_API_KEY'"
  }
}
EOF

echo "=== Starting OpenViking server ==="
nohup openviking-server > /data/log/openviking.log 2>&1 &

sleep 3

echo "=== Checking health ==="
curl -s -H "Authorization: Bearer $OPENVIKING_API_KEY" http://localhost:1933/health

echo ""
echo "=== DONE ==="
echo "OPENVIKING_API_KEY=$OPENVIKING_API_KEY"
echo ""
echo "Add to Vercel environment variables:"
echo "  OPENVIKING_SERVER_URL=http://ec2-3-139-106-8.us-east-2.compute.amazonaws.com:1933"
echo "  OPENVIKING_API_KEY=$OPENVIKING_API_KEY"
