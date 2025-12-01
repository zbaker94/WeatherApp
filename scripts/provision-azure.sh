#!/usr/bin/env bash
set -euo pipefail

# =========================
# Config (edit as needed)
# =========================
RESOURCE_GROUP="rg-weatherapp"
LOCATION="southuk"
VM_NAME="weatherapp-vm"
ADMIN_USER="azureuser"
VM_SIZE="Standard_B1s"
IMAGE="Canonical:0001-com-ubuntu-server-jammy:22_04-lts:latest"

echo "Logging into Azure (make sure you are already authenticated with 'az login')..."
az account show >/dev/null

# Create resource group
echo "Creating resource group $RESOURCE_GROUP in $LOCATION..."
az group create -n "$RESOURCE_GROUP" -l "$LOCATION" >/dev/null

# Create VM
echo "Provisioning VM $VM_NAME..."
az vm create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$VM_NAME" \
  --image "$IMAGE" \
  --size "$VM_SIZE" \
  --admin-username "$ADMIN_USER" \
  --generate-ssh-keys \
  --public-ip-sku Standard \
  --authentication-type ssh \
  --output none

# Open WireGuard and HTTPS
echo "Opening UDP 51820 (WireGuard) and TCP 443 (HTTPS) on NSG..."
az vm open-port --resource-group "$RESOURCE_GROUP" --name "$VM_NAME" --port 51820 --protocol Udp --priority 300 >/dev/null
az vm open-port --resource-group "$RESOURCE_GROUP" --name "$VM_NAME" --port 443 --protocol Tcp --priority 310 >/dev/null

# Output details
VM_PUBLIC_IP="$(az vm show -d -g "$RESOURCE_GROUP" -n "$VM_NAME" --query publicIps -o tsv)"
VM_PRIVATE_IP="$(az vm show -d -g "$RESOURCE_GROUP" -n "$VM_NAME" --query privateIps -o tsv)"

echo "========================================"
echo "Provisioning complete."
echo "VM public IP:  $VM_PUBLIC_IP"
echo "VM private IP: $VM_PRIVATE_IP"
echo "SSH:           ssh $ADMIN_USER@$VM_PUBLIC_IP"
echo "WireGuard:     Endpoint $VM_PUBLIC_IP:51820"
echo "========================================"
