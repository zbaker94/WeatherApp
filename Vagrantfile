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
    sudo DEBIAN_FRONTEND=noninteractive apt-get update || true
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --fix-missing wireguard wireguard-tools iptables-persistent docker.io
    
    echo "🐳 Enabling and starting Docker service..."
    if systemctl list-unit-files | grep -q docker.service; then
       sudo systemctl enable docker
       sudo systemctl start docker
    fi
  SHELL
end