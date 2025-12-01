#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# Build and run containers
echo "🏗️ Building containers and starting stack..."
export DOCKER_BUILDKIT=1
sudo docker compose up -d --build

# Export Caddy local CA certs for host trust
echo "📜 Exporting Caddy CA certs (if available)..."
# Resolve caddy container by service name via compose project default
CADDY_CONTAINER_ID="$(sudo docker ps --filter 'ancestor=caddy:latest' --format '{{.ID}}' | head -n1 || true)"
if [ -n "$CADDY_CONTAINER_ID" ]; then
  if sudo docker exec "$CADDY_CONTAINER_ID" test -f /data/caddy/pki/authorities/local/root.crt; then
    sudo docker exec "$CADDY_CONTAINER_ID" cat /data/caddy/pki/authorities/local/root.crt | sudo tee "$APP_DIR/root.crt" >/dev/null
    if sudo docker exec "$CADDY_CONTAINER_ID" test -f /data/caddy/pki/authorities/local/intermediate.crt; then
      sudo docker exec "$CADDY_CONTAINER_ID" cat /data/caddy/pki/authorities/local/intermediate.crt | sudo tee "$APP_DIR/intermediate.crt" >/dev/null
      sudo bash -lc "cat '$APP_DIR/root.crt' '$APP_DIR/intermediate.crt' > '$APP_DIR/caddy-ca-chain.crt'"
    fi
    echo "✅ Exported Caddy certs to $APP_DIR"
  else
    echo "ℹ️ Caddy local PKI not ready yet."
  fi
fi

# Trust CA on VM (optional, helps curl/wget on the VM)
if [ -f "$APP_DIR/root.crt" ]; then
  sudo cp "$APP_DIR/root.crt" /usr/local/share/ca-certificates/caddy-root.crt
  sudo update-ca-certificates || true
fi

echo "✅ Application deployment complete."
