# 회의실 API 연동

회의실 예약 시스템과 연동하여 회의실 정보 조회 및 예약을 처리합니다.

## 개요

회의실 API는 다음 기능을 제공해야 합니다:

- 건물/층/회의실 목록 조회
- 회의실 상세 정보 조회
- 회의실 예약 현황 조회
- 회의실 예약 생성/수정/삭제

## 필요한 API 엔드포인트

### 1. 건물 목록 조회

<span class="api-method get">GET</span> `/buildings`

전체 건물 목록을 조회합니다.

**Response**

```json
{
  "buildings": [
    {
      "id": "building_a",
      "name": "본관",
      "address": "서울시 강남구 테헤란로 123",
      "floor_count": 10,
      "has_parking": true
    },
    {
      "id": "building_b",
      "name": "별관",
      "address": "서울시 강남구 테헤란로 125",
      "floor_count": 5,
      "has_parking": false
    }
  ]
}
```

---

### 2. 층 목록 조회

<span class="api-method get">GET</span> `/buildings/{building_id}/floors`

특정 건물의 층 목록을 조회합니다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `building_id` | string | 건물 ID |

**Response**

```json
{
  "building_id": "building_a",
  "floors": [
    {
      "id": "floor_a_1",
      "name": "1층",
      "floor_number": 1,
      "room_count": 3
    },
    {
      "id": "floor_a_2",
      "name": "2층",
      "floor_number": 2,
      "room_count": 5
    }
  ]
}
```

---

### 3. 회의실 목록 조회

<span class="api-method get">GET</span> `/floors/{floor_id}/rooms`

특정 층의 회의실 목록을 조회합니다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `floor_id` | string | 층 ID |

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `min_capacity` | integer | X | 최소 수용 인원 |
| `equipment` | string[] | X | 필요 장비 (프로젝터, 화이트보드 등) |

**Response**

```json
{
  "floor_id": "floor_a_2",
  "rooms": [
    {
      "id": "room_a2_1",
      "name": "대회의실",
      "capacity": 20,
      "equipment": ["projector", "whiteboard", "video_conference"],
      "description": "20인 규모 대형 회의실",
      "image_url": "https://...",
      "is_active": true
    },
    {
      "id": "room_a2_2",
      "name": "소회의실 1",
      "capacity": 6,
      "equipment": ["whiteboard", "monitor"],
      "description": "6인 소규모 회의실",
      "is_active": true
    }
  ]
}
```

---

### 4. 회의실 예약 현황 조회

<span class="api-method get">GET</span> `/rooms/{room_id}/reservations`

특정 회의실의 예약 현황을 조회합니다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `room_id` | string | 회의실 ID |

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `date` | string | O | 조회 날짜 (YYYY-MM-DD) |

**Response**

```json
{
  "room_id": "room_a2_1",
  "date": "2024-01-15",
  "reservations": [
    {
      "id": "rsv_001",
      "title": "주간 회의",
      "start_time": "09:00",
      "end_time": "10:00",
      "organizer": {
        "id": "emp_001",
        "name": "김철수"
      },
      "attendee_count": 8,
      "status": "confirmed"
    },
    {
      "id": "rsv_002",
      "title": "프로젝트 미팅",
      "start_time": "14:00",
      "end_time": "15:30",
      "organizer": {
        "id": "emp_002",
        "name": "이영희"
      },
      "attendee_count": 12,
      "status": "confirmed"
    }
  ]
}
```

---

### 5. 여러 회의실 예약 현황 조회 (벌크)

<span class="api-method post">POST</span> `/rooms/reservations/bulk`

여러 회의실의 예약 현황을 한 번에 조회합니다.

**Request Body**

```json
{
  "room_ids": ["room_a2_1", "room_a2_2", "room_a2_3"],
  "date": "2024-01-15"
}
```

**Response**

```json
{
  "date": "2024-01-15",
  "results": {
    "room_a2_1": {
      "reservations": [...]
    },
    "room_a2_2": {
      "reservations": [...]
    },
    "room_a2_3": {
      "reservations": []
    }
  }
}
```

---

### 6. 회의실 예약 생성

<span class="api-method post">POST</span> `/rooms/{room_id}/reservations`

회의실을 예약합니다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `room_id` | string | 회의실 ID |

**Request Body**

```json
{
  "title": "프로젝트 킥오프",
  "date": "2024-01-15",
  "start_time": "14:00",
  "end_time": "15:00",
  "organizer_id": "emp_001",
  "attendees": [
    {"id": "emp_002", "type": "required"},
    {"id": "emp_003", "type": "optional"}
  ],
  "description": "신규 프로젝트 시작 회의",
  "recurrence": {
    "pattern": "weekly",
    "end_date": "2024-03-31"
  }
}
```

**Response**

```json
{
  "id": "rsv_new_001",
  "room_id": "room_a2_1",
  "title": "프로젝트 킥오프",
  "date": "2024-01-15",
  "start_time": "14:00",
  "end_time": "15:00",
  "status": "confirmed",
  "recurrence_id": "rec_001"
}
```

**에러 응답**

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "해당 시간대에 이미 예약이 있습니다.",
    "conflicting_reservation": {
      "id": "rsv_002",
      "start_time": "14:00",
      "end_time": "15:30"
    }
  }
}
```

---

### 7. 예약 수정

<span class="api-method put">PUT</span> `/reservations/{reservation_id}`

예약을 수정합니다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `reservation_id` | string | 예약 ID |

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `update_series` | boolean | X | 반복 예약 전체 수정 |

**Request Body**

```json
{
  "start_time": "15:00",
  "end_time": "16:00"
}
```

---

### 8. 예약 삭제

<span class="api-method delete">DELETE</span> `/reservations/{reservation_id}`

예약을 삭제합니다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `reservation_id` | string | 예약 ID |

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `delete_series` | boolean | X | 반복 예약 전체 삭제 |

## Adapter 구현

### 인터페이스

```python title="backend/services/adapters/room_adapter.py"
from abc import ABC, abstractmethod
from datetime import date
from models.room import Building, Floor, Room, Reservation

class RoomAdapter(ABC):
    """회의실 연동 어댑터 인터페이스"""

    @abstractmethod
    async def get_buildings(self) -> list[Building]:
        """건물 목록 조회"""
        pass

    @abstractmethod
    async def get_floors(self, building_id: str) -> list[Floor]:
        """층 목록 조회"""
        pass

    @abstractmethod
    async def get_rooms(
        self,
        floor_id: str,
        min_capacity: int | None = None,
        equipment: list[str] | None = None
    ) -> list[Room]:
        """회의실 목록 조회"""
        pass

    @abstractmethod
    async def get_reservations(
        self,
        room_id: str,
        date: date
    ) -> list[Reservation]:
        """회의실 예약 현황 조회"""
        pass

    @abstractmethod
    async def get_reservations_bulk(
        self,
        room_ids: list[str],
        date: date
    ) -> dict[str, list[Reservation]]:
        """여러 회의실 예약 현황 벌크 조회"""
        pass

    @abstractmethod
    async def create_reservation(
        self,
        room_id: str,
        title: str,
        date: date,
        start_time: str,
        end_time: str,
        organizer_id: str,
        attendees: list[dict] | None = None,
        recurrence: dict | None = None
    ) -> Reservation:
        """회의실 예약 생성"""
        pass

    @abstractmethod
    async def update_reservation(
        self,
        reservation_id: str,
        updates: dict,
        update_series: bool = False
    ) -> Reservation:
        """예약 수정"""
        pass

    @abstractmethod
    async def delete_reservation(
        self,
        reservation_id: str,
        delete_series: bool = False
    ) -> bool:
        """예약 삭제"""
        pass
```

### 구현 예시

```python title="backend/services/adapters/company_room_adapter.py"
import httpx
from datetime import date
from .room_adapter import RoomAdapter
from models.room import Building, Floor, Room, Reservation
from config import get_settings

settings = get_settings()

class CompanyRoomAdapter(RoomAdapter):
    """회사 회의실 예약 시스템 연동 어댑터"""

    def __init__(self):
        self.base_url = settings.room_api_url
        self.api_key = settings.room_api_key
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=30.0,
            headers={"X-API-Key": self.api_key}
        )

    async def get_buildings(self) -> list[Building]:
        """건물 목록 조회"""
        response = await self.client.get("/buildings")
        response.raise_for_status()

        return [
            Building(
                id=b["id"],
                name=b["name"],
                address=b.get("address"),
                floor_count=b.get("floor_count", 0)
            )
            for b in response.json()["buildings"]
        ]

    async def get_floors(self, building_id: str) -> list[Floor]:
        """층 목록 조회"""
        response = await self.client.get(f"/buildings/{building_id}/floors")
        response.raise_for_status()

        return [
            Floor(
                id=f["id"],
                name=f["name"],
                building_id=building_id,
                floor_number=f.get("floor_number")
            )
            for f in response.json()["floors"]
        ]

    async def get_rooms(
        self,
        floor_id: str,
        min_capacity: int | None = None,
        equipment: list[str] | None = None
    ) -> list[Room]:
        """회의실 목록 조회"""
        params = {}
        if min_capacity:
            params["min_capacity"] = min_capacity
        if equipment:
            params["equipment"] = ",".join(equipment)

        response = await self.client.get(
            f"/floors/{floor_id}/rooms",
            params=params
        )
        response.raise_for_status()

        return [
            Room(
                id=r["id"],
                name=r["name"],
                floor_id=floor_id,
                capacity=r["capacity"],
                equipment=r.get("equipment", []),
                is_active=r.get("is_active", True)
            )
            for r in response.json()["rooms"]
        ]

    async def get_reservations(
        self,
        room_id: str,
        target_date: date
    ) -> list[Reservation]:
        """회의실 예약 현황 조회"""
        response = await self.client.get(
            f"/rooms/{room_id}/reservations",
            params={"date": target_date.isoformat()}
        )
        response.raise_for_status()

        return [
            Reservation(
                id=r["id"],
                room_id=room_id,
                title=r["title"],
                date=target_date,
                start_time=r["start_time"],
                end_time=r["end_time"],
                organizer_id=r["organizer"]["id"],
                organizer_name=r["organizer"]["name"],
                status=r.get("status", "confirmed")
            )
            for r in response.json()["reservations"]
        ]

    async def get_reservations_bulk(
        self,
        room_ids: list[str],
        target_date: date
    ) -> dict[str, list[Reservation]]:
        """여러 회의실 예약 현황 벌크 조회"""
        response = await self.client.post(
            "/rooms/reservations/bulk",
            json={"room_ids": room_ids, "date": target_date.isoformat()}
        )
        response.raise_for_status()

        results = {}
        for room_id, data in response.json()["results"].items():
            results[room_id] = [
                Reservation(
                    id=r["id"],
                    room_id=room_id,
                    title=r["title"],
                    date=target_date,
                    start_time=r["start_time"],
                    end_time=r["end_time"],
                    organizer_id=r["organizer"]["id"],
                    organizer_name=r["organizer"]["name"],
                    status=r.get("status", "confirmed")
                )
                for r in data["reservations"]
            ]
        return results

    async def create_reservation(
        self,
        room_id: str,
        title: str,
        target_date: date,
        start_time: str,
        end_time: str,
        organizer_id: str,
        attendees: list[dict] | None = None,
        recurrence: dict | None = None
    ) -> Reservation:
        """회의실 예약 생성"""
        payload = {
            "title": title,
            "date": target_date.isoformat(),
            "start_time": start_time,
            "end_time": end_time,
            "organizer_id": organizer_id,
        }

        if attendees:
            payload["attendees"] = attendees
        if recurrence:
            payload["recurrence"] = recurrence

        response = await self.client.post(
            f"/rooms/{room_id}/reservations",
            json=payload
        )
        response.raise_for_status()

        r = response.json()
        return Reservation(
            id=r["id"],
            room_id=room_id,
            title=r["title"],
            date=target_date,
            start_time=r["start_time"],
            end_time=r["end_time"],
            organizer_id=organizer_id,
            status=r.get("status", "confirmed"),
            recurrence_id=r.get("recurrence_id")
        )
```

## 설정

```bash title=".env"
# 회의실 API 설정
ROOM_API_URL=https://room.company.com/api/v1
ROOM_API_AUTH_TYPE=api_key
ROOM_API_KEY=your-api-key-here

# 선택적 설정
ROOM_API_TIMEOUT=30
ROOM_API_CACHE_TTL=60  # 1분 캐시 (예약 현황)
```

## 회의실 장비 코드

| 코드 | 설명 |
|-----|------|
| `projector` | 프로젝터 |
| `whiteboard` | 화이트보드 |
| `monitor` | 대형 모니터 |
| `video_conference` | 화상회의 장비 |
| `phone` | 회의용 전화기 |
| `webcam` | 웹캠 |

## 에러 코드

| 코드 | HTTP Status | 설명 |
|-----|-------------|------|
| `CONFLICT` | 409 | 시간 충돌 |
| `NOT_FOUND` | 404 | 회의실/예약 없음 |
| `CAPACITY_EXCEEDED` | 400 | 수용 인원 초과 |
| `UNAUTHORIZED` | 401 | 인증 실패 |
| `FORBIDDEN` | 403 | 예약 권한 없음 |

## 다음 단계

- [SSO 연동](../guides/sso-integration.md)
- [데이터 모델 레퍼런스](../reference/data-models.md)
