# 빠른 시작

설치가 완료되었다면, 이 가이드를 따라 Meeting Scheduler AI의 주요 기능을 체험해보세요.

## 기본 사용법

### 1. 참석자 선택

왼쪽 사이드바에서 회의 참석자를 선택합니다.

<figure markdown="span">
  ![참석자 선택 화면](../assets/images/sidebar-attendees.png){ width="300" }
  <figcaption>사이드바에서 참석자 선택</figcaption>
</figure>

=== "개별 선택"

    1. **임직원** 탭 클릭
    2. 이름/부서/이메일로 검색
    3. 직원 클릭하여 추가

=== "팀 전체 선택"

    1. **팀/그룹** 탭 클릭
    2. 원하는 팀의 **전체 추가** 버튼 클릭

=== "내 그룹 선택"

    1. **팀/그룹** 탭 클릭
    2. 내 주소록에서 그룹 선택

!!! tip "참석자 유형"
    참석자는 세 가지 유형으로 구분됩니다:

    - **주관자**: 회의를 주최하는 사람 (1명, 개인만 가능)
    - **필수 참석자**: 반드시 참석해야 하는 사람
    - **선택 참석자**: 선택적으로 참석하는 사람

<figure markdown="span">
  ![참석자 드래그앤드롭](../assets/images/attendee-dragdrop.png){ width="300" }
  <figcaption>드래그앤드롭으로 참석자 유형 변경</figcaption>
</figure>

### 2. 회의실 선택

1. **건물** 선택
2. **층** 선택
3. 타임라인에서 원하는 시간대를 **드래그**하여 선택

<figure markdown="span">
  ![회의실 타임라인](../assets/images/room-timeline.png){ width="100%" }
  <figcaption>회의실별 타임라인 - 시간대 드래그로 선택</figcaption>
</figure>

### 3. 예약 완료

1. **예약하기** 버튼 클릭
2. 회의 제목 입력
3. 반복 설정 (필요시)
4. **예약하기** 확인

<figure markdown="span">
  ![예약 모달](../assets/images/reservation-modal.png){ width="400" }
  <figcaption>예약 확인 모달</figcaption>
</figure>

## AI 어시스턴트 사용

우측 하단의 채팅 버튼을 클릭하여 AI 어시스턴트를 사용할 수 있습니다.

<figure markdown="span">
  ![AI 채팅](../assets/images/ai-chat.png){ width="350" }
  <figcaption>AI 어시스턴트와 자연어로 예약</figcaption>
</figure>

### 예시 명령어

```
김철수, 이영희와 내일 오후 2시에 본관 대회의실 예약해줘
```

```
개발팀 전체 회의 잡아줘. 1시간짜리.
```

```
다음 주 월요일 프로젝트 A팀 주간 회의 예약해줘
```

### 빠른 적용 기능

AI 응답에 건물, 층, 회의실, 참석자 등이 언급되면 **빠른 적용** 버튼이 표시됩니다.
버튼을 클릭하면 해당 내용이 자동으로 UI에 적용됩니다.

<figure markdown="span">
  ![빠른 적용 버튼](../assets/images/quick-apply.png){ width="350" }
  <figcaption>AI 응답의 빠른 적용 버튼</figcaption>
</figure>

### 최적 시간 추천

1. 참석자를 선택한 상태에서
2. 사이드바의 **추천 시간대** 패널에서 추천 시간 확인
3. 추천된 시간 중 원하는 시간 클릭하여 자동 선택

<figure markdown="span">
  ![최적 시간 추천](../assets/images/optimal-times.png){ width="300" }
  <figcaption>참석자 일정 기반 최적 시간 추천</figcaption>
</figure>

### 참석자 일정 충돌 표시

참석자가 선택되면 타임라인에 해당 참석자들의 일정 충돌이 표시됩니다.

<figure markdown="span">
  ![일정 충돌 표시](../assets/images/busy-times.png){ width="100%" }
  <figcaption>오렌지색 빗금으로 참석자 일정 충돌 표시</figcaption>
</figure>

## 내 예약 관리

상단의 **내 예약** 버튼을 클릭하여 예약을 관리합니다.

<figure markdown="span">
  ![내 예약 관리](../assets/images/my-reservations.png){ width="100%" }
  <figcaption>내 예약 목록 및 관리</figcaption>
</figure>

### 필터링

- **예정된 예약**: 오늘 이후 예약
- **지난 예약**: 이미 지난 예약
- **전체**: 모든 예약

### 예약 삭제

- **이것만**: 해당 예약만 삭제
- **모두**: 반복 예약 전체 삭제

## 우클릭 컨텍스트 메뉴

타임라인에서 우클릭하면 상황별 컨텍스트 메뉴가 나타납니다.

<figure markdown="span">
  ![컨텍스트 메뉴](../assets/images/context-menu.png){ width="200" }
  <figcaption>우클릭 컨텍스트 메뉴</figcaption>
</figure>

- **빈 시간대**: 30분/1시간/2시간 선택, 정시까지 선택, 추천 시간
- **선택된 시간대**: 예약하기, 선택 해제
- **예약된 시간대**: 예약 상세 보기

## 반복 회의 설정

예약 시 반복 옵션을 선택할 수 있습니다:

| 옵션 | 설명 |
|-----|------|
| 반복 안함 | 단일 예약 |
| 매일 | 매일 같은 시간에 반복 |
| 매주 | 매주 같은 요일에 반복 |
| 격주 | 2주마다 같은 요일에 반복 |
| 매월 | 매월 같은 날짜에 반복 |

!!! warning "반복 종료일"
    반복 회의 설정 시 반드시 **반복 종료 날짜**를 지정해야 합니다.

## 다음 단계

시스템을 사내 환경에 맞게 설정하려면 API 연동 가이드를 참고하세요:

- [직원 조회 API 연동](../api/employee-api.md)
- [일정 조회 API 연동](../api/calendar-api.md)
- [회의실 API 연동](../api/room-api.md)
