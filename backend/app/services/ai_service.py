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

    @staticmethod
    def _plant_likelihood(image_bytes: bytes) -> dict[str, float]:
        image = Image.open(BytesIO(image_bytes)).convert("RGB").resize((240, 240), Image.Resampling.BILINEAR)
        arr = np.asarray(image).astype(np.float32) / 255.0

        r = arr[..., 0]
        g = arr[..., 1]
        b = arr[..., 2]

        vegetation_mask = (g > (r * 1.05)) & (g > (b * 1.05))
        vegetation_ratio = float(np.mean(vegetation_mask))
        green_dominance = float(np.mean((g > (r + 0.03)) & (g > (b + 0.03))))

        green_excess = float(np.clip(np.mean(g - ((r + b) * 0.5)), 0.0, 1.0))

        max_channel = np.max(arr, axis=2)
        min_channel = np.min(arr, axis=2)
        saturation = np.where(max_channel > 0, (max_channel - min_channel) / max_channel, 0.0)
        saturation_mean = float(np.mean(saturation))
        high_contrast_ratio = float(np.mean((max_channel - min_channel) > 0.55))

        gray_like_ratio = float(np.mean((np.abs(r - g) < 0.04) & (np.abs(g - b) < 0.04)))

        gray = (0.299 * r) + (0.587 * g) + (0.114 * b)
        edge_h = np.abs(np.diff(gray, axis=1)).mean()
        edge_v = np.abs(np.diff(gray, axis=0)).mean()
        edge_density = float(np.clip((edge_h + edge_v) * 2.5, 0.0, 1.0))

        # UI screenshots and text-heavy images usually have high contrast/edges with low vegetation.
        score = (
            (0.45 * vegetation_ratio)
            + (0.2 * green_excess)
            + (0.18 * saturation_mean)
            + (0.15 * green_dominance)
            - (0.2 * gray_like_ratio)
            - (0.12 * high_contrast_ratio)
            - (0.08 * edge_density)
        )
        plant_score = float(np.clip(score, 0.0, 1.0))
        return {
            "plant_score": plant_score,
            "vegetation_ratio": vegetation_ratio,
            "gray_ratio": gray_like_ratio,
            "high_contrast_ratio": high_contrast_ratio,
            "edge_density": edge_density,
        }

    @staticmethod
    def _prediction_stats(probs: np.ndarray) -> dict[str, float]:
        if probs.size == 0:
            return {"confidence": 0.0, "margin": 0.0, "entropy": 1.0}
        sorted_probs = np.sort(probs)
        top1 = float(sorted_probs[-1])
        top2 = float(sorted_probs[-2]) if probs.size > 1 else 0.0
        margin = top1 - top2
        eps = 1e-12
        entropy = float(-np.sum(probs * np.log(np.clip(probs, eps, 1.0))))
        entropy_max = float(np.log(max(2, probs.size)))
        normalized_entropy = float(entropy / entropy_max) if entropy_max > 0 else 1.0
        return {"confidence": top1, "margin": margin, "entropy": normalized_entropy}

    def predict(self, image_bytes: bytes) -> dict[str, Any]:
        input_tensor = self.preprocess(image_bytes)
        input_name = self.session.get_inputs()[0].name
        output_name = self.session.get_outputs()[0].name

        logits = self.session.run([output_name], {input_name: input_tensor})[0][0]
        probs = self._softmax(logits)
        stats = self._prediction_stats(probs)

        index = int(np.argmax(probs))
        confidence = float(probs[index])
        label = self.labels[index] if self.labels and index < len(self.labels) else f"class_{index}"
        plant_features = self._plant_likelihood(image_bytes)
        plant_score = float(plant_features["plant_score"])
        margin = float(stats["margin"])
        entropy = float(stats["entropy"])

        # Reject obvious non-plant images (e.g., UI screenshots/text/objects)
        # by combining image heuristics with prediction uncertainty.
        is_plant = plant_score >= 0.16
        if is_plant and plant_score < 0.22 and (confidence < 0.9 or margin < 0.2):
            is_plant = False
        if is_plant and entropy > 0.72 and plant_score < 0.3:
            is_plant = False
        if is_plant and plant_features["gray_ratio"] > 0.45 and plant_features["vegetation_ratio"] < 0.08:
            is_plant = False

        return {
            "index": index,
            "label": label,
            "confidence": confidence,
            "plant_score": plant_score,
            "margin": margin,
            "entropy": entropy,
            "is_plant": is_plant,
        }

    @staticmethod
    def _softmax(logits: np.ndarray) -> np.ndarray:
        shifted = logits - np.max(logits)
        exp = np.exp(shifted)
        return exp / np.sum(exp)
