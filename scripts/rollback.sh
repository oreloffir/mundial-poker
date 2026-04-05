#!/bin/bash
# Mundial Poker — Manual rollback to previous deploy
# Usage: /opt/mundial-poker/scripts/rollback.sh
#
# Restores the :rollback-tagged images from the previous deploy
# and restarts services without rebuilding.

set -euo pipefail

COMPOSE="docker-compose -f /opt/mundial-poker/docker-compose.production.yml"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting rollback..."

# Verify rollback images exist
if ! docker image inspect mundial-poker-server:rollback &>/dev/null; then
  echo "ERROR: No rollback image found for server. Cannot rollback."
  echo "This means either the first deploy never completed, or rollback images were pruned."
  exit 1
fi

if ! docker image inspect mundial-poker-web:rollback &>/dev/null; then
  echo "ERROR: No rollback image found for web. Cannot rollback."
  exit 1
fi

echo "Restoring rollback images..."
docker tag mundial-poker-server:rollback mundial-poker-server:latest
docker tag mundial-poker-web:rollback mundial-poker-web:latest

echo "Restarting services with rollback images..."
$COMPOSE up -d --no-build

echo "Waiting for services..."
sleep 10

HEALTH=$(curl -sf http://localhost/api/health | grep -o '"status":"ok"' || echo "failed")
if [ "$HEALTH" != '"status":"ok"' ]; then
  echo "ERROR: Rollback health check also failed. Manual intervention required."
  echo "Check logs: $COMPOSE logs server --tail=50"
  exit 1
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Rollback successful — previous version is live."
