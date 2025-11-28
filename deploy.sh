#!/bin/bash
set -e

# make setup script executable
chmod +x ./setup.sh

# Start the VM and reprovision if needed
vagrant up --provision

# Run the setup script inside the VM
vagrant ssh -c "bash /vagrant/setup.sh"

echo "✅ WireGuard VPN setup complete."
echo "➡️ Client config available at ./client.conf"
echo "Run: sudo wg-quick up ./client.conf"
echo "Then access your app at http://10.8.0.1:<port>"
