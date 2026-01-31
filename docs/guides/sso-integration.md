# SSO 연동 가이드

기업 IdP(Identity Provider)와 SAML 2.0 기반 SSO를 연동하는 방법을 설명합니다.

## 개요

SSO(Single Sign-On) 연동을 통해:

- 사용자는 기업 계정으로 로그인
- 별도 계정 생성 불필요
- 중앙화된 접근 제어
- 감사 로그 통합

## 지원 IdP

| IdP | SAML 2.0 | OIDC | 테스트 완료 |
|-----|----------|------|------------|
| Microsoft ADFS | :material-check: | :material-check: | :material-check: |
| Azure AD | :material-check: | :material-check: | :material-check: |
| Okta | :material-check: | :material-check: | :material-check: |
| OneLogin | :material-check: | :material-check: | :material-check: |
| Google Workspace | :material-close: | :material-check: | :material-check: |
| PingFederate | :material-check: | :material-check: | :material-minus: |

## SAML 2.0 연동

### 1단계: IdP 등록 정보 확인

IdP 관리자에게 다음 정보를 요청합니다:

- **IdP Entity ID**: IdP 식별자
- **SSO URL**: 로그인 엔드포인트
- **SLO URL**: 로그아웃 엔드포인트 (선택)
- **X.509 Certificate**: 서명 검증용 인증서

### 2단계: SP 메타데이터 제공

IdP 관리자에게 SP(Service Provider) 정보를 제공합니다:

```xml title="SP Metadata"
<?xml version="1.0"?>
<EntityDescriptor
    xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
    entityID="https://meeting.company.com/saml/metadata">

    <SPSSODescriptor
        protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"
        AuthnRequestsSigned="true"
        WantAssertionsSigned="true">

        <NameIDFormat>
            urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress
        </NameIDFormat>

        <AssertionConsumerService
            Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
            Location="https://meeting.company.com/api/auth/saml/acs"
            index="0"
            isDefault="true"/>

        <SingleLogoutService
            Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
            Location="https://meeting.company.com/api/auth/saml/slo"/>

    </SPSSODescriptor>
</EntityDescriptor>
```

또는 메타데이터 URL 제공:

```
https://meeting.company.com/api/auth/saml/metadata
```

### 3단계: 속성 매핑 설정

IdP에서 전달할 사용자 속성을 설정합니다:

| SAML Attribute | 용도 | 필수 |
|----------------|------|------|
| `NameID` | 사용자 고유 식별자 | :material-check: |
| `email` | 이메일 주소 | :material-check: |
| `displayName` | 표시 이름 | :material-check: |
| `employeeId` | 직원 ID | :material-check: |
| `department` | 부서 | :material-minus: |
| `groups` | 그룹 멤버십 | :material-minus: |

### 4단계: 환경 변수 설정

```bash title=".env"
# SSO 활성화
AUTH_ENABLED=true
AUTH_PROVIDER=saml

# SAML 설정
SAML_ENTITY_ID=https://meeting.company.com/saml/metadata
SAML_IDP_ENTITY_ID=https://idp.company.com/saml
SAML_IDP_SSO_URL=https://idp.company.com/saml/sso
SAML_IDP_SLO_URL=https://idp.company.com/saml/slo
SAML_IDP_CERTIFICATE_PATH=/etc/ssl/idp-cert.pem

# SP 인증서 (선택, 서명된 요청 시)
SAML_SP_CERTIFICATE_PATH=/etc/ssl/sp-cert.pem
SAML_SP_PRIVATE_KEY_PATH=/etc/ssl/sp-key.pem

# 속성 매핑
SAML_ATTR_EMAIL=http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress
SAML_ATTR_NAME=http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name
SAML_ATTR_EMPLOYEE_ID=http://schemas.company.com/claims/employeeId
SAML_ATTR_GROUPS=http://schemas.xmlsoap.org/claims/Group

# 콜백 URL
SAML_ACS_URL=https://meeting.company.com/api/auth/saml/acs
SAML_SLO_URL=https://meeting.company.com/api/auth/saml/slo
```

### 5단계: 테스트

```bash
# SAML 설정 검증
python -m backend.auth.saml_validator

# 로그인 테스트
curl -v https://meeting.company.com/api/auth/saml/login
```

## IdP별 설정 가이드

### Microsoft ADFS

=== "ADFS 설정"

    1. **ADFS 관리 콘솔** 열기
    2. **신뢰 당사자 트러스트** → **신뢰 당사자 트러스트 추가**
    3. **데이터 원본 선택**: "신뢰 당사자에 대한 데이터를 수동으로 입력"
    4. **표시 이름**: "Meeting Scheduler"
    5. **프로필**: "AD FS 프로필"
    6. **URL 구성**:
        - SAML 2.0 WebSSO 프로토콜 지원 사용
        - URL: `https://meeting.company.com/api/auth/saml/acs`
    7. **식별자**: `https://meeting.company.com/saml/metadata`

=== "클레임 규칙"

    ```
    규칙 1: LDAP 속성을 클레임으로 전송
    - 저장소: Active Directory
    - 매핑:
      - E-Mail-Addresses → E-Mail Address
      - Display-Name → Name
      - Employee-ID → employeeId

    규칙 2: 그룹 멤버십 전송
    - 들어오는 클레임: Token Groups - Unqualified Names
    - 나가는 클레임: Group
    ```

### Azure AD

=== "엔터프라이즈 애플리케이션 등록"

    1. Azure Portal → **Azure Active Directory** → **엔터프라이즈 애플리케이션**
    2. **새 애플리케이션** → **나만의 애플리케이션 만들기**
    3. 이름: "Meeting Scheduler"
    4. **Single Sign-On** → **SAML**
    5. 기본 SAML 구성:
        - 식별자(엔터티 ID): `https://meeting.company.com/saml/metadata`
        - 회신 URL: `https://meeting.company.com/api/auth/saml/acs`
        - 로그아웃 URL: `https://meeting.company.com/api/auth/saml/slo`

=== "환경 변수"

    ```bash
    SAML_IDP_ENTITY_ID=https://sts.windows.net/{tenant-id}/
    SAML_IDP_SSO_URL=https://login.microsoftonline.com/{tenant-id}/saml2
    SAML_IDP_SLO_URL=https://login.microsoftonline.com/{tenant-id}/saml2
    ```

### Okta

=== "애플리케이션 생성"

    1. Okta Admin → **Applications** → **Create App Integration**
    2. Sign-in method: **SAML 2.0**
    3. General Settings:
        - App name: "Meeting Scheduler"
    4. SAML Settings:
        - Single sign on URL: `https://meeting.company.com/api/auth/saml/acs`
        - Audience URI: `https://meeting.company.com/saml/metadata`
        - Name ID format: EmailAddress
        - Application username: Email

=== "속성 매핑"

    | Name | Value |
    |------|-------|
    | email | user.email |
    | displayName | user.displayName |
    | employeeId | user.employeeNumber |
    | groups | appuser.groups |

## 문제 해결

### 일반적인 오류

#### "Invalid SAML Response"

```
원인: 시간 동기화 문제 또는 인증서 불일치

해결:
1. 서버 시간 확인 (NTP 동기화)
2. IdP 인증서 갱신 확인
3. SAML Response 디버깅:
   export SAML_DEBUG=true
   python -m backend.auth.saml_debug
```

#### "NameID not found"

```
원인: IdP에서 NameID를 전송하지 않음

해결:
1. IdP 클레임 규칙 확인
2. NameID 형식 확인 (emailAddress 권장)
```

#### "Signature validation failed"

```
원인: 인증서 불일치

해결:
1. IdP 메타데이터에서 최신 인증서 다운로드
2. SAML_IDP_CERTIFICATE_PATH 업데이트
3. 서비스 재시작
```

### 디버깅

```bash
# SAML 요청/응답 로깅 활성화
export SAML_DEBUG=true
export LOG_LEVEL=DEBUG

# SAML Response 디코딩
echo "BASE64_SAML_RESPONSE" | base64 -d | xmllint --format -

# 인증서 검증
openssl x509 -in /etc/ssl/idp-cert.pem -text -noout
```

## 보안 고려사항

!!! warning "보안 체크리스트"

    - [x] HTTPS 필수 (HTTP 비허용)
    - [x] 서명된 SAML Response 필수
    - [x] 암호화된 Assertion 권장
    - [x] Replay Attack 방지 (nonce 검증)
    - [x] 시간 검증 (NotBefore, NotOnOrAfter)

### 인증서 관리

```bash
# SP 인증서 생성 (2년 유효)
openssl req -x509 -nodes -days 730 \
    -newkey rsa:2048 \
    -keyout sp-key.pem \
    -out sp-cert.pem \
    -subj "/CN=meeting.company.com"

# 인증서 만료일 확인
openssl x509 -enddate -noout -in sp-cert.pem
```

## 다음 단계

- [OAuth 2.0 설정](oauth-setup.md)
- [권한 관리 설정](../reference/data-models.md)
