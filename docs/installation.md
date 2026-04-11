# Installation Guide

Complete platform-specific installation instructions for Plantify.

---

## 🎯 Choose Your Installation Method

Plantify supports multiple installation methods. Choose based on your use case:

| Method | Best For | Setup Time | Complexity |
|--------|----------|-----------|-----------|
| **Docker** | Production, CI/CD, reproducible environments | 5 mins | ⭐ Low |
| **Kubernetes** | Large-scale deployments, cloud, high availability | 10 mins | ⭐⭐ Medium |
| **Source Code** | Development, customization, contributin | 20 mins | ⭐⭐⭐ High |
| **Package Managers** | macOS/Linux desktop users | 2 mins | ⭐ Low |
| **Pre-built Binaries** | Desktop applications (Windows, macOS, Linux) | 3 mins | ⭐ Low |

---

## Docker Installation (Recommended)

### Prerequisites
- **Docker**: [Install Docker](https://docs.docker.com/get-docker/)
- **4 GB RAM** minimum
- **Internet connection** for initial pull

### Quick Start

```bash
# Pull image
docker pull ghcr.io/naghdiefallah/plantify:latest

# Run container
docker run -d \
  --name plantify \
  -p 3000:3000 \
  -p 5000:5000 \
  --memory=4g \
  ghcr.io/naghdiefallah/plantify:latest

# Wait for startup
sleep 10

# Access services
# Frontend: http://localhost:3000
# API: http://localhost:5000
# API Docs: http://localhost:5000/docs
```

### Production Setup with Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    image: ghcr.io/naghdiefallah/plantify:v1.2.0
    ports:
      - "5000:5000"
    environment:
      - PLANTIFY_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/plantify
      - DEBUG=false
    depends_on:
      - db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: ghcr.io/naghdiefallah/plantify:v1.2.0
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://api.plantify.example.com
      - NODE_ENV=production
    depends_on:
      - api
    restart: unless-stopped

  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=plantify
      - POSTGRES_USER=plantify
      - POSTGRES_PASSWORD=securepassword123
    restart: unless-stopped

volumes:
  postgres_data:
```

**Launch**:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## Kubernetes Installation

### Prerequisites
- **Kubernetes cluster**: v1.18+
- **kubectl**: Configured and connected to cluster
- **Helm**: v3+
- **Persistent storage**: For database

### Using Helm (Recommended)

```bash
# Add Helm repository
helm repo add plantify https://charts.plantify.example.com
helm repo update

# Install with defaults
helm install plantify plantify/plantify \
  --namespace plantify \
  --create-namespace

# Or with custom values
helm install plantify plantify/plantify \
  -f values.yaml \
  --namespace plantify
```

### Custom Values (values.yaml)

```yaml
image:
  repository: ghcr.io/naghdiefallah/plantify
  tag: v1.2.0
  pullPolicy: IfNotPresent

replicas: 3

resources:
  requests:
    memory: "2Gi"
    cpu: "1000m"
  limits:
    memory: "4Gi"
    cpu: "2000m"

persistence:
  enabled: true
  storageClass: standard
  size: 20Gi

postgresql:
  enabled: true
  auth:
    username: plantify
    password: securepassword
    database: plantify

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: plantify.example.com
      paths:
        - path: /
          pathType: Prefix
```

**Deploy**:
```bash
kubectl apply -f values.yaml
helm install plantify plantify/plantify -f values.yaml
```

**Verify**:
```bash
kubectl get pods -n plantify
kubectl port-forward -n plantify svc/plantify 3000:3000
# Visit http://localhost:3000
```

---

## Source Code Installation

### Prerequisites

#### Backend
- **Python**: 3.9 or 3.11
- **pip**: Package manager
- **Git**: Clone repository
- **Virtual environment**: venv or conda

#### Frontend
- **Node.js**: 18 or 20
- **npm**: 9+
- **CUDA** (optional): For GPU

### Step 1: Clone Repository

```bash
git clone https://github.com/naghdiefallah/plantify
cd plantify
```

### Step 2: Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Linux/macOS)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
PLANTIFY_ENV=development
DEBUG=true
DATABASE_URL=sqlite:///./test.db
SECRET_KEY=choose-a-strong-key-here
CORS_ORIGINS=http://localhost:3000
EOF

# Run migrations
alembic upgrade head

# Start server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
```

**Backend ready at**: `http://localhost:5000`  
**API Documentation**: `http://localhost:5000/docs`

### Step 3: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=Plantify
EOF

# Start development server
npm run dev
```

**Frontend ready at**: `http://localhost:3000`

### Step 4: Verify Installation

```bash
# Terminal 1: Check API health
curl http://localhost:5000/health

# Terminal 2: Check frontend
curl http://localhost:3000

# Browser: Open http://localhost:3000
```

---

## Desktop Application Installation

### Windows

#### MSI Installer
```powershell
# Download MSI
Invoke-WebRequest -Uri "https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/plantify-v1.2.0-windows-x86_64.msi" `
  -OutFile "plantify-installer.msi"

# Run installer
msiexec /i plantify-installer.msi

# App appears in Start Menu
```

#### Portable EXE
```powershell
# Download portable
Invoke-WebRequest -Uri "https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/plantify-v1.2.0-windows-portable.exe" `
  -OutFile "plantify.exe"

# Run directly
.\plantify.exe
```

### macOS

#### DMG
```bash
# Download
curl -L -o plantify.dmg \
  "https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/plantify-v1.2.0-macos-universal.dmg"

# Mount and install
hdiutil attach plantify.dmg
cp -r /Volumes/Plantify/Plantify.app /Applications/
hdiutil detach /Volumes/Plantify
```

#### Homebrew
```bash
brew tap plantify/plantify
brew install plantify
```

### Linux

#### AppImage
```bash
# Download
wget https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/plantify-v1.2.0-linux-x86_64.AppImage

# Make executable
chmod +x plantify-v1.2.0-linux-x86_64.AppImage

# Run
./plantify-v1.2.0-linux-x86_64.AppImage
```

#### Debian/Ubuntu
```bash
# Download
wget https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/plantify-v1.2.0-linux-x86_64.deb

# Install
sudo apt-get install ./plantify-v1.2.0-linux-x86_64.deb

# Run
plantify
```

#### Red Hat/Fedora
```bash
# Download
wget https://github.com/naghdiefallah/plantify/releases/download/v1.2.0/plantify-v1.2.0-linux-x86_64.rpm

# Install
sudo dnf install ./plantify-v1.2.0-linux-x86_64.rpm

# Run
plantify
```

---

## Mobile Installation

### Android

Download from:
- **Google Play Store**: [Plantify](https://play.google.com/store/apps/details?id=com.plantify.app)
- **GitHub Releases**: [APK](https://github.com/naghdiefallah/plantify/releases)
- **F-Droid**: [Plantify](https://f-droid.org/packages/com.plantify.app)

Or sideload:
```bash
adb install plantify-v1.2.0-android-universal.apk
```

### iOS

Download from:
- **App Store**: [Plantify](https://apps.apple.com/app/plantify/id...)
- **TestFlight**: [Beta](https://testflight.apple.com/join/...)

---

## Verification

After installation, verify Plantify is working:

```bash
# API health
curl http://localhost:5000/health

# Frontend
curl http://localhost:3000

# Try detection
curl -X POST http://localhost:5000/api/detect \
  -H "Content-Type: application/json" \
  -d '{
    "image": "base64-encoded-image",
    "format": "jpeg"
  }'
```

---

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs plantify

# Increase memory
docker run --memory=8g ghcr.io/naghdiefallah/plantify:latest
```

### Port already in use
```bash
# Use different ports
docker run -p 8000:3000 -p 8001:5000 ghcr.io/naghdiefallah/plantify:latest
```

### Model fails to load
```bash
# Reset model
docker exec plantify rm -f /app/model/plantify_model.onnx

# Restart container
docker restart plantify

# Container will re-download on startup
```

### Database connection error
```bash
# Check DATABASE_URL environment variable
docker exec plantify env | grep DATABASE

# Verify database is running
docker ps | grep postgres
```

---

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **RAM** | 2 GB | 8 GB |
| **CPU** | 2 cores | 4+ cores |
| **Disk** | 5 GB | 20 GB |
| **GPU** | - | NVIDIA CUDA |

---

## Next Steps

- **[Configuration Guide](./configuration.md)** — Customize your setup
- **[Quick Start](./quickstart.md)** — First plant detection
- **[Deployment Guide](./deployment/docker.md)** — Production setup
- **[API Documentation](./features/api.md)** — Integrate

---

## Getting Help

- 📖 **[Full Documentation](./)** — Read guides and tutorials
- 🐛 **[Report Issues](https://github.com/naghdiefallah/plantify/issues)** — Found a bug?
- 💬 **[GitHub Discussions](https://github.com/naghdiefallah/plantify/discussions)** — Ask questions
- 📧 **Email**: support@plantify.example.com
