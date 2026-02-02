# 개발자 가이드

로컬 개발 환경 설정 및 코드 구조를 설명합니다.

## 개발 환경 설정

### 필수 요구사항

- Node.js 18+
- Python 3.11+
- Redis (선택)
- Git

### 1. 저장소 클론

```bash
git clone https://github.com/geniuskey/magnet.git
cd magnet
```

### 2. 백엔드 설정

```bash
cd backend

# 가상환경 생성
python -m venv venv

# 활성화 (Windows)
venv\Scripts\activate

# 활성화 (Mac/Linux)
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env
# .env 파일에서 LLM_API_KEY 설정

# 서버 실행
uvicorn main:app --reload --port 8000
```

### 3. 프론트엔드 설정

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 4. 접속 확인

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API 문서: http://localhost:8000/docs

## 프로젝트 구조

### 백엔드 (`backend/`)

```
backend/
├── main.py                 # FastAPI 앱 엔트리포인트
├── config.py               # 환경변수 및 설정
├── api/
│   ├── routes/
│   │   ├── chat.py         # 채팅 API 라우터
│   │   └── health.py       # 헬스체크 API
│   └── middleware/
│       └── auth.py         # 인증 미들웨어
├── agent/
│   ├── agent.py            # LLM Agent 메인 로직
│   ├── llm_client.py       # LLM 클라이언트 (Claude/GPT/Gemini)
│   ├── conversation.py     # 대화 컨텍스트 관리
│   ├── prompts/
│   │   └── prompt_manager.py # 프롬프트 관리
│   └── tools/
│       ├── base.py         # Tool 베이스 클래스
│       ├── registry.py     # Tool 레지스트리
│       ├── employee.py     # 직원 검색 도구
│       ├── calendar.py     # 캘린더 도구
│       ├── meeting.py      # 회의 도구
│       └── room.py         # 회의실 도구
├── models/
│   ├── employee.py         # 직원 데이터 모델
│   ├── room.py             # 회의실 데이터 모델
│   ├── meeting.py          # 회의 데이터 모델
│   ├── calendar.py         # 캘린더 데이터 모델
│   └── chat.py             # 채팅 데이터 모델
├── services/
│   ├── adapters/           # 외부 API 어댑터
│   │   ├── organization_adapter.py
│   │   ├── calendar_adapter.py
│   │   └── room_adapter.py
│   ├── mock_data.py        # Mock 데이터
│   ├── slot_finder.py      # 빈 시간대 탐색
│   └── calendar.py         # 캘린더 서비스
├── utils/
│   ├── logger.py           # 로깅 유틸
│   └── datetime_utils.py   # 날짜/시간 유틸
└── tests/
    ├── conftest.py         # pytest 설정
    └── test_*.py           # 테스트 파일들
```

### 프론트엔드 (`frontend/`)

```
frontend/
├── src/
│   ├── main.jsx            # React 앱 엔트리포인트
│   ├── App.jsx             # 메인 앱 컴포넌트
│   ├── components/
│   │   ├── RoomReservation.jsx  # 회의실 타임라인 뷰
│   │   ├── FloatingChat.jsx     # 플로팅 AI 채팅
│   │   ├── Sidebar.jsx          # 사이드바 (참석자, 설정)
│   │   ├── Header.jsx           # 상단 헤더
│   │   ├── ReservationModal.jsx # 예약 모달
│   │   ├── MyReservations.jsx   # 내 예약 목록
│   │   └── Toast.jsx            # 토스트 알림
│   ├── context/
│   │   ├── ReservationContext.jsx  # 예약 상태 관리
│   │   ├── ChatContext.jsx         # 채팅 상태 관리
│   │   └── ThemeContext.jsx        # 테마 (다크모드)
│   ├── services/
│   │   ├── api.js              # 백엔드 API 호출
│   │   └── functionCalling.js  # 프론트엔드 Function Calling
│   └── hooks/
│       └── useChat.js          # 채팅 커스텀 훅
├── public/
└── index.html
```

## 주요 컴포넌트 설명

### ReservationContext

전역 예약 상태를 관리하는 React Context입니다.

```jsx
// 주요 상태
const {
  buildings,         // 건물 목록
  floors,            // 층 목록
  rooms,             // 회의실 목록
  reservations,      // 예약 목록
  selectedDate,      // 선택된 날짜
  selectedRoom,      // 선택된 회의실
  selectedTimeSlots, // 선택된 시간대
  participants,      // 선택된 참석자
} = useReservation();

// 주요 액션
const {
  setSelectedDate,      // 날짜 설정
  toggleFloor,          // 층 토글
  setTimeByRange,       // 시간 범위 설정
  createReservation,    // 예약 생성
  findOptimalTimes,     // 최적 시간 찾기
} = useReservation();
```

### Function Calling (프론트엔드)

자연어를 파싱하여 예약 함수를 호출합니다.

```javascript
// services/functionCalling.js
export function parseUserIntent(message, context) {
  // 사용자 메시지에서 의도 추출
  // - 회의실 이름 (세미나실 A, 대회의실 등)
  // - 시간 (오전 10시, 2시부터 3시까지)
  // - 참석자 (김철수, 마케팅팀)
  // - 날짜 (내일, 다음 주 월요일)

  return {
    intent: 'create_reservation',
    functions: [
      { name: 'setRoomByName', args: ['세미나실 A'] },
      { name: 'setTimeByRange', args: ['10:00', '11:00'] },
    ]
  };
}
```

## 테스트 실행

### 백엔드 테스트

```bash
cd backend
pytest -v

# 특정 테스트만
pytest tests/test_slot_finder.py -v

# 커버리지
pytest --cov=. --cov-report=html
```

### 프론트엔드 테스트

```bash
cd frontend
npm test
```

## 코드 스타일

### 백엔드 (Python)

- Black 포맷터 사용
- isort로 import 정렬
- Type hints 사용

```bash
black .
isort .
```

### 프론트엔드 (JavaScript)

- ESLint + Prettier
- 함수형 컴포넌트 선호

```bash
npm run lint
npm run format
```

## 새 기능 추가 가이드

### 새 Tool 추가 (백엔드)

1. `backend/agent/tools/`에 새 Tool 클래스 생성

```python
from .base import BaseTool

class MyNewTool(BaseTool):
    name = "my_new_tool"
    description = "도구 설명"

    async def execute(self, **kwargs):
        # 구현
        return result
```

2. `backend/agent/tools/registry.py`에 등록

### 새 Adapter 추가 (백엔드)

1. `backend/services/adapters/`에 Adapter 구현
2. 인터페이스(ABC) 상속
3. `config.py`에 설정 추가

### 새 컴포넌트 추가 (프론트엔드)

1. `frontend/src/components/`에 컴포넌트 생성
2. 필요시 Context에 상태 추가
3. 스타일은 Tailwind CSS 사용

## 디버깅

### 백엔드 로그

```bash
# 로그 레벨 설정
export LOG_LEVEL=DEBUG
uvicorn main:app --reload
```

### 프론트엔드 DevTools

- React DevTools로 컴포넌트 상태 확인
- Network 탭에서 API 요청 확인
- Console에서 Function Calling 결과 확인

## 기여 방법

1. 이슈 생성 또는 기존 이슈 확인
2. Feature 브랜치 생성: `git checkout -b feature/my-feature`
3. 변경사항 커밋: `git commit -m "feat: add my feature"`
4. PR 생성

### 커밋 메시지 컨벤션

```
feat: 새로운 기능
fix: 버그 수정
docs: 문서 수정
refactor: 코드 리팩토링
style: 코드 스타일 변경
chore: 빌드, 설정 변경
test: 테스트 추가/수정
```

## 문제 해결

### 자주 발생하는 문제

**Q: 백엔드 서버가 시작되지 않음**
- Python 버전 확인 (3.11+)
- 가상환경 활성화 확인
- `pip install -r requirements.txt` 재실행

**Q: 프론트엔드 빌드 실패**
- Node.js 버전 확인 (18+)
- `node_modules` 삭제 후 `npm install` 재실행

**Q: API 호출 실패**
- 백엔드 서버 실행 중인지 확인
- CORS 설정 확인
- `.env` 파일 설정 확인

## 다음 단계

- [아키텍처 개요](architecture.md)
- [API 연동 가이드](../api/index.md)
- [운영 가이드](../OPERATIONS.md)
