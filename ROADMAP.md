# Plantify Roadmap

Updated: 2026-06-26
Scope: active roadmap for the current Next.js, FastAPI, Tauri, and model-delivery stack.

## Current State

Completed in the current repo:

- Shared dashboard shell across home, chat, community, history, and settings.
- Desktop shell with custom title bar and Tauri packaging.
- FastAPI auth, audit logging, request IDs, rate limiting, metrics, and SQLite migrations.
- Cross-platform release flow tied to the `Publish` workflow.
- Three standalone training entrypoints that target the backend model artifact contract.

## Product Direction

- Primary surface: web app
- Primary user: farmers
- Main decision criteria: reliability, security, UI/UX, and performance
- Highest-risk areas: authentication, data durability, and runtime reliability
- Deployment baseline: VPS with Docker Compose

## Active Priorities

### 1. Product UX

Status: in progress

Next priorities:

- Tighten the farmer scan -> analyze -> act loop so every step is clearer, faster, and safer against stale or confusing state.
- Improve farmer history and treatment guidance ergonomics on desktop and mobile.
- Reduce friction in authentication and session recovery across all critical web flows.

### 2. Model Quality

Status: in progress

Next priorities:

- Measure the current non-plant rejection path against a labeled holdout set.
- Produce a reproducible comparison between `train.py`, `train_kaggle.py`, and `train_collab.py` on the same split.
- Track class-level confusion and false-positive hotspots before expanding the dataset.

### 3. Release and Operations

Status: in progress

Next priorities:

- Consolidate deploy, rollback, recovery, and outage handling into a smaller set of trusted runbooks.
- Add backup and restore drill evidence for production data.
- Harden runtime reliability on the VPS deployment path before expanding automation scope.

### 4. Enterprise Readiness

Status: in progress

Next priorities:

- Define the target auth model for future SSO support without breaking current JWT flows.
- Strengthen RBAC boundaries and role-specific access expectations before wider enterprise rollout.
- Formalize audit, backup, and recovery expectations around the current deployment model.
- Keep CI/CD hardening later unless it directly blocks product safety or runtime reliability.

### 5. Testing

Status: in progress

Next priorities:

- Add frontend regression coverage for dashboard shell navigation and history filtering.
- Add frontend regression coverage for the farmer scan flow, including image replacement and stale-result prevention.
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
- Document the planned Turso migration path and the assumptions that currently depend on SQLite semantics.

Definition of done target:

- Publish one authoritative operations runbook set for deploy, rollback, backup, restore, and incident triage.

### 7. Data Platform Migration

Status: planned

Next priorities:

- Map current SQLite-specific assumptions in migrations, sessions, concurrency, and backup flows.
- Define the migration path toward Turso with minimal disruption to the VPS deployment baseline.
- Identify schema, query, and operational changes needed before switching the production data path.

## Guardrails

- SQLite remains the current operational datastore while the Turso migration path is designed and validated.
- VPS plus Docker Compose remains the deployment baseline.
- Release automation stays intentionally small: `Publish`, `Cross-Platform Release`, and `Telegram Notifications` only.
- Model artifacts must stay compatible with backend runtime loading and ONNX export paths.
