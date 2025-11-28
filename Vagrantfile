Vagrant.configure("2") do |config|
  config.vm.box = "roboxes/ubuntu2204"
#   config.vm.network "private_network", ip: "10.0.0.5" TODO remove if this works
  config.vm.network "forwarded_port", guest: 51820, host: 51820, protocol: "udp"

  config.vm.provider "virtualbox" do |vb|
    vb.memory = "2048"
    vb.cpus = 2
  end

  config.vm.synced_folder ".", "/vagrant"

  config.vm.provision "shell", inline: <<-SHELL
    echo "🔄 Updating package lists and installing dependencies..."
    sudo apt-get remove -y docker.io docker-doc docker-compose podman-docker containerd runc
    
    sudo DEBIAN_FRONTEND=noninteractive apt-get update || true
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --fix-missing wireguard wireguard-tools iptables-persistent ca-certificates curl gnupg lsb-release

    # Add Docker’s official GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
      sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    # Add Docker’s official apt repository
    echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Update again and install Docker + Compose plugin
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    echo "🐳 Enabling and starting Docker service..."
    if systemctl list-unit-files | grep -q docker.service; then
       sudo systemctl enable docker
       sudo systemctl start docker
    fi
  SHELL
end
