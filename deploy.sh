#!/bin/bash
set -e

OS="$(uname -s)"

chmod +x ./setup.sh
vagrant up --provision
vagrant ssh -c "bash /vagrant/setup.sh"

ROOT_CERT="./root.crt"

if [ -f "$ROOT_CERT" ]; then
  echo "📜 Found Caddy root certificate at $ROOT_CERT"
  case "$OS" in
    Linux)
      echo "🐧 Installing root certificate on Linux host..."
      sudo cp "$ROOT_CERT" /usr/local/share/ca-certificates/caddy-root.crt
      sudo update-ca-certificates
      ;;
    Darwin)
      echo "🍎 Installing root certificate on macOS host..."
      sudo security add-trusted-cert -d -r trustRoot \
        -k /Library/Keychains/System.keychain "$ROOT_CERT"
      ;;
    *)
      echo "⚠️ Unsupported OS: $OS. Please install $ROOT_CERT manually."
      ;;
  esac
else
  echo "❌ No root certificate found at $ROOT_CERT. Did setup.sh export it?"
fi

# --- Update /etc/hosts ---
HOST_ENTRY="10.8.0.1 weatherapp.local"
if grep -q "weatherapp.local" /etc/hosts; then
  echo "ℹ️ /etc/hosts already contains weatherapp.local"
else
  echo "📝 Adding weatherapp.local to /etc/hosts..."
  # macOS and Linux both use /etc/hosts
  echo "$HOST_ENTRY" | sudo tee -a /etc/hosts > /dev/null
fi

echo "✅ WireGuard VPN setup complete."
echo "➡️ Client config available at ./client.conf"

CONF="$(realpath ./client.conf)"
if ! sudo wg show wg0 &>/dev/null; then
  echo "Running wg-quick up $CONF"
  sudo wg-quick up "$CONF"
else
  echo "WireGuard already up."
fi

URL="https://weatherapp.local"
echo "Opening app at $URL ..."
case "$OS" in
  Linux)
    if command -v xdg-open >/dev/null; then
      xdg-open "$URL"
    else
      echo "⚠️ No xdg-open found. Open $URL manually."
    fi
    ;;
  Darwin)
    open "$URL"
    ;;
  *)
    echo "⚠️ Unsupported OS: $OS. Open $URL manually."
    ;;
esac
echo "✅ Deploy complete!"
