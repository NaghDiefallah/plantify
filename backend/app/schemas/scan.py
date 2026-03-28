from datetime import datetime

from pydantic import BaseModel


class DetectionResponse(BaseModel):
    disease_type: str
    confidence_score: float
    treatment_recommendations: str
    domain: str
    image_sha256: str | None = None
    before_image_b64: str | None = None
    after_image_b64: str | None = None


class ScanHistoryResponse(BaseModel):
    id: str
    disease_type: str
    confidence_score: float
    recommendation: str
    domain: str
    created_at: datetime
    before_image_b64: str | None = None

    model_config = {"from_attributes": True}


class StatsResponse(BaseModel):
    total_scans: int
    healthy_ratio: float
    top_disease: str | None
