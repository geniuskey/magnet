# 레퍼런스

Meeting Scheduler AI의 기술 레퍼런스 문서입니다.

## 문서 목록

<div class="grid cards" markdown>

-   :material-robot:{ .lg .middle } **LLM Function Calling**

    ---

    AI 어시스턴트가 시스템을 제어하기 위한 함수 API

    [:octicons-arrow-right-24: LLM Functions](llm-functions.md)

-   :material-database:{ .lg .middle } **데이터 모델**

    ---

    시스템에서 사용하는 데이터 구조 정의

    [:octicons-arrow-right-24: 데이터 모델](data-models.md)

-   :material-alert-circle:{ .lg .middle } **에러 코드**

    ---

    API 에러 코드 및 해결 방법

    [:octicons-arrow-right-24: 에러 코드](error-codes.md)

-   :material-frequently-asked-questions:{ .lg .middle } **FAQ**

    ---

    자주 묻는 질문과 답변

    [:octicons-arrow-right-24: FAQ](faq.md)

</div>

## API 엔드포인트 요약

### 인증

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/auth/login` | 로그인 시작 |
| POST | `/api/auth/callback` | OAuth 콜백 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 현재 사용자 정보 |

### 채팅

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/chat` | 채팅 메시지 전송 |
| GET | `/api/chat/conversation/{id}` | 대화 내역 조회 |
| DELETE | `/api/chat/conversation/{id}` | 대화 삭제 |

### 직원

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/employees/search` | 직원 검색 |
| GET | `/api/employees/{id}` | 직원 상세 조회 |
| GET | `/api/departments` | 부서 목록 |
| GET | `/api/departments/{id}/members` | 부서원 조회 |

### 회의실

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/buildings` | 건물 목록 |
| GET | `/api/buildings/{id}/floors` | 층 목록 |
| GET | `/api/floors/{id}/rooms` | 회의실 목록 |
| GET | `/api/rooms/{id}/reservations` | 예약 현황 |
| POST | `/api/rooms/{id}/reservations` | 예약 생성 |

### 예약

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/reservations` | 내 예약 목록 |
| GET | `/api/reservations/{id}` | 예약 상세 |
| PUT | `/api/reservations/{id}` | 예약 수정 |
| DELETE | `/api/reservations/{id}` | 예약 삭제 |

### 캘린더

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/calendars/{user_id}/events` | 일정 조회 |
| POST | `/api/calendars/freebusy` | Free/Busy 조회 |
| POST | `/api/calendars/events` | 일정 생성 |

### 시스템

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/health` | 헬스 체크 |
| GET | `/docs` | API 문서 (Swagger) |
| GET | `/redoc` | API 문서 (ReDoc) |
