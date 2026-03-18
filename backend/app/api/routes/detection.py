import base64
import hashlib
from typing import Annotated
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_session
from app.models.plant_metadata import PlantMetadata
from app.models.scan_history import ScanHistory
from app.models.user import User
from app.schemas.scan import DetectionResponse
from app.services.recommendations import recommendation_for_label
from app.services.upload_validation import validate_image_upload

router = APIRouter(prefix="/detect", tags=["detect"])


@router.post("", response_model=DetectionResponse)
async def detect(
    image: Annotated[UploadFile, File(...)],
    domain: Annotated[Literal["color", "grayscale", "segmented"], Form()] = "color",
    segmented_image: UploadFile | None = File(default=None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DetectionResponse:
    ai = getattr(router, "ai_service", None)
    if ai is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI service not ready")

    image_bytes = await image.read()
    validate_image_upload(image, image_bytes, field_name="image")

    prediction = ai.predict(image_bytes)
    label = prediction["label"]
    confidence = prediction["confidence"]

    metadata_stmt = select(PlantMetadata).where(PlantMetadata.disease_type == label)
    metadata = (await session.execute(metadata_stmt)).scalar_one_or_none()
    recommendation = metadata.treatment_recommendation if metadata else recommendation_for_label(label)

    digest = hashlib.sha256(image_bytes).hexdigest()
    scan = ScanHistory(
        user_id=current_user.id,
        disease_type=label,
        confidence_score=confidence,
        recommendation=recommendation,
        domain=domain,
        image_sha256=digest,
    )
    session.add(scan)
    await session.commit()

    before_b64 = base64.b64encode(image_bytes).decode("utf-8")
    after_b64 = None
    if segmented_image is not None:
        segmented_bytes = await segmented_image.read()
        if segmented_bytes:
            validate_image_upload(segmented_image, segmented_bytes, field_name="segmented_image")
            after_b64 = base64.b64encode(segmented_bytes).decode("utf-8")

    return DetectionResponse(
        disease_type=label,
        confidence_score=confidence,
        treatment_recommendations=recommendation,
        domain=domain,
        before_image_b64=before_b64,
        after_image_b64=after_b64,
    )
