#!/usr/bin/env bash
set -euo pipefail

# =========================
# Config (edit as needed)
# =========================
RESOURCE_GROUP="rg-weatherapp"
VM_NAME="weatherapp-vm"
ADMIN_USER="azureuser"
REMOTE_DIR="/home/${ADMIN_USER}/weatherapp"

# Run bootstrap once? Set to "true" on the first run, then "false" for redeploys.
RUN_BOOTSTRAP="${RUN_BOOTSTRAP:-false}"

# =========================
# Discover public IP
# =========================
VM_PUBLIC_IP="$(az vm show -d -g "$RESOURCE_GROUP" -n "$VM_NAME" --query publicIps -o tsv)"
if [ -z "$VM_PUBLIC_IP" ]; then
  echo "❌ Could not determine VM public IP."
  exit 1
fi
echo "ℹ️ VM public IP: $VM_PUBLIC_IP"

# =========================
# Sync project to VM
# =========================
echo "📦 Syncing project to $ADMIN_USER@$VM_PUBLIC_IP:$REMOTE_DIR ..."
rsync -avz --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  ./ "$ADMIN_USER@$VM_PUBLIC_IP:$REMOTE_DIR"

# =========================
# Remote run (bootstrap or deploy)
# =========================
if [ "$RUN_BOOTSTRAP" = "true" ]; then
  echo "🚀 Running one-time VM bootstrap (WireGuard + Docker)..."
  ssh "$ADMIN_USER@$VM_PUBLIC_IP" "bash $REMOTE_DIR/vm_setup.sh"
else
  echo "🔁 Running repeatable application deployment..."
  ssh "$ADMIN_USER@$VM_PUBLIC_IP" "bash $REMOTE_DIR/start-app.sh"
fi

# =========================
# Fetch client.conf and certs
# =========================
echo "📥 Fetching client.conf and CA certs..."
scp "$ADMIN_USER@$VM_PUBLIC_IP:$REMOTE_DIR/client.conf" ./client.conf || true
scp "$ADMIN_USER@$VM_PUBLIC_IP:$REMOTE_DIR/root.crt" ./root.crt || true
scp "$ADMIN_USER@$VM_PUBLIC_IP:$REMOTE_DIR/caddy-ca-chain.crt" ./caddy-ca-chain.crt || true

echo "========================================"
echo "Done."
echo "- Client VPN config: ./client.conf (bring up: sudo wg-quick up ./client.conf)"
echo "- Caddy CA:          ./root.crt (install on host) and ./caddy-ca-chain.crt"
echo "- App URL:           https://weatherapp.local (add '10.8.0.1 weatherapp.local' to /etc/hosts)"
echo "========================================"
