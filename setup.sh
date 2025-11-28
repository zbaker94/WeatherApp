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
echo "🏌️☁️ Starting weatherapp stack..."
cd /vagrant
export DOCKER_BUILDKIT=1
sudo docker compose up -d --build

echo "✅ Weatherapp is running inside Docker Compose, accessible via HTTPS at https://weatherapp.local"

echo "📜 Waiting for Caddy to generate certificates..."
for i in {1..10}; do
  if sudo docker exec vagrant-caddy-1 test -f /data/caddy/pki/authorities/local/root.crt; then
    sudo docker exec vagrant-caddy-1 cat /data/caddy/pki/authorities/local/root.crt > /vagrant/root.crt
    sudo docker exec vagrant-caddy-1 cat /data/caddy/pki/authorities/local/intermediate.crt > /vagrant/intermediate.crt
    cat /vagrant/root.crt /vagrant/intermediate.crt > /vagrant/caddy-ca-chain.crt
    echo "✅ Exported Caddy root+intermediate chain to /vagrant/caddy-ca-chain.crt"
    break
  else
    echo "⏳ Still waiting ($i)..."
    sleep 3
  fi
done

# Install root CA on VM itself (for curl/wget inside VM)
sudo cp /vagrant/root.crt /usr/local/share/ca-certificates/caddy-root.crt
sudo update-ca-certificates
echo "✅ Root CA installed on VM"
