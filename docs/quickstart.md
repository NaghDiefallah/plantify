# Quick Start Guide

Get Plantify running in 5 minutes! This guide covers the fastest way to start using Plantify.

## 🚀 Choose Your Platform

=== "Docker (Recommended)"

    **Prerequisites**: Docker installed ([Get Docker](https://docs.docker.com/get-docker/))

    ```bash
    # Pull latest image
    docker pull ghcr.io/naghdiefallah/plantify:latest

    # Run container
    docker run -d \
      --name plantify \
      -p 3000:3000 \
      -p 5000:5000 \
      -e PLANTIFY_ENV=production \
      ghcr.io/naghdiefallah/plantify:latest

    # Wait for startup (10-15 seconds)
    sleep 15

    # Access dashboard
    # → Frontend: http://localhost:3000
    # → API: http://localhost:5000
    ```

    **Verify running**:
    ```bash
    docker ps | grep plantify
    curl http://localhost:5000/health
    ```

    **Stop container**:
    ```bash
    docker stop plantify
    docker rm plantify
    ```

=== "Kubernetes"

    **Prerequisites**: kubectl configured, Helm 3+

    ```bash
    # Add Plantify Helm repository
    helm repo add plantify https://charts.plantify.example.com
    helm repo update

    # Install Plantify
    helm install plantify plantify/plantify \
      --namespace plantify \
      --create-namespace \
      --set image.tag=latest

    # Check deployment
    kubectl get pods -n plantify
    kubectl port-forward -n plantify svc/plantify 3000:3000

    # Access at http://localhost:3000
    ```

=== "Local Development"

    **Prerequisites**: 
    - Node.js 18+ ([Get Node](https://nodejs.org/))
    - Python 3.9+ ([Get Python](https://www.python.org/))
    - Git

    ```bash
    # Clone repository
    git clone https://github.com/naghdiefallah/plantify
    cd plantify

    # Backend setup
    cd backend
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    python -m uvicorn app.main:app --reload

    # In another terminal, frontend setup
    cd frontend
    npm install
    npm run dev

    # Access:
    # → Frontend: http://localhost:3000
    # → API: http://localhost:5000
    # → Docs: http://localhost:5000/docs
    ```

---

## 📸 First Detection

Once Plantify is running, detect a plant disease:

### Via Web Dashboard

1. Open http://localhost:3000
2. Click **"Upload Image"** or **"Take Photo"**
3. Select a plant image
4. View results:
   - **Disease**: Identified plant disease
   - **Confidence**: Detection confidence (0-100%)
   - **Treatment**: Recommended treatment

### Via REST API

```bash
# Convert image to base64
base64 -i plant-image.jpg > image.b64

# Send to API
curl -X POST http://localhost:5000/api/detect \
  -H "Content-Type: application/json" \
  -d @- << EOF
{
  "image": "$(cat image.b64)",
  "format": "jpeg"
}
EOF
```

**Response**:
```json
{
  "id": "scan_abc123",
  "detected": true,
  "crop": "Apple",
  "disease": "Apple Scab",
  "confidence": 0.94,
  "treatment": "Apply sulfur or copper fungicide in early spring",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## ⚙️ Basic Configuration

Configure Plantify via environment variables:

```bash
# Key Settings
PLANTIFY_ENV=production          # development, staging, production
DEBUG=false                       # Enable debug logging
LOG_LEVEL=INFO                    # DEBUG, INFO, WARNING, ERROR

# Database
DATABASE_URL=sqlite:///db.sqlite  # SQLite default
# DATABASE_URL=postgresql://user:pass@localhost/plantify  # PostgreSQL

# API
API_HOST=0.0.0.0
API_PORT=5000
API_WORKERS=4                     # Number of worker processes

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=Plantify
```

**Set variables**:

```bash
# Docker: Pass via environment
    docker run -e DATABASE_URL=postgresql://... ghcr.io/naghdiefallah/plantify:latest
# Local: Create .env file
echo "DATABASE_URL=postgresql://..." > backend/.env
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > frontend/.env.local
```

See [Configuration Guide](./configuration.md) for detailed options.

---

## 🧪 Verify Installation

Run verification tests:

```bash
# Health check
curl http://localhost:5000/health
# Response: {"status": "ok", "version": "1.2.0"}

# API documentation
curl http://localhost:5000/openapi.json

# Test detection with sample image
curl -X POST http://localhost:5000/api/detect \
  -H "Content-Type: application/json" \
  -d '{"image": "sample_base64_data"}'
```

---

## 📚 Next Steps

After getting Plantify running:

1. **[Explore Features](./features/detection.md)** — Learn about detection capabilities
2. **[API Guide](./features/api.md)** — Integrate into your app
3. **[Production Deployment](./deployment/docker.md)** — Deploy to production
4. **[Configuration](./configuration.md)** — Customize for your needs

---

## ❓ Troubleshooting

### Container won't start
```bash
# Check logs
docker logs plantify

# Try rebuilding
docker pull --no-cache ghcr.io/naghdiefallah/plantify:latest
```

### Port already in use
```bash
# Use different port
docker run -p 8000:3000 -p 8001:5000 ghcr.io/naghdiefallah/plantify:latest
```

### Model loading error
```bash
# Check model file exists
docker exec plantify ls -la /app/model/

# Verify model
docker exec plantify python -c "import torch; print(torch.cuda.is_available())"
```

### API timeout
```bash
# Increase timeout, reduce workers
docker run -e API_WORKERS=2 ghcr.io/naghdiefallah/plantify:latest

# Check available resources
docker stats plantify
```

See [Troubleshooting Guide](./faq.md#troubleshooting) for more.

---

## 🆘 Get Help

- 📖 **Documentation**: [Full docs](.)
- 🐛 **Issues**: [GitHub Issues](https://github.com/naghdiefallah/plantify/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/naghdiefallah/plantify/discussions)
- 📧 **Email**: support@plantify.example.com

---

## 🎯 Performance Tips

- **GPU Support**: Plantify auto-detects NVIDIA CUDA GPUs for 10x faster detection
- **Batch Processing**: Use batch API for multiple images (50% faster per image)
- **Caching**: Recently detected diseases are cached for instant results
- **Async Processing**: Use webhooks for non-blocking batch operations

---

**Tip**: For production deployments, see [Deployment Guide](./deployment/docker.md).
