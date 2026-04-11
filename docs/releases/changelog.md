# Changelog

All notable changes to Plantify are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and Plantify adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Fuzzy search for plant disease database
- Integration with ONNX Runtime for cross-platform model optimization
- Export results as PDF reports
- Webhook support for real-time scan notifications

### Changed
- Redesigned installation wizard with platform detection

### Fixed
- Memory leak in batch processing pipeline
- Incorrect crop detection for closely related plant species

---

## [1.2.0] — 2024-01-15

### Added
- **🎯 Improved Detection Accuracy**: Model accuracy increased to 96% across all crop types
- **🖥️ Dark Mode**: Complete dark mode support in web dashboard
- **📈 Analytics Dashboard**: Real-time scan trends, success rates, and disease prevalence charts
- **🔒 WebAuthn Support**: Passwordless authentication using FIDO2/WebAuthn
- **📊 CSV Export**: Export scan history as CSV for analysis
- **🏃 Performance**: 30% faster API response times via query optimization
- **🔧 Configurable Model Paths**: Support custom ML models via environment variables
- **📱 Mobile Optimizations**: Improved mobile UI/UX for iOS and Android

### Changed
- **🐳 Docker Image Optimization**: 50% smaller image size (1.2GB → 620MB) via multi-stage builds
- **⚡ Startup Speed**: 40% faster container startup time
- **📦 Dependencies**: Updated to latest security releases
  - `torch` 2.1.1 → 2.1.2 (security patches)
  - `opencv-python` 4.8.1 → 4.8.2
  - `fastapi` 0.104.1 → 0.105.0
- **🗺️ UI/UX**: Reorganized settings, improved button placement, clearer error messages
- **🔄 Database**: SQLite performance tuning for concurrent access

### Fixed
- **🐛 Memory Leak**: Fixed memory accumulation in long-running inference processes (issue #142)
- **📷 Image Handling**: Prevent EXE corruption when uploading corrupted JPEG files (issue #156)
- **🔐 CORS**: Proper handling of OPTIONS preflight requests on all endpoints
- **⏱️ Timeout**: Batch job timeouts no longer cascade to next request (issue #189)
- **🌐 Localization**: Fix Spanish and French translations (issue #203)
- **📊 Export**: CSV export now handles special characters correctly (issue #198)

### Security
- **🔒 Rate Limiting**: Implemented token-bucket rate limiting on all API endpoints
- **🛡️ CSRF Protection**: Added CSRF tokens to web forms
- **🔐 HTTPS**: Enforce HTTPS in production builds
- **🚫 XSS Prevention**: Sanitize all user inputs and outputs

### Deprecated
- `/api/v1/analyze` endpoint (use `/api/detect` instead)
- Support for Python 3.8 (minimum now 3.9)

### Documentation
- Comprehensive API documentation with OpenAPI/Swagger
- New deployment guides for AWS, Azure, GCP
- Architecture overview and design decisions
- Contributing guidelines and development setup

---

## [1.1.0] — 2023-12-01

### Added
- **📦 Batch Processing API**: Process multiple images in a single request
  ```
  POST /api/batch/detect
  Content: Array of images (max 100)
  ```
- **⚙️ Configuration Management**: Environment-based config with validation
- **🏗️ Kubernetes Templates**: Ready-to-use YAML manifests for k8s deployment
- **📊 Prometheus Metrics**: Export metrics for monitoring and alerting
- **📝 Logging Integration**: Structured JSON logging for analysis
- **🔄 Auto-reload**: Hot reload on source code changes (dev mode)
- **📱 Progressive Web App**: Installable web app for mobile browsers

### Changed
- **🎨 Default Color Scheme**: Updated to modern green palette
- **🚀 API Structure**: Reorganized endpoints for better RESTful design
- **🐳 Docker Compose**: Added prod and dev variants
- **📦 Dependencies**: Updated all dependencies to latest versions

### Fixed
- **🐛 Database Migrations**: Fix for PostgreSQL compatibility
- **📸 Image Upload**: Support for additional image formats (HEIC, WebP)
- **🌐 Cross-Origin**: Proper CORS headers for mobile clients
- **⏱️ Request Timeout**: Graceful timeout handling for long-running operations

### Removed
- Support for Python 3.7
- deprecated REST endpoints from v1.0.0

---

## [1.0.0] — 2023-11-01 — Initial Release

### Added
- **Core Features**:
  - Plant disease detection for 38 diseases across 14 crop types
  - 95% accuracy on trained crop types
  - Web dashboard with modern UI
  - REST API for programmatic access
  - Mobile apps (iOS, Android)
  - Desktop apps (Windows, macOS, Linux)

- **Deployment**:
  - Docker containerization
  - Docker Compose for local development and production
  - Kubernetes deployment templates
  - Cloud provider integration guidance

- **Network Architecture**:
  - Efficient model inference pipeline with GPU support
  - Connection pooling for database operations
  - Caching layer for frequently detected diseases
  - Async request handling with Celery

- **Security**:
  - JWT token-based authentication
  - Role-based access control (RBAC)
  - Input validation and sanitization
  - SQL injection prevention
  - CORS policy enforcement
  - Request rate limiting

- **Monitoring & Analytics**:
  - Scan analytics and statistics
  - API usage metrics
  - Error logging and alerting
  - Health check endpoints

- **Documentation**:
  - Quick Start guide
  - Deployment guide with Docker/Kubernetes
  - API documentation
  - Architecture overview
  - Troubleshooting guide

### Features by Platform

**Web**:
- Modern responsive UI (Next.js + React)
- Real-time camera feed processing
- Drag-and-drop image upload
- Scan history and saved results

**Mobile** (iOS & Android):
- Native camera integration
- Offline detection capability
- Push notifications for new features
- Biometric authentication

**Desktop** (Windows, macOS, Linux):
- Standalone application
- System tray integration
- Batch folder scanning
- Auto-updates

---

## Version History

| Version | Release Date | End of Support | Status |
|---------|--------------|----------------|--------|
| 1.2.0 | Jan 15, 2024 | Jan 15, 2025 | **Current** ✓ |
| 1.1.0 | Dec 1, 2023 | Dec 1, 2024 | Supported ✓ |
| 1.0.0 | Nov 1, 2023 | Oct 31, 2024 | Legacy ⚠️ |

---

## Links & References

- **[Full Release Information](./index.md)**
- **[Release Process Documentation](./process.md)**
- **[GitHub Releases](https://github.com/naghdiefallah/plantify/releases)**
- **[GitHub Milestones](https://github.com/naghdiefallah/plantify/milestones)**

---

For more details about a specific version, visit the [Releases Page](./index.md) or [GitHub Releases](https://github.com/naghdiefallah/plantify/releases).
