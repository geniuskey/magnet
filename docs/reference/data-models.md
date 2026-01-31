# 데이터 모델

시스템에서 사용하는 주요 데이터 모델 정의입니다.

## 직원 (Employee)

```python
class Employee(BaseModel):
    """직원 정보"""

    id: str                      # 직원 고유 ID
    name: str                    # 이름
    email: str                   # 이메일
    department: str              # 부서명
    team_id: str                 # 부서 ID
    position: str                # 직급
    phone: str | None            # 전화번호
    profile_image: str | None    # 프로필 이미지 URL
    manager_id: str | None       # 상위 관리자 ID
    joined_date: date | None     # 입사일
```

### JSON 예시

```json
{
  "id": "emp_001",
  "name": "김철수",
  "email": "chulsoo.kim@company.com",
  "department": "개발팀",
  "team_id": "team_dev",
  "position": "선임",
  "phone": "010-1234-5678",
  "profile_image": "https://cdn.company.com/profiles/emp_001.jpg",
  "manager_id": "emp_000",
  "joined_date": "2020-03-01"
}
```

## 부서 (Department)

```python
class Department(BaseModel):
    """부서 정보"""

    id: str                      # 부서 ID
    name: str                    # 부서명
    parent_id: str | None        # 상위 부서 ID
    path: list[str] | None       # 조직 경로
    member_count: int            # 소속 인원 수
    manager_id: str | None       # 부서장 ID
```

## 건물 (Building)

```python
class Building(BaseModel):
    """건물 정보"""

    id: str                      # 건물 ID
    name: str                    # 건물명
    address: str | None          # 주소
    floor_count: int             # 층 수
    has_parking: bool            # 주차 가능 여부
```

## 층 (Floor)

```python
class Floor(BaseModel):
    """층 정보"""

    id: str                      # 층 ID
    name: str                    # 층 이름 (예: "2층")
    building_id: str             # 건물 ID
    floor_number: int            # 층 번호
    room_count: int              # 회의실 수
```

## 회의실 (Room)

```python
class Room(BaseModel):
    """회의실 정보"""

    id: str                      # 회의실 ID
    name: str                    # 회의실명
    floor_id: str                # 층 ID
    building_id: str             # 건물 ID
    capacity: int                # 수용 인원
    equipment: list[str]         # 장비 목록
    description: str | None      # 설명
    image_url: str | None        # 이미지 URL
    is_active: bool              # 사용 가능 여부
```

### 장비 코드

| 코드 | 설명 |
|-----|------|
| `projector` | 프로젝터 |
| `whiteboard` | 화이트보드 |
| `monitor` | 대형 모니터 |
| `video_conference` | 화상회의 장비 |
| `phone` | 회의용 전화기 |
| `webcam` | 웹캠 |

## 예약 (Reservation)

```python
class Reservation(BaseModel):
    """회의실 예약"""

    id: str                      # 예약 ID
    room_id: str                 # 회의실 ID
    title: str                   # 회의 제목
    description: str | None      # 설명
    date: date                   # 예약 날짜
    start_time: str              # 시작 시간 (HH:MM)
    end_time: str                # 종료 시간 (HH:MM)
    organizer_id: str            # 주관자 ID
    organizer_name: str          # 주관자 이름
    attendees: list[Attendee]    # 참석자 목록
    status: ReservationStatus    # 예약 상태
    recurrence_id: str | None    # 반복 예약 그룹 ID
    created_at: datetime         # 생성 시간
    updated_at: datetime         # 수정 시간
```

### 예약 상태

| 상태 | 설명 |
|-----|------|
| `confirmed` | 확정 |
| `tentative` | 잠정 |
| `cancelled` | 취소됨 |

## 참석자 (Attendee)

```python
class Attendee(BaseModel):
    """회의 참석자"""

    id: str                      # 직원 ID
    name: str                    # 이름
    email: str                   # 이메일
    type: AttendeeType           # 참석자 유형
    response: AttendeeResponse   # 응답 상태
```

### 참석자 유형

| 유형 | 설명 |
|-----|------|
| `organizer` | 주관자 |
| `required` | 필수 참석자 |
| `optional` | 선택 참석자 |

### 응답 상태

| 상태 | 설명 |
|-----|------|
| `accepted` | 수락 |
| `declined` | 거절 |
| `tentative` | 미정 |
| `none` | 응답 없음 |

## 캘린더 이벤트 (CalendarEvent)

```python
class CalendarEvent(BaseModel):
    """캘린더 일정"""

    id: str                      # 일정 ID
    title: str                   # 제목
    description: str | None      # 설명
    start: datetime              # 시작 시간
    end: datetime                # 종료 시간
    location: str | None         # 장소
    is_all_day: bool             # 종일 일정 여부
    is_private: bool             # 비공개 여부
    organizer_id: str            # 주관자 ID
    attendees: list[Attendee]    # 참석자 목록
    recurrence: Recurrence | None  # 반복 설정
```

## 반복 설정 (Recurrence)

```python
class Recurrence(BaseModel):
    """반복 설정"""

    pattern: RecurrencePattern   # 반복 패턴
    interval: int                # 간격 (예: 2주마다면 2)
    days_of_week: list[str] | None  # 요일 (weekly 시)
    day_of_month: int | None     # 일자 (monthly 시)
    end_date: date | None        # 종료 날짜
    occurrences: int | None      # 반복 횟수
```

### 반복 패턴

| 패턴 | 설명 |
|-----|------|
| `daily` | 매일 |
| `weekly` | 매주 |
| `biweekly` | 격주 |
| `monthly` | 매월 |
| `yearly` | 매년 |

## Free/Busy 결과

```python
class FreeBusyResult(BaseModel):
    """Free/Busy 조회 결과"""

    busy: list[BusySlot]         # 바쁜 시간대 목록

class BusySlot(BaseModel):
    """바쁜 시간대"""

    start: datetime              # 시작 시간
    end: datetime                # 종료 시간
```

## 채팅 메시지

```python
class ChatMessage(BaseModel):
    """채팅 메시지"""

    role: str                    # 역할 (user, assistant, system)
    content: str                 # 메시지 내용
    timestamp: datetime          # 시간
    metadata: dict | None        # 메타데이터

class ChatResponse(BaseModel):
    """채팅 응답"""

    conversation_id: str         # 대화 ID
    response: ResponseContent    # 응답 내용
    status: ChatStatus           # 대화 상태
    timestamp: datetime          # 응답 시간

class ResponseContent(BaseModel):
    """응답 내용"""

    type: ResponseType           # 응답 타입
    content: str                 # 텍스트 내용
    options: list[dict] | None   # 선택 옵션
    actions: list[UIAction] | None  # UI 액션
```

### 응답 타입

| 타입 | 설명 |
|-----|------|
| `text` | 일반 텍스트 |
| `options` | 선택 옵션 제공 |
| `confirmation` | 확인 요청 |
| `error` | 오류 |

### 대화 상태

| 상태 | 설명 |
|-----|------|
| `processing` | 처리 중 |
| `awaiting_selection` | 선택 대기 |
| `awaiting_confirmation` | 확인 대기 |
| `completed` | 완료 |
| `error` | 오류 |

## UI 액션

```python
class UIAction(BaseModel):
    """UI 제어 액션"""

    action: str                  # 액션 타입
    params: dict                 # 파라미터
```

### 액션 타입

| 액션 | 설명 | 파라미터 |
|-----|------|---------|
| `setBuilding` | 건물 선택 | `{"name": "본관"}` |
| `setFloor` | 층 선택 | `{"name": "2층"}` |
| `setRoom` | 회의실 선택 | `{"name": "대회의실"}` |
| `setParticipants` | 참석자 설정 | `{"names": ["김철수", "이영희"]}` |
| `setDate` | 날짜 설정 | `{"date": "2024-01-15"}` |
| `setTime` | 시간 설정 | `{"start": "14:00", "end": "15:00"}` |
