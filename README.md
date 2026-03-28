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

## Roadmap

The canonical enterprise roadmap is maintained in [ROADMAP.md](ROADMAP.md).

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

The backend launcher will install or refresh `backend/requirements.txt` into the root `venv` automatically when that shared environment is missing backend packages.

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
- validates backend dependency graph (`pip check`) and Bun lockfile consistency
- runs vulnerability scans for repository dependencies (Trivy) and backend Python dependencies (pip-audit)
- builds and pushes backend and frontend images to GHCR
- scans pushed backend/frontend container images for high/critical vulnerabilities
- uploads the production compose file to your VPS
- pulls fresh images, waits for healthy containers, and verifies backend `/ready` and frontend availability
- repeats post-deploy smoke checks and auto-attempts rollback to the previous image tag on failure

A separate workflow in `.github/workflows/telegram-notify.yml` sends Telegram notifications after deployment, synthetic monitoring, daily SLO trend, weekly digest, and monthly scorecard workflow completions.
When `PROD_SLO_URL` is configured, Telegram notifications include a compact live SLO snapshot (`enforceable_slo_ok`, `enough_data`, availability, p95).

An additional synthetic monitor workflow in `.github/workflows/synthetic-monitor.yml` runs every 30 minutes (and on demand) to verify production readiness and SLO health.
Each run uploads monitoring evidence artifacts (`ready.json`, `slo.json`, `synthetic-summary.txt`) retained for 14 days.

A daily trend workflow in `.github/workflows/slo-trend-daily.yml` captures a scheduled SLO snapshot and uploads trend artifacts (`slo-daily.json`, `slo-trend.jsonl`, `slo-trend.csv`) retained for 30 days.

A daily dashboard workflow in `.github/workflows/observability-dashboard-daily.yml` captures `/slo` + `/metrics` and publishes dashboard artifacts (`observability-dashboard-summary.json`, `observability-dashboard.md`) retained for 30 days.

A weekly digest workflow in `.github/workflows/reliability-digest-weekly.yml` produces a compact markdown reliability report from live `/slo` (and optional `/metrics`) and uploads digest artifacts retained for 30 days.

A monthly scorecard workflow in `.github/workflows/reliability-scorecard-monthly.yml` generates a single reliability score plus markdown summary and uploads scorecard artifacts retained for 90 days.

A manual game-day workflow in `.github/workflows/game-day-drill.yml` runs deploy/db/inference drill scenarios and uploads drill evidence artifacts (`game-day-report.json`, `game-day-report.md`).

A QA governance workflow in `.github/workflows/qa-release-governance.yml` runs backend integration tests, frontend production build, frontend end-to-end smoke checks, and generates release traceability artifacts (`release-traceability.json`, checksum file).

A model governance workflow in `.github/workflows/model-governance.yml` runs offline baseline evaluation with drift proxy metrics and registers immutable model artifact metadata entries.

A model rollback workflow in `.github/workflows/model-rollback.yml` creates rollback plans (and optional active-version switch in registry artifact output) for rapid model reversion exercises.

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

Production backend `.env` should include at least:

- `APP_ENV=production`
- `SECRET_KEY` (minimum 32 chars)
- `ROLE_ELEVATION_CODE` (minimum 20 chars)
- `CORS_ORIGINS` including your production domain (for example `https://plantify.limarise.com`)

SQLite resilience knobs (recommended for production):

- `SQLITE_JOURNAL_MODE=WAL`
- `SQLITE_SYNCHRONOUS=NORMAL`
- `SQLITE_BUSY_TIMEOUT_MS=5000`
- `SQLITE_FOREIGN_KEYS=true`

Security header baseline:

- Backend applies CSP and standard security headers on all responses.
- Backend applies `Strict-Transport-Security` automatically when `APP_ENV=production`.
- Frontend applies matching security headers through Next.js response headers.

For Telegram notifications:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

For synthetic production monitoring:

- `PROD_READY_URL` (example: `https://your-domain/ready`)
- `PROD_SLO_URL` (example: `https://your-domain/slo`)
- `PROD_METRICS_URL` (optional, required only when route budget enforcement is enabled; example: `https://your-domain/metrics`)

For protected branch release governance:

- Require the `QA and Release Governance` workflow check on the `main` branch in GitHub branch protection settings.
- Keep `Build, Publish, and Deploy` required for production release promotion.

Optional CI toggle:

- Security scan enforcement is automatic on `push` to `main` (`SECURITY_SCAN_ENFORCE=true` in workflow context), making CI fail on detected high/critical dependency or image vulnerabilities.
- Set `SLO_GATE_ENFORCE` to `true` in [ .github/workflows/publish.yml ](.github/workflows/publish.yml) to fail deploy when backend `/slo` reports `slo_ok=false` after rollout.

SLO gate behavior:

- `/slo` now reports `enough_data`, `enforceable_slo_ok`, and explicit error-budget policy fields (`error_budget_target`, `error_budget_remaining`, `error_budget_burn_rate`, `policy_status`).
- Deploy SLO gating uses `enforceable_slo_ok`, so low-traffic rollouts do not fail before minimum sample volume is reached.
- Configure the threshold with backend env `SLO_MIN_REQUESTS_FOR_EVALUATION`.

Synthetic route budget behavior (optional):

- Set workflow env `SYNTHETIC_ENFORCE_ROUTE_BUDGETS=true` in `.github/workflows/synthetic-monitor.yml` to enforce route p95 thresholds.
- Configure route budgets using `SYNTHETIC_ROUTE_BUDGETS` (format: `/route=seconds,/another-route=seconds`).
- Route budget results are written to `route-budget-report.txt` and uploaded in synthetic evidence artifacts.

### SLO Incident Runbook (Quick)

When deploy or synthetic checks fail on SLO:

1. Pull latest synthetic artifact bundle and inspect `slo.json` plus `synthetic-summary.txt`.
2. Verify whether `enough_data` is `true`.
3. If `enough_data=false`, treat as low-volume warmup; continue monitoring until minimum request threshold is reached.
4. If `enough_data=true` and `availability_ok=false`, inspect backend logs for 4xx/5xx spikes and recent deploy changes.
5. If `enough_data=true` and `latency_ok=false`, inspect `/metrics/prometheus` for route-level p95 outliers.
6. Roll back to last known-good image tag if `enforceable_slo_ok=false` persists after mitigation.
7. Capture incident notes with timestamp, image tag, failing SLO fields, and remediation outcome.

### VPS Prerequisites

- Docker and Docker Compose plugin installed on the VPS
- VPS user can run Docker commands
- Caddy is managed separately on the VPS and proxies to Plantify on `127.0.0.1:13000` and `127.0.0.1:18000`

## Database Migrations (Alembic)

Initial migration is included at backend/alembic/versions/20260318_0001_init.py.

Data resilience hardening migrations now include:

- backend/alembic/versions/20260319_0002_user_role.py
- backend/alembic/versions/20260328_0003_integrity_constraints.py (SQLite-safe table rebuild enforcing role/domain/confidence CHECK constraints)

Model governance metadata:

- backend/model/model_registry.json tracks immutable model artifact hashes and active model version.
- Use `python backend/scripts/model_registry.py --registry backend/model/model_registry.json show` to inspect registry state.
- Use `python backend/scripts/model_rollback.py --registry backend/model/model_registry.json --out backend/model/model_rollback_plan.json` to create rollback plans.

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
- SQLite write-contention stress behavior under concurrent inserts
- Alembic-upgraded DB integrity constraints for role/domain/confidence fields
- model governance registry immutability and rollback-plan controls

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

Polyform Non-Commercial. See LICENSE.