# Security Policy

This document describes the security posture currently implemented in Plantify, how to report vulnerabilities, and which controls are still pending for enterprise-grade operation.

## Reporting a Vulnerability

Do not open a public GitHub issue for a security problem.

Preferred disclosure path:

1. Use GitHub's private vulnerability reporting for this repository if it is enabled.
2. If private reporting is unavailable, contact the repository owner directly through GitHub and include enough detail to reproduce the issue safely.

Include:

- affected component or file
- impact summary
- reproduction steps or proof of concept
- any mitigation you have already identified

## Supported Code

Security fixes should be assumed to target:

- the current `main` branch
- the latest published release

Older tags and historical workflows should be treated as unsupported unless explicitly called out in a release note.

## Current Security Controls In This Repo

Backend and platform controls present in code today:

- JWT access and refresh token flow
- rate limiting
- audit logging
- request IDs
- metrics endpoints
- production settings validation
- SQLite migration and integrity coverage

Operational controls present in automation today:

- deploy secrets are validated before VPS rollout
- production env bundles are written from GitHub secrets during deploy
- release artifacts are published with `checksums.txt`
- Telegram notifications run only after the release workflow completes

## Minimum Production Baseline

The following baseline is expected for production deployments using the current repository shape:

- `APP_ENV=production` with backend production validators passing
- secure and non-placeholder `SECRET_KEY` and `ROLE_ELEVATION_CODE`
- explicit and non-localhost CORS allowlist
- deploy-time secret bundle validation in CI (`ROOT_ENV_FILE`, `BACKEND_ENV_FILE`, `FRONTEND_ENV_FILE`)
- health and readiness endpoints monitored by the runtime platform
- periodic backup and restore drills for persistent data volumes

## Release Verification

Current GitHub releases publish SHA-256 checksums for release assets.

Verify a release by downloading the artifact and `checksums.txt`, then run:

```bash
sha256sum --check checksums.txt
```

If you are verifying on Windows PowerShell, an equivalent approach is:

```powershell
Get-FileHash .\plantify-installer.exe -Algorithm SHA256
```

Compare the resulting hash with the matching line in `checksums.txt`.

## Secrets and Deployment Expectations

The current deploy path expects these secret bundles to be managed outside the repo:

- `ROOT_ENV_FILE`
- `BACKEND_ENV_FILE`
- `FRONTEND_ENV_FILE`
- GHCR pull credentials for the VPS

Do not commit `.env` files, keystores, provisioning profiles, or production database copies to the repository.

## Enterprise Hardening Gaps

The following controls are not yet fully enforced as part of mandatory automation in this repository:

- required CI gates for static analysis, dependency vulnerability scans, and container image scans
- SBOM generation and artifact attestations as hard release blockers
- codified staged promotion policy (staging verification before production rollout)
- centralized observability and alert routing configuration as versioned infrastructure
- formal incident response playbooks with tested RTO/RPO targets

## Secure Contribution Guidance

- Keep security-sensitive changes small and reviewable.
- Avoid hard-coding credentials, API keys, or signing material.
- Validate configuration changes against the backend settings model before deployment.
- Treat local build artifacts such as `.next`, `out`, `venv`, and SQLite copies as disposable runtime state, not source assets.

## Known Gaps

The repository still contains historical signing and security-support files that are not part of the active three-workflow automation path. If you rely on those files, verify them manually before assuming they are maintained.

Some links and examples in historical docs may refer to older release paths. Treat workflow files in `.github/workflows` as the source of truth.

---

## Related Documents

- [README.md](README.md) - repository overview and production snapshot
- [ROADMAP.md](ROADMAP.md) - active hardening and delivery priorities
- [docs/security/verification.md](docs/security/verification.md) - release artifact verification guidance

---

## History

**Last Updated**: June 25, 2026  
**Next Review**: September 30, 2026

---

**Questions?** Email: security@plantify.com
