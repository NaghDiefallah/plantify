# Plantify

Plantify is a plant disease detection platform built around a Next.js frontend, a FastAPI backend, and a shared model artifact pipeline. The current repository also contains desktop packaging through Tauri, mobile wrappers through Capacitor, release automation, and training entrypoints for local, Kaggle, and Colab environments.

## What Is In This Repo

- `frontend/`: Next.js 15 app, localized UI, dashboard shell, Tauri desktop wrapper, Capacitor mobile projects.
- `backend/`: FastAPI API, auth, detection services, Alembic migrations, SQLite persistence, model governance helpers.
- `dataset/`: dataset variants used for training and evaluation.
- `train.py`, `train_kaggle.py`, `train_collab.py`: standalone training entrypoints.
- `docs/`: MkDocs content for install, quick start, releases, and security notes.

`app.py` is a legacy prototype path and is not the primary application entrypoint anymore.

## Current Product Surface

- Role-based dashboard shell with shared sidebar, top bar, history, settings, and desktop title bar integration.
- Scan flow with persistent history and parsed plant and disease names in responses.
- FastAPI auth and platform controls: JWT access and refresh tokens, audit logging, request IDs, rate limiting, metrics, and production settings validation.
- Model artifact flow that keeps PyTorch checkpoints, ONNX export, classes, and registry metadata aligned.
- Desktop packaging through Tauri and mobile packaging through Capacitor.

## Local Development

### Full stack

From the repository root:

```bash
bun install
bun dev
```

This starts the frontend on `http://localhost:3000` and the backend on `http://localhost:8000`.

### Backend only

```bash
python -m venv venv
venv\Scripts\activate
pip install -r backend/requirements.txt
cd backend
alembic upgrade head
python scripts/seed_db.py
uvicorn app.main:app --app-dir backend --reload --host 0.0.0.0 --port 8000
```

### Frontend only

```bash
cd frontend
bun install
bun run dev
```

If needed, add `frontend/.env.local`:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

## Desktop and Mobile Builds

From `frontend/`:

```bash
bun run tauri:dev
bun run tauri:build
bun run cap:sync
```

The desktop shell uses a custom title bar because the Tauri window is undecorated.

## Training and Model Artifacts

The supported training entrypoints are:

- `train.py`
- `train_kaggle.py`
- `train_collab.py`

Default artifact targets:

- `backend/model/plantify_model.pth`
- `backend/model/classes.json`

Export ONNX after training with:

```bash
venv\Scripts\activate
python backend/scripts/export_onnx.py --checkpoint backend/model/plantify_model.pth --classes backend/model/classes.json
```

Model registry and rollback helpers live under `backend/scripts/` and `backend/model/model_registry.json`.

## Validation

Frontend:

```bash
cd frontend
bun run lint
bun run build
```

Backend:

```bash
cd backend
pytest -q
```

## Production Readiness Snapshot

Current production baseline in this repository:

- FastAPI service includes auth, request IDs, rate limiting, metrics, readiness checks, and production configuration validation.
- Frontend and backend are packaged into containers and deployed through the `Publish` workflow.
- Release artifacts are generated through `Cross-Platform Release` and include `checksums.txt`.
- Desktop and mobile release builds are automated for supported targets.

Current gaps before enterprise-grade operation:

- No required pre-deploy quality gate workflow that blocks production rollout on failed tests, security scans, or policy checks.
- No centralized telemetry stack and alert routing configuration in repo (metrics endpoint exists, but dashboarding and alerting are external).
- No staged environment promotion model (for example, dev -> staging -> production with enforced approvals and smoke checks).
- SQLite plus single-host Docker Compose remains the default deployment shape; this requires explicit backup, restore, and failover runbook maturity for high-availability expectations.
- No in-repo SBOM, container vulnerability, and static code analysis enforcement as release blockers.

See [ROADMAP.md](ROADMAP.md) for the active hardening plan and [SECURITY.md](SECURITY.md) for the current security policy and control boundaries.

## Automation

The repo currently keeps automation intentionally narrow. There are three workflows only:

1. `Publish`: builds and pushes GHCR images, validates deploy secrets, and deploys to the VPS with Docker Compose.
2. `Cross-Platform Release`: runs after a successful `Publish` on `main` or by manual dispatch, creates the next tag when needed, builds release artifacts, and publishes a GitHub release with `checksums.txt`.
3. `Telegram Notifications`: sends a single post-release notification after the release workflow finishes.

## Documentation Map

- `DEPLOYMENT_GUIDE.md`: deployment notes.
- `PRODUCTION_DEPLOYMENT.md`: VPS and container deployment detail.
- `CHATBOT_SETUP.md`: Ollama and chatbot setup.
- `ENV_CONFIGURATION.md`: environment variable guidance.
- `ROADMAP.md`: active product and platform priorities.
- `SECURITY.md`: current security policy.

## License

Polyform Non-Commercial. See `LICENSE`.