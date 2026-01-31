# 설치

## 저장소 클론

```bash
git clone https://github.com/geniuskey/magnet.git
cd magnet
```

## 백엔드 설치

### Python 환경 설정

=== "venv (권장)"

    ```bash
    cd backend
    python -m venv venv

    # Linux/Mac
    source venv/bin/activate

    # Windows
    .\venv\Scripts\activate

    pip install -r requirements.txt
    ```

=== "conda"

    ```bash
    conda create -n magnet python=3.11
    conda activate magnet
    cd backend
    pip install -r requirements.txt
    ```

=== "Poetry"

    ```bash
    cd backend
    poetry install
    poetry shell
    ```

### 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 설정합니다:

```bash title=".env"
# LLM Provider 설정 (하나만 선택)
LLM_PROVIDER=anthropic  # anthropic, openai, gemini

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-xxxxx

# OpenAI (대안)
# OPENAI_API_KEY=sk-xxxxx

# Google Gemini (대안)
# GOOGLE_API_KEY=xxxxx

# 서버 설정
HOST=0.0.0.0
PORT=8080
DEBUG=false

# 외부 API 연동 (연동 완료 후 설정)
EMPLOYEE_API_URL=https://hr.company.com/api
CALENDAR_API_URL=https://calendar.company.com/api
ROOM_API_URL=https://room.company.com/api
API_CLIENT_ID=your-client-id
API_CLIENT_SECRET=your-client-secret

# SSO 설정 (연동 완료 후 설정)
SSO_ENABLED=false
SSO_PROVIDER=saml  # saml, oidc
SSO_ISSUER_URL=https://idp.company.com
```

### 백엔드 실행

```bash
# 개발 모드
uvicorn main:app --reload --host 0.0.0.0 --port 8080

# 프로덕션 모드
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8080
```

## 프론트엔드 설치

### Node.js 의존성 설치

```bash
cd frontend
npm install
```

### 환경 변수 설정

```bash title=".env.local"
VITE_API_URL=http://localhost:8080
```

### 프론트엔드 실행

=== "개발 모드"

    ```bash
    npm run dev
    ```

=== "프로덕션 빌드"

    ```bash
    npm run build
    npm run preview
    ```

## Docker 설치 (선택)

Docker Compose를 사용하면 더 간단하게 실행할 수 있습니다.

```yaml title="docker-compose.yml"
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - LLM_PROVIDER=anthropic
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
    environment:
      - VITE_API_URL=http://backend:8080
```

```bash
# 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

## 설치 확인

설치가 완료되면 다음 URL로 접속하여 확인합니다:

- **프론트엔드**: http://localhost:5173
- **백엔드 API 문서**: http://localhost:8080/docs
- **백엔드 Health Check**: http://localhost:8080/health

!!! success "설치 완료"
    모든 서비스가 정상적으로 실행되면 다음 단계로 진행합니다.

## 다음 단계

- [빠른 시작](quickstart.md) - 기본 사용법
- [API 연동](../api/index.md) - 사내 시스템 연동
