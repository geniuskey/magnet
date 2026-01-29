#!/bin/bash
# 데이터 백업 스크립트

set -e

BACKUP_DIR="/var/backups/meeting-scheduler"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=== Meeting Scheduler 백업 ==="
echo "백업 경로: $BACKUP_DIR"
echo "타임스탬프: $TIMESTAMP"

# 백업 디렉토리 생성
mkdir -p "$BACKUP_DIR"

# Redis 데이터 백업
echo "Redis 데이터 백업 중..."
docker-compose exec -T redis redis-cli BGSAVE
sleep 5
docker cp meeting-scheduler-redis-1:/data/dump.rdb "$BACKUP_DIR/redis_$TIMESTAMP.rdb" 2>/dev/null || \
docker cp meeting-scheduler_redis_1:/data/dump.rdb "$BACKUP_DIR/redis_$TIMESTAMP.rdb"

# PostgreSQL 백업 (사용하는 경우)
# echo "PostgreSQL 백업 중..."
# docker-compose exec -T postgres pg_dump -U postgres meeting_scheduler > "$BACKUP_DIR/postgres_$TIMESTAMP.sql"

# 오래된 백업 삭제 (30일 이상)
echo "오래된 백업 정리 중..."
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "=== 백업 완료 ==="
ls -la "$BACKUP_DIR"
