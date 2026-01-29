#!/bin/bash
# 배포 스크립트
# Usage: ./scripts/deploy.sh [dev|staging|prod]

set -e

ENVIRONMENT=${1:-dev}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Meeting Scheduler AI 배포 ==="
echo "환경: $ENVIRONMENT"
echo "프로젝트 경로: $PROJECT_DIR"

# 환경 파일 확인
ENV_FILE="$PROJECT_DIR/.env.$ENVIRONMENT"
if [ ! -f "$ENV_FILE" ]; then
    echo "경고: $ENV_FILE 파일이 없습니다. .env.example을 복사합니다."
    cp "$PROJECT_DIR/backend/.env.example" "$ENV_FILE"
fi

# 환경 변수 로드
export $(cat "$ENV_FILE" | grep -v '^#' | xargs)

cd "$PROJECT_DIR"

case $ENVIRONMENT in
    dev)
        echo "개발 환경 배포..."
        docker-compose -f docker-compose.dev.yml up -d --build
        ;;
    staging)
        echo "스테이징 환경 배포..."
        docker-compose -f docker-compose.yml up -d --build
        ;;
    prod)
        echo "프로덕션 환경 배포..."

        # 프론트엔드 빌드
        echo "프론트엔드 빌드 중..."
        cd frontend
        npm ci
        npm run build
        cd ..

        # Docker 이미지 빌드 및 배포
        docker-compose -f docker-compose.yml up -d --build

        # 헬스체크
        echo "헬스체크 중..."
        sleep 10
        curl -f http://localhost/api/health || exit 1
        ;;
    *)
        echo "알 수 없는 환경: $ENVIRONMENT"
        echo "사용법: ./scripts/deploy.sh [dev|staging|prod]"
        exit 1
        ;;
esac

echo "=== 배포 완료 ==="
docker-compose ps
