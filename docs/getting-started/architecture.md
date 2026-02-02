# 아키텍처

## 시스템 구성도

```mermaid
graph TB
    subgraph Client["클라이언트"]
        Browser[웹 브라우저]
    end

    subgraph Frontend["프론트엔드 (React)"]
        UI[예약 UI]
        Chat[AI 채팅]
        Context[상태 관리]
    end

    subgraph Backend["백엔드 (FastAPI)"]
        API[REST API]
        Agent[LLM Agent]
        Tools[Tool Registry]
        Conv[대화 관리]
    end

    subgraph LLM["LLM Provider"]
        Claude[Anthropic Claude]
        GPT[OpenAI GPT-4]
        Gemini[Google Gemini]
    end

    subgraph External["사내 시스템"]
        HR[HR/조직도 API]
        CAL[캘린더 API]
        ROOM[회의실 API]
        SSO[SSO/IdP]
    end

    Browser --> UI
    Browser --> Chat
    UI --> Context
    Chat --> Context
    Context --> API
    API --> Agent
    Agent --> Tools
    Agent --> Conv
    Agent --> Claude
    Agent --> GPT
    Agent --> Gemini
    Tools --> HR
    Tools --> CAL
    Tools --> ROOM
    API --> SSO
```

## 컴포넌트 설명

### 프론트엔드

| 컴포넌트 | 설명 |
|---------|------|
| **예약 UI** | 회의실 타임라인, 참석자 선택, 예약 폼 |
| **AI 채팅** | 플로팅 채팅 창, 자연어 명령 처리 |
| **상태 관리** | React Context를 사용한 전역 상태 관리 |

### 프론트엔드 컴포넌트 구조

```mermaid
graph TB
    subgraph App["App.jsx"]
        subgraph Contexts["Context Providers"]
            RC[ReservationContext]
            TC[ThemeContext]
            CC[ChatContext]
        end

        subgraph Layout["레이아웃"]
            Header[Header]
            Main[Main Content]
        end

        subgraph MainContent["메인 콘텐츠"]
            RR[RoomReservation<br/>타임라인 뷰]
            SB[Sidebar<br/>참석자/설정]
            FC[FloatingChat<br/>AI 어시스턴트]
        end

        subgraph Modals["모달"]
            RM[ReservationModal]
            DM[ReservationDetailModal]
            MR[MyReservations]
        end
    end

    RC --> RR
    RC --> SB
    RC --> FC
    RC --> RM

    TC --> Header
    TC --> RR

    CC --> FC

    FC --> |parseUserIntent| FCS[functionCalling.js]
    FCS --> |setTimeByRange<br/>setRoomByName<br/>etc.| RC

    RR --> |드래그 선택| RC
    SB --> |참석자 선택| RC
    RM --> |예약 생성| RC
```

### 상태 관리 구조

```mermaid
graph LR
    subgraph ReservationContext["ReservationContext 상태"]
        B[buildings]
        F[floors]
        R[rooms]
        RV[reservations]
        SD[selectedDate]
        SF[selectedFloors]
        SR[selectedRoom]
        ST[selectedTimeSlots]
        P[participants]
        MD[meetingDuration]
    end

    subgraph Actions["주요 액션"]
        TF[toggleFloor]
        STR[setTimeByRange]
        CR[createReservation]
        MV[moveReservation]
        FOT[findOptimalTimes]
    end

    B --> F
    F --> R
    SF --> R
    R --> RV
    SD --> RV
    SR --> ST
    P --> FOT
    ST --> CR
```

### 백엔드

| 컴포넌트 | 설명 |
|---------|------|
| **REST API** | FastAPI 기반 RESTful API 서버 |
| **LLM Agent** | 자연어 처리 및 도구 호출 오케스트레이션 |
| **Tool Registry** | 외부 API 연동 도구 관리 |
| **대화 관리** | 대화 컨텍스트 및 세션 관리 |

## 데이터 흐름

### 일반 예약 흐름

```mermaid
sequenceDiagram
    participant U as 사용자
    participant F as 프론트엔드
    participant B as 백엔드
    participant R as 회의실 API
    participant C as 캘린더 API

    U->>F: 회의실/시간 선택
    U->>F: 참석자 선택
    U->>F: 예약하기 클릭
    F->>B: POST /api/reservations
    B->>R: 회의실 예약 요청
    R-->>B: 예약 확정
    B->>C: 참석자 일정 등록
    C-->>B: 일정 등록 완료
    B-->>F: 예약 완료 응답
    F-->>U: 예약 완료 표시
```

### AI 채팅 흐름 (프론트엔드 Function Calling)

프론트엔드에서 직접 사용자 의도를 파싱하고 함수를 실행하는 방식입니다.

```mermaid
sequenceDiagram
    participant U as 사용자
    participant F as 프론트엔드
    participant FC as Function Calling
    participant CTX as ReservationContext

    U->>F: "김철수와 내일 2시 회의 잡아줘"
    F->>FC: parseUserIntent(message)
    FC-->>F: [setParticipantsByNames, setDateByString, setTimeByRange]

    loop Function Execution
        F->>CTX: 함수 실행
        CTX-->>F: 결과 반환
    end

    F-->>U: 결과 메시지 + 빠른 적용 버튼
```

### AI 채팅 흐름 (백엔드 LLM Agent)

백엔드 LLM이 의도를 분석하고 도구를 호출하는 방식입니다.

```mermaid
sequenceDiagram
    participant U as 사용자
    participant F as 프론트엔드
    participant B as 백엔드
    participant A as LLM Agent
    participant L as LLM
    participant T as Tools

    U->>F: "김철수와 내일 2시 회의 잡아줘"
    F->>B: POST /api/chat
    B->>A: 메시지 처리 요청
    A->>L: 사용자 의도 분석

    loop Tool Calls
        L-->>A: Tool 호출 요청
        A->>T: Tool 실행
        T-->>A: 결과 반환
        A->>L: 결과 전달
    end

    L-->>A: 최종 응답
    A-->>B: 응답 + 액션
    B-->>F: 응답 반환
    F-->>U: 메시지 + 빠른 적용 버튼
```

## 기술 스택

### 프론트엔드

- **React 18**: UI 프레임워크
- **Vite**: 빌드 도구
- **Tailwind CSS**: 스타일링
- **React Context**: 상태 관리

### 백엔드

- **FastAPI**: 웹 프레임워크
- **Pydantic**: 데이터 검증
- **httpx**: 비동기 HTTP 클라이언트
- **Python 3.11+**: 런타임

### LLM 연동

- **Anthropic Claude**: 기본 LLM
- **OpenAI GPT-4**: 대안 LLM
- **Google Gemini**: 대안 LLM

## 확장 포인트

### Adapter 패턴

외부 시스템 연동은 Adapter 패턴을 사용하여 구현됩니다:

```python
# backend/services/adapters/organization_adapter.py
class OrganizationAdapter(ABC):
    @abstractmethod
    async def search_employees(self, query: str) -> list[Employee]:
        pass

    @abstractmethod
    async def get_team_members(self, team_id: str) -> list[Employee]:
        pass

# 구현체
class CompanyHRAdapter(OrganizationAdapter):
    def __init__(self, api_url: str, client_id: str, client_secret: str):
        self.api_url = api_url
        # ...

    async def search_employees(self, query: str) -> list[Employee]:
        # 회사 HR API 호출
        response = await self.client.get(f"{self.api_url}/employees", params={"q": query})
        return [Employee(**emp) for emp in response.json()]
```

### 새로운 API 연동 추가

1. `backend/services/adapters/`에 새 Adapter 구현
2. `backend/agent/tools/`에 새 Tool 추가
3. `backend/config.py`에 설정 추가

자세한 내용은 각 API 연동 가이드를 참고하세요.
