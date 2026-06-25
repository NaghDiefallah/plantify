# Plantify Roadmap

Updated: 2026-06-25
Scope: active roadmap for the current Next.js, FastAPI, Tauri, and model-delivery stack.

## Current State

Completed in the current repo:

- Shared dashboard shell across home, chat, community, history, and settings.
- Desktop shell with custom title bar and Tauri packaging.
- FastAPI auth, audit logging, request IDs, rate limiting, metrics, and SQLite migrations.
- Cross-platform release flow tied to the `Publish` workflow.
- Three standalone training entrypoints that target the backend model artifact contract.

## Active Priorities

### 1. Product UX

Status: in progress

Next priorities:

- Deepen non-farmer role flows so each dashboard has task-specific actions instead of shared placeholder structure.
- Keep polishing desktop behavior, especially packaged-app QA for title bar, locale changes, and layout consistency.
- Tighten mobile history and result ergonomics for smaller screens.

### 2. Model Quality

Status: in progress

Next priorities:

- Measure the current non-plant rejection path against a labeled holdout set.
- Produce a reproducible comparison between `train.py`, `train_kaggle.py`, and `train_collab.py` on the same split.
- Track class-level confusion and false-positive hotspots before expanding the dataset.

### 3. Release and Operations

Status: in progress

Next priorities:

- Verify the reduced three-workflow automation topology end to end after each release workflow change.
- Consolidate deploy, rollback, and recovery guidance into a smaller set of trusted runbooks.
- Add backup and restore drill evidence for production SQLite data.

### 4. Enterprise Readiness

Status: in progress

Next priorities:

- Add a required quality gate workflow that blocks deploy on failing tests, lint, and policy checks.
- Introduce mandatory security checks (dependency scanning, static analysis, and container scan) in CI.
- Define and document environment promotion gates (dev to staging to production) with approval points.
- Add versioned observability standards: required metrics, log fields, and alert thresholds.
- Define incident response ownership, escalation paths, and RTO/RPO targets.

### 5. Testing

Status: in progress

Next priorities:

- Add frontend regression coverage for dashboard shell navigation and history filtering.
- Add backend tests for label parsing and non-plant edge cases.
- Add artifact smoke coverage for checkpoint-to-ONNX export across supported model architectures.

Quality gate target:

- Require passing tests and lint for backend and frontend before merge into `main`.

### 6. Documentation Hygiene

Status: in progress

Next priorities:

- Remove or merge stale top-level docs that describe workflows and security controls no longer present.
- Document the expected dataset structure and the preferred training entrypoint by environment.
- Keep README, roadmap, and security policy aligned with the actual three-workflow automation setup.

Definition of done target:

- Publish one authoritative operations runbook set for deploy, rollback, backup, restore, and incident triage.

## Guardrails

- SQLite remains the default operational datastore unless scaling pressure forces a change.
- VPS plus Docker Compose remains the deployment baseline.
- Release automation stays intentionally small: `Publish`, `Cross-Platform Release`, and `Telegram Notifications` only.
- Model artifacts must stay compatible with backend runtime loading and ONNX export paths.
