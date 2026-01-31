# 일정 조회 API 연동

캘린더 시스템과 연동하여 참석자들의 일정을 조회하고 회의 일정을 등록합니다.

## 개요

일정 조회 API는 다음 기능을 제공해야 합니다:

- 특정 사용자의 일정 조회
- 여러 사용자의 Free/Busy 조회
- 일정 생성 (회의 초대)
- 일정 수정/삭제

## 필요한 API 엔드포인트

### 1. 사용자 일정 조회

<span class="api-method get">GET</span> `/calendars/{user_id}/events`

특정 사용자의 일정을 조회합니다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `user_id` | string | 사용자 ID (직원 ID) |

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `start_date` | string | O | 조회 시작일 (YYYY-MM-DD) |
| `end_date` | string | O | 조회 종료일 (YYYY-MM-DD) |
| `include_private` | boolean | X | 비공개 일정 포함 (기본: false) |

**Response**

```json
{
  "user_id": "emp_001",
  "events": [
    {
      "id": "evt_001",
      "title": "팀 회의",
      "start": "2024-01-15T09:00:00+09:00",
      "end": "2024-01-15T10:00:00+09:00",
      "location": "본관 대회의실",
      "is_all_day": false,
      "is_private": false,
      "status": "confirmed",
      "organizer": {
        "id": "emp_002",
        "name": "이영희"
      },
      "attendees": [
        {
          "id": "emp_001",
          "name": "김철수",
          "response": "accepted"
        }
      ]
    }
  ]
}
```

---

### 2. Free/Busy 조회

<span class="api-method post">POST</span> `/calendars/freebusy`

여러 사용자의 Free/Busy 상태를 조회합니다. 일정 상세 정보 없이 바쁜 시간대만 반환합니다.

**Request Body**

```json
{
  "user_ids": ["emp_001", "emp_002", "emp_003"],
  "start_date": "2024-01-15",
  "end_date": "2024-01-15",
  "timezone": "Asia/Seoul"
}
```

**Response**

```json
{
  "results": {
    "emp_001": {
      "busy": [
        {
          "start": "2024-01-15T09:00:00+09:00",
          "end": "2024-01-15T10:00:00+09:00"
        },
        {
          "start": "2024-01-15T14:00:00+09:00",
          "end": "2024-01-15T15:30:00+09:00"
        }
      ]
    },
    "emp_002": {
      "busy": [
        {
          "start": "2024-01-15T10:00:00+09:00",
          "end": "2024-01-15T11:00:00+09:00"
        }
      ]
    },
    "emp_003": {
      "busy": []
    }
  }
}
```

!!! tip "최적 시간 찾기"
    Free/Busy API를 사용하면 모든 참석자가 가능한 공통 시간대를 효율적으로 찾을 수 있습니다.

---

### 3. 일정 생성 (회의 초대)

<span class="api-method post">POST</span> `/calendars/events`

새 회의 일정을 생성하고 참석자를 초대합니다.

**Request Body**

```json
{
  "title": "프로젝트 킥오프 미팅",
  "description": "신규 프로젝트 시작 회의입니다.",
  "start": "2024-01-15T14:00:00+09:00",
  "end": "2024-01-15T15:00:00+09:00",
  "location": "본관 대회의실",
  "timezone": "Asia/Seoul",
  "organizer_id": "emp_001",
  "attendees": [
    {
      "id": "emp_002",
      "type": "required"
    },
    {
      "id": "emp_003",
      "type": "optional"
    }
  ],
  "recurrence": {
    "pattern": "weekly",
    "interval": 1,
    "days_of_week": ["monday"],
    "end_date": "2024-03-31"
  },
  "reminders": [
    {"minutes": 15, "method": "popup"},
    {"minutes": 60, "method": "email"}
  ]
}
```

**Response**

```json
{
  "id": "evt_new_001",
  "title": "프로젝트 킥오프 미팅",
  "start": "2024-01-15T14:00:00+09:00",
  "end": "2024-01-15T15:00:00+09:00",
  "location": "본관 대회의실",
  "status": "confirmed",
  "html_link": "https://calendar.company.com/event/evt_new_001",
  "recurrence_id": "rec_001"
}
```

---

### 4. 일정 수정

<span class="api-method put">PUT</span> `/calendars/events/{event_id}`

기존 일정을 수정합니다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `event_id` | string | 일정 ID |

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `update_series` | boolean | X | 반복 일정 전체 수정 (기본: false) |

**Request Body**

```json
{
  "title": "프로젝트 킥오프 미팅 (변경)",
  "start": "2024-01-15T15:00:00+09:00",
  "end": "2024-01-15T16:00:00+09:00"
}
```

---

### 5. 일정 삭제

<span class="api-method delete">DELETE</span> `/calendars/events/{event_id}`

일정을 삭제합니다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `event_id` | string | 일정 ID |

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `delete_series` | boolean | X | 반복 일정 전체 삭제 (기본: false) |
| `notify_attendees` | boolean | X | 참석자에게 알림 (기본: true) |

## Adapter 구현

### 인터페이스

```python title="backend/services/adapters/calendar_adapter.py"
from abc import ABC, abstractmethod
from datetime import date, datetime
from models.calendar import CalendarEvent, FreeBusyResult, AttendeeType

class CalendarAdapter(ABC):
    """캘린더 연동 어댑터 인터페이스"""

    @abstractmethod
    async def get_events(
        self,
        user_id: str,
        start_date: date,
        end_date: date,
        include_private: bool = False
    ) -> list[CalendarEvent]:
        """사용자 일정 조회"""
        pass

    @abstractmethod
    async def get_freebusy(
        self,
        user_ids: list[str],
        start_date: date,
        end_date: date
    ) -> dict[str, FreeBusyResult]:
        """Free/Busy 조회"""
        pass

    @abstractmethod
    async def create_event(
        self,
        title: str,
        start: datetime,
        end: datetime,
        organizer_id: str,
        attendees: list[dict],
        location: str | None = None,
        description: str | None = None,
        recurrence: dict | None = None
    ) -> CalendarEvent:
        """일정 생성"""
        pass

    @abstractmethod
    async def update_event(
        self,
        event_id: str,
        updates: dict,
        update_series: bool = False
    ) -> CalendarEvent:
        """일정 수정"""
        pass

    @abstractmethod
    async def delete_event(
        self,
        event_id: str,
        delete_series: bool = False,
        notify_attendees: bool = True
    ) -> bool:
        """일정 삭제"""
        pass
```

### 구현 예시 (Microsoft 365)

```python title="backend/services/adapters/ms365_calendar_adapter.py"
import httpx
from datetime import date, datetime
from .calendar_adapter import CalendarAdapter
from models.calendar import CalendarEvent, FreeBusyResult
from config import get_settings

settings = get_settings()

class MS365CalendarAdapter(CalendarAdapter):
    """Microsoft 365 캘린더 연동 어댑터"""

    def __init__(self):
        self.base_url = "https://graph.microsoft.com/v1.0"
        self.client = httpx.AsyncClient(timeout=30.0)
        self._token = None

    async def _get_token(self) -> str:
        """Azure AD OAuth 토큰 획득"""
        if self._token:
            return self._token

        response = await self.client.post(
            f"https://login.microsoftonline.com/{settings.azure_tenant_id}/oauth2/v2.0/token",
            data={
                "grant_type": "client_credentials",
                "client_id": settings.calendar_api_client_id,
                "client_secret": settings.calendar_api_client_secret,
                "scope": "https://graph.microsoft.com/.default"
            }
        )
        response.raise_for_status()
        self._token = response.json()["access_token"]
        return self._token

    async def get_events(
        self,
        user_id: str,
        start_date: date,
        end_date: date,
        include_private: bool = False
    ) -> list[CalendarEvent]:
        """사용자 일정 조회"""
        token = await self._get_token()

        # 사용자 이메일로 변환 필요시 HR API 사용
        response = await self.client.get(
            f"{self.base_url}/users/{user_id}/calendar/events",
            headers={"Authorization": f"Bearer {token}"},
            params={
                "$filter": f"start/dateTime ge '{start_date}' and end/dateTime le '{end_date}'",
                "$orderby": "start/dateTime",
                "$top": 100
            }
        )
        response.raise_for_status()

        events = []
        for item in response.json()["value"]:
            if not include_private and item.get("sensitivity") == "private":
                continue

            events.append(CalendarEvent(
                id=item["id"],
                title=item["subject"],
                start=datetime.fromisoformat(item["start"]["dateTime"]),
                end=datetime.fromisoformat(item["end"]["dateTime"]),
                location=item.get("location", {}).get("displayName"),
                is_all_day=item["isAllDay"],
                organizer_id=item["organizer"]["emailAddress"]["address"],
            ))

        return events

    async def get_freebusy(
        self,
        user_ids: list[str],
        start_date: date,
        end_date: date
    ) -> dict[str, FreeBusyResult]:
        """Free/Busy 조회"""
        token = await self._get_token()

        response = await self.client.post(
            f"{self.base_url}/me/calendar/getSchedule",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "schedules": user_ids,
                "startTime": {
                    "dateTime": f"{start_date}T00:00:00",
                    "timeZone": "Asia/Seoul"
                },
                "endTime": {
                    "dateTime": f"{end_date}T23:59:59",
                    "timeZone": "Asia/Seoul"
                },
                "availabilityViewInterval": 30
            }
        )
        response.raise_for_status()

        results = {}
        for schedule in response.json()["value"]:
            user_id = schedule["scheduleId"]
            busy_slots = []

            for item in schedule.get("scheduleItems", []):
                busy_slots.append({
                    "start": item["start"]["dateTime"],
                    "end": item["end"]["dateTime"]
                })

            results[user_id] = FreeBusyResult(busy=busy_slots)

        return results

    async def create_event(
        self,
        title: str,
        start: datetime,
        end: datetime,
        organizer_id: str,
        attendees: list[dict],
        location: str | None = None,
        description: str | None = None,
        recurrence: dict | None = None
    ) -> CalendarEvent:
        """일정 생성"""
        token = await self._get_token()

        event_data = {
            "subject": title,
            "start": {
                "dateTime": start.isoformat(),
                "timeZone": "Asia/Seoul"
            },
            "end": {
                "dateTime": end.isoformat(),
                "timeZone": "Asia/Seoul"
            },
            "attendees": [
                {
                    "emailAddress": {"address": a["id"]},
                    "type": "required" if a.get("type") == "required" else "optional"
                }
                for a in attendees
            ]
        }

        if location:
            event_data["location"] = {"displayName": location}
        if description:
            event_data["body"] = {"contentType": "text", "content": description}

        response = await self.client.post(
            f"{self.base_url}/users/{organizer_id}/calendar/events",
            headers={"Authorization": f"Bearer {token}"},
            json=event_data
        )
        response.raise_for_status()

        item = response.json()
        return CalendarEvent(
            id=item["id"],
            title=item["subject"],
            start=datetime.fromisoformat(item["start"]["dateTime"]),
            end=datetime.fromisoformat(item["end"]["dateTime"]),
            location=location,
        )
```

## 설정

=== "Microsoft 365"

    ```bash title=".env"
    CALENDAR_PROVIDER=ms365
    CALENDAR_API_URL=https://graph.microsoft.com/v1.0
    AZURE_TENANT_ID=your-tenant-id
    CALENDAR_API_CLIENT_ID=your-app-id
    CALENDAR_API_CLIENT_SECRET=your-secret
    ```

=== "Google Workspace"

    ```bash title=".env"
    CALENDAR_PROVIDER=google
    CALENDAR_API_URL=https://www.googleapis.com/calendar/v3
    GOOGLE_SERVICE_ACCOUNT_FILE=service-account.json
    GOOGLE_DELEGATED_USER=admin@company.com
    ```

=== "사내 시스템"

    ```bash title=".env"
    CALENDAR_PROVIDER=custom
    CALENDAR_API_URL=https://calendar.company.com/api/v1
    CALENDAR_API_CLIENT_ID=your-client-id
    CALENDAR_API_CLIENT_SECRET=your-secret
    ```

## 참석자 응답 상태

| 상태 | 설명 |
|-----|------|
| `accepted` | 수락 |
| `declined` | 거절 |
| `tentative` | 미정 |
| `none` | 응답 없음 |

## 반복 패턴

| 패턴 | 설명 | 예시 |
|-----|------|------|
| `daily` | 매일 | 매일 같은 시간 |
| `weekly` | 매주 | 매주 월요일 |
| `biweekly` | 격주 | 격주 화요일 |
| `monthly` | 매월 | 매월 15일 |
| `yearly` | 매년 | 매년 1월 1일 |

## 다음 단계

- [회의실 API 연동](room-api.md)
- [SSO 연동](../guides/sso-integration.md)
