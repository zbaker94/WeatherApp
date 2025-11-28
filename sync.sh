#!/usr/bin/env bash
set -euo pipefail

SSH_CONFIG="$(vagrant ssh-config 2>/dev/null || true)"
if [[ -z "$SSH_CONFIG" ]]; then
  echo "❌ vagrant ssh-config not available. Is the VM up?"
  exit 1
fi

VM_HOST=$(echo "$SSH_CONFIG" | awk '/HostName/ {print $2; exit}')
VM_PORT=$(echo "$SSH_CONFIG" | awk '/Port/ {print $2; exit}')
VM_USER=$(echo "$SSH_CONFIG" | awk '/User/ {print $2; exit}')
VM_KEY=$(echo "$SSH_CONFIG" | awk '/IdentityFile/ {print $2; exit}' | sed 's/"//g')

RSYNC_RSH="ssh -i ${VM_KEY} -p ${VM_PORT} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

EXCLUDES=(--exclude '.vagrant' --exclude '.git' --exclude 'node_modules' --exclude 'vendor')

echo "⬇️  Pulling guest -> host..."
RSYNC_RSH="$RSYNC_RSH" rsync -az "${EXCLUDES[@]}" -e "$RSYNC_RSH" "${VM_USER}@${VM_HOST}:/vagrant/" ./ || echo "⚠️ Guest->Host rsync failed."

echo "⬆️  Pushing host -> guest (update only)..."
RSYNC_RSH="$RSYNC_RSH" rsync -az --update --delete "${EXCLUDES[@]}" -e "$RSYNC_RSH" ./ "${VM_USER}@${VM_HOST}:/vagrant/" || echo "⚠️ Host->Guest rsync failed."

echo "✅ Sync complete."
