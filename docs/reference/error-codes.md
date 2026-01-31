# 에러 코드

API에서 반환하는 에러 코드와 해결 방법입니다.

## 에러 응답 형식

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자에게 표시할 메시지",
    "details": {
      // 추가 정보 (선택)
    }
  }
}
```

## HTTP 상태 코드

| 코드 | 의미 | 설명 |
|-----|------|------|
| 200 | OK | 성공 |
| 201 | Created | 리소스 생성 성공 |
| 400 | Bad Request | 잘못된 요청 |
| 401 | Unauthorized | 인증 필요 |
| 403 | Forbidden | 권한 없음 |
| 404 | Not Found | 리소스 없음 |
| 409 | Conflict | 충돌 (예: 중복 예약) |
| 429 | Too Many Requests | 요청 한도 초과 |
| 500 | Internal Server Error | 서버 오류 |
| 502 | Bad Gateway | 외부 서비스 오류 |
| 503 | Service Unavailable | 서비스 불가 |

## 인증 관련 에러

### AUTH_001: 인증 필요

```json
{
  "error": {
    "code": "AUTH_001",
    "message": "로그인이 필요합니다."
  }
}
```

**원인**: 인증되지 않은 상태에서 보호된 리소스 접근

**해결**: 로그인 후 재시도

---

### AUTH_002: 토큰 만료

```json
{
  "error": {
    "code": "AUTH_002",
    "message": "세션이 만료되었습니다. 다시 로그인해주세요."
  }
}
```

**원인**: 액세스 토큰 또는 세션 만료

**해결**: 토큰 갱신 또는 재로그인

---

### AUTH_003: 권한 없음

```json
{
  "error": {
    "code": "AUTH_003",
    "message": "이 작업을 수행할 권한이 없습니다."
  }
}
```

**원인**: 필요한 권한이 없음

**해결**: 관리자에게 권한 요청

---

### AUTH_004: 잘못된 자격 증명

```json
{
  "error": {
    "code": "AUTH_004",
    "message": "사용자 인증에 실패했습니다."
  }
}
```

**원인**: 잘못된 사용자명/비밀번호 또는 SSO 실패

**해결**: 자격 증명 확인 후 재시도

## 예약 관련 에러

### RSV_001: 시간 충돌

```json
{
  "error": {
    "code": "RSV_001",
    "message": "해당 시간에 이미 예약이 있습니다.",
    "details": {
      "conflicting_reservation": {
        "id": "rsv_002",
        "title": "기존 회의",
        "start_time": "14:00",
        "end_time": "15:30"
      }
    }
  }
}
```

**원인**: 요청한 시간대에 이미 예약 존재

**해결**: 다른 시간대 선택

---

### RSV_002: 수용 인원 초과

```json
{
  "error": {
    "code": "RSV_002",
    "message": "회의실 수용 인원을 초과했습니다.",
    "details": {
      "room_capacity": 10,
      "requested_attendees": 15
    }
  }
}
```

**원인**: 참석자 수가 회의실 수용 인원 초과

**해결**: 더 큰 회의실 선택 또는 참석자 조정

---

### RSV_003: 예약 없음

```json
{
  "error": {
    "code": "RSV_003",
    "message": "예약을 찾을 수 없습니다."
  }
}
```

**원인**: 존재하지 않는 예약 ID

**해결**: 예약 ID 확인

---

### RSV_004: 수정 권한 없음

```json
{
  "error": {
    "code": "RSV_004",
    "message": "이 예약을 수정할 권한이 없습니다."
  }
}
```

**원인**: 예약 주관자가 아님

**해결**: 주관자에게 수정 요청

---

### RSV_005: 과거 시간 예약 불가

```json
{
  "error": {
    "code": "RSV_005",
    "message": "과거 시간에는 예약할 수 없습니다."
  }
}
```

**원인**: 과거 시간대 예약 시도

**해결**: 현재 이후 시간 선택

## 직원 관련 에러

### EMP_001: 직원 없음

```json
{
  "error": {
    "code": "EMP_001",
    "message": "직원을 찾을 수 없습니다."
  }
}
```

**원인**: 존재하지 않는 직원 ID

**해결**: 직원 ID 확인

---

### EMP_002: 검색 결과 없음

```json
{
  "error": {
    "code": "EMP_002",
    "message": "검색 결과가 없습니다.",
    "details": {
      "query": "홍길동"
    }
  }
}
```

**원인**: 검색 조건에 맞는 직원 없음

**해결**: 다른 검색어 시도

## 캘린더 관련 에러

### CAL_001: 일정 조회 실패

```json
{
  "error": {
    "code": "CAL_001",
    "message": "일정을 조회할 수 없습니다."
  }
}
```

**원인**: 캘린더 API 오류 또는 권한 없음

**해결**: 잠시 후 재시도 또는 권한 확인

---

### CAL_002: 일정 생성 실패

```json
{
  "error": {
    "code": "CAL_002",
    "message": "일정을 생성할 수 없습니다.",
    "details": {
      "reason": "참석자 캘린더에 접근 권한이 없습니다."
    }
  }
}
```

**원인**: 캘린더 API 오류 또는 권한 문제

**해결**: 참석자 권한 확인

## 회의실 관련 에러

### ROOM_001: 회의실 없음

```json
{
  "error": {
    "code": "ROOM_001",
    "message": "회의실을 찾을 수 없습니다."
  }
}
```

**원인**: 존재하지 않는 회의실 ID

**해결**: 회의실 ID 확인

---

### ROOM_002: 회의실 사용 불가

```json
{
  "error": {
    "code": "ROOM_002",
    "message": "이 회의실은 현재 사용할 수 없습니다.",
    "details": {
      "reason": "maintenance"
    }
  }
}
```

**원인**: 회의실 비활성화 또는 점검 중

**해결**: 다른 회의실 선택

## 채팅 관련 에러

### CHAT_001: 메시지 처리 실패

```json
{
  "error": {
    "code": "CHAT_001",
    "message": "메시지를 처리할 수 없습니다. 다시 시도해주세요."
  }
}
```

**원인**: LLM API 오류

**해결**: 잠시 후 재시도

---

### CHAT_002: 대화 없음

```json
{
  "error": {
    "code": "CHAT_002",
    "message": "대화를 찾을 수 없습니다."
  }
}
```

**원인**: 존재하지 않는 대화 ID

**해결**: 새 대화 시작

## 시스템 에러

### SYS_001: 서버 오류

```json
{
  "error": {
    "code": "SYS_001",
    "message": "시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
  }
}
```

**원인**: 예상치 못한 서버 오류

**해결**: 잠시 후 재시도, 지속 시 관리자 문의

---

### SYS_002: 외부 서비스 오류

```json
{
  "error": {
    "code": "SYS_002",
    "message": "외부 서비스 연결에 실패했습니다.",
    "details": {
      "service": "calendar"
    }
  }
}
```

**원인**: 외부 API (HR, 캘린더, 회의실) 연결 실패

**해결**: 잠시 후 재시도

---

### SYS_003: 요청 한도 초과

```json
{
  "error": {
    "code": "SYS_003",
    "message": "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
    "details": {
      "retry_after": 60
    }
  }
}
```

**원인**: Rate limit 초과

**해결**: `retry_after` 시간 후 재시도

## 에러 처리 예시

### 프론트엔드

```typescript
async function handleApiError(response: Response) {
  if (!response.ok) {
    const error = await response.json();

    switch (error.error.code) {
      case 'AUTH_002':
        // 토큰 갱신 시도
        await refreshToken();
        return retry();

      case 'RSV_001':
        // 충돌 정보 표시
        showConflictDialog(error.error.details.conflicting_reservation);
        break;

      case 'SYS_003':
        // 재시도 대기
        await sleep(error.error.details.retry_after * 1000);
        return retry();

      default:
        showErrorMessage(error.error.message);
    }
  }
}
```

### 백엔드

```python
from fastapi import HTTPException

class APIError(HTTPException):
    def __init__(self, code: str, message: str, status_code: int = 400, details: dict = None):
        super().__init__(
            status_code=status_code,
            detail={
                "error": {
                    "code": code,
                    "message": message,
                    "details": details
                }
            }
        )

# 사용 예시
raise APIError(
    code="RSV_001",
    message="해당 시간에 이미 예약이 있습니다.",
    status_code=409,
    details={"conflicting_reservation": existing_reservation}
)
```
