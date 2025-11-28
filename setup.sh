#!/bin/bash
set -e

# --- WireGuard setup ---
echo "🔐 Generating WireGuard keys..."
SERVER_PRIVATE_KEY=$(wg genkey)
SERVER_PUBLIC_KEY=$(echo $SERVER_PRIVATE_KEY | wg pubkey)
CLIENT_PRIVATE_KEY=$(wg genkey)
CLIENT_PUBLIC_KEY=$(echo $CLIENT_PRIVATE_KEY | wg pubkey)

echo "🔧 Enabling IP forwarding..."
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf

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
sudo iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o $DEFAULT_IF -j MASQUERADE
sudo iptables -A FORWARD -i wg0 -o $DEFAULT_IF -j ACCEPT
sudo iptables -A FORWARD -i $DEFAULT_IF -o wg0 -j ACCEPT

echo "💾 Saving firewall rules for persistence..."
sudo mkdir -p /etc/iptables
sudo bash -c "iptables-save > /etc/iptables/rules.v4"
sudo bash -c "ip6tables-save > /etc/iptables/rules.v6"
sudo netfilter-persistent save

echo "🚀 Starting WireGuard service..."
sudo systemctl enable wg-quick@wg0
sudo systemctl restart wg-quick@wg0

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

# --- Docker build & run ---
echo "🐳 Building Docker image for weatherapp..."
cd /vagrant

# Enable Docker BuildKit
export DOCKER_BUILDKIT=1
# Load environment variables
if [ -f /vagrant/.env ]; then
  export $(grep -v '^#' /vagrant/.env | xargs)
fi

sudo docker build -t weatherapp .

echo "🏃 Starting weatherapp container..."
sudo docker run -d \
  --name weatherapp \
  -p 10.8.0.1:${PORT}:${PORT} \
  --env-file /vagrant/.env \
  weatherapp

echo "✅ Weatherapp is running inside Docker, bound to VPN IP 10.8.0.1:${PORT}"