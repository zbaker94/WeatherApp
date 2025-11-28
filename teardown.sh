#!/usr/bin/env bash
set -euo pipefail

# teardown.sh
# Safely remove artifacts created by deploy/setup:
# - host UDP relay (systemd socat service or background socat)
# - iptables DNAT/forward rules referencing port 51820
# - WireGuard client interface
# - /etc/hosts entry for weatherapp.local
# - installed root CA (Linux and macOS)
# - generated files (client.conf, root.crt, intermediate.crt, caddy-ca-chain.crt)
# - Vagrant VM
# - stale rsync temporary files and background rsync processes
#
# Idempotent and safe to run multiple times.

OS="$(uname -s)"
HOSTS_ENTRY_HOST="weatherapp.local"
HOSTS_FILE="/etc/hosts"
WG_RELAY_SERVICE="/etc/systemd/system/wg-udp-relay.service"

log() { printf '%s\n' "$1"; }

# Only set CLIENT_CONF if the file exists on host
if [[ -f "./client.conf" ]]; then
  CLIENT_CONF="$(realpath ./client.conf)"
else
  CLIENT_CONF=""
fi

remove_hosts_entry() {
  log "🧹 Checking ${HOSTS_FILE} for ${HOSTS_ENTRY_HOST}..."
  if grep -q "$HOSTS_ENTRY_HOST" "$HOSTS_FILE"; then
    log "📝 Removing ${HOSTS_ENTRY_HOST} from ${HOSTS_FILE}..."
    TMP="$(mktemp)"
    sudo awk -v host="$HOSTS_ENTRY_HOST" 'index($0, host)==0' "$HOSTS_FILE" > "$TMP"
    sudo cp "$TMP" "$HOSTS_FILE"
    rm -f "$TMP"
    log "✅ Removed ${HOSTS_ENTRY_HOST} from ${HOSTS_FILE}."
  else
    log "ℹ️ ${HOSTS_FILE} does not contain ${HOSTS_ENTRY_HOST}; nothing to remove."
  fi
}

remove_linux_cert() {
  local cert_path="/usr/local/share/ca-certificates/caddy-root.crt"
  if [[ -f "$cert_path" ]]; then
    log "🐧 Removing Caddy root certificate from Linux trust store..."
    sudo rm -f "$cert_path"
    sudo update-ca-certificates || true
    log "✅ Linux trust store updated."
  else
    log "ℹ️ No Linux Caddy root certificate found at $cert_path."
  fi
}

remove_macos_cert() {
  local keychain="/Library/Keychains/System.keychain"
  log "🍎 Attempting to remove Caddy root certificate from macOS System keychain..."

  if [[ -f "./root.crt" ]]; then
    local fp
    fp="$(openssl x509 -noout -fingerprint -sha1 -in ./root.crt 2>/dev/null | awk -F= '{print $2}' | tr -d ':')"
    if [[ -n "$fp" ]]; then
      if sudo security delete-certificate -Z "$fp" "$keychain" >/dev/null 2>&1; then
        log "✅ Deleted certificate with fingerprint $fp."
        return
      fi
    fi
  fi

  for cn in "Caddy Local Authority" \
            "Caddy Local Authority - Local" \
            "Caddy Local Authority - 2025 ECC Root"; do
    if sudo security find-certificate -c "$cn" "$keychain" >/dev/null 2>&1; then
      if sudo security delete-certificate -c "$cn" "$keychain" >/dev/null 2>&1; then
        log "✅ Deleted certificate with common name: $cn."
        return
      fi
    fi
  done

  log "ℹ️ No matching Caddy certificate found in System keychain."
}

bring_down_wireguard() {
  log "🔻 Tearing down WireGuard client if running..."
  if [[ -n "${CLIENT_CONF:-}" ]]; then
    sudo wg-quick down "${CLIENT_CONF}" >/dev/null 2>&1 || true
  fi

  for iface in client wg0; do
    if sudo wg show "$iface" >/dev/null 2>&1; then
      sudo wg-quick down "$iface" >/dev/null 2>&1 || true
      log "✅ Brought down WireGuard interface: $iface."
    fi
  done

  log "ℹ️ WireGuard teardown complete (if it was running)."
}

stop_and_remove_relay() {
  log "🔁 Cleaning up host UDP relay (socat/systemd/iptables) for port 51820..."

  # 1) systemd service (Linux)
  if [[ "$OS" == "Linux" ]]; then
    if sudo systemctl list-unit-files | grep -q '^wg-udp-relay.service'; then
      log "🔧 Stopping and disabling wg-udp-relay.service..."
      sudo systemctl stop wg-udp-relay.service >/dev/null 2>&1 || true
      sudo systemctl disable wg-udp-relay.service >/dev/null 2>&1 || true
      if [[ -f "$WG_RELAY_SERVICE" ]]; then
        sudo rm -f "$WG_RELAY_SERVICE"
        sudo systemctl daemon-reload || true
        log "✅ Removed systemd unit $WG_RELAY_SERVICE"
      fi
    else
      log "ℹ️ wg-udp-relay.service not present."
    fi
  fi

  # 2) background socat processes (macOS or Linux)
  if command -v pgrep >/dev/null 2>&1; then
    if pgrep -f "socat .*51820" >/dev/null 2>&1; then
      log "🛑 Killing background socat processes bound to port 51820..."
      pkill -f "socat .*51820" || true
      sleep 1
      log "✅ Killed socat processes (if any)."
    else
      log "ℹ️ No background socat processes for port 51820 found."
    fi
  fi

  # 3) iptables DNAT / FORWARD rules on Linux hosts (remove any rules referencing port 51820)
  if [[ "$OS" == "Linux" ]] && command -v iptables >/dev/null 2>&1; then
    if sudo iptables -t nat -S | grep -q -- '--dport 51820'; then
      log "🔧 Removing iptables NAT PREROUTING rules that reference port 51820..."
      sudo iptables -t nat -S | while IFS= read -r line; do
        if [[ "$line" == *"--dport 51820"* ]]; then
          del_rule="${line/-A/-D}"
          sudo iptables -t nat $del_rule || true
        fi
      done
      log "✅ Removed NAT PREROUTING rules for port 51820 (if any)."
    else
      log "ℹ️ No NAT PREROUTING iptables rules for port 51820 found."
    fi

    if sudo iptables -S | grep -q -- '51820'; then
      log "🔧 Removing iptables FORWARD rules that reference 51820..."
      sudo iptables -S | while IFS= read -r line; do
        if [[ "$line" == *"51820"* ]]; then
          if [[ "$line" == -A* ]]; then
            del_rule="${line/-A/-D}"
            sudo iptables $del_rule || true
          fi
        fi
      done
      log "✅ Removed FORWARD rules referencing 51820 (if any)."
    else
      log "ℹ️ No FORWARD iptables rules referencing 51820 found."
    fi
  fi

  log "🔚 Host relay cleanup complete."
}

cleanup_rsync_state() {
  log "🧹 Cleaning up rsync state and background rsync processes..."

  # Kill any long-running rsync processes that match a vagrant/ssh rsync pattern
  if command -v pgrep >/dev/null 2>&1; then
    if pgrep -f "rsync .*ssh" >/dev/null 2>&1; then
      log "🛑 Killing background rsync processes..."
      pkill -f "rsync .*ssh" || true
      sleep 1
      log "✅ Killed rsync processes (if any)."
    else
      log "ℹ️ No background rsync processes found."
    fi
  fi

  # Remove common rsync temporary files in repo root (safe, only removes known patterns)
  local patterns=( ".~tmp~" ".~tmp~*" "*.~tmp~" )
  for p in "${patterns[@]}"; do
    # find and remove matching files
    find . -maxdepth 2 -type f -name "$p" -print0 2>/dev/null | xargs -0 -r rm -f || true
  done

  # Remove stale rsync state in $HOME/.rsync if present (do not remove user configs)
  if [[ -d "$HOME/.rsync" ]]; then
    log "🧹 Removing stale rsync state in $HOME/.rsync (locks/temp files)..."
    find "$HOME/.rsync" -type f -name '*.tmp' -print0 2>/dev/null | xargs -0 -r rm -f || true
    log "✅ Cleaned rsync state (if any)."
  fi

  log "🔚 rsync cleanup complete."
}

destroy_vagrant() {
  if command -v vagrant >/dev/null 2>&1; then
    log "🧨 Destroying Vagrant VM (if present)..."
    vagrant halt >/dev/null 2>&1 || true
    vagrant destroy -f >/dev/null 2>&1 || log "ℹ️ Vagrant destroy skipped or failed gracefully."
    log "✅ Vagrant VM destroyed (if it existed)."
  else
    log "ℹ️ vagrant not installed on this host; skipping VM destroy."
  fi
}

delete_files() {
  log "🗑️ Deleting generated files from repo root..."
  for f in "./client.conf" "./root.crt" "./intermediate.crt" "./caddy-ca-chain.crt"; do
    if [[ -f "$f" ]]; then
      mv "$f" "$f.bak" && log "✅ Moved $f to $f.bak"
    else
      log "ℹ️ $f not found."
    fi
  done
}

main() {
  log "🧼 Starting teardown..."

  case "$OS" in
    Linux) remove_linux_cert ;;
    Darwin) remove_macos_cert ;;
    *) log "⚠️ Unsupported OS: $OS. Please remove the trusted certificate manually if present." ;;
  esac

  remove_hosts_entry
  bring_down_wireguard
  stop_and_remove_relay
  cleanup_rsync_state
  destroy_vagrant
  delete_files

  log "🏁 Teardown complete."
}

main "$@"
