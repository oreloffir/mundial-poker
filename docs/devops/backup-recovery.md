# Database Backup & Recovery

**Added:** Sprint 7 (April 5, 2026)
**Owner:** Devsi

---

## Overview

Daily PostgreSQL backups run at 03:00 UTC. Backups go to S3 via the EC2 instance profile — no access keys on the box.

| Field | Value |
|-------|-------|
| S3 bucket | `s3://mundial-poker-backups` |
| Prefix | `daily/` |
| Format | `YYYYMMDD_HHMMSS.sql.gz` |
| Retention | 30 days (lifecycle rule) |
| Versioning | Enabled |
| Region | eu-west-1 |

---

## Setup (one-time, already done)

Run `scripts/aws-setup.sh` from a machine with AWS admin credentials. This creates:
- S3 bucket with versioning + 30-day lifecycle
- IAM role `mundial-poker-ec2-backup` with write-only access to the bucket
- Instance profile attached to `i-0b95a73440e9e9111`

**No AWS access keys exist on the EC2 instance.** The backup script uses the instance credential chain automatically.

---

## Where Backups Live

```
s3://mundial-poker-backups/
└── daily/
    ├── 20260405_030000.sql.gz
    ├── 20260406_030000.sql.gz
    └── ...
```

List backups:
```bash
aws s3 ls s3://mundial-poker-backups/daily/ --region eu-west-1
```

---

## Manual Backup (anytime)

SSH into EC2, then:
```bash
/opt/mundial-poker/scripts/backup-db.sh
```

Check the log:
```bash
tail -20 /var/log/mundial-poker-backup.log
```

---

## Restore Procedure

### 1. Download the backup

```bash
# List available backups
aws s3 ls s3://mundial-poker-backups/daily/ --region eu-west-1

# Download the one you want (replace timestamp)
aws s3 cp s3://mundial-poker-backups/daily/20260405_030000.sql.gz /tmp/restore.sql.gz --region eu-west-1
```

### 2. Decompress

```bash
gunzip /tmp/restore.sql.gz
# Produces /tmp/restore.sql
```

### 3. Restore to PostgreSQL

**WARNING: This drops and recreates all tables. All current data is replaced.**

```bash
cd /opt/mundial-poker

# Drop existing data and restore
docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U wpc -d world_poker_cup < /tmp/restore.sql
```

### 4. Verify

```bash
docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U wpc -d world_poker_cup -c "SELECT COUNT(*) FROM games;"
```

### 5. Restart server

```bash
/opt/mundial-poker/compose restart server
```

---

## Cron Schedule

Verify the cron job is active:
```bash
crontab -l | grep backup
# Should show: 0 3 * * * /opt/mundial-poker/scripts/backup-db.sh >> /var/log/mundial-poker-backup.log 2>&1
```

Log file: `/var/log/mundial-poker-backup.log`

---

## Disaster Recovery Scenarios

### Scenario A: EC2 data corruption / EBS failure

1. Terminate instance if needed
2. Launch new t2.micro in eu-west-1 (use `docs/devops/ec2-setup.md`)
3. Attach Elastic IP `52.49.249.190` to new instance
4. Deploy application (push any commit to trigger CI/CD, or manual deploy)
5. Attach IAM instance profile `mundial-poker-ec2-profile` to new instance
6. Run restore procedure above using latest backup from S3
7. Verify health: `curl https://mundialpoker.duckdns.org/api/health`

### Scenario B: Accidental data deletion

1. Identify which backup to restore from (`aws s3 ls`)
2. Follow restore procedure above
3. Data from after the backup timestamp is lost — acceptable for demo phase

### Scenario C: Backup script failing silently

Check the log:
```bash
tail -50 /var/log/mundial-poker-backup.log
```

Common causes:
- IAM role detached from instance (check EC2 console → IAM role)
- Docker container not running (`/opt/mundial-poker/compose ps`)
- Disk full on `/tmp` (`df -h /tmp`)

---

## What's NOT Backed Up

- **Redis** — AOF persistence enabled. Survives container restarts. If EC2 dies, active game state is lost (no Redis backup). Acceptable for demo phase. Upgrade to ElastiCache before real-money launch.
- **`.env.production`** — Lives on EC2 only. Secrets are in GitHub Secrets — use those to recreate the file if the instance is lost.
- **nginx.conf** — In the repo. Recreate via deploy.
- **SSL certificates** — In `/etc/letsencrypt` on EC2. After a new instance, re-run certbot. Let's Encrypt will reissue immediately.
