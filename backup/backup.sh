#!/bin/bash
set -e
# Günlük pg_dump — timestamp'li, son 30 günü tut, haftalık rclone sync (opsiyonel)
: "${PGHOST:=db}"
: "${POSTGRES_USER:=koc_matrix}"
: "${POSTGRES_DB:=koc_matrix_ultra}"
: "${BACKUP_RETENTION_DAYS:=30}"

TS=$(date +"%Y%m%d_%H%M%S")
OUT="/backups/dump_${TS}.sql.gz"
mkdir -p /backups
echo "[backup] dumping to $OUT ..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h "$PGHOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$OUT"
echo "[backup] done: $(du -h "$OUT" | cut -f1)"

# retention
echo "[backup] cleaning older than ${BACKUP_RETENTION_DAYS}d ..."
find /backups -name "dump_*.sql.gz" -mtime +${BACKUP_RETENTION_DAYS} -delete || true
ls -lh /backups | tail -20

# weekly rclone (if enabled) — check if it's Sunday 03:xx
if [ "${RCLONE_ENABLED}" = "true" ] && [ "$(date +%u)" = "7" ]; then
  echo "[backup] weekly rclone sync ..."
  if rclone --config /rclone.conf copy /backups remote:koc-matrix-backups --include "dump_*.sql.gz" 2>&1; then
    echo "[backup] rclone ok"
  else
    echo "[backup] rclone failed or not configured (mount /rclone.conf)"
  fi
fi

# Test restore hint
echo "[backup] to restore: gunzip -c $OUT | psql -h \$PGHOST -U \$POSTGRES_USER -d \$POSTGRES_DB"
