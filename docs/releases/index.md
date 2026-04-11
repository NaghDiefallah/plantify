# All Releases

Browse all Plantify releases, download artifacts, and view detailed release notes.

## Latest Release

### [v1.2.0](https://github.com/naghdiefallah/plantify/releases/tag/v1.2.0) — January 15, 2024

**🎯 Highlights**:
- 🎯 Improved detection accuracy to 96% (up from 95%)
- 🖥️ Redesigned web dashboard with dark mode support
- 📈 Real-time analytics dashboard for scan trends
- 🔒 Enhanced security with WebAuthn/passkey support
- 🐳 Optimized Docker image (50% smaller, faster startup)
- 📊 New CSV export for scan results
- 🚀 30% faster API response times

**Downloads**:
- **Docker**: `ghcr.io/naghdiefallah/plantify:v1.2.0`
- **Android**: [APK](https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/plantify-v1.2.0-android-universal.apk) | [AAB](https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/plantify-v1.2.0-android-universal.aab)
- **iOS**: [IPA](https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/plantify-v1.2.0-ios-arm64.ipa)
- **macOS**: [DMG](https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/plantify-v1.2.0-macos-universal.dmg)
- **Windows**: [MSI](https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/plantify-v1.2.0-windows-x86_64.msi) | [Portable](https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/plantify-v1.2.0-windows-portable.exe)
- **Linux**: [AppImage](https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/plantify-v1.2.0-linux-x86_64.AppImage) | [deb](https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/plantify-v1.2.0-linux-x86_64.deb) | [rpm](https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/plantify-v1.2.0-linux-x86_64.rpm)

### Pre-release: v1.3.0-beta.1

Testing new features before stable release. See the [beta branch](https://github.com/naghdiefallah/plantify) for details.

---

## Release Archive

### v1.1.0 — December 1, 2023

**Features**:
- Added batch processing API
- Improved model accuracy to 95%
- Added Kubernetes deployment templates
- New monitoring and logging integration

[**View Release**](https://github.com/naghdiefallah/plantify/releases/tag/v1.1.0) | [**Downloads**](https://github.com/naghdiefallah/plantify/releases/tag/v1.1.0/download)

---

### v1.0.0 — November 1, 2023

**Initial Release** ✨

- Plant disease detection across 38 diseases
- Web dashboard
- REST API
- Docker & Kubernetes support
- Multi-platform mobile apps (iOS, Android)
- Desktop apps (Windows, macOS, Linux)

[**View Release**](https://github.com/naghdiefallah/plantify/releases/tag/v1.0.0) | [**Downloads**](https://github.com/naghdiefallah/plantify/releases/tag/v1.0.0/download)

---

## Downloading & Installing

### Method 1: GitHub Releases Page
Visit [GitHub Releases](https://github.com/naghdiefallah/plantify/releases) to download any version.

### Method 2: Docker
```bash
docker pull ghcr.io/naghdiefallah/plantify:v1.2.0
```

### Method 3: Package Managers
```bash
# macOS
brew install plantify

# Ubuntu/Debian
sudo apt-get install plantify

# Fedora/RHEL
sudo dnf install plantify

# Arch
yay -S plantify
```

### Method 4: Direct Download
Each release provides direct download links for all platforms.

---

## Verifying Downloads

All releases include checksums for security verification:

```bash
# Download checksums.txt from release assets
# Then verify
sha256sum --check checksums.txt

# Or with gpg signature
gpg --verify plantify-v1.2.0.tar.gz.sig plantify-v1.2.0.tar.gz
```

---

## Release Cycle & Schedule

**Plantify follows semantic versioning** with regular releases:

- **Major** (e.g., v2.0.0): Major features/breaking changes — ~annual
- **Minor** (e.g., v1.2.0): Features & improvements — ~monthly
- **Patch** (e.g., v1.1.1): Bug fixes & security — as needed
- **Pre-release** (alpha/beta/rc): Testing phases — weekly during development

---

## Upgrading

### From v1.1.x to v1.2.0

**Docker**:
```bash
docker pull ghcr.io/naghdiefallah/plantify:v1.2.0
docker run --rm -v plantify_db:/app/data ghcr.io/naghdiefallah/plantify:v1.2.0 migrate
docker run -d ghcr.io/naghdiefallah/plantify:v1.2.0
```

**Kubernetes**:
```bash
helm repo update
helm upgrade plantify plantify/plantify --set image.tag=v1.2.0
```

**Local**:
```bash
git checkout v1.2.0
pip install --upgrade -r requirements.txt
python manage.py migrate
```

See [Full Upgrade Guide](./process.md#upgrading) for details.

---

## Support & Maintenance

| Version | Release Date | End of Support |
|---------|--------------|----------------|
| v1.2.0 | Jan 15, 2024 | Jan 15, 2025 |
| v1.1.0 | Dec 1, 2023 | Dec 1, 2024 |
| v1.0.0 | Nov 1, 2023 | Nov 1, 2023 (Deprecated) |

> **LTS** (Long-term Support): No versions currently designated as LTS. Security patches provided for 12 months from release.

---

## Security Updates

Security issues are handled promptly. If you find a vulnerability:

1. **Do NOT** open a public issue
2. Email: security@plantify.example.com
3. Include: version, description, reproduction steps
4. We'll acknowledge within 24 hours and release a patch ASAP

See [Security Policy](https://github.com/naghdiefallah/plantify/security/policy).

---

## Release Notes & Changelog

Detailed information about each release:

- [v1.2.0 Release Notes](https://github.com/naghdiefallah/plantify/releases/tag/v1.2.0)
- [v1.1.0 Release Notes](https://github.com/naghdiefallah/plantify/releases/tag/v1.1.0)
- [Full Changelog](./changelog.md)

---

## Related Documentation

- **[Release Process](./process.md)** — How releases are made
- **[Changelog](./changelog.md)** — All changes by version
- **[Installation Guide](../installation.md)** — Setup Plantify
- **[Deployment Guide](../deployment/docker.md)** — Production setup

---

## Questions?

- 📖 See [FAQ](../faq.md)
- 🐛 [Report Issues](https://github.com/naghdiefallah/plantify/issues)
- 💬 [Ask on Discussions](https://github.com/naghdiefallah/plantify/discussions)
- 📧 Email: support@plantify.example.com
