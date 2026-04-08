# Plantify

Plantify is a full-stack plant disease detection platform with role-based dashboards, persistent scan history, production-ready backend controls, and a unified model-training pipeline for local, Kaggle, and Colab workflows.

## Current Status

Shipped in the current codebase:

- Next.js 15 frontend with localized landing page and role-aware dashboards.
- FastAPI backend with JWT auth, refresh-token rotation, audit logging, rate limiting, request IDs, metrics, and SLO endpoints.
- Persistent SQLite scan history with Alembic migrations and SQLite resilience tuning.
- ONNX inference pipeline with automatic artifact export from the trained PyTorch checkpoint.
- Detection responses that split plant name and disease name instead of returning only raw canonical labels.
- Non-plant rejection heuristics to reduce false diagnoses on obvious non-leaf images.
- Unified training scripts that all produce backend-compatible artifacts.

## Architecture

```text
plantify/
  frontend/                  # Next.js 15 app, dashboard, i18n, landing page
  backend/                   # FastAPI API, auth, DB, AI inference, migrations
    app/
      api/routes/            # auth, users, detection, dashboard
      services/              # ai_service, model_artifacts, label_parser, etc.
    scripts/
      export_onnx.py         # exports ONNX + classes from checkpoint
      ensure_model_artifacts.py
    model/                   # checkpoint, ONNX model, classes, model registry
  dataset/
    color/
    grayscale/
    segmented/
  train.py                   # standalone local/cloud training script
  train_kaggle.py            # standalone Kaggle notebook training script
  train_collab.py            # standalone Google Colab training script
```

## Core Product Features

- Role-based dashboard shell with collapsible sidebar, mobile drawer behavior, section navigation, and logout action.
- Farmer scan workspace with drag-and-drop upload, compressed image handling, result card, and persistent history.
- Detection results expose `plant_name`, `disease`, `disease_type`, `confidence_score`, and treatment guidance.
- History and dashboard APIs return parsed plant and disease labels for clearer UI rendering.
- Team carousel and landing page motion polish on desktop and mobile.
- Production deployment pipeline with smoke checks, synthetic monitoring, model governance, and rollback controls.

## Local Development

### Full stack dev mode

From the repository root:

```bash
bun install
bun dev
```

This starts:

- frontend on http://localhost:3000
- backend on http://localhost:8000

The backend launcher refreshes the shared root virtual environment with `backend/requirements.txt` when needed and applies migrations before startup.

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

If needed, create `frontend/.env.local`:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

## Training Scripts

There are now exactly three standalone training scripts:

- `train.py`: for local machines, cloud VMs, or any normal Python environment.
- `train_kaggle.py`: for Kaggle notebooks.
- `train_collab.py`: for Google Colab notebooks.

Each script is fully self-contained and does not import any other project training module. Each script also verifies the saved checkpoint automatically at the end of training, so a separate `verify_model.py` step is no longer needed.

All three scripts default to writing compatible artifacts to:

- `backend/model/plantify_model.pth`
- `backend/model/classes.json`

### How to run them

From the repository root on Windows:

```bash
venv\Scripts\activate
python train.py
python train_kaggle.py
python train_collab.py
```

Useful overrides:

```bash
python train.py --arch efficientnet_b2 --epochs 16 --batch-size 32
python train.py --arch mobilenet_v3_large
python train_kaggle.py --dataset-root dataset --epochs 22 --batch-size 40
python train_collab.py --dataset-root /content/dataset --resume
```

### Notebook usage

For Kaggle or Colab, upload or clone the whole repository, then run the script from the repo root. The scripts no longer depend on `training_common.py`, so the earlier missing-module error should be gone.

### Exporting ONNX after training

After training a checkpoint, export ONNX with:

```bash
venv\Scripts\activate
python backend/scripts/export_onnx.py --checkpoint backend/model/plantify_model.pth --classes backend/model/classes.json
```

The backend can reconstruct checkpoints saved from:

- `efficientnet_b2`
- `efficientnet_b3`
- `mobilenet_v3_large`

## Testing and Validation

Frontend:

```bash
cd frontend
npm run build
```

Backend:

```bash
cd backend
pytest -q
```

Training sanity check:

```bash
python -c "import train, train_lite, train_kaggle, train_collab; from backend.app.services.model_artifacts import build_model; build_model('efficientnet_b2', 3); build_model('mobilenet_v3_large', 3); build_model('efficientnet_b3', 3); print('imports-and-builds-ok')"
```

## Deployment and Operations

From the repository root:

```bash
docker compose up --build
```

Current deployment and governance workflow coverage includes:

- frontend build and backend integration gates
- vulnerability scanning and dependency policy checks
- GHCR image publishing
- VPS rollout with repeated smoke checks
- deploy rollback attempts on failure
- synthetic monitoring and Telegram notifications
- daily observability and SLO trend artifacts
- weekly reliability digest and monthly scorecard
- model governance and rollback workflows

See `DEPLOYMENT_GUIDE.md`, `ENV_CONFIGURATION.md`, and `ROADMAP.md` for operational detail.

## Database and Model Governance

- Alembic migrations live under `backend/alembic/versions/`.
- `backend/model/model_registry.json` tracks model artifact metadata and active versions.
- Use `python backend/scripts/model_registry.py --registry backend/model/model_registry.json show` to inspect registry state.
- Use `python backend/scripts/model_rollback.py --registry backend/model/model_registry.json --out backend/model/model_rollback_plan.json` to create rollback plans.

## Legacy App

`app.py` remains in the repository for reference, but the primary product path is the frontend/backend stack.

## Roadmap

The current execution roadmap is maintained in [ROADMAP.md](ROADMAP.md).

## License

Polyform Non-Commercial. See `LICENSE`.