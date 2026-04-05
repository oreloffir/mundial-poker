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

3. **Backup script** at `/opt/mundial-poker/scripts/backup-db.sh`

4. **Cron job:** Run daily at 03:00 UTC

5. **Test it:** Run the script manually, download from S3, restore to a local Postgres, verify data is intact.

6. **Document** in `docs/devops/backup-recovery.md`: how to restore, where backups live, retention policy.

### Out of Scope

- Redis backup (AOF is already enabled — good enough for now)
- Automated restore testing (manual verify is fine for Sprint 7)

### Deliverables

- [x] S3 bucket setup script written (`scripts/aws-setup.sh`)
- [x] Backup script written (`scripts/backup-db.sh`) — correct credentials: user `wpc`, db `world_poker_cup`
- [x] Recovery docs written (`docs/devops/backup-recovery.md`)
- [ ] Orel runs `scripts/aws-setup.sh` (AWS admin creds required)
- [ ] IAM role attached to `i-0b95a73440e9e9111`
- [ ] Cron scheduled on EC2 (03:00 UTC)
- [ ] Manual test: backup → download → restore → verify

---

## D9 — Uptime Monitoring

**Priority:** Critical
**Branch:** `feat/monitoring`
**Deadline:** April 6 (Day 1, after D8)

We're blind to outages. If the server goes down at 2am, nobody knows until someone opens the URL.

### Requirements

1. UptimeRobot monitors (HTTPS + API health)
2. Server healthcheck in `docker-compose.production.yml`
3. Shared ticket to Soni for real DB+Redis health check in `/api/health`

### Deliverables

- [x] Server healthcheck added to `docker-compose.production.yml` (wget, 30s interval, 15s start_period)
- [x] Shared ticket filed: `jira/sprint-7/shared/D9-S-health-endpoint.md`
- [ ] Orel sets up UptimeRobot (2 monitors, email alerts)
- [ ] Soni enhances `/api/health` to check DB + Redis (tracked in shared ticket)

---

## D10 — Prettier Pre-Commit Hook

**Priority:** High
**Branch:** `feat/d10-prettier-precommit`
**Deadline:** April 7

Soni requested this in the mid-term review. Format-fix PRs are wasting hours every sprint. One hook kills the problem forever.

### Deliverables

- [x] husky ^9.1.7 + lint-staged ^16.4.0 installed
- [x] `.husky/pre-commit` runs `pnpm exec lint-staged`
- [x] `package.json` lint-staged config covers `.{ts,tsx,js,jsx}` and `.{json,md,css}`
- [x] `prepare` script auto-installs hook on `pnpm install`
- [x] One-time bulk format run — codebase was already clean (0 source files changed)
- [x] Hook verified: lint-staged fired during hook setup commit itself

---

## D11 — Deploy Health Check + Rollback Script

**Priority:** Medium
**Branch:** `feat/devsi-sprint7`
**Deadline:** April 10

Currently deploy.sh does `docker compose up -d` and hopes for the best. Add a post-deploy health check and a rollback mechanism.

### Deliverables

- [x] Image tagging before build (`:rollback` tag saved before each new deploy)
- [x] Post-deploy health check — 10s wait, checks `"status":"ok"` in response
- [x] Auto-rollback on failure — restores `:rollback` images, restarts, exits 1 (CI marks deploy failed)
- [x] `scripts/rollback.sh` — manual rollback for EC2 use
- [ ] Test: good deploy passes, bad deploy triggers rollback (needs live EC2 test after merge)

---

## Delivery Log

| Task | Status                                                                     | PR  | Deployed                |
| ---- | -------------------------------------------------------------------------- | --- | ----------------------- |
| D8   | ✅ Done (my side) — blocked on Orel (AWS setup + EC2 cron)                 | #34 | ⬜ pending merge + Orel |
| D9   | ✅ Done (my side) — blocked on Orel (UptimeRobot) + Soni (health endpoint) | #38 | ⬜ pending merge        |
| D10  | ✅ Done                                                                    | #39 | ⬜ pending merge        |
| D11  | ✅ Done                                                                    | #41 | ⬜ pending merge        |

### D8 Progress Log — April 5, 2026

- Corrected DB credentials in backup script: user `wpc`, db `world_poker_cup` (task spec had wrong values — would have failed silently)
- `scripts/backup-db.sh` — dumps via `docker-compose exec -T`, pipes to gzip, uploads to S3 via instance profile
- `scripts/aws-setup.sh` — one-time AWS setup. Orel runs from his machine with AWS admin credentials
- `docs/devops/backup-recovery.md` — restore procedure, disaster recovery scenarios A/B/C

### D9 Progress Log — April 5, 2026

- Server healthcheck added to `docker-compose.production.yml` (wget not curl — alpine doesn't have curl)
- Shared ticket `D9-S-health-endpoint.md` filed to Soni — `/api/health` needs real DB + Redis check
- UptimeRobot: external setup, Orel configures (2 monitors: HTTPS + keyword check on /api/health)

### D10 Progress Log — April 5, 2026

- husky + lint-staged installed at workspace root
- Hook fires on commit — confirmed by lint-staged output during setup commit
- Codebase was already 100% formatted — bulk format = no-op on source files

### D11 Progress Log — April 5, 2026

- Image tagging added before build in cd.yml: `:rollback` tag saved, skips gracefully on first deploy
- Health check enhanced: 10s wait (up from 5s), checks `"status":"ok"` specifically
- Auto-rollback: if health check fails → restore `:rollback` images → restart → exit 1 (CI marks red)
- `scripts/rollback.sh` written — manual rollback with pre-flight checks and post-rollback health verify
- Rollback images survive `docker system prune -f` (tagged, not dangling)
