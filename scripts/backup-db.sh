#!/bin/bash
# Mundial Poker — PostgreSQL backup to S3
# Runs daily at 03:00 UTC via cron
# Requires: EC2 IAM role with s3:PutObject on s3://mundial-poker-backups/*
# Log: /var/log/mundial-poker-backup.log

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/mundial-poker-${TIMESTAMP}.sql.gz"
S3_BUCKET="mundial-poker-backups"
S3_KEY="daily/${TIMESTAMP}.sql.gz"
COMPOSE="docker-compose -f /opt/mundial-poker/docker-compose.production.yml"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting backup..."

# Dump and compress in one pass — avoids large uncompressed temp files on t2.micro
$COMPOSE exec -T postgres pg_dump -U wpc world_poker_cup | gzip >"$BACKUP_FILE"

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Dump complete — size: $BACKUP_SIZE"

# Upload to S3 (uses EC2 instance profile — no access keys)
aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/${S3_KEY}" --region eu-west-1

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Uploaded to s3://${S3_BUCKET}/${S3_KEY}"

# Clean up temp file
rm "$BACKUP_FILE"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backup completed successfully: ${S3_KEY}"
