# TASKS: 회의 일정 조율 & 예약 자동화 시스템

## 개요
이 문서는 Meeting Scheduler AI 개발을 위한 태스크 체크리스트입니다.
각 Phase를 순서대로 진행하며, 하위 태스크를 완료할 때마다 체크합니다.

---

## Phase 0: 프로젝트 초기 설정 (Day 1)

### 0.1 프로젝트 구조 생성
- [ ] 루트 디렉토리 구조 생성
  ```
  meeting-scheduler/
  ├── backend/
  ├── frontend/
  ├── nginx/
  ├── docs/
  └── docker-compose.yml
  ```
- [ ] backend/ 하위 디렉토리 생성 (api/, agent/, services/, models/, utils/)
- [ ] frontend/ 하위 디렉토리 생성 (src/components/, src/hooks/, src/services/)
- [ ] `.gitignore` 파일 생성
- [ ] `README.md` 작성

### 0.2 Backend 환경 설정
- [ ] `backend/requirements.txt` 작성
  ```
  fastapi>=0.104.0
  uvicorn>=0.24.0
  httpx>=0.25.0
  pydantic>=2.5.0
  python-dotenv>=1.0.0
  redis>=5.0.0
  jinja2>=3.1.0
  anthropic>=0.7.0  # 또는 openai
  ```
- [ ] `backend/config.py` 환경설정 모듈 작성
- [ ] `backend/.env.example` 작성
- [ ] `backend/Dockerfile` 작성

### 0.3 Frontend 환경 설정
- [ ] `npm create vite@latest frontend -- --template react` 실행
- [ ] Tailwind CSS 설치 및 설정
- [ ] `frontend/Dockerfile` 작성
- [ ] 기본 디렉토리 구조 정리

### 0.4 Docker 환경 설정
- [ ] `docker-compose.yml` 작성 (backend, frontend, redis, nginx)
- [ ] `nginx/nginx.conf` 작성 (리버스 프록시 설정)
- [ ] 로컬 개발용 `docker-compose.dev.yml` 작성
- [ ] `docker-compose up` 으로 기본 실행 확인

---

## Phase 1: Backend 기반 구축 (Day 2-4)

### 1.1 FastAPI 앱 기본 구조
- [ ] `backend/main.py` - FastAPI 앱 생성 및 라우터 등록
- [ ] `backend/api/routes/__init__.py` - 라우터 모음
- [ ] `backend/api/routes/health.py` - 헬스체크 엔드포인트
  - [ ] `GET /api/health` 구현
  - [ ] 외부 서비스 연결 상태 체크 포함
- [ ] `backend/utils/logger.py` - 로깅 설정
- [ ] CORS 설정 (개발용)

### 1.2 Pydantic 모델 정의
- [ ] `backend/models/__init__.py`
- [ ] `backend/models/employee.py`
  ```python
  class Employee(BaseModel):
      id: str
      name: str
      department: str
      email: str
      position: str | None
  ```
- [ ] `backend/models/calendar.py`
  ```python
  class TimeSlot(BaseModel):
      start: datetime
      end: datetime
      is_busy: bool
  
  class DaySchedule(BaseModel):
      date: date
      slots: list[TimeSlot]
  ```
- [ ] `backend/models/room.py`
  ```python
  class Room(BaseModel):
      id: str
      name: str
      floor: int
      capacity: int
      facilities: list[str]
  ```
- [ ] `backend/models/meeting.py`
  ```python
  class MeetingRequest(BaseModel):
      title: str
      attendee_ids: list[str]
      room_id: str
      start_time: datetime
      end_time: datetime
  
  class Meeting(BaseModel):
      id: str
      # ... 나머지 필드
  ```
- [ ] `backend/models/chat.py`
  ```python
  class ChatRequest(BaseModel):
      message: str
      conversation_id: str | None
  
  class ChatResponse(BaseModel):
      conversation_id: str
      response: dict
      status: str
  ```

### 1.3 외부 API 클라이언트 (Mock 포함)
- [ ] `backend/services/__init__.py`
- [ ] `backend/services/base.py` - BaseAPIClient 추상 클래스
- [ ] `backend/services/organization.py`
  - [ ] `search_employee(query, department)` 구현
  - [ ] `get_employee_by_id(employee_id)` 구현
  - [ ] `get_team_members(department)` 구현
  - [ ] Mock 데이터로 테스트 가능하게 구현
- [ ] `backend/services/calendar.py`
  - [ ] `get_schedule(employee_id, start_date, end_date)` 구현
  - [ ] `get_schedules(employee_ids, start_date, end_date)` 구현
  - [ ] `create_event(meeting)` 구현
  - [ ] Mock 데이터로 테스트 가능하게 구현
- [ ] `backend/services/room.py`
  - [ ] `list_rooms(floor, min_capacity, facilities)` 구현
  - [ ] `get_room_availability(room_id, start_time, end_time)` 구현
  - [ ] `search_available_rooms(start_time, end_time, min_capacity)` 구현
  - [ ] `book_room(room_id, start_time, end_time, meeting_id)` 구현
  - [ ] Mock 데이터로 테스트 가능하게 구현

### 1.4 빈 시간대 계산 로직
- [ ] `backend/services/slot_finder.py`
  - [ ] `find_busy_slots(schedules)` - 바쁜 시간대 추출
  - [ ] `find_free_slots(busy_slots, date_range, work_hours)` - 빈 시간대 계산
  - [ ] `find_common_free_slots(employee_schedules, duration)` - 공통 빈 시간대
  - [ ] `rank_slots(slots, preferences)` - 선호도 기반 정렬
- [ ] `backend/utils/datetime_utils.py`
  - [ ] `parse_relative_date(text)` - "내일", "다음 주" 파싱
  - [ ] `get_work_hours(date)` - 업무 시간 반환
  - [ ] `is_lunch_time(time)` - 점심시간 체크

### 1.5 Unit 테스트
- [ ] `backend/tests/__init__.py`
- [ ] `backend/tests/conftest.py` - pytest fixtures
- [ ] `backend/tests/test_slot_finder.py`
  - [ ] 빈 시간대 계산 테스트
  - [ ] 공통 빈 시간대 테스트
  - [ ] 엣지 케이스 테스트 (종일 바쁨, 완전 비어있음 등)
- [ ] `backend/tests/test_datetime_utils.py`

---

## Phase 2: LLM Agent 구현 (Day 5-8)

### 2.1 LLM 클라이언트
- [ ] `backend/agent/__init__.py`
- [ ] `backend/agent/llm_client.py`
  - [ ] LLM API 클라이언트 클래스 (Anthropic 또는 OpenAI 호환)
  - [ ] `chat(messages, tools, tool_choice)` 메서드
  - [ ] 재시도 로직 (rate limit, timeout)
  - [ ] 에러 핸들링

### 2.2 Tool 정의 및 실행기
- [ ] `backend/agent/tools/__init__.py`
- [ ] `backend/agent/tools/base.py`
  ```python
  class BaseTool(ABC):
      name: str
      description: str
      parameters: dict
      
      @abstractmethod
      async def execute(self, **kwargs) -> dict:
          pass
  ```
- [ ] `backend/agent/tools/employee.py`
  - [ ] `SearchEmployeeTool` 구현
  - [ ] 동명이인 처리 로직
- [ ] `backend/agent/tools/calendar.py`
  - [ ] `GetCalendarTool` 구현
  - [ ] `FindFreeSlotsTool` 구현
- [ ] `backend/agent/tools/room.py`
  - [ ] `SearchRoomsTool` 구현
- [ ] `backend/agent/tools/meeting.py`
  - [ ] `CreateMeetingTool` 구현
  - [ ] 예약 전 확인 플래그 처리
- [ ] `backend/agent/tools/registry.py`
  - [ ] 도구 레지스트리 (이름으로 도구 조회)
  - [ ] 전체 도구 스키마 생성

### 2.3 프롬프트 관리
- [ ] `backend/agent/prompts/` 디렉토리 생성
- [ ] `backend/agent/prompts/system.jinja2` - 시스템 프롬프트 템플릿
- [ ] `backend/agent/prompts/prompt_manager.py`
  - [ ] 프롬프트 로드 및 렌더링
  - [ ] 동적 변수 주입 (현재 날짜 등)

### 2.4 Agent 오케스트레이터
- [ ] `backend/agent/conversation.py`
  - [ ] `Conversation` 클래스 (대화 이력 관리)
  - [ ] Redis 기반 대화 저장/조회
- [ ] `backend/agent/agent.py`
  - [ ] `MeetingAgent` 클래스
  - [ ] `process(message, conversation)` 메서드
  - [ ] Tool call 루프 구현
  - [ ] 응답 포맷팅 (일반 텍스트, 옵션 제시)
  - [ ] 에러 핸들링 및 사용자 친화적 메시지

### 2.5 채팅 API 엔드포인트
- [ ] `backend/api/routes/chat.py`
  - [ ] `POST /api/chat` 구현
  - [ ] 대화 ID 관리 (신규/기존)
  - [ ] Agent 호출 및 응답 반환
- [ ] Request/Response 검증
- [ ] 에러 응답 포맷 통일

### 2.6 Agent 테스트
- [ ] `backend/tests/test_tools.py` - 개별 도구 테스트
- [ ] `backend/tests/test_agent.py` - Agent 통합 테스트 (LLM mock)
- [ ] 시나리오 기반 테스트
  - [ ] 단순 회의 예약 시나리오
  - [ ] 동명이인 처리 시나리오
  - [ ] 빈 시간 없음 시나리오

---

## Phase 3: Frontend 구현 (Day 9-12)

### 3.1 기본 레이아웃
- [ ] `frontend/src/App.jsx` - 메인 앱 컴포넌트
- [ ] `frontend/src/styles/index.css` - Tailwind 기본 스타일
- [ ] 반응형 레이아웃 (데스크톱/모바일)

### 3.2 채팅 컴포넌트
- [ ] `frontend/src/components/ChatWindow.jsx`
  - [ ] 메시지 목록 표시
  - [ ] 자동 스크롤
  - [ ] 로딩 인디케이터
- [ ] `frontend/src/components/MessageBubble.jsx`
  - [ ] 사용자/AI 메시지 구분 스타일
  - [ ] 타임스탬프 표시
- [ ] `frontend/src/components/InputBar.jsx`
  - [ ] 텍스트 입력
  - [ ] 전송 버튼
  - [ ] Enter 키 전송
  - [ ] 전송 중 비활성화
- [ ] `frontend/src/components/OptionCard.jsx`
  - [ ] 회의 옵션 카드 (시간, 장소)
  - [ ] 클릭하여 선택

### 3.3 API 통신
- [ ] `frontend/src/services/api.js`
  - [ ] `sendMessage(message, conversationId)` 함수
  - [ ] 에러 핸들링
  - [ ] 타임아웃 처리
- [ ] `frontend/src/hooks/useChat.js`
  - [ ] 메시지 상태 관리
  - [ ] 대화 ID 관리
  - [ ] 로딩/에러 상태

### 3.4 상태 관리
- [ ] `frontend/src/context/ChatContext.jsx` (또는 간단한 useState)
  - [ ] 대화 이력
  - [ ] 현재 상태 (idle, loading, awaiting_selection)
- [ ] 로컬 스토리지에 대화 ID 저장 (새로고침 대응)

### 3.5 UX 개선
- [ ] 타이핑 인디케이터 ("AI가 응답 중...")
- [ ] 에러 메시지 표시 (토스트 또는 인라인)
- [ ] 빈 상태 UI (처음 시작 안내 메시지)
- [ ] 새 대화 시작 버튼

### 3.6 빌드 및 배포 설정
- [ ] `frontend/vite.config.js` - 프록시 설정 (개발용)
- [ ] 프로덕션 빌드 테스트
- [ ] Nginx 정적 파일 서빙 설정 확인

---

## Phase 4: 통합 및 테스트 (Day 13-14)

### 4.1 End-to-End 통합
- [ ] Frontend ↔ Backend 연동 테스트
- [ ] Docker Compose로 전체 스택 실행 테스트
- [ ] Nginx 리버스 프록시 동작 확인

### 4.2 시나리오 테스트
- [ ] **시나리오 1**: 단순 회의 예약
  ```
  "내일 오후 김철수랑 1시간 회의 잡아줘"
  → 옵션 제시 → 선택 → 예약 완료
  ```
- [ ] **시나리오 2**: 팀 회의
  ```
  "다음 주에 개발팀 전체 회의 가능한 시간 찾아줘"
  → 팀원 조회 → 공통 빈 시간 → 옵션 제시
  ```
- [ ] **시나리오 3**: 동명이인 처리
  ```
  "김철수랑 회의" (동명이인 2명)
  → 부서 확인 질문 → 선택 → 진행
  ```
- [ ] **시나리오 4**: 빈 시간 없음
  ```
  "내일 오전에 5명 회의"
  → 불가능 안내 → 대안 제시 (다른 날짜/시간)
  ```
- [ ] **시나리오 5**: 회의실 조건
  ```
  "화상회의 장비 있는 회의실로"
  → 조건 필터링 → 결과 제시
  ```

### 4.3 에러 케이스 테스트
- [ ] LLM API 타임아웃
- [ ] 사내 API 연결 실패
- [ ] 잘못된 사용자 입력
- [ ] 세션 만료

### 4.4 성능 테스트
- [ ] 단일 요청 응답 시간 측정
- [ ] 동시 요청 테스트 (10명, 50명)

---

## Phase 5: 인증 및 보안 (Day 15-16)

### 5.1 인증 미들웨어
- [ ] `backend/api/middleware/auth.py`
  - [ ] 토큰 검증 로직
  - [ ] 사용자 정보 추출
- [ ] SSO 연동 설정 (사내 시스템에 맞게)
- [ ] 개발용 bypass 옵션

### 5.2 권한 체크
- [ ] 타인 일정 조회 권한 체크 로직
- [ ] 회의 생성 권한 체크
- [ ] 감사 로그 기록

### 5.3 보안 강화
- [ ] HTTPS 설정 (사내 인증서)
- [ ] Rate limiting (Redis 기반)
- [ ] 입력 값 검증 강화

---

## Phase 6: 배포 및 운영 준비 (Day 17-18)

### 6.1 배포 스크립트
- [ ] `scripts/deploy.sh` - 배포 자동화 스크립트
- [ ] `scripts/backup.sh` - 데이터 백업 스크립트
- [ ] 환경별 설정 파일 분리 (dev, staging, prod)

### 6.2 모니터링 설정
- [ ] 헬스체크 엔드포인트 강화
- [ ] 로그 수집 설정 (사내 로그 시스템 연동)
- [ ] 알림 설정 (에러 발생 시)

### 6.3 문서화
- [ ] API 문서 (OpenAPI/Swagger)
- [ ] 운영 가이드 (`docs/OPERATIONS.md`)
- [ ] 사용자 가이드 (`docs/USER_GUIDE.md`)
- [ ] 트러블슈팅 가이드

### 6.4 최종 점검
- [ ] 프로덕션 환경 설정 확인
- [ ] 백업/복구 테스트
- [ ] 롤백 절차 확인

---

## Phase 7: 사내 API 연동 (API 스펙 수신 후)

### 7.1 조직 API 연동
- [ ] 실제 API 스펙 분석
- [ ] `OrganizationAPIClient` 실제 구현으로 교체
- [ ] 응답 매핑 로직 구현
- [ ] 연동 테스트

### 7.2 캘린더 API 연동
- [ ] 실제 API 스펙 분석
- [ ] `CalendarAPIClient` 실제 구현으로 교체
- [ ] 일정 조회 연동 테스트
- [ ] 일정 생성 연동 테스트

### 7.3 회의실 API 연동
- [ ] 실제 API 스펙 분석
- [ ] `RoomAPIClient` 실제 구현으로 교체
- [ ] 회의실 검색 연동 테스트
- [ ] 예약 생성 연동 테스트

### 7.4 통합 테스트
- [ ] 실제 API 환경에서 전체 시나리오 테스트
- [ ] 에러 케이스 재테스트

---

## 백로그 (향후 개선)

### 기능 개선
- [ ] WebSocket 실시간 스트리밍 응답
- [ ] 예약 수정/취소 기능
- [ ] 반복 회의 지원
- [ ] 회의 리마인더 알림
- [ ] 참석자 응답 확인 (수락/거절)

### UX 개선
- [ ] 다크 모드 지원
- [ ] 키보드 단축키
- [ ] 최근 검색 히스토리
- [ ] 자주 만나는 사람 추천

### 확장
- [ ] Slack 봇 연동
- [ ] Teams 봇 연동
- [ ] 모바일 앱 (React Native)
- [ ] 회의록 자동 생성 연동

---

## 진행 상황 요약

| Phase | 상태 | 예상 소요 | 비고 |
|-------|------|----------|------|
| Phase 0: 초기 설정 | ⬜ 대기 | 1일 | |
| Phase 1: Backend 기반 | ⬜ 대기 | 3일 | |
| Phase 2: LLM Agent | ⬜ 대기 | 4일 | |
| Phase 3: Frontend | ⬜ 대기 | 4일 | |
| Phase 4: 통합 테스트 | ⬜ 대기 | 2일 | |
| Phase 5: 인증/보안 | ⬜ 대기 | 2일 | |
| Phase 6: 배포 준비 | ⬜ 대기 | 2일 | |
| Phase 7: API 연동 | ⬜ 대기 | API 스펙 수신 후 | |

**총 예상 소요: 약 18일 (API 연동 제외)**

---

## 참고사항

### 개발 시작 전 필요한 정보
1. ✅ LLM API 접근 정보 (Anthropic API 키 또는 사내 LLM 엔드포인트)
2. ⬜ 사내 조직 API 스펙
3. ⬜ 사내 캘린더 API 스펙
4. ⬜ 사내 회의실 예약 API 스펙
5. ⬜ 사내 SSO/인증 시스템 연동 방법
6. ⬜ 배포 대상 서버 정보

### Mock 데이터 활용
- API 스펙이 없는 동안 Mock 데이터로 개발 진행
- `backend/services/mock/` 디렉토리에 Mock 구현
- 환경 변수로 Mock/실제 API 전환: `USE_MOCK_API=true`
