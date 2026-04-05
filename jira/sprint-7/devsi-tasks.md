# Devsi — Sprint 7 Tasks

**Sprint:** April 5–12, 2026
**Role:** DevOps
**Total tasks:** 4

The existential risks first: backups, monitoring. Then developer experience: Prettier. Then resilience: health checks. Your priority order is set — don't reorder.

Deploy after EVERY task. Update Clodi after EVERY task.

---

## D8 — PostgreSQL Backups to S3 (THE #1 PRIORITY)

**Priority:** Critical
**Branch:** `feat/db-backups-s3`
**Deadline:** April 6 (Day 1)

Right now, one EBS failure = all data gone. This is the single biggest risk to the project. Fix it today.

### Requirements

1. **Create S3 bucket:**
   ```bash
   aws s3 mb s3://mundial-poker-backups --region eu-west-1
   ```
   - Enable versioning
   - Add lifecycle rule: delete backups older than 30 days

2. **Create IAM role for EC2:**
   - Policy: `s3:PutObject`, `s3:GetObject` on `mundial-poker-backups/*`
   - Attach to EC2 instance profile (no access keys on the box)

3. **Backup script** at `/opt/mundial-poker/scripts/backup-db.sh`:
   ```bash
   #!/bin/bash
   TIMESTAMP=$(date +%Y%m%d_%H%M%S)
   BACKUP_FILE="/tmp/mundial-poker-${TIMESTAMP}.sql.gz"

   docker exec mundial-poker-postgres pg_dump -U postgres mundial_poker | gzip > "$BACKUP_FILE"
   aws s3 cp "$BACKUP_FILE" "s3://mundial-poker-backups/daily/${TIMESTAMP}.sql.gz"
   rm "$BACKUP_FILE"

   echo "[$(date)] Backup completed: ${TIMESTAMP}.sql.gz"
   ```

4. **Cron job:** Run daily at 03:00 UTC
   ```bash
   echo "0 3 * * * /opt/mundial-poker/scripts/backup-db.sh >> /var/log/backup.log 2>&1" | crontab -
   ```

5. **Test it:** Run the script manually, download from S3, restore to a local Postgres, verify data is intact.

6. **Document** in `docs/devops/backup-recovery.md`: how to restore, where backups live, retention policy.

### Out of Scope
- Redis backup (AOF is already enabled — good enough for now)
- Automated restore testing (manual verify is fine for Sprint 7)

### Deliverables

- [ ] S3 bucket created with versioning + lifecycle
- [ ] IAM role attached (no access keys)
- [ ] Backup script works end-to-end
- [ ] Cron job scheduled (daily 03:00 UTC)
- [ ] Manual test: backup → download → restore → verify
- [ ] Recovery docs written

---

## D9 — Uptime Monitoring

**Priority:** Critical
**Branch:** n/a (external setup)
**Deadline:** April 6 (Day 1, after D8)

We're blind to outages. If the server goes down at 2am, nobody knows until someone opens the URL.

### Requirements

1. **UptimeRobot (free tier):**
   - Monitor 1: HTTPS check on `https://mundialpoker.duckdns.org` — 5 min interval
   - Monitor 2: API health check on `https://mundialpoker.duckdns.org/api/health` — 5 min interval
   - Alert: Email to Orel + Devsi on downtime
   - Status page: Create public status page (optional but nice)

2. **Server-side health endpoint** — verify `/api/health` returns:
   ```json
   { "status": "ok", "db": "connected", "redis": "connected" }
   ```
   If it doesn't exist or doesn't check DB/Redis, ask Soni to add it (file in `jira/sprint-7/shared/`).

3. **Docker health checks** — add to `docker-compose.prod.yml`:
   ```yaml
   services:
     server:
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:5174/api/health"]
         interval: 30s
         timeout: 10s
         retries: 3
     postgres:
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U postgres"]
         interval: 30s
         timeout: 5s
         retries: 3
     redis:
       healthcheck:
         test: ["CMD", "redis-cli", "ping"]
         interval: 30s
         timeout: 5s
         retries: 3
   ```

### Deliverables

- [ ] UptimeRobot monitors active (HTTPS + API health)
- [ ] Email alerts configured
- [ ] Docker health checks added to compose
- [ ] Verify `/api/health` checks DB + Redis (or ticket to Soni)

---

## D10 — Prettier Pre-Commit Hook

**Priority:** High
**Branch:** `feat/prettier-precommit`
**Deadline:** April 7

Soni requested this in the mid-term review. Format-fix PRs are wasting hours every sprint. One hook kills the problem forever.

### Requirements

1. **Install dependencies** in the monorepo root:
   ```bash
   pnpm add -Dw prettier husky lint-staged
   ```

2. **Configure Prettier** — create `.prettierrc` at repo root:
   ```json
   {
     "semi": false,
     "singleQuote": true,
     "trailingComma": "all",
     "printWidth": 100,
     "tabWidth": 2
   }
   ```
   **IMPORTANT:** Check with Soni/Joni if these match existing style before committing. If the codebase already has a different convention, match that.

3. **Configure lint-staged** in `package.json`:
   ```json
   {
     "lint-staged": {
       "*.{ts,tsx,js,jsx}": ["prettier --write"],
       "*.{json,md,css}": ["prettier --write"]
     }
   }
   ```

4. **Setup husky:**
   ```bash
   pnpm exec husky init
   echo "pnpm exec lint-staged" > .husky/pre-commit
   ```

5. **One-time format** — run Prettier on the entire codebase and commit as a single "chore: format all files with prettier" commit. This is the only time we do a bulk format. After this, the hook keeps things clean.

6. **Test it:** Make a messy file, stage it, commit — verify Prettier auto-formats before the commit lands.

### Out of Scope
- ESLint integration (separate sprint)
- CI format check (the hook is sufficient for now)

### Deliverables

- [ ] Prettier + husky + lint-staged installed
- [ ] Pre-commit hook auto-formats staged files
- [ ] One-time bulk format committed
- [ ] Tested: messy file → commit → auto-formatted

---

## D11 — Deploy Health Check + Rollback Script

**Priority:** Medium
**Branch:** `feat/deploy-healthcheck`
**Deadline:** April 10

Currently, `deploy.sh` does `docker compose up -d` and hopes for the best. If the new build is broken, we don't know until someone manually tests. Add a post-deploy health check and a rollback mechanism.

### Requirements

1. **Post-deploy health check** in `deploy.sh`:
   ```bash
   # After docker compose up -d
   echo "Waiting for services to start..."
   sleep 10

   HEALTH=$(curl -sf http://localhost/api/health | jq -r '.status' 2>/dev/null)
   if [ "$HEALTH" != "ok" ]; then
     echo "DEPLOY FAILED — health check returned: $HEALTH"
     echo "Rolling back..."
     docker compose -f docker-compose.prod.yml down
     docker compose -f docker-compose.prod.yml up -d --no-build
     exit 1
   fi

   echo "Deploy successful — health check passed"
   ```

2. **Image tagging** — before `docker compose up`, tag current images as `:rollback`:
   ```bash
   docker tag mundial-poker-server:latest mundial-poker-server:rollback
   docker tag mundial-poker-web:latest mundial-poker-web:rollback
   ```
   Rollback = swap to `:rollback` tags.

3. **Rollback script** at `scripts/rollback.sh`:
   ```bash
   docker tag mundial-poker-server:rollback mundial-poker-server:latest
   docker tag mundial-poker-web:rollback mundial-poker-web:latest
   docker compose -f docker-compose.prod.yml up -d --no-build
   ```

4. **Test:** Deploy a known-good build, verify health check passes. Then break something intentionally (wrong env var), deploy, verify health check fails and rollback triggers.

### Out of Scope
- Zero-downtime deploys (needs graceful shutdown — Sprint 8)
- Automated rollback in CI (manual trigger is fine for now)

### Deliverables

- [ ] Post-deploy health check in deploy.sh
- [ ] Image tagging before deploy
- [ ] Rollback script works
- [ ] Tested: good deploy passes, bad deploy triggers rollback

---

## Delivery Log

| Task | Status | PR | Deployed |
|------|--------|-----|----------|
| D8   | 🔄 In progress — PR open, AWS setup pending Orel | #pending | ⬜ |
| D9   | ⬜     |     |          |
| D10  | ⬜     |     |          |
| D11  | ⬜     |     |          |

### D8 Progress Log

**April 5, 2026**

- Corrected DB credentials in backup script: user `wpc`, db `world_poker_cup` (task spec had wrong values)
- `scripts/backup-db.sh` written — dumps via `docker-compose exec -T`, pipes to gzip, uploads to S3 via instance profile
- `scripts/aws-setup.sh` written — one-time AWS setup (S3 bucket + versioning + 30-day lifecycle + IAM role + instance profile). Orel runs this from his machine with AWS admin credentials
- `docs/devops/backup-recovery.md` written — restore procedure, disaster recovery scenarios A/B/C, what's NOT backed up (Redis/SSL/env)
- **Blocked on Orel:** AWS setup script needs to run once (`scripts/aws-setup.sh`) before the backup script can upload to S3. IAM instance profile must be attached to `i-0b95a73440e9e9111`.
- After Orel runs setup: SSH into EC2, `chmod +x scripts/backup-db.sh`, run manually to verify, then `crontab -e` to add the 03:00 UTC job.
