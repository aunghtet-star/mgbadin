#!/bin/bash
# ============================================
# MG Badin - DigitalOcean Deployment Script
# Run this on your Droplet after SSH
# ============================================

set -e

echo "🚀 MG Badin Deployment Script"
echo "=============================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Update system
echo -e "${YELLOW}Step 1: Updating system...${NC}"
sudo apt update && sudo apt upgrade -y

# Step 2: Install Docker
echo -e "${YELLOW}Step 2: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${GREEN}Docker installed!${NC}"
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

# Step 3: Install Docker Compose
echo -e "${YELLOW}Step 3: Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}Docker Compose installed!${NC}"
else
    echo -e "${GREEN}Docker Compose already installed${NC}"
fi

# Step 4: Setup firewall
echo -e "${YELLOW}Step 4: Configuring firewall...${NC}"
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3001/tcp  # App 1
sudo ufw allow 3002/tcp  # App 2
sudo ufw allow 3003/tcp  # App 3
sudo ufw --force enable
echo -e "${GREEN}Firewall configured!${NC}"

# Step 5: Create app directory
echo -e "${YELLOW}Step 5: Creating app directory...${NC}"
sudo mkdir -p /opt/mgbadin
sudo chown $USER:$USER /opt/mgbadin
echo -e "${GREEN}Directory created at /opt/mgbadin${NC}"

echo ""
echo -e "${GREEN}=============================="
echo "✅ Server setup complete!"
echo "=============================="
echo ""
echo "Next steps:"
echo "1. Copy your project files to /opt/mgbadin"
echo "2. Create .env file with your secrets"
echo "3. Run: cd /opt/mgbadin && docker-compose up -d"
echo ""
echo "NOTE: Log out and log back in for Docker permissions to take effect"
echo -e "${NC}"
