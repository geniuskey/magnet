# Meeting Scheduler AI (회의봇)

자연어 기반 회의 일정 조율 & 예약 자동화 시스템

## Demo

[![Demo Video](https://img.youtube.com/vi/9EwUjulNWqc/maxresdefault.jpg)](https://youtu.be/9EwUjulNWqc)

> 클릭하여 데모 영상 보기

## 개요

회의봇은 LLM을 활용하여 자연어로 회의 일정을 조율하고 예약할 수 있는 시스템입니다.

**주요 기능:**
- 자연어로 회의 요청 ("세미나실 A 오전 10시 예약해줘")
- AI 어시스턴트의 스마트 추천 및 빠른 적용 버튼
- 참석자 일정 조회 및 최적 시간 자동 탐색
- 회의실 검색/필터 (이름, 수용인원, 장비)
- 멀티 플로어 뷰 (여러 층 동시 보기)
- 드래그로 시간 선택 및 예약 이동
- 다크모드 지원

## 기술 스택

### Backend
- Python 3.11+
- FastAPI
- Anthropic Claude API
- Redis

### Frontend
- React 18
- Vite
- Tailwind CSS

### Infrastructure
- Docker / Docker Compose
- Nginx

## 빠른 시작

### 1. 환경 설정

```bash
# 환경 변수 파일 생성
cp backend/.env.example backend/.env

# .env 파일에 LLM API 키 설정
# LLM_API_KEY=your-api-key-here
```

### 2. 개발 환경 실행

```bash
# Docker Compose로 실행
docker-compose -f docker-compose.dev.yml up -d

# 또는 로컬에서 직접 실행
cd backend
pip install -r requirements.txt
python main.py

# 프론트엔드 (별도 터미널)
cd frontend
npm install
npm run dev
```

### 3. 접속

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API 문서: http://localhost:8000/docs

## 프로젝트 구조

```
meeting-scheduler/
├── backend/               # FastAPI 백엔드
│   ├── agent/            # LLM Agent 및 도구
│   ├── api/              # API 라우터
│   ├── models/           # Pydantic 모델
│   ├── services/         # 비즈니스 로직
│   └── tests/            # 테스트
├── frontend/             # React 프론트엔드
│   ├── src/
│   │   ├── components/   # UI 컴포넌트
│   │   ├── context/      # React Context
│   │   ├── hooks/        # Custom Hooks
│   │   └── services/     # API 서비스
├── nginx/                # Nginx 설정
├── scripts/              # 배포/운영 스크립트
└── docs/                 # 문서
```

## 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `LLM_API_KEY` | Anthropic API 키 | - |
| `LLM_MODEL` | 사용할 모델 | claude-sonnet-4-20250514 |
| `USE_MOCK_API` | Mock 데이터 사용 여부 | true |
| `REDIS_URL` | Redis 연결 URL | redis://localhost:6379 |
| `AUTH_BYPASS` | 인증 우회 (개발용) | true |

## API 엔드포인트

### 채팅
- `POST /api/chat` - 메시지 전송
- `GET /api/chat/conversation/{id}` - 대화 내역 조회
- `DELETE /api/chat/conversation/{id}` - 대화 삭제

### 헬스체크
- `GET /api/health` - 서비스 상태 확인

## 테스트

```bash
cd backend
pytest
```

## 배포

```bash
# 프로덕션 배포
./scripts/deploy.sh prod
```

자세한 내용은 [운영 가이드](docs/OPERATIONS.md)를 참조하세요.

## 문서

- [PRD (제품 요구사항)](PRD.md)
- [TRD (기술 설계)](TRD.md)
- [TASKS (개발 태스크)](TASKS.md)
- [운영 가이드](docs/OPERATIONS.md)
- [사용자 가이드](docs/USER_GUIDE.md)

## 라이선스

Private - 사내 전용
