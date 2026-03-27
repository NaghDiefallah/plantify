# Plantify SaaS

Plantify is now organized as a production-oriented full-stack web application:

- Frontend: Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn-style UI primitives, Framer Motion
- Backend: FastAPI with async handlers and JWT auth
- Persistence: SQLite via SQLAlchemy 2.0 async
- AI Inference: ONNX Runtime on CPU, exported from the trained PyTorch checkpoint
- Infra: Docker Compose with Caddy reverse proxy

## Architecture

```text
plantify/
  frontend/                # Next.js 15 UI and dashboard
  backend/                 # FastAPI API, auth, DB, and ONNX inference
    app/
      api/routes/          # auth, users, detection, dashboard
      models/              # User, ScanHistory, PlantMetadata
      services/            # ai_service and metadata bootstrap
    scripts/export_onnx.py # converts plantify_model.pth to ONNX + classes.json
    model/                 # generated ONNX artifacts at build/start
  caddy/Caddyfile          # reverse proxy config
  docker-compose.yml
  dataset/
    color/
    grayscale/
    segmented/
```

## Data Domains

The training and model robustness context remains based on:

- dataset/color (RGB)
- dataset/grayscale (luminance)
- dataset/segmented (foreground masked)

## Core Features

- User accounts: signup, login, profile
- Rotating refresh-token auth flow with automatic access-token renewal
- Detection history persisted to SQLite
- Drag-and-drop upload with client-side compression and strict file validation
- ONNX inference endpoint returning:
  - disease_type
  - confidence_score
  - treatment_recommendations
- Optional before/after image support by sending segmented image
- Bento-style dashboard tiles:
  - live detection
  - recent history
  - statistics
  - plant health tips

## Local Development

### 0. One Command Dev Mode

From the repository root, you can now start backend and frontend together with Bun:

```bash
bun install
bun dev
```

This runs:

- backend on http://localhost:8000
- frontend on http://localhost:3000

On Windows, the root Bun scripts call PowerShell launcher files under scripts/ so you do not need to manually chain activation commands.

### 1. Backend

```bash
python -m venv venv
venv\Scripts\activate
pip install -r backend/requirements.txt
cd backend
alembic upgrade head
python scripts/seed_db.py
uvicorn app.main:app --app-dir backend --reload --host 0.0.0.0 --port 8000
```

If backend/model/plantify_model.onnx or backend/model/classes.json do not exist yet, startup will export them automatically from the root checkpoint at plantify_model.pth.

### 2. Frontend

```bash
cd frontend
bun install
bun run dev
```

If needed, set frontend env in frontend/.env.local:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

## Dockerized Run

From repository root:

```bash
docker compose up --build
```

Services:

- Caddy entrypoint: http://localhost
- Frontend: proxied by Caddy
- Backend API: proxied at /api
- SQLite persisted in Docker volume: plantify_data

## Automated CI/CD and VPS Deployment

Pushing to `main` now triggers an automated pipeline in `.github/workflows/publish.yml` that:

- runs backend integration tests and frontend lint/build as quality gates
- builds and pushes backend and frontend images to GHCR
- uploads the production compose file to your VPS
- pulls fresh images, waits for healthy containers, and verifies `/health`

A separate workflow in `.github/workflows/telegram-notify.yml` sends Telegram notifications after the deployment workflow completes.

### Required GitHub Repository Secrets

Set these in GitHub: Settings -> Secrets and variables -> Actions.

For VPS deploy:

- `VPS_HOST` (example: `203.0.113.10`)
- `VPS_USER` (example: `root` or deploy user)
- `VPS_SSH_KEY` (private key for SSH)
- `VPS_PORT` (optional, defaults to `22`)
- `VPS_APP_DIR` (optional, defaults to `/opt/plantify`)
- `GHCR_USERNAME` (GitHub username that can pull private GHCR images)
- `GHCR_PAT` (PAT with `read:packages` scope for VPS pulls)
- `BACKEND_ENV_FILE` (full content of backend `.env` for production)

For Telegram notifications:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

### VPS Prerequisites

- Docker and Docker Compose plugin installed on the VPS
- VPS user can run Docker commands
- Caddy is managed separately on the VPS and proxies to Plantify on `127.0.0.1:13000` and `127.0.0.1:18000`

## Database Migrations (Alembic)

Initial migration is included at backend/alembic/versions/20260318_0001_init.py.

Useful commands:

```bash
cd backend
alembic upgrade head
alembic downgrade -1
```

## Auth and Upload Hardening

- Login returns access_token + refresh_token.
- Frontend auto-refreshes access tokens on 401 and stores rotated token pairs.
- /api/auth/refresh rotates refresh tokens server-side (old one revoked).
- Refresh token reuse detection forces full session invalidation for that user.
- /api/detect validates MIME type and max file size (5MB by default).

## Integration Tests

Backend integration tests cover:

- refresh token rotation and reuse detection invalidation
- logout refresh-token revocation
- detect endpoint MIME/type validation and max-size rejection

Run tests:

```bash
cd backend
pytest
```

## Training and Model Export Notes

- Existing training scripts are kept:
  - train.py
  - train_lite.py
- Build pipeline exports ONNX from plantify_model.pth via backend/scripts/export_onnx.py
- Labels are written to backend/model/classes.json and used at inference time

## Legacy Streamlit App

The original app.py remains in the repository for reference, but the primary product path is now the frontend/backend stack.

## License

MIT. See LICENSE.