#!/usr/bin/env bash
set -euo pipefail

OS="$(uname -s)"
# Only set CLIENT_CONF if the file exists
if [[ -f "./client.conf" ]]; then
  CLIENT_CONF="$(realpath ./client.conf)"
else
  CLIENT_CONF=""
fi
HOSTS_ENTRY_HOST="weatherapp.local"
HOSTS_FILE="/etc/hosts"

log() { echo -e "$1"; }

remove_hosts_entry() {
  log "🧹 Checking /etc/hosts for ${HOSTS_ENTRY_HOST}..."
  if grep -q "$HOSTS_ENTRY_HOST" "$HOSTS_FILE"; then
    log "📝 Removing ${HOSTS_ENTRY_HOST} from /etc/hosts..."
    TMP="$(mktemp)"
    sudo awk -v host="$HOSTS_ENTRY_HOST" 'index($0, host)==0' "$HOSTS_FILE" > "$TMP"
    sudo cp "$TMP" "$HOSTS_FILE"
    rm -f "$TMP"
    log "✅ Removed ${HOSTS_ENTRY_HOST} from /etc/hosts."
  else
    log "ℹ️ /etc/hosts does not contain ${HOSTS_ENTRY_HOST}; nothing to remove."
  fi
}

remove_linux_cert() {
  local cert_path="/usr/local/share/ca-certificates/caddy-root.crt"
  if [[ -f "$cert_path" ]]; then
    log "🐧 Removing Caddy root certificate from Linux trust store..."
    sudo rm -f "$cert_path"
    sudo update-ca-certificates
    log "✅ Linux trust store updated."
  else
    log "ℹ️ No Linux Caddy root certificate found at $cert_path."
  fi
}

remove_macos_cert() {
  local keychain="/Library/Keychains/System.keychain"
  log "🍎 Attempting to remove Caddy root certificate from macOS System keychain..."

  if [[ -f "./root.crt" ]]; then
    # Compute SHA‑1 fingerprint of the root.crt
    local fp
    fp="$(openssl x509 -noout -fingerprint -sha1 -in ./root.crt | awk -F= '{print $2}' | tr -d ':')"
    if [[ -n "$fp" ]]; then
      if sudo security delete-certificate -Z "$fp" "$keychain"; then
        log "✅ Deleted certificate with fingerprint $fp."
        return
      fi
    fi
  fi

  # Fallback: try by common name
  for cn in "Caddy Local Authority" \
            "Caddy Local Authority - Local" \
            "Caddy Local Authority - 2025 ECC Root"; do
    if sudo security find-certificate -c "$cn" "$keychain" >/dev/null 2>&1; then
      if sudo security delete-certificate -c "$cn" "$keychain"; then
        log "✅ Deleted certificate with common name: $cn."
        return
      fi
    fi
  done

  log "ℹ️ No matching Caddy certificate found in System keychain."
}

bring_down_wireguard() {
  log "🔻 Tearing down WireGuard if running..."
  if [[ -n "$CLIENT_CONF" ]]; then
    sudo wg-quick down "$CLIENT_CONF" >/dev/null 2>&1 || \
      log "ℹ️ WireGuard already down or client.conf not active."
  fi
  for iface in "client" "wg0"; do
    if sudo wg show "$iface" >/dev/null 2>&1; then
      sudo wg-quick down "$iface" >/dev/null 2>&1 && \
        log "✅ Brought down WireGuard interface: $iface."
    fi
  done
}

destroy_vagrant() {
  if command -v vagrant >/dev/null 2>&1; then
    log "🧨 Destroying Vagrant VM..."
    vagrant destroy -f || log "ℹ️ Vagrant destroy skipped or failed gracefully."
  fi
}

delete_files() {
  log "🗑️ Deleting generated files..."
  for f in "./client.conf" "./root.crt" "./intermediate.crt" "./caddy-ca-chain.crt"; do
    [[ -f "$f" ]] && rm -f "$f" && log "✅ Deleted $f" || log "ℹ️ $f not found."
  done
}

main() {
  case "$OS" in
    Linux) remove_linux_cert ;;
    Darwin) remove_macos_cert ;;
    *) log "⚠️ Unsupported OS: $OS. Please remove the trusted certificate 'caddy-root.crt' manually." ;;
  esac

  remove_hosts_entry
  bring_down_wireguard
  destroy_vagrant
  delete_files

  log "🏁 Teardown complete."
}

main "$@"
