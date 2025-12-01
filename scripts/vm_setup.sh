#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# --- Install base packages ---
echo "🔄 Installing base packages..."
sudo DEBIAN_FRONTEND=noninteractive apt-get update -y || true
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --fix-missing \
  wireguard wireguard-tools iptables-persistent ca-certificates curl gnupg lsb-release rsync

# --- Install Docker (idempotent) ---
if ! command -v docker >/dev/null 2>&1; then
  echo "🐳 Installing Docker..."
  sudo mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo systemctl enable docker
  sudo systemctl start docker
fi

# --- Enable IP forwarding (idempotent) ---
echo "🔧 Enabling IP forwarding..."
sudo sysctl -w net.ipv4.ip_forward=1
grep -q '^net.ipv4.ip_forward=1' /etc/sysctl.conf || echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf

# --- WireGuard (idempotent) ---
if [ -f /etc/wireguard/wg0.conf ]; then
  echo "ℹ️ WireGuard already configured. Skipping key generation and server config."
else
  echo "🔐 Generating WireGuard keys..."
  SERVER_PRIVATE_KEY=$(wg genkey)
  SERVER_PUBLIC_KEY=$(echo "$SERVER_PRIVATE_KEY" | wg pubkey)
  CLIENT_PRIVATE_KEY=$(wg genkey)
  CLIENT_PUBLIC_KEY=$(echo "$CLIENT_PRIVATE_KEY" | wg pubkey)

  echo "⚙️ Writing WireGuard server configuration..."
  sudo mkdir -p /etc/wireguard
  sudo bash -c "cat > /etc/wireguard/wg0.conf <<EOF
[Interface]
Address = 10.8.0.1/24
ListenPort = 51820
PrivateKey = $SERVER_PRIVATE_KEY

[Peer]
PublicKey = $CLIENT_PUBLIC_KEY
AllowedIPs = 10.8.0.2/32
EOF"

  echo "🛡️ Setting up NAT for VPN clients..."
  DEFAULT_IF=$(ip route | awk '/default/ {print $5}' | head -n1)
  sudo iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o "$DEFAULT_IF" -j MASQUERADE || true
  sudo iptables -A FORWARD -i wg0 -o "$DEFAULT_IF" -j ACCEPT || true
  sudo iptables -A FORWARD -i "$DEFAULT_IF" -o wg0 -j ACCEPT || true
  sudo mkdir -p /etc/iptables
  sudo bash -c "iptables-save > /etc/iptables/rules.v4"
  sudo bash -c "ip6tables-save > /etc/iptables/rules.v6"
  sudo netfilter-persistent save || true

  echo "🚀 Starting WireGuard service..."
  sudo systemctl enable wg-quick@wg0
  sudo systemctl restart wg-quick@wg0 || true

  echo "📄 Generating initial client configuration..."
  VM_PUBLIC_IP="$(curl -s http://ifconfig.me || true)"
  if [ -z "$VM_PUBLIC_IP" ]; then
    VM_PUBLIC_IP="$(curl -s -H "Metadata:true" "http://169.254.169.254/metadata/instance/network/interface/0/ipv4/ipAddress/0/publicIpAddress?api-version=2021-02-01&format=text" || true)"
  fi
  if [ -z "$VM_PUBLIC_IP" ]; then
    echo "❌ Could not detect VM public IP. Exiting."
    exit 1
  fi

  cat > "$APP_DIR/client.conf" <<EOF
[Interface]
PrivateKey = $CLIENT_PRIVATE_KEY
Address = 10.8.0.2/24
DNS = 10.8.0.1

[Peer]
PublicKey = $SERVER_PUBLIC_KEY
Endpoint = $VM_PUBLIC_IP:51820
AllowedIPs = 10.8.0.0/24
EOF
fi

echo "✅ VM bootstrap complete."
