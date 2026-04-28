# Azwell Metaverse

2D 메타버스 오피스 플랫폼 — 가상 사무실에서 동료와 소통하고, 미니 아레나 전투를 즐길 수 있습니다.

## Tech Stack

| 영역 | 기술 |
|------|------|
| Client | React 18, Phaser 3, Zustand, Tailwind CSS, Vite |
| Server | Express, Socket.IO, Drizzle ORM, PostgreSQL |
| Admin | React 18, Tailwind CSS, Vite |
| Shared | TypeScript (모노레포 공유 패키지) |
| Infra | Docker, nginx, GitHub Actions (self-hosted runner) |

## Features

- **가상 오피스** — 2D 타일맵 기반 다층 사무실, 캐릭터 이동 및 실시간 동기화
- **실시간 채팅** — 공개 채팅, DM, 그룹 채팅, 슬래시 커맨드
- **캐릭터 커스터마이징** — 성별, 헤어, 의상, 액세서리 선택
- **아레나 전투** — FFA / 2v2 / 3v3 실시간 미니 총싸움 게임
- **인벤토리 & 장비** — 무기, 근접무기, 탄약, 방어구, 소모품
- **퀘스트 시스템** — 일일 퀘스트 완료 시 XP + 골드 지급
- **레벨 시스템** — 최대 레벨 30, 만렙 후 초과 XP → 골드 전환
- **관리자 앱** — 유저/퀘스트/채팅 관리, 골드 수정

## Project Structure

```
├── apps/
│   ├── client/          # 게임 클라이언트 (React + Phaser 3)
│   ├── server/          # API + WebSocket 서버 (Express + Socket.IO)
│   └── admin/           # 관리자 대시보드 (React)
├── packages/
│   └── shared/          # 공유 타입 & 상수
├── docker-compose.yml
├── nginx.conf
└── .github/workflows/   # CI/CD
```

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 10
- Docker & Docker Compose

### Development (로컬)

```bash
# 의존성 설치
pnpm install

# PostgreSQL 실행 (Docker)
docker run -d --name metaverse-pg \
  -e POSTGRES_DB=metaverse \
  -e POSTGRES_USER=metaverse \
  -e POSTGRES_PASSWORD=metaverse_password \
  -p 5432:5432 postgres:16-alpine

# DB 마이그레이션 & 시드
pnpm db:migrate
pnpm db:seed

# 전체 개발 서버 시작
pnpm dev
```

- Client: http://localhost:3000
- Server: http://localhost:4000
- Admin: http://localhost:3001

### Production (Docker)

```bash
# 전체 빌드 & 실행
docker compose up -d --build

# 상태 확인
docker compose ps
```

| 서비스 | 포트 | 설명 |
|--------|------|------|
| client | 3000 | 게임 클라이언트 (nginx) |
| admin | 3001 | 관리자 앱 (nginx) |
| server | 내부 | API + WebSocket |
| postgres | 내부 | PostgreSQL 16 |

## CI/CD

`main` 브랜치에 push 시 GitHub Actions가 자동으로 배포합니다.

```
git push → GitHub Actions → git pull → docker compose up -d --build → health check
```

Self-hosted runner가 서버에 설치되어 있어야 합니다.

## Environment Variables

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `DATABASE_URL` | `postgres://...@localhost:5432/metaverse` | PostgreSQL 연결 |
| `JWT_SECRET` | `dev-secret-change-in-production` | JWT 서명 키 |
| `PORT` | `4000` | 서버 포트 |
| `CLIENT_URL` | `http://localhost:3000` | CORS 허용 origin |
| `ADMIN_URL` | `http://localhost:3001` | CORS 허용 origin (admin) |

## License

Private — Azwell AI
