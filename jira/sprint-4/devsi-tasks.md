# Devsi — Sprint 4 Tasks

**Sprint:** April 4–11, 2026
**Role:** DevOps
**Total tasks:** 3

Read the [Sprint Brief](./SPRINT-BRIEF.md) first.

---

## D2 — EC2 Instance Setup

**Priority:** High (blocks everything)
**Deadline:** April 4 (day 1)

### Requirements

1. **Launch EC2 instance** — t2.micro or t3.micro (free tier eligible)
   - Region: closest to team (eu-west-1 or us-east-1 — confirm with Orel)
   - AMI: Amazon Linux 2023 or Ubuntu 22.04 LTS
   - Storage: 20GB gp3 (free tier allows 30GB)

2. **Security groups:**
   - Port 22 (SSH) — restricted to Orel's IP + team IPs
   - Port 80 (HTTP) — open to all
   - Port 443 (HTTPS) — open to all (for future SSL)
   - Port 5174 — closed (server accessed via Nginx reverse proxy only)
   - Port 5432, 6379 — closed (internal Docker network only)

3. **Install Docker + Docker Compose:**
   ```bash
   sudo yum install docker -y  # or apt install docker.io
   sudo systemctl start docker
   sudo usermod -aG docker ec2-user
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

4. **SSH key** — create a deploy key for GitHub Actions (passwordless SSH deploy)

5. **Elastic IP** — assign a static IP so the address doesn't change on instance restart

6. **Document the setup** at `docs/deployment/ec2-setup.md`:
   - Instance ID, region, IP
   - SSH access instructions
   - Security group rules
   - Docker version

### Deliverables

- [ ] EC2 running with Docker + Docker Compose
- [ ] Security groups configured
- [ ] Elastic IP assigned
- [ ] SSH key created for CI/CD
- [ ] Setup documented

**Estimated effort:** 2-3 hours

---

## D3 — Docker Compose Production + Nginx

**Priority:** High
**Deadline:** April 6

### Requirements

1. **Create `docker-compose.production.yml`** at repo root:

   ```yaml
   version: '3.8'
   services:
     postgres:
       image: postgres:16-alpine
       environment:
         POSTGRES_USER: wpc
         POSTGRES_PASSWORD: ${DB_PASSWORD}
         POSTGRES_DB: world_poker_cup
       volumes:
         - pgdata:/var/lib/postgresql/data
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U wpc"]
         interval: 5s
       restart: always

     redis:
       image: redis:7-alpine
       healthcheck:
         test: ["CMD", "redis-cli", "ping"]
         interval: 5s
       restart: always

     server:
       build:
         context: .
         dockerfile: apps/server/Dockerfile
       environment:
         - NODE_ENV=production
         - PORT=5174
         - DATABASE_URL=postgres://wpc:${DB_PASSWORD}@postgres:5432/world_poker_cup
         - REDIS_URL=redis://redis:6379
         - JWT_SECRET=${JWT_SECRET}
       depends_on:
         postgres: { condition: service_healthy }
         redis: { condition: service_healthy }
       restart: always

     web:
       build:
         context: .
         dockerfile: apps/web/Dockerfile
       depends_on:
         - server
       restart: always

     nginx:
       image: nginx:alpine
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx.conf:/etc/nginx/conf.d/default.conf
       depends_on:
         - web
         - server
       restart: always

   volumes:
     pgdata:
   ```

2. **Create `nginx.conf`** — reverse proxy + WebSocket upgrade:
   ```nginx
   upstream server {
     server server:5174;
   }

   upstream web {
     server web:80;
   }

   server {
     listen 80;

     # Frontend
     location / {
       proxy_pass http://web;
     }

     # API
     location /api/ {
       proxy_pass http://server;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
     }

     # WebSocket
     location /socket.io/ {
       proxy_pass http://server;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
     }
   }
   ```

3. **Create `.env.production.template`** (committed, no secrets):
   ```
   DB_PASSWORD=change_me
   JWT_SECRET=change_me
   NODE_ENV=production
   ```
   Actual `.env.production` lives on EC2 only, NOT in repo.

### Deliverables

- [ ] `docker-compose.production.yml` working
- [ ] `nginx.conf` with WebSocket proxy
- [ ] `.env.production.template` in repo
- [ ] All services start with `docker-compose -f docker-compose.production.yml up -d`
- [ ] Health checks on all services

**Estimated effort:** 1 day

---

## D4 — GitHub Actions CD Pipeline (Deploy to EC2)

**Priority:** High
**Deadline:** April 8

### Requirements

1. **Update `.github/workflows/cd.yml`** — add deploy step after build:

   ```yaml
   deploy:
     needs: [build]
     runs-on: ubuntu-latest
     if: github.ref == 'refs/heads/main'
     steps:
       - uses: actions/checkout@v4

       - name: Deploy to EC2
         uses: appleboy/ssh-action@v1
         with:
           host: ${{ secrets.EC2_HOST }}
           username: ec2-user
           key: ${{ secrets.EC2_SSH_KEY }}
           script: |
             cd /opt/mundial-poker
             git pull origin main
             docker-compose -f docker-compose.production.yml build
             docker-compose -f docker-compose.production.yml up -d
             docker-compose -f docker-compose.production.yml exec server pnpm db:migrate
             echo "Deploy complete: $(date)"
   ```

2. **Add GitHub Secrets:**
   - `EC2_HOST` — Elastic IP address
   - `EC2_SSH_KEY` — private key from D2
   - `DB_PASSWORD` — production database password
   - `JWT_SECRET` — production JWT secret

3. **Clone repo on EC2:**
   ```bash
   sudo mkdir -p /opt/mundial-poker
   sudo chown ec2-user:ec2-user /opt/mundial-poker
   cd /opt/mundial-poker
   git clone https://github.com/oreloffir/mundial-poker.git .
   cp .env.production.template .env.production
   # Edit .env.production with real secrets
   ```

4. **First deploy test:** Push to main, watch GitHub Actions, verify the game loads at `http://<ec2-ip>`.

### Deliverables

- [ ] CD pipeline deploys on push to main
- [ ] GitHub Secrets configured
- [ ] Repo cloned on EC2
- [ ] First deploy succeeds — game accessible at EC2 IP
- [ ] Deploy completes in <5 minutes

**Estimated effort:** 1 day

---

## Delivery Log

### D2 — EC2 Setup
**Status:** Not started

### D3 — Docker Compose + Nginx
**Status:** Not started

### D4 — CD Pipeline
**Status:** Not started
