# Release Process

Comprehensive guide to Plantify's release process, versioning, and lifecycle management.

For the **complete detailed reference**, see [RELEASE_PROCESS.md](../../RELEASE_PROCESS.md) in the repository.

---

## Quick Summary

Plantify uses **Semantic Versioning** (`MAJOR.MINOR.PATCH`):

| When | Version | Example |
|------|---------|---------|
| Breaking changes | MAJOR | v1.0.0 → v2.0.0 |
| New features | MINOR | v1.0.0 → v1.1.0 |
| Bug fixes | PATCH | v1.1.0 → v1.1.1 |

---

## Release Stages

```
Features Developed  →  Alpha Testing  →  Beta Testing  →  Release Candidate  →  Stable Release
  (on develop)        (v1.x-alpha)      (v1.x-beta)        (v1.x-rc)          (v1.x.0)
```

### Pre-release Versions

| Stage | Stability | Users | Timeline | Example |
|-------|-----------|-------|----------|---------|
| **Alpha** | 🔴 Low | Developers | Continuous | v1.2.0-alpha.1 |
| **Beta** | 🟡 Medium | Testers | 1-2 weeks | v1.2.0-beta.1 |
| **RC** | 🟢 High | Operations | 2-3 days | v1.2.0-rc.1 |

---

## Publishing a Release

### 1️⃣ Prepare

```bash
git checkout main
git pull origin main
# Update version in package.json, etc.
git commit -m "chore: bump version to v1.2.0"
git push origin main
```

### 2️⃣ Tag Release

```bash
git tag -s v1.2.0 -m "Release v1.2.0: New features"
git push origin v1.2.0
```

### 3️⃣ GitHub Actions Builds Everything
- All platforms (Android, iOS, macOS, Windows, Linux)
- All architectures
- Signs binaries
- Generates checksums

### 4️⃣ Release Published
- GitHub Release page created
- Docker image pushed
- Artifacts uploaded
- Announcement sent

---

## Supported Versions

| Version | Released | Until | Support |
|---------|----------|-------|---------|
| **1.2.0** | Jan 2024 | Jan 2025 | ✓ Active |
| 1.1.0 | Dec 2023 | Dec 2024 | ✓ Maintained |
| 1.0.0 | Nov 2023 | Nov 2023 | ⚠️ End-of-Life |

**Support Level**: 12 months of bug fixes and security patches from release date.

---

## Upgrading

Choose your platform:

=== "Docker"

    ```bash
    docker pull ghcr.io/naghdiefallah/plantify:v1.2.0
    docker run -e DATABASE_URL=... ghcr.io/naghdiefallah/plantify:v1.2.0
    ```

=== "Kubernetes"

    ```bash
    helm repo update plantify
    helm upgrade plantify plantify/plantify --set image.tag=v1.2.0
    ```

=== "Source Code"

    ```bash
    git checkout v1.2.0
    pip install -U -r requirements.txt
    npm --prefix frontend install
    ```

---

## Reporting Issues

Found a bug in a release? 

1. Check the **[Latest Release](./index.md)** — might be fixed
2. Open an [Issue on GitHub](https://github.com/naghdiefallah/plantify/issues)
3. For security: email security@plantify.example.com

---

## Full Documentation

For detailed information on:
- Advanced versioning strategies
- Rollback procedures
- Hotfix workflows
- Release checklist
- Troubleshooting

See [RELEASE_PROCESS.md](../../RELEASE_PROCESS.md).

---

## Related

- [All Releases](./index.md) — Browse download history
- [Changelog](./changelog.md) — Detailed changes by version
- [Installation Guide](../installation.md) — How to install
- [Deployment Guide](../deployment/docker.md) — Production setup
