# EC2 Setup — Mundial Poker Production

**Author:** Devsi
**Sprint:** 4
**Date:** April 2, 2026

This document records the exact steps to provision and configure the EC2 instance for production.
Treat this as the runbook — if we ever need to rebuild from scratch, follow these steps.

---

## Instance Spec

| Setting | Value |
|---------|-------|
| Instance type | t2.micro (free tier eligible) |
| AMI | Amazon Linux 2023 (`ami-0762bad84218d1ffa`) |
| Region | eu-west-1 (Ireland) |
| Storage | 20GB gp3 |
| Elastic IP | `52.49.249.190` |
| Key pair | `mundial-poker-deploy` (`~/.ssh/mundial-poker-deploy.pem`) |

---

## Step 1 — Launch EC2 Instance

In the AWS Console:

1. Go to EC2 → Launch Instance
2. Name: `mundial-poker-production`
3. AMI: Amazon Linux 2023 AMI (64-bit x86)
4. Instance type: `t2.micro`
5. Key pair: Create new → `mundial-poker-ec2` → ED25519 → download `.pem`
6. Network settings:
   - VPC: default
   - Subnet: default
   - Auto-assign public IP: **Disable** (we'll use Elastic IP)
   - Firewall: Create security group `mundial-poker-sg` (see Step 2)
7. Storage: 20 GiB gp3
8. Launch

---

## Step 2 — Security Group Rules

Security group name: `mundial-poker-sg`

| Type | Port | Protocol | Source | Purpose |
|------|------|----------|--------|---------|
| SSH | 22 | TCP | `<OREL_IP>/32` | Admin access only |
| HTTP | 80 | TCP | `0.0.0.0/0` | Web traffic |
| HTTPS | 443 | TCP | `0.0.0.0/0` | Web traffic (SSL — Sprint 5) |

**All other inbound traffic: DENY**

Outbound: all allowed (default).

> Replace `<OREL_IP>` with Orel's actual IP. Get it from: `curl ifconfig.me`

---

## Step 3 — Assign Elastic IP

1. EC2 → Elastic IPs → Allocate Elastic IP address
2. Select the new allocation → Associate → select `mundial-poker-production`
3. Record the IP: `<ELASTIC_IP>`

This IP never changes even if the instance is stopped/started. Use it everywhere.

---

## Step 4 — SSH Into the Instance

```bash
chmod 400 mundial-poker-ec2.pem
ssh -i mundial-poker-ec2.pem ec2-user@<ELASTIC_IP>
```

---

## Step 5 — Install Docker

```bash
# Update packages
sudo dnf update -y

# Install Docker
sudo dnf install -y docker

# Start Docker and enable on boot
sudo systemctl start docker
sudo systemctl enable docker

# Add ec2-user to docker group (no sudo needed)
sudo usermod -aG docker ec2-user

# Apply group change (or re-login)
newgrp docker

# Verify
docker --version
```

---

## Step 6 — Install Docker Compose

> Note: `docker-compose-plugin` is not available in the AL2023 dnf repo. Install the binary directly.

```bash
# Download latest Docker Compose v2 binary
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
sudo curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Also install latest buildx (AL2023 ships 0.12.1 which is too old for Compose v5)
mkdir -p ~/.docker/cli-plugins
BUILDX_VERSION=$(curl -s https://api.github.com/repos/docker/buildx/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
curl -SL "https://github.com/docker/buildx/releases/download/${BUILDX_VERSION}/buildx-${BUILDX_VERSION}.linux-amd64" -o ~/.docker/cli-plugins/docker-buildx
chmod +x ~/.docker/cli-plugins/docker-buildx

# Verify
docker-compose version
docker buildx version
```

---

## Step 7 — Install Git and Node (for migrations)

```bash
sudo dnf install -y git

# Verify
git --version
```

---

## Step 8 — Clone the Repository

```bash
# Create app directory
sudo mkdir -p /opt/mundial-poker
sudo chown ec2-user:ec2-user /opt/mundial-poker

# Clone
git clone https://github.com/oreloffir/mundial-poker.git /opt/mundial-poker

cd /opt/mundial-poker
```

---

## Step 9 — Create Deploy Key for GitHub Actions

The CD pipeline needs to SSH into EC2 without a password. We use a dedicated Ed25519 key.

**On the EC2 instance:**

```bash
# Generate deploy key (no passphrase)
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N "" -C "github-actions-deploy"

# Add public key to authorized_keys
cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Print private key — copy this into GitHub Secrets as EC2_SSH_KEY
cat ~/.ssh/deploy_key
```

**In GitHub (repo Settings → Secrets → Actions):**

| Secret | Value |
|--------|-------|
| `EC2_HOST` | `<ELASTIC_IP>` |
| `EC2_USER` | `ec2-user` |
| `EC2_SSH_KEY` | contents of `~/.ssh/deploy_key` (private key) |
| `DB_PASSWORD` | strong random password |
| `JWT_SECRET` | strong random string (32+ chars) |

---

## Step 10 — Create .env on EC2

```bash
cd /opt/mundial-poker

# Copy the template
cp .env.production.template .env.production

# Edit with real values
nano .env.production
```

Fill in:
- `DB_PASSWORD` — same as GitHub Secret
- `JWT_SECRET` — same as GitHub Secret
- `REDIS_PASSWORD` — set if you add Redis auth (optional for now)

The `.env.production` file lives **only on EC2**. Never commit it.

---

## Step 11 — Verify Docker Works

```bash
cd /opt/mundial-poker

# Test services start
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d postgres redis

# Check health
docker compose -f docker-compose.production.yml ps
```

---

## Instance Details

| Field | Value |
|-------|-------|
| Instance ID | `i-0b95a73440e9e9111` |
| Elastic IP | `52.49.249.190` |
| Region | `eu-west-1` (Ireland) |
| AMI | `ami-0762bad84218d1ffa` (Amazon Linux 2023) |
| Security group | `sg-0c6ee7ef0e6ee3f37` (`mundial-poker-sg`) |
| Key pair file | `mundial-poker-deploy` (`~/.ssh/mundial-poker-deploy.pem`, not in repo) |
| Deploy key | `~/.ssh/github_actions_deploy` (private key in GitHub Secrets as `EC2_SSH_KEY`) |
| App path | `/opt/mundial-poker` |
| Docker version | 25.0.14 |
| Docker Compose | v5.1.1 |
| Docker buildx | v0.33.0 |

---

## Maintenance Notes

- **Stop/Start:** Elastic IP stays assigned. No IP change.
- **Reboot:** Docker services restart automatically (`restart: unless-stopped`).
- **SSH:** Always use the `.pem` key. Orel's IP only.
- **Secrets:** `.env.production` lives only on EC2. Back it up securely.
- **Disk:** 20GB gp3. PostgreSQL data + Docker images will use ~3–5GB. Monitor with `df -h`.
