import json
from io import BytesIO
from pathlib import Path
from typing import Any

import numpy as np
import onnxruntime as ort
from PIL import Image


class AIService:
    def __init__(self, model_path: str, labels_path: str) -> None:
        self.model_path = Path(model_path)
        self.labels_path = Path(labels_path)
        self.session = self._load_session()
        self.labels = self._load_labels()

    def _load_session(self) -> ort.InferenceSession:
        providers = ["CPUExecutionProvider"]
        session_options = ort.SessionOptions()
        session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        return ort.InferenceSession(str(self.model_path), providers=providers, sess_options=session_options)

    def _load_labels(self) -> list[str]:
        if self.labels_path.exists():
            return json.loads(self.labels_path.read_text(encoding="utf-8"))
        return []

    @staticmethod
    def preprocess(image_bytes: bytes, image_size: int = 240) -> np.ndarray:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        image = image.resize((256, 256), Image.Resampling.BILINEAR)

        left = (256 - image_size) // 2
        top = (256 - image_size) // 2
        image = image.crop((left, top, left + image_size, top + image_size))

        arr = np.asarray(image).astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)

        arr = (arr - mean) / std
        arr = np.transpose(arr, (2, 0, 1))
        return np.expand_dims(arr, axis=0)

    def predict(self, image_bytes: bytes) -> dict[str, Any]:
        input_tensor = self.preprocess(image_bytes)
        input_name = self.session.get_inputs()[0].name
        output_name = self.session.get_outputs()[0].name

        logits = self.session.run([output_name], {input_name: input_tensor})[0][0]
        probs = self._softmax(logits)

        index = int(np.argmax(probs))
        confidence = float(probs[index])
        label = self.labels[index] if self.labels and index < len(self.labels) else f"class_{index}"

        return {
            "index": index,
            "label": label,
            "confidence": confidence,
        }

    @staticmethod
    def _softmax(logits: np.ndarray) -> np.ndarray:
        shifted = logits - np.max(logits)
        exp = np.exp(shifted)
        return exp / np.sum(exp)
