FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY backend /app
COPY plantify_model.pth /app/model/plantify_model.pth

RUN python scripts/export_onnx.py
RUN chmod +x scripts/start.sh

EXPOSE 8000
CMD ["sh", "scripts/start.sh"]
