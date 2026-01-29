# 운영 가이드

## 1. 시스템 개요

Meeting Scheduler AI는 자연어 기반 회의 일정 조율 시스템입니다.

### 구성 요소
- **Backend**: FastAPI (Python 3.11+)
- **Frontend**: React 18 + Vite
- **Cache**: Redis
- **Reverse Proxy**: Nginx

### 포트 구성
| 서비스 | 내부 포트 | 외부 포트 |
|--------|----------|----------|
| Nginx | 80, 443 | 80, 443 |
| Backend | 8000 | - |
| Redis | 6379 | - |

## 2. 배포

### 개발 환경
```bash
./scripts/deploy.sh dev
```

### 프로덕션 환경
```bash
./scripts/deploy.sh prod
```

### 환경 변수 설정
`.env.prod` 파일에 다음 변수 설정 필요:
```
LLM_API_KEY=<실제 API 키>
USE_MOCK_API=false
AUTH_BYPASS=false
```

## 3. 모니터링

### 헬스체크
```bash
curl http://localhost/api/health
```

### 로그 확인
```bash
# 전체 로그
docker-compose logs -f

# 백엔드 로그만
docker-compose logs -f backend

# 최근 100줄
docker-compose logs --tail=100 backend
```

### 서비스 상태 확인
```bash
docker-compose ps
```

## 4. 장애 대응

### 서비스 재시작
```bash
# 전체 재시작
docker-compose restart

# 특정 서비스만
docker-compose restart backend
```

### 긴급 롤백
```bash
# 이전 이미지로 롤백
docker-compose down
git checkout HEAD~1
docker-compose up -d --build
```

### Redis 데이터 복구
```bash
docker-compose stop redis
docker cp /var/backups/meeting-scheduler/redis_YYYYMMDD_HHMMSS.rdb redis:/data/dump.rdb
docker-compose start redis
```

## 5. 백업

### 수동 백업
```bash
./scripts/backup.sh
```

### 자동 백업 (cron)
```bash
# crontab -e
0 2 * * * /path/to/meeting-scheduler/scripts/backup.sh >> /var/log/backup.log 2>&1
```

## 6. 성능 튜닝

### Uvicorn 워커 수 조정
`backend/Dockerfile`:
```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### Redis 메모리 설정
`docker-compose.yml`:
```yaml
redis:
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

## 7. 보안

### SSL 인증서 갱신
```bash
# Let's Encrypt 사용 시
certbot renew
docker-compose restart nginx
```

### API 키 로테이션
1. 새 API 키 발급
2. `.env.prod` 업데이트
3. `docker-compose restart backend`

## 8. 트러블슈팅

### 문제: 응답이 느림
- Redis 연결 확인: `docker-compose exec redis redis-cli ping`
- LLM API 상태 확인
- 로그에서 timeout 에러 확인

### 문제: 직원 검색 안됨
- Mock 모드 확인: `USE_MOCK_API` 설정
- 사내 API 연결 상태 확인

### 문제: 회의실 예약 실패
- 회의실 API 연결 확인
- 이미 예약된 시간인지 확인
- 로그에서 에러 메시지 확인

## 9. 연락처

- 개발팀: dev-team@company.com
- 인프라팀: infra@company.com
- 긴급 연락처: xxx-xxxx-xxxx
