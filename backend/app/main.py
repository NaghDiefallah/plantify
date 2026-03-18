from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, dashboard, detection, users
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.ai_service import AIService
from app.services.bootstrap import seed_metadata_if_empty
from scripts.export_onnx import export as export_onnx

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    model_path = Path(settings.model_path)
    labels_path = Path(settings.labels_path)
    if not model_path.exists() or not labels_path.exists():
        export_onnx(settings.checkpoint_path)

    ai_service = AIService(model_path=settings.model_path, labels_path=settings.labels_path)
    detection.router.ai_service = ai_service

    async with SessionLocal() as session:
        await seed_metadata_if_empty(session, settings.labels_path)

    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(detection.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
