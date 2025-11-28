#!/bin/bash
set -euo pipefail

# --- WireGuard setup ---
echo "🔐 Generating WireGuard keys..."
SERVER_PRIVATE_KEY=$(wg genkey)
SERVER_PUBLIC_KEY=$(echo "$SERVER_PRIVATE_KEY" | wg pubkey)
CLIENT_PRIVATE_KEY=$(wg genkey)
CLIENT_PUBLIC_KEY=$(echo "$CLIENT_PRIVATE_KEY" | wg pubkey)

echo "🔧 Enabling IP forwarding..."
sudo sysctl -w net.ipv4.ip_forward=1
if ! grep -q '^net.ipv4.ip_forward=1' /etc/sysctl.conf 2>/dev/null; then
  echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
fi

echo "⚙️ Setting up WireGuard server configuration..."
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
DEFAULT_IF=$(ip route | awk '/default/ {print $5}')
sudo iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o "$DEFAULT_IF" -j MASQUERADE
sudo iptables -A FORWARD -i wg0 -o "$DEFAULT_IF" -j ACCEPT
sudo iptables -A FORWARD -i "$DEFAULT_IF" -o wg0 -j ACCEPT

echo "💾 Saving firewall rules for persistence..."
sudo mkdir -p /etc/iptables
sudo bash -c "iptables-save > /etc/iptables/rules.v4"
sudo bash -c "ip6tables-save > /etc/iptables/rules.v6"
sudo netfilter-persistent save || true

echo "🚀 Starting WireGuard service..."
sudo systemctl enable wg-quick@wg0
sudo systemctl restart wg-quick@wg0 || true

echo "📄 Generating client configuration file..."
sudo bash -c "cat > /vagrant/client.conf <<EOF
[Interface]
PrivateKey = $CLIENT_PRIVATE_KEY
Address = 10.8.0.2/24
DNS = 10.8.0.1

[Peer]
PublicKey = $SERVER_PUBLIC_KEY
Endpoint = 127.0.0.1:51820
AllowedIPs = 10.0.0.0/24, 10.8.0.0/24
EOF"

# --- Ensure stable DNS for VM and Docker (important for containers and Node) ---
echo "🔧 Configuring system DNS and Docker daemon DNS..."

# 1) Configure systemd-resolved upstreams (idempotent)
sudo tee /etc/systemd/resolved.conf > /dev/null <<'EOF'
[Resolve]
DNS=8.8.8.8 1.1.1.1
FallbackDNS=9.9.9.9
# Keep DNSStubListener=yes so /etc/resolv.conf points to 127.0.0.53
EOF

sudo systemctl restart systemd-resolved
sleep 1
echo "📡 systemd-resolved configured (showing summary):"
resolvectl status | sed -n '1,40p' || true

# 2) Configure Docker daemon to use explicit DNS so containers don't inherit a broken stub resolver
DOCKER_DAEMON_JSON='/etc/docker/daemon.json'
sudo mkdir -p "$(dirname "$DOCKER_DAEMON_JSON")"
# Preserve existing daemon.json keys if present by merging minimally; if file exists, overwrite only dns key.
if sudo test -f "$DOCKER_DAEMON_JSON"; then
  # create a temp file merging dns into existing JSON if possible; fallback to overwrite
  TMP_JSON=$(mktemp)
  if command -v jq >/dev/null 2>&1; then
    sudo jq '. + {"dns":["8.8.8.8","1.1.1.1"]}' "$DOCKER_DAEMON_JSON" > "$TMP_JSON" && sudo mv "$TMP_JSON" "$DOCKER_DAEMON_JSON" || {
      sudo rm -f "$TMP_JSON"
      sudo tee "$DOCKER_DAEMON_JSON" > /dev/null <<'EOF'
{
  "dns": ["8.8.8.8", "1.1.1.1"]
}
EOF
    }
  else
    # jq not available; overwrite with dns key (safe and idempotent)
    sudo tee "$DOCKER_DAEMON_JSON" > /dev/null <<'EOF'
{
  "dns": ["8.8.8.8", "1.1.1.1"]
}
EOF
  fi
else
  sudo tee "$DOCKER_DAEMON_JSON" > /dev/null <<'EOF'
{
  "dns": ["8.8.8.8", "1.1.1.1"]
}
EOF
fi

sudo systemctl restart docker || true
echo "🐳 Docker daemon restarted with explicit DNS."

# 3) If netplan is present, persist nameservers so DHCP doesn't overwrite them
if ls /etc/netplan/*.yaml >/dev/null 2>&1; then
  echo "🗺️ Applying netplan nameservers to persist DNS across reboots..."
  sudo tee /etc/netplan/99-fixed-dns.yaml > /dev/null <<'EOF'
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
      nameservers:
        addresses: [8.8.8.8,1.1.1.1]
EOF
  sudo netplan apply || true
  echo "✅ netplan applied (if netplan is used on this image)."
fi

# --- Docker build & run ---
echo "🏌️☁️ Starting weatherapp stack..."
cd /vagrant
export DOCKER_BUILDKIT=1
sudo docker compose up -d --build

echo "✅ Weatherapp is running inside Docker Compose, accessible via HTTPS at https://weatherapp.local"

echo "📜 Waiting for Caddy certs inside container and exporting to /vagrant..."
for i in {1..40}; do
  if sudo docker exec vagrant-caddy-1 test -f /data/caddy/pki/authorities/local/root.crt >/dev/null 2>&1; then
    echo "✅ Caddy certs found in container; exporting to /vagrant..."
    sudo docker exec vagrant-caddy-1 cat /data/caddy/pki/authorities/local/root.crt | sudo tee /vagrant/root.crt >/dev/null
    sudo docker exec vagrant-caddy-1 cat /data/caddy/pki/authorities/local/intermediate.crt | sudo tee /vagrant/intermediate.crt >/dev/null
    sudo bash -lc 'cat /vagrant/root.crt /vagrant/intermediate.crt > /vagrant/caddy-ca-chain.crt'
    sudo chown vagrant:vagrant /vagrant/root.crt /vagrant/intermediate.crt /vagrant/caddy-ca-chain.crt || true
    echo "✅ Exported Caddy certs to /vagrant"
    break
  else
    echo "⏳ Caddy certs not yet present in container ($i/40)..."
    sleep 3
  fi
done

# Install root CA on VM itself (for curl/wget inside VM) if export succeeded
if [ -f /vagrant/root.crt ]; then
  sudo cp /vagrant/root.crt /usr/local/share/ca-certificates/caddy-root.crt
  sudo update-ca-certificates || true
  echo "✅ Root CA installed on VM"
else
  echo "⚠️ root.crt not found in /vagrant after export attempts; skipping VM CA install"
fi
