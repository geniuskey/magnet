# LLM Function Calling API

AI 어시스턴트가 회의실 예약 시스템을 제어하기 위한 함수 목록입니다.

## 개요

이 함수들은 `ReservationContext`에서 제공되며, AI 어시스턴트가 자연어 명령을 시스템 동작으로 변환할 때 사용합니다.

```javascript
import { useReservation } from '../context/ReservationContext';

const {
  // LLM 제어 함수들
  setOrganizerByName,
  setParticipantsByNames,
  setDateByString,
  // ...
} = useReservation();
```

---

## 참석자 관리

### setOrganizerByName

주관자를 이름으로 설정합니다.

```typescript
setOrganizerByName(name: string): Employee | null
```

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `name` | string | 주관자 이름 (부분 매칭 지원) |

**반환값**: 설정된 직원 객체 또는 `null` (찾지 못한 경우)

**예시**:
```javascript
const organizer = setOrganizerByName("김철수");
// { id: "emp_1", name: "김철수", department: "개발팀", ... }
```

---

### setParticipantsByNames

참석자를 이름 목록으로 설정합니다.

```typescript
setParticipantsByNames(
  names: string[],
  type?: 'REQUIRED' | 'OPTIONAL'
): Employee[]
```

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `names` | string[] | - | 참석자 이름 목록 |
| `type` | string | `'REQUIRED'` | 참석자 유형 |

**예시**:
```javascript
// 필수 참석자 추가
setParticipantsByNames(["박영희", "이민수"], "REQUIRED");

// 선택 참석자 추가
setParticipantsByNames(["정하나"], "OPTIONAL");
```

---

### searchEmployees

임직원을 검색합니다.

```typescript
searchEmployees(query: string): EmployeeSummary[]
```

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `query` | string | 검색어 (이름, 부서, 직책, 이메일) |

**반환값**: 최대 20개의 직원 정보 배열

**예시**:
```javascript
const results = searchEmployees("개발");
// [
//   { id: "emp_1", name: "김철수", department: "개발팀", position: "팀장", email: "..." },
//   { id: "emp_2", name: "박영희", department: "개발팀", position: "선임", email: "..." },
// ]
```

---

## 장소 설정

### setBuildingByName

건물을 이름으로 선택합니다.

```typescript
setBuildingByName(name: string): Building | null
```

**예시**:
```javascript
setBuildingByName("본사");
// { id: "building_1", name: "본사 빌딩", address: "..." }
```

---

### setFloorByName

층을 이름으로 선택합니다.

```typescript
setFloorByName(
  floorName: string,
  buildingName?: string
): Floor | null
```

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `floorName` | string | 층 이름 (예: "10층", "B1") |
| `buildingName` | string? | 건물 이름 (생략 시 현재 선택된 건물) |

**예시**:
```javascript
setFloorByName("10층", "본사");
```

---

### setRoomByName

회의실을 이름으로 선택합니다.

```typescript
setRoomByName(roomName: string): Room | null
```

**예시**:
```javascript
const room = setRoomByName("회의실 A");
// { id: "room_1", name: "회의실 A", capacity: 10, ... }
```

---

### getAvailableRooms

특정 시간대에 예약 가능한 회의실 목록을 조회합니다.

```typescript
getAvailableRooms(
  startTime: string,
  endTime: string,
  date?: string
): RoomInfo[]
```

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `startTime` | string | - | 시작 시간 (HH:MM) |
| `endTime` | string | - | 종료 시간 (HH:MM) |
| `date` | string? | 선택된 날짜 | 조회 날짜 (YYYY-MM-DD) |

**예시**:
```javascript
const rooms = getAvailableRooms("14:00", "15:00");
// [
//   { id: "room_1", name: "회의실 A", capacity: 10, floor: "10F", amenities: ["projector"] },
//   { id: "room_2", name: "회의실 B", capacity: 6, floor: "10F", amenities: [] },
// ]
```

---

## 시간 설정

### setDateByString

날짜를 자연어 또는 문자열로 설정합니다.

```typescript
setDateByString(dateStr: string): string | null
```

**지원하는 형식**:

| 입력 | 결과 |
|------|------|
| `"오늘"`, `"today"` | 오늘 날짜 |
| `"내일"`, `"tomorrow"` | 내일 날짜 |
| `"모레"` | 모레 날짜 |
| `"다음 주"`, `"next week"` | 7일 후 |
| `"월요일"` ~ `"금요일"` | 다음 해당 요일 |
| `"2024-01-15"` | 지정된 날짜 |

**예시**:
```javascript
setDateByString("내일");        // "2024-01-16"
setDateByString("다음 주 월요일"); // "2024-01-22"
setDateByString("2024-02-01");  // "2024-02-01"
```

---

### setTimeByRange

시간 범위를 선택합니다.

```typescript
setTimeByRange(
  startTime: string,
  endTime: string,
  roomId?: string
): boolean
```

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `startTime` | string | 시작 시간 (HH:MM) |
| `endTime` | string | 종료 시간 (HH:MM) |
| `roomId` | string? | 회의실 ID (생략 시 현재 선택된 회의실) |

**반환값**: 성공 여부 (`false`: 이미 예약된 시간)

**예시**:
```javascript
setTimeByRange("14:00", "15:00", "room_1"); // true
```

---

### setRecurrenceByString

반복 일정을 자연어로 설정합니다.

```typescript
setRecurrenceByString(
  typeStr: string,
  endDateStr?: string
): RecurrenceType
```

**지원하는 반복 유형**:

| 입력 | 결과 |
|------|------|
| `"매일"`, `"daily"` | 매일 반복 |
| `"매주"`, `"weekly"` | 매주 반복 |
| `"격주"`, `"biweekly"` | 격주 반복 |
| `"매월"`, `"monthly"` | 매월 반복 |

**예시**:
```javascript
setRecurrenceByString("매주", "2024-03-31");
```

---

## 예약 관리

### createQuickReservation

한 번의 호출로 예약을 생성합니다.

```typescript
createQuickReservation(options: {
  title?: string;
  organizerName?: string;
  requiredNames?: string[];
  optionalNames?: string[];
  roomName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  recurrenceType?: string;
  recurrenceEnd?: string;
}): Promise<ReservationResult>
```

**예시**:
```javascript
const result = await createQuickReservation({
  title: "주간 회의",
  organizerName: "김철수",
  requiredNames: ["박영희", "이민수"],
  optionalNames: ["정하나"],
  roomName: "회의실 A",
  date: "내일",
  startTime: "14:00",
  endTime: "15:00",
  recurrenceType: "매주",
  recurrenceEnd: "2024-03-31"
});

// { success: true, reservation: { id: "res_123", ... } }
// 또는 { success: false, error: "회의실 \"회의실 A\" 찾을 수 없음" }
```

---

### getMyReservationList

내 예약 목록을 조회합니다.

```typescript
getMyReservationList(date?: string): ReservationSummary[]
```

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `date` | string? | 특정 날짜 필터 (YYYY-MM-DD) |

**예시**:
```javascript
const reservations = getMyReservationList("2024-01-15");
// [
//   {
//     id: "res_1",
//     title: "주간 회의",
//     date: "2024-01-15",
//     startTime: "14:00",
//     endTime: "15:00",
//     roomId: "room_1",
//     roomName: "회의실 A",
//     participants: 5,
//     isRecurring: true
//   }
// ]
```

---

### cancelReservationByTime

회의실 이름과 시간으로 예약을 취소합니다.

```typescript
cancelReservationByTime(
  roomName: string,
  startTime: string,
  date?: string
): CancelResult
```

**예시**:
```javascript
const result = cancelReservationByTime("회의실 A", "14:00");
// { success: true, deletedReservation: { ... } }
// 또는 { success: false, error: "해당 예약을 찾을 수 없음" }
```

---

## 상태 조회

### getCurrentState

현재 선택 상태를 요약합니다.

```typescript
getCurrentState(): StateSnapshot
```

**반환값**:
```typescript
{
  // 참석자
  organizer: { id: string, name: string } | null,
  requiredAttendees: { id: string, name: string }[],
  optionalAttendees: { id: string, name: string }[],
  totalParticipants: number,

  // 장소
  building: { id: string, name: string } | null,
  floors: string[],
  room: { id: string, name: string } | null,

  // 시간
  date: string,
  timeSlots: {
    start: string,
    end: string,
    count: number,
    durationMinutes: number
  } | null,

  // 회의 정보
  title: string,
  recurrence: string,
  recurrenceEndDate: string | null,

  // 추천
  optimalTimesCount: number
}
```

**예시**:
```javascript
const state = getCurrentState();
console.log(`참석자 ${state.totalParticipants}명, ${state.room?.name}에서 ${state.timeSlots?.durationMinutes}분 회의`);
```

---

### getParticipantSchedules

참석자들의 일정을 조회합니다.

```typescript
getParticipantSchedules(
  participantIds: string[],
  date: string
): ParticipantSchedule[]
```

**예시**:
```javascript
const schedules = getParticipantSchedules(["emp_1", "emp_2"], "2024-01-15");
// [
//   {
//     employee: { id: "emp_1", name: "김철수", ... },
//     schedule: [
//       { date: "2024-01-15", startTime: "10:00", endTime: "11:00", title: "팀 미팅" }
//     ]
//   }
// ]
```

---

### findOptimalTimes

참석자들이 모두 참석 가능한 최적 시간을 찾습니다.

```typescript
findOptimalTimes(durationMinutes?: number): OptimalTime[]
```

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `durationMinutes` | number | 60 | 회의 시간 (분) |

**반환값**:
```typescript
{
  startTime: string;
  endTime: string;
  requiredScore: number;           // 참석 가능한 필수 참석자 수
  optionalScore: number;           // 참석 가능한 선택 참석자 수
  totalScore: number;              // 종합 점수
  availableRequired: Employee[];   // 참석 가능한 필수 참석자
  unavailableRequired: Employee[]; // 참석 불가한 필수 참석자
  availableOptional: Employee[];   // 참석 가능한 선택 참석자
  unavailableOptional: Employee[]; // 참석 불가한 선택 참석자
  availableRooms: Room[];          // 예약 가능한 회의실
  isAllRequiredAvailable: boolean; // 필수 참석자 전원 가능 여부
}[]
```

**예시**:
```javascript
const times = findOptimalTimes(60);
// [
//   {
//     startTime: "14:00",
//     endTime: "15:00",
//     requiredScore: 3,
//     optionalScore: 2,
//     isAllRequiredAvailable: true,
//     availableRooms: [{ id: "room_1", name: "회의실 A", ... }],
//     ...
//   }
// ]
```

---

## 함수 요약

| 카테고리 | 함수 | 설명 |
|---------|------|------|
| **참석자** | `setOrganizerByName` | 주관자 설정 |
| | `setParticipantsByNames` | 참석자 추가 |
| | `searchEmployees` | 임직원 검색 |
| **장소** | `setBuildingByName` | 건물 선택 |
| | `setFloorByName` | 층 선택 |
| | `setRoomByName` | 회의실 선택 |
| | `getAvailableRooms` | 가용 회의실 조회 |
| **시간** | `setDateByString` | 날짜 설정 (자연어) |
| | `setTimeByRange` | 시간 범위 선택 |
| | `setRecurrenceByString` | 반복 설정 |
| **예약** | `createQuickReservation` | 간편 예약 생성 |
| | `getMyReservationList` | 내 예약 조회 |
| | `cancelReservationByTime` | 예약 취소 |
| **상태** | `getCurrentState` | 현재 상태 요약 |
| | `getParticipantSchedules` | 참석자 일정 조회 |
| | `findOptimalTimes` | 최적 시간 추천 |
