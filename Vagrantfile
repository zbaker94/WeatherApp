Vagrant.configure("2") do |config|
  require 'rbconfig'
  host_cpu = RbConfig::CONFIG['host_cpu']

  if host_cpu =~ /arm|aarch64/
    config.vm.box = "cloud-image/ubuntu-24.04"
  config.vm.box_version = "20251113.0.0"
  else
    config.vm.box = "roboxes/ubuntu2204"
  end

  config.vm.network "forwarded_port", guest: 51820, host: 51820, protocol: "udp"

  # Use rsync for synced folder (works reliably across providers)
  config.vm.synced_folder ".", "/vagrant", type: "rsync", rsync__auto: false

  config.vm.provider "virtualbox" do |vb|
    vb.memory = "2048"
    vb.cpus = 2
  end

  config.vm.provision "shell", inline: <<-SHELL
    echo "🔄 Updating package lists and installing dependencies..."
    sudo apt-get remove -y docker.io docker-doc docker-compose podman-docker containerd runc || true

    sudo DEBIAN_FRONTEND=noninteractive apt-get update || true
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --fix-missing wireguard wireguard-tools iptables-persistent ca-certificates curl gnupg lsb-release rsync

    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
      sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    echo "🐳 Enabling and starting Docker service..."
    if systemctl list-unit-files | grep -q docker.service; then
       sudo systemctl enable docker
       sudo systemctl start docker
    fi
  SHELL
end
