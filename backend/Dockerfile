FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

ARG MODEL_BOOTSTRAP_CLASSES=""
ARG MODEL_VERSION_PREFIX="ci"
ARG GITHUB_SHA=""
ARG GITHUB_RUN_ID=""
ENV MODEL_BOOTSTRAP_CLASSES=${MODEL_BOOTSTRAP_CLASSES}
ENV MODEL_VERSION_PREFIX=${MODEL_VERSION_PREFIX}
ENV GITHUB_SHA=${GITHUB_SHA}
ENV GITHUB_RUN_ID=${GITHUB_RUN_ID}

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY backend /app
RUN python scripts/ensure_model_artifacts.py
RUN chmod +x scripts/start.sh

EXPOSE 8000
CMD ["sh", "scripts/start.sh"]
