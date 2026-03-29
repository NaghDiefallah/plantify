FROM python:3.11-alpine AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	PATH="/opt/venv/bin:${PATH}"

WORKDIR /app

ARG MODEL_BOOTSTRAP_CLASSES=""
ARG MODEL_VERSION_PREFIX="ci"
ARG GITHUB_SHA=""
ARG GITHUB_RUN_ID=""
ENV MODEL_BOOTSTRAP_CLASSES=${MODEL_BOOTSTRAP_CLASSES} \
	MODEL_VERSION_PREFIX=${MODEL_VERSION_PREFIX} \
	GITHUB_SHA=${GITHUB_SHA} \
	GITHUB_RUN_ID=${GITHUB_RUN_ID}

RUN apk add --no-cache --virtual .build-deps \
	build-base \
	libffi-dev \
	openssl-dev \
	&& python -m venv /opt/venv

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --upgrade pip \
	&& pip install --no-cache-dir -r /tmp/requirements.txt

COPY backend /app
RUN python scripts/ensure_model_artifacts.py \
	&& chmod +x scripts/start.sh \
	&& find /opt/venv -type d -name "__pycache__" -prune -exec rm -rf {} \; \
	&& rm -rf /root/.cache /tmp/*

FROM python:3.11-alpine AS runner

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	PATH="/opt/venv/bin:${PATH}"

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /app /app

EXPOSE 8000
CMD ["sh", "scripts/start.sh"]
