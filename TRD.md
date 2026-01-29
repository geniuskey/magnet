# TRD: 회의 일정 조율 & 예약 자동화 시스템

## 1. 개요

### 1.1 문서 목적
Meeting Scheduler AI 시스템의 기술 아키텍처, 설계 결정, 구현 세부사항을 정의

### 1.2 시스템 개요
```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│                    (Web Chat Interface)                      │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   FastAPI   │  │   LLM       │  │   Tool Executor     │ │
│  │   Server    │──│   Agent     │──│   (Function Call)   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  조직 API    │  │  캘린더 API  │  │ 회의실 API   │
│  (사내)      │  │  (사내)      │  │  (사내)      │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 2. 기술 스택

### 2.1 백엔드
| 구성요소 | 기술 | 선정 이유 |
|---------|------|----------|
| 웹 프레임워크 | FastAPI | 비동기 지원, OpenAPI 자동 생성, 타입 힌트 |
| 런타임 | Python 3.11+ | LLM 라이브러리 호환성, 팀 기술 스택 |
| ASGI 서버 | Uvicorn | FastAPI 권장, 고성능 |
| 작업 큐 | Celery + Redis | 비동기 작업 처리 (선택적) |

### 2.2 프론트엔드
| 구성요소 | 기술 | 선정 이유 |
|---------|------|----------|
| 프레임워크 | React 18 | 컴포넌트 기반, 생태계 |
| 빌드 도구 | Vite | 빠른 개발 서버, 간단한 설정 |
| 스타일링 | Tailwind CSS | 빠른 UI 개발 |
| 상태 관리 | React Context | 심플한 상태 관리 (MVP) |

### 2.3 LLM 통합
| 구성요소 | 기술 | 비고 |
|---------|------|------|
| LLM 클라이언트 | OpenAI SDK 호환 | Claude API 또는 사내 LLM |
| Function Calling | Tool/Function 스키마 | JSON Schema 기반 |
| 프롬프트 관리 | Jinja2 템플릿 | 버전 관리 용이 |

### 2.4 인프라
| 구성요소 | 기술 | 선정 이유 |
|---------|------|----------|
| 컨테이너 | Docker + Docker Compose | 일관된 배포 환경 |
| 웹 서버 | Nginx | 리버스 프록시, SSL 종단 |
| 데이터베이스 | PostgreSQL | 대화 이력 저장 (선택적) |
| 캐시 | Redis | 세션, 캐싱 |

---

## 3. 시스템 아키텍처

### 3.1 컴포넌트 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                         Docker Host                              │
│                                                                  │
│  ┌──────────┐    ┌─────────────────────────────────────────┐   │
│  │  Nginx   │────│              FastAPI App                 │   │
│  │  :443    │    │  ┌─────────────────────────────────┐    │   │
│  └──────────┘    │  │         API Routes              │    │   │
│                  │  │  /chat, /health, /auth          │    │   │
│                  │  └───────────────┬─────────────────┘    │   │
│                  │                  │                       │   │
│                  │  ┌───────────────▼─────────────────┐    │   │
│                  │  │        LLM Agent Service        │    │   │
│                  │  │  ┌───────────────────────────┐  │    │   │
│                  │  │  │    Prompt Manager         │  │    │   │
│                  │  │  │    Tool Registry          │  │    │   │
│                  │  │  │    Conversation Manager   │  │    │   │
│                  │  │  └───────────────────────────┘  │    │   │
│                  │  └───────────────┬─────────────────┘    │   │
│                  │                  │                       │   │
│                  │  ┌───────────────▼─────────────────┐    │   │
│                  │  │       External API Clients      │    │   │
│                  │  │  ┌─────┐ ┌─────┐ ┌──────────┐  │    │   │
│                  │  │  │ Org │ │ Cal │ │ Room     │  │    │   │
│                  │  │  │ API │ │ API │ │ API      │  │    │   │
│                  │  │  └─────┘ └─────┘ └──────────┘  │    │   │
│                  │  └─────────────────────────────────┘    │   │
│                  └─────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────┐    ┌──────────┐                                  │
│  │  Redis   │    │ Postgres │  (Optional)                      │
│  │  :6379   │    │  :5432   │                                  │
│  └──────────┘    └──────────┘                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 디렉토리 구조

```
meeting-scheduler/
├── docker-compose.yml
├── Dockerfile
├── README.md
├── docs/
│   ├── PRD.md
│   ├── TRD.md
│   └── TASKS.md
│
├── backend/
│   ├── main.py                 # FastAPI 앱 엔트리포인트
│   ├── requirements.txt
│   ├── config.py               # 환경설정
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── chat.py         # 채팅 엔드포인트
│   │   │   ├── health.py       # 헬스체크
│   │   │   └── auth.py         # 인증
│   │   └── middleware/
│   │       ├── __init__.py
│   │       └── auth.py         # 인증 미들웨어
│   │
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── llm_client.py       # LLM API 클라이언트
│   │   ├── agent.py            # 에이전트 오케스트레이터
│   │   ├── prompts/
│   │   │   ├── system.jinja2   # 시스템 프롬프트
│   │   │   └── tools.jinja2    # 도구 설명
│   │   └── tools/
│   │       ├── __init__.py
│   │       ├── base.py         # 도구 베이스 클래스
│   │       ├── employee.py     # 직원 검색 도구
│   │       ├── calendar.py     # 캘린더 도구
│   │       ├── room.py         # 회의실 도구
│   │       └── meeting.py      # 회의 생성 도구
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── organization.py     # 조직 API 클라이언트
│   │   ├── calendar.py         # 캘린더 API 클라이언트
│   │   ├── room.py             # 회의실 API 클라이언트
│   │   └── slot_finder.py      # 빈 시간대 계산 로직
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── employee.py         # 직원 모델
│   │   ├── calendar.py         # 일정 모델
│   │   ├── room.py             # 회의실 모델
│   │   └── meeting.py          # 회의 모델
│   │
│   └── utils/
│       ├── __init__.py
│       ├── datetime_utils.py   # 날짜/시간 유틸
│       └── logger.py           # 로깅 설정
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── InputBar.jsx
│   │   │   └── OptionCard.jsx
│   │   ├── hooks/
│   │   │   └── useChat.js
│   │   ├── services/
│   │   │   └── api.js
│   │   └── styles/
│   │       └── index.css
│   └── public/
│
└── nginx/
    └── nginx.conf
```

---

## 4. API 설계

### 4.1 Backend REST API

#### POST /api/chat
채팅 메시지 전송 및 응답

**Request:**
```json
{
  "message": "내일 오후에 김철수랑 회의 잡아줘",
  "conversation_id": "conv_abc123"  // optional, 새 대화면 생략
}
```

**Response:**
```json
{
  "conversation_id": "conv_abc123",
  "response": {
    "type": "text",
    "content": "김철수님의 내일 오후 일정을 확인하고 있어요..."
  },
  "options": null,  // 선택지가 있을 때만 포함
  "status": "processing"  // processing | awaiting_selection | completed | error
}
```

**Response (선택지 제공 시):**
```json
{
  "conversation_id": "conv_abc123",
  "response": {
    "type": "options",
    "content": "3개 시간대가 가능해요:",
    "options": [
      {
        "id": 1,
        "time": "2024-01-15T14:00:00",
        "duration": 60,
        "room": {"id": "room_1", "name": "회의실 A", "floor": 4}
      },
      {
        "id": 2,
        "time": "2024-01-15T15:30:00",
        "duration": 60,
        "room": {"id": "room_2", "name": "회의실 B", "floor": 3}
      }
    ]
  },
  "status": "awaiting_selection"
}
```

#### GET /api/health
헬스체크

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "llm": "connected",
    "org_api": "connected",
    "calendar_api": "connected",
    "room_api": "connected"
  }
}
```

### 4.2 WebSocket (선택적 - 스트리밍용)

#### WS /api/chat/stream
실시간 응답 스트리밍

```javascript
// Client -> Server
{"type": "message", "content": "회의 잡아줘", "conversation_id": "..."}

// Server -> Client (스트리밍)
{"type": "chunk", "content": "김철수님의"}
{"type": "chunk", "content": " 일정을 확인하고 있어요..."}
{"type": "done", "full_response": "..."}
```

---

## 5. LLM Agent 설계

### 5.1 Tool 정의

```python
TOOLS = [
    {
        "name": "search_employee",
        "description": "직원을 이름, 부서, 직급으로 검색합니다. 동명이인이 있을 수 있으므로 결과에 부서 정보를 포함합니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "검색어 (이름, 부서명, 직급 등)"
                },
                "department": {
                    "type": "string",
                    "description": "부서 필터 (선택)"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "get_employee_calendar",
        "description": "특정 직원(들)의 일정을 조회합니다. 일정 상세 내용은 비공개이며, 바쁨/가능 여부만 반환됩니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "employee_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "조회할 직원 ID 목록"
                },
                "start_date": {
                    "type": "string",
                    "format": "date",
                    "description": "조회 시작일 (YYYY-MM-DD)"
                },
                "end_date": {
                    "type": "string",
                    "format": "date",
                    "description": "조회 종료일 (YYYY-MM-DD)"
                }
            },
            "required": ["employee_ids", "start_date", "end_date"]
        }
    },
    {
        "name": "find_common_free_slots",
        "description": "여러 참석자의 공통 빈 시간대를 찾습니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "employee_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "참석자 ID 목록"
                },
                "start_date": {
                    "type": "string",
                    "format": "date"
                },
                "end_date": {
                    "type": "string",
                    "format": "date"
                },
                "duration_minutes": {
                    "type": "integer",
                    "description": "필요한 회의 시간 (분)"
                },
                "preferred_time": {
                    "type": "string",
                    "enum": ["morning", "afternoon", "any"],
                    "description": "선호 시간대"
                }
            },
            "required": ["employee_ids", "start_date", "end_date", "duration_minutes"]
        }
    },
    {
        "name": "search_available_rooms",
        "description": "특정 시간대에 예약 가능한 회의실을 검색합니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "start_time": {
                    "type": "string",
                    "format": "date-time"
                },
                "end_time": {
                    "type": "string",
                    "format": "date-time"
                },
                "min_capacity": {
                    "type": "integer",
                    "description": "최소 수용 인원"
                },
                "facilities": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "필요 시설 (예: 화상회의, 화이트보드)"
                }
            },
            "required": ["start_time", "end_time"]
        }
    },
    {
        "name": "create_meeting",
        "description": "회의를 생성하고 회의실을 예약합니다. 반드시 사용자 확인 후에만 호출하세요.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "회의 제목"
                },
                "attendee_ids": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "room_id": {
                    "type": "string"
                },
                "start_time": {
                    "type": "string",
                    "format": "date-time"
                },
                "end_time": {
                    "type": "string",
                    "format": "date-time"
                },
                "description": {
                    "type": "string",
                    "description": "회의 설명 (선택)"
                }
            },
            "required": ["title", "attendee_ids", "room_id", "start_time", "end_time"]
        }
    }
]
```

### 5.2 시스템 프롬프트

```
당신은 사내 회의 일정 조율을 도와주는 AI 어시스턴트입니다.

## 역할
- 사용자의 자연어 요청을 이해하여 회의 일정을 조율합니다
- 참석자 일정을 확인하고 공통 빈 시간대를 찾습니다
- 적절한 회의실을 추천하고 예약을 도와줍니다

## 행동 규칙
1. 항상 친절하고 간결하게 응답합니다
2. 모호한 요청은 명확히 확인합니다 (예: 동명이인, 날짜 범위)
3. 회의 예약 전 반드시 사용자 확인을 받습니다
4. 타인의 일정 상세 내용은 공개하지 않습니다

## 날짜/시간 처리
- 오늘 날짜: {current_date}
- "내일" = {tomorrow_date}
- "다음 주" = {next_week_start} ~ {next_week_end}
- "오전" = 09:00-12:00, "오후" = 13:00-18:00

## 응답 형식
- 진행 상황을 사용자에게 알려주세요
- 옵션 제시 시 번호를 붙여 선택하기 쉽게 합니다
- 예약 완료 시 요약 정보를 제공합니다
```

### 5.3 Agent 실행 흐름

```python
class MeetingAgent:
    async def process(self, user_message: str, conversation: Conversation) -> Response:
        # 1. 대화 이력 + 새 메시지로 프롬프트 구성
        messages = self._build_messages(conversation, user_message)
        
        # 2. LLM 호출 (with tools)
        response = await self.llm_client.chat(
            messages=messages,
            tools=TOOLS,
            tool_choice="auto"
        )
        
        # 3. Tool call이 있으면 실행
        while response.tool_calls:
            tool_results = await self._execute_tools(response.tool_calls)
            messages.append(response)
            messages.append({"role": "tool", "content": tool_results})
            response = await self.llm_client.chat(messages=messages, tools=TOOLS)
        
        # 4. 최종 응답 반환
        return self._format_response(response)
```

---

## 6. 사내 API 연동

### 6.1 API 클라이언트 추상화

```python
# services/base.py
class BaseAPIClient:
    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url
        self.session = httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=30.0
        )
    
    async def _request(self, method: str, path: str, **kwargs) -> dict:
        response = await self.session.request(method, path, **kwargs)
        response.raise_for_status()
        return response.json()
```

### 6.2 API 어댑터 패턴
실제 사내 API 스펙에 맞게 어댑터 구현

```python
# services/organization.py
class OrganizationAPIClient(BaseAPIClient):
    async def search_employee(self, query: str, department: str = None) -> list[Employee]:
        """
        실제 API 호출 후 내부 모델로 변환
        TODO: 실제 API 스펙에 맞게 구현
        """
        params = {"q": query}
        if department:
            params["dept"] = department
        
        data = await self._request("GET", "/employees/search", params=params)
        return [Employee.from_api(item) for item in data["results"]]
```

---

## 7. 보안 설계

### 7.1 인증 흐름

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Nginx   │────▶│ FastAPI  │
│          │     │  (SSL)   │     │          │
└──────────┘     └──────────┘     └──────────┘
     │                                  │
     │  1. SSO 로그인                   │
     ▼                                  │
┌──────────┐                           │
│  SSO     │◀──────────────────────────┘
│  Server  │     2. 토큰 검증
└──────────┘
```

### 7.2 권한 체크

```python
# middleware/auth.py
async def verify_permissions(user: User, employee_ids: list[str]) -> bool:
    """
    타인 일정 조회 시 권한 확인
    - 같은 팀원: 허용
    - 다른 팀: 공개 설정 확인
    """
    for emp_id in employee_ids:
        if emp_id == user.id:
            continue
        if not await can_view_calendar(user, emp_id):
            raise PermissionDenied(f"Cannot view calendar of {emp_id}")
```

---

## 8. 배포 설정

### 8.1 Docker Compose

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - /path/to/certs:/etc/nginx/certs
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - LLM_API_URL=${LLM_API_URL}
      - LLM_API_KEY=${LLM_API_KEY}
      - ORG_API_URL=${ORG_API_URL}
      - CALENDAR_API_URL=${CALENDAR_API_URL}
      - ROOM_API_URL=${ROOM_API_URL}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    # Nginx에서 정적 파일 서빙

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### 8.2 환경 변수

```bash
# .env.example
# LLM 설정
LLM_API_URL=https://api.anthropic.com/v1  # 또는 사내 LLM 엔드포인트
LLM_API_KEY=sk-xxx
LLM_MODEL=claude-sonnet-4-20250514

# 사내 API
ORG_API_URL=https://intranet.company.com/api/org
CALENDAR_API_URL=https://intranet.company.com/api/calendar
ROOM_API_URL=https://intranet.company.com/api/rooms
API_AUTH_TOKEN=xxx

# 서버 설정
REDIS_URL=redis://localhost:6379
LOG_LEVEL=INFO
```

---

## 9. 모니터링 및 로깅

### 9.1 로그 포맷

```python
# 구조화된 JSON 로그
{
    "timestamp": "2024-01-15T14:30:00Z",
    "level": "INFO",
    "service": "meeting-scheduler",
    "user_id": "user_123",
    "conversation_id": "conv_abc",
    "action": "tool_call",
    "tool": "search_employee",
    "duration_ms": 150,
    "success": true
}
```

### 9.2 메트릭

| 메트릭 | 설명 |
|--------|------|
| `request_latency` | API 응답 시간 |
| `llm_call_latency` | LLM API 호출 시간 |
| `tool_call_count` | 도구 호출 횟수 |
| `meeting_created` | 생성된 회의 수 |
| `error_rate` | 에러 발생률 |

---

## 10. 에러 처리

### 10.1 에러 코드

| 코드 | 설명 | 사용자 메시지 |
|------|------|--------------|
| `EMPLOYEE_NOT_FOUND` | 직원 검색 결과 없음 | "해당 이름의 직원을 찾지 못했어요" |
| `NO_AVAILABLE_SLOT` | 공통 빈 시간 없음 | "해당 기간에 모두 가능한 시간이 없어요" |
| `NO_AVAILABLE_ROOM` | 회의실 없음 | "해당 시간에 이용 가능한 회의실이 없어요" |
| `BOOKING_CONFLICT` | 예약 충돌 | "이미 예약된 시간이에요" |
| `PERMISSION_DENIED` | 권한 없음 | "해당 정보에 접근할 권한이 없어요" |
| `API_ERROR` | 외부 API 오류 | "시스템 오류가 발생했어요. 잠시 후 다시 시도해주세요" |

---

## 11. 테스트 전략

### 11.1 테스트 레벨

| 레벨 | 대상 | 도구 |
|------|------|------|
| Unit | 개별 함수/클래스 | pytest |
| Integration | API 클라이언트, DB | pytest + httpx mock |
| E2E | 전체 흐름 | pytest + 실제 API (스테이징) |

### 11.2 Mock 전략

```python
# tests/conftest.py
@pytest.fixture
def mock_org_api():
    with respx.mock:
        respx.get("/employees/search").mock(return_value=Response(200, json={
            "results": [
                {"id": "emp_1", "name": "김철수", "department": "개발팀"}
            ]
        }))
        yield
```
