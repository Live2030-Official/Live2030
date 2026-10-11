#!/bin/bash
# ==============================================================================
# Live 2030 - Instant AWS Production Deployment Script
# Target: Ubuntu 22.04 / 24.04 LTS on AWS EC2
# ==============================================================================

set -e
export DEBIAN_FRONTEND=noninteractive

echo "🚀 Starting Live 2030 AWS Server Setup..."

# Update package lists
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"

# Install prerequisite tools
sudo apt-get install -y curl wget git ufw rsync unzip ca-certificates gnupg lsb-release

# Install Docker Engine
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker Engine..."
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker $USER
    echo "✅ Docker installed successfully."
fi

# Configure Firewall (UFW)
echo "🛡️ Configuring Firewall..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 4000/tcp  # Live 2030 Backend API & WebSockets
sudo ufw allow 3000/tcp  # Live 2030 Admin Dashboard
sudo ufw --force enable

# Prepare app workspace directory
APP_DIR="/home/ubuntu/live2030"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo "📂 Application directory ready at $APP_DIR"

if [ -f "docker-compose.yml" ]; then
    echo "🐳 Launching Live 2030 Platform containers..."
    sudo docker compose up -d --build
    echo "✅ Live 2030 Containers are UP and RUNNING!"
    echo "🌐 Backend API: http://$(curl -s http://checkip.amazonaws.com):4000/api/docs"
    echo "📊 Admin Dashboard: http://$(curl -s http://checkip.amazonaws.com):3000"
else
    echo "⚠️ docker-compose.yml not yet in $APP_DIR. Ready to receive files via sync_to_aws.ps1!"
fi

echo "🎉 AWS Setup Complete!"
