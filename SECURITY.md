# Security Policy

This document describes the security posture that is actually present in the current Plantify repository and how to report vulnerabilities responsibly.

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

## Secure Contribution Guidance

- Keep security-sensitive changes small and reviewable.
- Avoid hard-coding credentials, API keys, or signing material.
- Validate configuration changes against the backend settings model before deployment.
- Treat local build artifacts such as `.next`, `out`, `venv`, and SQLite copies as disposable runtime state, not source assets.

## Known Gaps

The repository still contains historical signing and security-support files that are not part of the active three-workflow automation path. If you rely on those files, verify them manually before assuming they are maintained.

---

## Frequently Asked Questions

**Q: How often are dependencies updated?**  
A: Automated via Dependabot weekly. Critical security fixes applied immediately.

**Q: Can I audit the source code?**  
A: Yes! Repository is open-source. Code audits welcome via responsible disclosure.

**Q: Is Plantify HIPAA compliant?**  
A: Not officially, but the architecture supports HIPAA-level security controls.

**Q: How do you handle zero-day vulnerabilities?**  
A: We monitor security advisories and apply patches within 24-48 hours of disclosure.

---

## Related Documents

- [Contributing Guide](../contributing/guide.md) — Security in code contributions
- [Deployment Guide](../deployment/docker.md) — Secure deployment practices
- [Release Process](./process.md) — How releases are authenticated
- [Privacy Policy](https://plantify.example.com/privacy) — Data handling

---

## History

**Last Updated**: April 8, 2026  
**Next Review**: April 8, 2027

---

**Questions?** Email: security@plantify.example.com
