# DevOps Overview — Mundial Poker

**Owner:** Devsi
**Last updated:** April 2, 2026

Everything you need to understand, operate, and debug the production infrastructure.

---

## Contents

- [AWS Account](#aws-account)
- [EC2 Instance](#ec2-instance)
- [Docker Services](#docker-services)
- [CI/CD Pipeline](#cicd-pipeline)
- [Day-to-Day Operations](#day-to-day-operations)
  - [SSH into the server](#ssh-into-the-server)
  - [View logs](#view-logs)
  - [Restart services](#restart-services)
  - [Manual deploy](#manual-deploy)
  - [Health checks](#health-checks)
- [Environment Variables](#environment-variables)
- [GitHub Secrets](#github-secrets)
- [Database Backups](#database-backups)
- [Redis Persistence](#redis-persistence)
- [Domain Setup](#domain-setup)

---

## AWS Account

| Field | Value |
|-------|-------|
| Account ID | `686348672927` |
| IAM user | `mundial-poker-devsi` |
| Region | `eu-west-1` (Ireland) |
| Monthly cost | ~$0 (free tier — t2.micro + 20GB gp3 + 1 Elastic IP) |

Free tier limits that matter:
- t2.micro: 750 hours/month (we use ~720 — **do not run a second instance**)
- gp3 storage: 30GB free (we use 20GB)
- Elastic IP: free while associated to a running instance — **costs ~$4/month if instance is stopped**

---

## EC2 Instance

| Field | Value |
|-------|-------|
| Name | `mundial-poker-production` |
| Instance ID | `i-0b95a73440e9e9111` |
| Type | `t2.micro` (1 vCPU, 1GB RAM) |
| AMI | Amazon Linux 2023 (`ami-0762bad84218d1ffa`) |
| Storage | 20GB gp3 |
| Elastic IP | `52.49.249.190` (static — survives stop/start) |
| Security group | `mundial-poker-sg` (`sg-0c6ee7ef0e6ee3f37`) |
| App directory | `/opt/mundial-poker` |

### Security Group Rules

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | `0.0.0.0/0` | SSH — **restrict to team IPs before launch** |
| 80 | TCP | `0.0.0.0/0` | HTTP — game is accessible here |
| 443 | TCP | `0.0.0.0/0` | HTTPS — ready for SSL cert (Sprint 5) |

All other ports (5174, 5432, 6379) are closed externally. They're only accessible inside the Docker bridge network.

---

## Docker Services

All 5 services are defined in `docker-compose.production.yml`. They communicate on an internal bridge network — nothing is exposed except port 80 via nginx.

| Service | Image | Internal port | Purpose | Health check |
|---------|-------|---------------|---------|--------------|
| `nginx` | `nginx:alpine` | **80 → public** | Reverse proxy. Routes `/` → web, `/api/` → server, `/socket.io/` → server | — |
| `server` | `mundial-poker-server` (built) | 5174 | Node.js + Express + Socket.io | `GET /api/health` |
| `web` | `mundial-poker-web` (built) | 80 | React SPA served by nginx | — |
| `postgres` | `postgres:16-alpine` | 5432 | PostgreSQL 16, persistent volume | `pg_isready -U wpc` |
| `redis` | `redis:7-alpine` | 6379 | Redis 7, AOF persistence | `redis-cli ping` |

### Nginx routing (`nginx.conf`)

```
GET /          → web:80      (React SPA, client-side routing via try_files)
GET /api/*     → server:5174 (REST API)
WS  /socket.io → server:5174 (WebSocket, 86400s timeout)
```

---

## CI/CD Pipeline

`.github/workflows/cd.yml` — triggers on every push to `main`.

```
Push to main
    │
    ▼
[build-production job]
    │  Checkout → pnpm install → pnpm build
    │  Upload artifacts (server-dist, web-dist, 30-day retention)
    │
    ▼ (needs: build-production)
[deploy job]
    │  SSH into 52.49.249.190 as ec2-user
    │  cd /opt/mundial-poker
    │  git pull origin main
    │  docker-compose build --no-cache
    │  docker-compose up -d
    │  Run DB migrations
    │  curl /api/health → must return 200
    │
    ▼
Deploy complete
```

CI (`.github/workflows/ci.yml`) runs on every PR and push to `main`/`develop`:
- lint + typecheck (parallel)
- test-shared, test-web, test-server (parallel, server job uses real PostgreSQL service container)
- build (gated — only runs if all tests pass)

**The deploy job only runs after CI passes.** If tests fail, nothing deploys.

---

## Day-to-Day Operations

### SSH into the server

```bash
ssh -i ~/.ssh/mundial-poker-deploy.pem ec2-user@52.49.249.190
```

The `.pem` file is on your local machine only — never committed to the repo.

---

### View logs

```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Server only (most useful)
docker-compose -f docker-compose.production.yml logs -f server

# Last 100 lines
docker-compose -f docker-compose.production.yml logs --tail=100 server

# Nginx access logs
docker-compose -f docker-compose.production.yml logs -f nginx
```

---

### Restart services

```bash
# Restart a single service (e.g. after a config change)
docker-compose -f docker-compose.production.yml restart server

# Full restart (stops and starts all containers, keeps volumes)
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d

# Hard restart with rebuild (after code changes without CD pipeline)
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d
```

All services have `restart: always` — they come back automatically if the EC2 instance reboots.

---

### Manual deploy

Use this if the CD pipeline is broken or you need to deploy a specific branch:

```bash
ssh -i ~/.ssh/mundial-poker-deploy.pem ec2-user@52.49.249.190

cd /opt/mundial-poker

# Pull the branch you want
git fetch origin
git checkout <branch>
git pull

# Rebuild and restart
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d

# Run migrations if schema changed
cat apps/server/src/db/migrations/*.sql | \
  docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U wpc -d world_poker_cup

# Verify
curl localhost/api/health
```

---

### Health checks

```bash
# From anywhere on the internet
curl http://52.49.249.190/api/health
# Expected: {"success":true,"data":{"status":"ok","timestamp":"..."}}

# From inside the EC2 instance
curl localhost/api/health

# Check all container statuses
docker-compose -f docker-compose.production.yml ps

# Check Redis
docker-compose -f docker-compose.production.yml exec redis redis-cli ping
# Expected: PONG

# Check DB tables
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U wpc -d world_poker_cup -c "\dt"

# Check team count (should be 32)
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U wpc -d world_poker_cup -c "SELECT count(*) FROM teams"

# Check disk usage
df -h
docker system df
```

---

## Environment Variables

Template committed at `.env.production.template`. Actual file lives **only on EC2** at `/opt/mundial-poker/.env.production` — never committed.

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_PASSWORD` | Yes | PostgreSQL password for `wpc` user |
| `JWT_SECRET` | Yes | JWT signing secret (32+ chars) |
| `NODE_ENV` | Yes | Set to `production` |

The server container also receives these via `docker-compose.production.yml`:

| Variable | Value (set in compose) | Description |
|----------|----------------------|-------------|
| `PORT` | `5174` | Express server port (internal) |
| `DATABASE_URL` | `postgres://wpc:${DB_PASSWORD}@postgres:5432/world_poker_cup` | Constructed from DB_PASSWORD |
| `REDIS_URL` | `redis://redis:6379` | Redis connection (internal network) |

Generate strong values with:
```bash
openssl rand -base64 32  # for DB_PASSWORD
openssl rand -base64 48  # for JWT_SECRET
```

---

## GitHub Secrets

Configured in repo Settings → Secrets → Actions. Names only — values are not stored anywhere in the repo.

| Secret | Purpose |
|--------|---------|
| `EC2_HOST` | Elastic IP (`52.49.249.190`) |
| `EC2_USER` | SSH username (`ec2-user`) |
| `EC2_SSH_KEY` | Ed25519 private key for deploy user |
| `DB_PASSWORD` | PostgreSQL password (same as `.env.production`) |
| `JWT_SECRET` | JWT signing secret (same as `.env.production`) |

To rotate any secret: update it in GitHub Settings → Secrets, and update `.env.production` on EC2 to match, then restart the `server` container.

---

## Database Backups

**Current state: no automated backups.** This is a Sprint 5 task.

Until then, manual backup:

```bash
# SSH into EC2, then:
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U wpc world_poker_cup > backup-$(date +%Y%m%d).sql

# Copy to your local machine
scp -i ~/.ssh/mundial-poker-deploy.pem \
  ec2-user@52.49.249.190:~/backup-*.sql ./
```

PostgreSQL data lives in the Docker volume `mundial-poker_pgdata`. It survives container restarts and rebuilds. It would be lost if the EC2 instance's EBS volume is deleted — **do not terminate the instance without backing up first**.

**Sprint 5 plan:** Add a cron job on EC2 that dumps daily to S3.

---

## Redis Persistence

Redis is configured with AOF (Append-Only File) persistence:

```yaml
command: redis-server --appendonly yes
```

This means Redis writes every operation to disk. On restart, it replays the log to restore state. Redis data lives in the Docker volume `mundial-poker_redisdata`.

Soni's game state (betting states, blind cache, phase map) uses 2-hour TTLs — expired keys are automatically removed. A Redis restart during an active game will restore state for rounds that started within the last 2 hours.

---

## Domain Setup

No domain configured yet — planned for Sprint 5.

When ready:

1. Buy/transfer domain (e.g. `mundialpoker.com`)
2. Create an A record pointing to `52.49.249.190`
3. Install Certbot on EC2 for SSL:
   ```bash
   sudo dnf install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d mundialpoker.com -d www.mundialpoker.com
   ```
4. Update `nginx.conf` to add port 443 server block (Certbot can do this automatically)
5. Update CORS in `apps/server/src/app.ts` to allow the new domain
6. Update GitHub Secret `EC2_HOST` if IP changes (it won't with Elastic IP)

---

## Files in This Folder

| File | Purpose |
|------|---------|
| `README.md` | This file — full infrastructure overview |
| `ec2-setup.md` | Step-by-step EC2 provisioning runbook (use if rebuilding from scratch) |
| `infrastructure-plan.md` | Sprint 3 planning doc — deployment target decision, Redis/DB choices, load estimates |
