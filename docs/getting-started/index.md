# 시작하기

Meeting Scheduler AI를 사내 환경에 도입하기 위한 가이드입니다.

## 사전 요구사항

### 시스템 요구사항

| 구분 | 최소 사양 | 권장 사양 |
|------|----------|----------|
| CPU | 2 Core | 4 Core 이상 |
| Memory | 4GB | 8GB 이상 |
| Storage | 10GB | 50GB 이상 |
| OS | Ubuntu 20.04+ / Windows Server 2019+ | Ubuntu 22.04 LTS |

### 소프트웨어 요구사항

- **Python**: 3.10 이상
- **Node.js**: 18.x 이상
- **npm**: 9.x 이상
- **Git**: 2.x 이상

### 외부 서비스

- **LLM API Key**: Anthropic Claude, OpenAI GPT-4, Google Gemini 중 하나
- **사내 API 접근 권한**: HR, 캘린더, 회의실 시스템

## 도입 절차

```mermaid
graph LR
    A[환경 구성] --> B[API 연동]
    B --> C[인증 설정]
    C --> D[테스트]
    D --> E[운영 배포]
```

### 1단계: 환경 구성

기본 시스템을 설치하고 설정합니다.

[:octicons-arrow-right-24: 설치 가이드](installation.md)

### 2단계: API 연동

사내 시스템과 연동합니다.

- [직원 조회 API 연동](../api/employee-api.md)
- [일정 조회 API 연동](../api/calendar-api.md)
- [회의실 API 연동](../api/room-api.md)

### 3단계: 인증 설정

SSO 또는 OAuth 2.0을 설정합니다.

[:octicons-arrow-right-24: SSO 연동 가이드](../guides/sso-integration.md)

### 4단계: 테스트 및 배포

[:octicons-arrow-right-24: 빠른 시작](quickstart.md)

## 다음 단계

- [설치하기](installation.md)
- [아키텍처 이해하기](architecture.md)
