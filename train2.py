# ============================================================
# CELL 1: UNIVERSAL NOTEBOOK ENVIRONMENT, IMPORTS, AND SETUP
# ============================================================

from __future__ import annotations

import gc
import hashlib
import importlib.util
import io
import json
import math
import os
import random
import shutil
import subprocess
import sys
import textwrap
import time
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

# ------------------------------------------------------------
# Auto-install required packages if they are not already present.
# This keeps the script sequential and self-contained.
# ------------------------------------------------------------

def ensure_packages() -> None:
    required = {
        "kagglehub": "kagglehub",
        "timm": "timm>=1.0.9",
        "huggingface_hub": "huggingface_hub>=0.24.0",
        "onnx": "onnx>=1.16.0",
        "onnxruntime": "onnxruntime>=1.18.0",
        "sklearn": "scikit-learn>=1.4.0",
        "tensorflow_datasets": "tensorflow-datasets>=4.9.6",
        "PIL": "Pillow>=10.4.0",
    }
    missing = []
    for module_name, pip_name in required.items():
        if importlib.util.find_spec(module_name) is None:
            missing.append(pip_name)
    if missing:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q"] + missing)

ensure_packages()

# ------------------------------------------------------------
# Imports that depend on the package installation step.
# ------------------------------------------------------------

import kagglehub
import numpy as np
import onnx
import onnxruntime as ort
import tensorflow_datasets as tfds
import timm
import torch
import torch.nn as nn
import torch.optim as optim
from huggingface_hub import snapshot_download
from PIL import Image, ImageFile
from sklearn.model_selection import train_test_split
from torch.cuda.amp import GradScaler, autocast
from torch.utils.data import DataLoader, Dataset, Subset, WeightedRandomSampler
from torchvision import datasets, transforms

ImageFile.LOAD_TRUNCATED_IMAGES = True
torch.backends.cudnn.benchmark = True

# ------------------------------------------------------------
# Reproducibility settings.
# ------------------------------------------------------------

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

# ------------------------------------------------------------
# Universal cloud notebook environment detection.
# ------------------------------------------------------------

@dataclass
class RuntimeConfig:
    platform_name: str
    workspace_dir: Path
    cache_dir: Path
    data_dir: Path
    merged_dir: Path
    split_dir: Path
    artifacts_dir: Path
    package_dir: Path
    reference_models_dir: Path


def detect_runtime() -> RuntimeConfig:
    if "COLAB_GPU" in os.environ:
        platform_name = "colab"
        base = Path("/tmp/plantify_hybrid")
    elif "KAGGLE_KERNEL_RUN_TYPE" in os.environ:
        platform_name = "kaggle"
        base = Path("/kaggle/working/plantify_hybrid")
    elif "SM_TRAINING_ENV" in os.environ or "SAGEMAKER_JOB_NAME" in os.environ:
        platform_name = "sagemaker"
        base = Path("/tmp/plantify_hybrid")
    else:
        platform_name = "local"
        base = Path.cwd() / "plantify_hybrid_workspace"

    cache_dir = base / "cache"
    data_dir = base / "data"
    merged_dir = base / "merged_dataset"
    split_dir = base / "prepared_dataset"
    artifacts_dir = base / "artifacts"
    package_dir = base / "deploy_package_contents"
    reference_models_dir = base / "reference_models"

    for path in [base, cache_dir, data_dir, merged_dir, split_dir, artifacts_dir, package_dir, reference_models_dir]:
        path.mkdir(parents=True, exist_ok=True)

    return RuntimeConfig(
        platform_name=platform_name,
        workspace_dir=base,
        cache_dir=cache_dir,
        data_dir=data_dir,
        merged_dir=merged_dir,
        split_dir=split_dir,
        artifacts_dir=artifacts_dir,
        package_dir=package_dir,
        reference_models_dir=reference_models_dir,
    )


RUNTIME = detect_runtime()
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ------------------------------------------------------------
# Memory hygiene helpers to reduce OOM risk on shared hardware.
# ------------------------------------------------------------

def cleanup_memory() -> None:
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()


def get_num_workers() -> int:
    cpu_count = os.cpu_count() or 2
    if RUNTIME.platform_name == "kaggle":
        return min(4, cpu_count)
    if RUNTIME.platform_name == "colab":
        return min(2, cpu_count)
    return min(6, cpu_count)


NUM_WORKERS = get_num_workers()

# ============================================================
# CELL 2: DATASET CONFIGURATION, MULTILINGUAL CLASS MAP, AND
#         KAGGLE / TFDS DATA INGESTION
# ============================================================

# ------------------------------------------------------------
# Canonical PlantVillage class names.
# ------------------------------------------------------------

CANONICAL_CLASSES = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___healthy",
    "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew",
    "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot",
    "Peach___healthy",
    "Pepper,_bell___Bacterial_spot",
    "Pepper,_bell___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Raspberry___healthy",
    "Soybean___healthy",
    "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch",
    "Strawberry___healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy",
]

# ------------------------------------------------------------
# Exact five-language mapping for all canonical classes.
# ------------------------------------------------------------

MULTILINGUAL_CLASS_MAP: Dict[str, Dict[str, str]] = {
    "Apple___Apple_scab": {
        "ar": "تفاح - جرب التفاح",
        "en": "Apple - Apple scab",
        "es": "Manzana - Sarna del manzano",
        "hi": "सेब - एप्पल स्कैब",
        "zh": "苹果 - 苹果黑星病",
    },
    "Apple___Black_rot": {
        "ar": "تفاح - العفن الأسود",
        "en": "Apple - Black rot",
        "es": "Manzana - Podredumbre negra",
        "hi": "सेब - काला सड़न रोग",
        "zh": "苹果 - 黑腐病",
    },
    "Apple___Cedar_apple_rust": {
        "ar": "تفاح - صدأ الأرز والتفاح",
        "en": "Apple - Cedar apple rust",
        "es": "Manzana - Roya del cedro y manzano",
        "hi": "सेब - सीडर एप्पल रस्ट",
        "zh": "苹果 - 苹果雪松锈病",
    },
    "Apple___healthy": {
        "ar": "تفاح - سليم",
        "en": "Apple - Healthy",
        "es": "Manzana - Sana",
        "hi": "सेब - स्वस्थ",
        "zh": "苹果 - 健康",
    },
    "Blueberry___healthy": {
        "ar": "توت أزرق - سليم",
        "en": "Blueberry - Healthy",
        "es": "Arándano - Sano",
        "hi": "ब्लूबेरी - स्वस्थ",
        "zh": "蓝莓 - 健康",
    },
    "Cherry_(including_sour)___Powdery_mildew": {
        "ar": "كرز - البياض الدقيقي",
        "en": "Cherry - Powdery mildew",
        "es": "Cereza - Oídio",
        "hi": "चेरी - पाउडरी मिल्ड्यू",
        "zh": "樱桃 - 白粉病",
    },
    "Cherry_(including_sour)___healthy": {
        "ar": "كرز - سليم",
        "en": "Cherry - Healthy",
        "es": "Cereza - Sana",
        "hi": "चेरी - स्वस्थ",
        "zh": "樱桃 - 健康",
    },
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": {
        "ar": "ذرة - تبقع أوراق السيركوسبورا / التبقع الرمادي",
        "en": "Corn - Cercospora leaf spot / Gray leaf spot",
        "es": "Maíz - Mancha foliar por Cercospora / Mancha gris",
        "hi": "मक्का - सर्कोस्पोरा लीफ स्पॉट / ग्रे लीफ स्पॉट",
        "zh": "玉米 - 尾孢叶斑病 / 灰斑病",
    },
    "Corn_(maize)___Common_rust_": {
        "ar": "ذرة - الصدأ الشائع",
        "en": "Corn - Common rust",
        "es": "Maíz - Roya común",
        "hi": "मक्का - सामान्य रतुआ",
        "zh": "玉米 - 普通锈病",
    },
    "Corn_(maize)___Northern_Leaf_Blight": {
        "ar": "ذرة - لفحة الأوراق الشمالية",
        "en": "Corn - Northern leaf blight",
        "es": "Maíz - Tizón foliar del norte",
        "hi": "मक्का - नॉर्दर्न लीफ ब्लाइट",
        "zh": "玉米 - 北方叶枯病",
    },
    "Corn_(maize)___healthy": {
        "ar": "ذرة - سليمة",
        "en": "Corn - Healthy",
        "es": "Maíz - Sano",
        "hi": "मक्का - स्वस्थ",
        "zh": "玉米 - 健康",
    },
    "Grape___Black_rot": {
        "ar": "عنب - العفن الأسود",
        "en": "Grape - Black rot",
        "es": "Uva - Podredumbre negra",
        "hi": "अंगूर - काला सड़न रोग",
        "zh": "葡萄 - 黑腐病",
    },
    "Grape___Esca_(Black_Measles)": {
        "ar": "عنب - إيسكا (الحصبة السوداء)",
        "en": "Grape - Esca (Black measles)",
        "es": "Uva - Esca (Sarampión negro)",
        "hi": "अंगूर - एस्का (ब्लैक मीसल्स)",
        "zh": "葡萄 - 埃斯卡病（黑痘病）",
    },
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)": {
        "ar": "عنب - لفحة الأوراق (تبقع إيساريوپسيس)",
        "en": "Grape - Leaf blight (Isariopsis leaf spot)",
        "es": "Uva - Tizón foliar (Mancha de Isariopsis)",
        "hi": "अंगूर - लीफ ब्लाइट (आइसारियोप्सिस लीफ स्पॉट)",
        "zh": "葡萄 - 叶枯病（串珠镰孢叶斑）",
    },
    "Grape___healthy": {
        "ar": "عنب - سليم",
        "en": "Grape - Healthy",
        "es": "Uva - Sana",
        "hi": "अंगूर - स्वस्थ",
        "zh": "葡萄 - 健康",
    },
    "Orange___Haunglongbing_(Citrus_greening)": {
        "ar": "برتقال - هوانجلونجبينج (تخضير الحمضيات)",
        "en": "Orange - Huanglongbing (Citrus greening)",
        "es": "Naranja - Huanglongbing (Enverdecimiento de cítricos)",
        "hi": "संतरा - हुआंगलोंगबिंग (सिट्रस ग्रीनिंग)",
        "zh": "橙子 - 黄龙病（柑橘黄化病）",
    },
    "Peach___Bacterial_spot": {
        "ar": "خوخ - التبقع البكتيري",
        "en": "Peach - Bacterial spot",
        "es": "Durazno - Mancha bacteriana",
        "hi": "आड़ू - बैक्टीरियल स्पॉट",
        "zh": "桃 - 细菌性斑点病",
    },
    "Peach___healthy": {
        "ar": "خوخ - سليم",
        "en": "Peach - Healthy",
        "es": "Durazno - Sano",
        "hi": "आड़ू - स्वस्थ",
        "zh": "桃 - 健康",
    },
    "Pepper,_bell___Bacterial_spot": {
        "ar": "فلفل رومي - التبقع البكتيري",
        "en": "Bell pepper - Bacterial spot",
        "es": "Pimiento morrón - Mancha bacteriana",
        "hi": "शिमला मिर्च - बैक्टीरियल स्पॉट",
        "zh": "甜椒 - 细菌性斑点病",
    },
    "Pepper,_bell___healthy": {
        "ar": "فلفل رومي - سليم",
        "en": "Bell pepper - Healthy",
        "es": "Pimiento morrón - Sano",
        "hi": "शिमला मिर्च - स्वस्थ",
        "zh": "甜椒 - 健康",
    },
    "Potato___Early_blight": {
        "ar": "بطاطس - اللفحة المبكرة",
        "en": "Potato - Early blight",
        "es": "Papa - Tizón temprano",
        "hi": "आलू - अर्ली ब्लाइट",
        "zh": "马铃薯 - 早疫病",
    },
    "Potato___Late_blight": {
        "ar": "بطاطس - اللفحة المتأخرة",
        "en": "Potato - Late blight",
        "es": "Papa - Tizón tardío",
        "hi": "आलू - लेट ब्लाइट",
        "zh": "马铃薯 - 晚疫病",
    },
    "Potato___healthy": {
        "ar": "بطاطس - سليمة",
        "en": "Potato - Healthy",
        "es": "Papa - Sana",
        "hi": "आलू - स्वस्थ",
        "zh": "马铃薯 - 健康",
    },
    "Raspberry___healthy": {
        "ar": "توت العليق - سليم",
        "en": "Raspberry - Healthy",
        "es": "Frambuesa - Sana",
        "hi": "रास्पबेरी - स्वस्थ",
        "zh": "覆盆子 - 健康",
    },
    "Soybean___healthy": {
        "ar": "فول الصويا - سليم",
        "en": "Soybean - Healthy",
        "es": "Soja - Sana",
        "hi": "सोयाबीन - स्वस्थ",
        "zh": "大豆 - 健康",
    },
    "Squash___Powdery_mildew": {
        "ar": "قرع - البياض الدقيقي",
        "en": "Squash - Powdery mildew",
        "es": "Calabaza - Oídio",
        "hi": "स्क्वैश - पाउडरी मिल्ड्यू",
        "zh": "南瓜 - 白粉病",
    },
    "Strawberry___Leaf_scorch": {
        "ar": "فراولة - احتراق الأوراق",
        "en": "Strawberry - Leaf scorch",
        "es": "Fresa - Quemadura de la hoja",
        "hi": "स्ट्रॉबेरी - लीफ स्कॉर्च",
        "zh": "草莓 - 叶灼病",
    },
    "Strawberry___healthy": {
        "ar": "فراولة - سليمة",
        "en": "Strawberry - Healthy",
        "es": "Fresa - Sana",
        "hi": "स्ट्रॉबेरी - स्वस्थ",
        "zh": "草莓 - 健康",
    },
    "Tomato___Bacterial_spot": {
        "ar": "طماطم - التبقع البكتيري",
        "en": "Tomato - Bacterial spot",
        "es": "Tomate - Mancha bacteriana",
        "hi": "टमाटर - बैक्टीरियल स्पॉट",
        "zh": "番茄 - 细菌性斑点病",
    },
    "Tomato___Early_blight": {
        "ar": "طماطم - اللفحة المبكرة",
        "en": "Tomato - Early blight",
        "es": "Tomate - Tizón temprano",
        "hi": "टमाटर - अर्ली ब्लाइट",
        "zh": "番茄 - 早疫病",
    },
    "Tomato___Late_blight": {
        "ar": "طماطم - اللفحة المتأخرة",
        "en": "Tomato - Late blight",
        "es": "Tomate - Tizón tardío",
        "hi": "टमाटर - लेट ब्लाइट",
        "zh": "番茄 - 晚疫病",
    },
    "Tomato___Leaf_Mold": {
        "ar": "طماطم - عفن الأوراق",
        "en": "Tomato - Leaf mold",
        "es": "Tomate - Moho de la hoja",
        "hi": "टमाटर - लीफ मोल्ड",
        "zh": "番茄 - 叶霉病",
    },
    "Tomato___Septoria_leaf_spot": {
        "ar": "طماطم - تبقع أوراق السيبتوريا",
        "en": "Tomato - Septoria leaf spot",
        "es": "Tomate - Mancha foliar por Septoria",
        "hi": "टमाटर - सेप्टोरिया लीफ स्पॉट",
        "zh": "番茄 - 斑枯病",
    },
    "Tomato___Spider_mites Two-spotted_spider_mite": {
        "ar": "طماطم - العنكبوت الأحمر ذو البقعتين",
        "en": "Tomato - Two-spotted spider mite",
        "es": "Tomate - Araña roja de dos manchas",
        "hi": "टमाटर - टू-स्पॉटेड स्पाइडर माइट",
        "zh": "番茄 - 二斑叶螨",
    },
    "Tomato___Target_Spot": {
        "ar": "طماطم - البقعة الهدفية",
        "en": "Tomato - Target spot",
        "es": "Tomate - Mancha diana",
        "hi": "टमाटर - टारगेट स्पॉट",
        "zh": "番茄 - 靶斑病",
    },
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": {
        "ar": "طماطم - فيروس تجعد واصفرار أوراق الطماطم",
        "en": "Tomato - Tomato yellow leaf curl virus",
        "es": "Tomate - Virus del rizado amarillo de la hoja",
        "hi": "टमाटर - टोमैटो येलो लीफ कर्ल वायरस",
        "zh": "番茄 - 黄化曲叶病毒病",
    },
    "Tomato___Tomato_mosaic_virus": {
        "ar": "طماطم - فيروس موزاييك الطماطم",
        "en": "Tomato - Tomato mosaic virus",
        "es": "Tomate - Virus del mosaico del tomate",
        "hi": "टमाटर - टोमैटो मोज़ेक वायरस",
        "zh": "番茄 - 花叶病毒病",
    },
    "Tomato___healthy": {
        "ar": "طماطم - سليمة",
        "en": "Tomato - Healthy",
        "es": "Tomate - Sana",
        "hi": "टमाटर - स्वस्थ",
        "zh": "番茄 - 健康",
    },
}

# ------------------------------------------------------------
# Fallback translation logic for unexpected classes.
# ------------------------------------------------------------

FALLBACK_CROP_TRANSLATIONS = {
    "apple": {"ar": "تفاح", "en": "Apple", "es": "Manzana", "hi": "सेब", "zh": "苹果"},
    "blueberry": {"ar": "توت أزرق", "en": "Blueberry", "es": "Arándano", "hi": "ब्लूबेरी", "zh": "蓝莓"},
    "cherry": {"ar": "كرز", "en": "Cherry", "es": "Cereza", "hi": "चेरी", "zh": "樱桃"},
    "corn": {"ar": "ذرة", "en": "Corn", "es": "Maíz", "hi": "मक्का", "zh": "玉米"},
    "grape": {"ar": "عنب", "en": "Grape", "es": "Uva", "hi": "अंगूर", "zh": "葡萄"},
    "orange": {"ar": "برتقال", "en": "Orange", "es": "Naranja", "hi": "संतरा", "zh": "橙子"},
    "peach": {"ar": "خوخ", "en": "Peach", "es": "Durazno", "hi": "आड़ू", "zh": "桃"},
    "pepper": {"ar": "فلفل", "en": "Pepper", "es": "Pimiento", "hi": "मिर्च", "zh": "辣椒"},
    "potato": {"ar": "بطاطس", "en": "Potato", "es": "Papa", "hi": "आलू", "zh": "马铃薯"},
    "raspberry": {"ar": "توت العليق", "en": "Raspberry", "es": "Frambuesa", "hi": "रास्पबेरी", "zh": "覆盆子"},
    "soybean": {"ar": "فول الصويا", "en": "Soybean", "es": "Soja", "hi": "सोयाबीन", "zh": "大豆"},
    "squash": {"ar": "قرع", "en": "Squash", "es": "Calabaza", "hi": "स्क्वैश", "zh": "南瓜"},
    "strawberry": {"ar": "فراولة", "en": "Strawberry", "es": "Fresa", "hi": "स्ट्रॉबेरी", "zh": "草莓"},
    "tomato": {"ar": "طماطم", "en": "Tomato", "es": "Tomate", "hi": "टमाटर", "zh": "番茄"},
}

FALLBACK_DISEASE_TRANSLATIONS = {
    "healthy": {"ar": "سليم", "en": "Healthy", "es": "Sano", "hi": "स्वस्थ", "zh": "健康"},
    "bacterial_spot": {"ar": "التبقع البكتيري", "en": "Bacterial spot", "es": "Mancha bacteriana", "hi": "बैक्टीरियल स्पॉट", "zh": "细菌性斑点病"},
    "early_blight": {"ar": "اللفحة المبكرة", "en": "Early blight", "es": "Tizón temprano", "hi": "अर्ली ब्लाइट", "zh": "早疫病"},
    "late_blight": {"ar": "اللفحة المتأخرة", "en": "Late blight", "es": "Tizón tardío", "hi": "लेट ब्लाइट", "zh": "晚疫病"},
    "powdery_mildew": {"ar": "البياض الدقيقي", "en": "Powdery mildew", "es": "Oídio", "hi": "पाउडरी मिल्ड्यू", "zh": "白粉病"},
    "leaf_scorch": {"ar": "احتراق الأوراق", "en": "Leaf scorch", "es": "Quemadura de la hoja", "hi": "लीफ स्कॉर्च", "zh": "叶灼病"},
}

# ------------------------------------------------------------
# Kaggle API credential fallbacks for Colab / local environments.
# ------------------------------------------------------------

def configure_kaggle_credentials() -> None:
    username = os.environ.get("KAGGLE_USERNAME", "").strip()
    key = os.environ.get("KAGGLE_KEY", "").strip()

    if (not username or not key) and RUNTIME.platform_name == "colab":
        try:
            from google.colab import userdata  # type: ignore
            username = username or userdata.get("KAGGLE_USERNAME")
            key = key or userdata.get("KAGGLE_KEY")
        except Exception:
            pass

    if username and key:
        os.environ["KAGGLE_USERNAME"] = username
        os.environ["KAGGLE_KEY"] = key
        kaggle_dir = Path.home() / ".kaggle"
        kaggle_dir.mkdir(parents=True, exist_ok=True)
        kaggle_json = kaggle_dir / "kaggle.json"
        kaggle_json.write_text(json.dumps({"username": username, "key": key}), encoding="utf-8")
        try:
            kaggle_json.chmod(0o600)
        except Exception:
            pass


def download_kaggle_dataset(dataset_ref: str, target_dir: Path) -> Optional[Path]:
    try:
        downloaded_path = Path(kagglehub.dataset_download(dataset_ref))
        target = target_dir / dataset_ref.replace("/", "__")
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(downloaded_path, target)
        return target
    except Exception as exc:
        print(f"[WARN] Failed to download Kaggle dataset {dataset_ref}: {exc}")
        return None


def download_tfds_plant_village(target_dir: Path) -> Optional[Path]:
    try:
        export_dir = target_dir / "tfds_plant_village_export"
        if export_dir.exists():
            shutil.rmtree(export_dir)
        export_dir.mkdir(parents=True, exist_ok=True)

        ds_train = tfds.load("plant_village", split="train", as_supervised=True, shuffle_files=False)
        builder = tfds.builder("plant_village")
        label_names = builder.info.features["label"].names

        for idx, (image, label) in enumerate(tfds.as_numpy(ds_train)):
            class_name = label_names[int(label)]
            class_dir = export_dir / class_name
            class_dir.mkdir(parents=True, exist_ok=True)
            image_path = class_dir / f"tfds_{idx:08d}.jpg"
            pil_img = Image.fromarray(image)
            pil_img.save(image_path, format="JPEG", quality=95)

            if idx % 500 == 0:
                cleanup_memory()

        return export_dir
    except Exception as exc:
        print(f"[WARN] Failed to download/export TFDS plant_village: {exc}")
        return None


# ============================================================
# CELL 3: DATA ENGINEERING, CLASS NORMALIZATION, DEDUPLICATION,
#         AND MULTILINGUAL CLASS MAP GENERATION
# ============================================================

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}

SKIP_DIR_NAMES = {
    "train", "training", "valid", "val", "validation", "test", "testing",
    "dataset", "datasets", "data", "images", "image", "plantvillage", "new plant diseases dataset"
}

ALIAS_MAP = {
    "Apple__Apple_scab": "Apple___Apple_scab",
    "Apple__Black_rot": "Apple___Black_rot",
    "Apple__Cedar_apple_rust": "Apple___Cedar_apple_rust",
    "Apple__healthy": "Apple___healthy",
    "Blueberry__healthy": "Blueberry___healthy",
    "Cherry__Powdery_mildew": "Cherry_(including_sour)___Powdery_mildew",
    "Cherry__healthy": "Cherry_(including_sour)___healthy",
    "Corn__Cercospora_leaf_spot Gray_leaf_spot": "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn__Common_rust_": "Corn_(maize)___Common_rust_",
    "Corn__Northern_Leaf_Blight": "Corn_(maize)___Northern_Leaf_Blight",
    "Corn__healthy": "Corn_(maize)___healthy",
    "Grape__Black_rot": "Grape___Black_rot",
    "Grape__Esca_(Black_Measles)": "Grape___Esca_(Black_Measles)",
    "Grape__Leaf_blight_(Isariopsis_Leaf_Spot)": "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape__healthy": "Grape___healthy",
    "Orange__Haunglongbing_(Citrus_greening)": "Orange___Haunglongbing_(Citrus_greening)",
    "Peach__Bacterial_spot": "Peach___Bacterial_spot",
    "Peach__healthy": "Peach___healthy",
    "Pepper_bell__Bacterial_spot": "Pepper,_bell___Bacterial_spot",
    "Pepper_bell__healthy": "Pepper,_bell___healthy",
    "Potato__Early_blight": "Potato___Early_blight",
    "Potato__Late_blight": "Potato___Late_blight",
    "Potato__healthy": "Potato___healthy",
    "Raspberry__healthy": "Raspberry___healthy",
    "Soybean__healthy": "Soybean___healthy",
    "Squash__Powdery_mildew": "Squash___Powdery_mildew",
    "Strawberry__Leaf_scorch": "Strawberry___Leaf_scorch",
    "Strawberry__healthy": "Strawberry___healthy",
    "Tomato__Bacterial_spot": "Tomato___Bacterial_spot",
    "Tomato__Early_blight": "Tomato___Early_blight",
    "Tomato__Late_blight": "Tomato___Late_blight",
    "Tomato__Leaf_Mold": "Tomato___Leaf_Mold",
    "Tomato__Septoria_leaf_spot": "Tomato___Septoria_leaf_spot",
    "Tomato__Spider_mites Two-spotted_spider_mite": "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato__Target_Spot": "Tomato___Target_Spot",
    "Tomato__Tomato_Yellow_Leaf_Curl_Virus": "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato__Tomato_mosaic_virus": "Tomato___Tomato_mosaic_virus",
    "Tomato__healthy": "Tomato___healthy",
}


def canonicalize_class_name(raw_name: str) -> str:
    name = raw_name.strip().replace(" ", "_").replace("-", "_")
    name = name.replace(",", ",").replace("__", "___", 1) if "___" not in name and "__" in name else name
    while "____" in name:
        name = name.replace("____", "___")
    name = name.strip("._ ")

    if name in MULTILINGUAL_CLASS_MAP:
        return name
    if name in ALIAS_MAP:
        return ALIAS_MAP[name]

    normalized = name.replace("(", "_(").replace(")", ")_").replace("__", "___")
    normalized = normalized.replace("____", "___").replace("_,", ",")
    if normalized in MULTILINGUAL_CLASS_MAP:
        return normalized
    if normalized in ALIAS_MAP:
        return ALIAS_MAP[normalized]

    return name


def find_label_from_path(image_path: Path) -> Optional[str]:
    # Find the nearest meaningful parent directory that contains the class label.
    for parent in image_path.parents:
        parent_name = parent.name.strip()
        if not parent_name:
            continue
        if parent_name.lower() in SKIP_DIR_NAMES:
            continue
        if parent_name.startswith("."):
            continue
        if parent == image_path.parent:
            return canonicalize_class_name(parent_name)
    return None


def compute_image_hash(image_path: Path, target_size: Tuple[int, int] = (256, 256)) -> Optional[str]:
    try:
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            img = img.resize(target_size)
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=90)
            return hashlib.sha256(buffer.getvalue()).hexdigest()
    except Exception:
        return None


def merge_image_directories(source_dirs: Sequence[Path], destination_dir: Path) -> Dict[str, int]:
    if destination_dir.exists():
        shutil.rmtree(destination_dir)
    destination_dir.mkdir(parents=True, exist_ok=True)

    hash_registry: set[str] = set()
    per_class_counts: Dict[str, int] = defaultdict(int)
    total_seen = 0
    total_copied = 0
    total_deduped = 0

    for source_root in source_dirs:
        if source_root is None or not source_root.exists():
            continue

        for image_path in source_root.rglob("*"):
            if not image_path.is_file():
                continue
            if image_path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue

            label = find_label_from_path(image_path)
            if label is None:
                continue

            total_seen += 1
            image_hash = compute_image_hash(image_path)
            if image_hash is None:
                continue
            if image_hash in hash_registry:
                total_deduped += 1
                continue

            hash_registry.add(image_hash)
            class_dir = destination_dir / label
            class_dir.mkdir(parents=True, exist_ok=True)
            output_path = class_dir / f"{image_hash}{image_path.suffix.lower()}"
            shutil.copy2(image_path, output_path)
            per_class_counts[label] += 1
            total_copied += 1

            if total_seen % 500 == 0:
                cleanup_memory()

    print(f"[INFO] Merge complete. Seen={total_seen}, Copied={total_copied}, Deduplicated={total_deduped}")
    return dict(per_class_counts)


def save_multilingual_class_map(class_names: Sequence[str], output_path: Path) -> Dict[str, Dict[str, str]]:
    class_map: Dict[str, Dict[str, str]] = {}

    for class_name in sorted(class_names):
        if class_name in MULTILINGUAL_CLASS_MAP:
            class_map[class_name] = MULTILINGUAL_CLASS_MAP[class_name]
            continue

        # Fallback construction for unseen labels.
        if "___" in class_name:
            crop_raw, disease_raw = class_name.split("___", 1)
        else:
            crop_raw, disease_raw = class_name, "healthy"

        crop_key = crop_raw.lower().replace("_(including_sour)", "").replace("_(maize)", "").replace(",_bell", "").replace(",", "")
        crop_key = crop_key.split("_")[0]
        disease_key = disease_raw.lower().replace(" ", "_")

        crop_trans = FALLBACK_CROP_TRANSLATIONS.get(crop_key, {
            "ar": crop_raw,
            "en": crop_raw,
            "es": crop_raw,
            "hi": crop_raw,
            "zh": crop_raw,
        })
        disease_trans = FALLBACK_DISEASE_TRANSLATIONS.get(disease_key, {
            "ar": disease_raw.replace("_", " "),
            "en": disease_raw.replace("_", " "),
            "es": disease_raw.replace("_", " "),
            "hi": disease_raw.replace("_", " "),
            "zh": disease_raw.replace("_", " "),
        })

        class_map[class_name] = {
            "ar": f"{crop_trans['ar']} - {disease_trans['ar']}",
            "en": f"{crop_trans['en']} - {disease_trans['en']}",
            "es": f"{crop_trans['es']} - {disease_trans['es']}",
            "hi": f"{crop_trans['hi']} - {disease_trans['hi']}",
            "zh": f"{crop_trans['zh']} - {disease_trans['zh']}",
        }

    output_path.write_text(json.dumps(class_map, ensure_ascii=False, indent=2), encoding="utf-8")
    return class_map


# ============================================================
# CELL 4: DATA SPLITTING, TRANSFORMS, WEIGHTED SAMPLING, AND
#         MEMORY-AWARE DATALOADER CONSTRUCTION
# ============================================================

def split_merged_dataset(
    merged_dir: Path,
    output_dir: Path,
    val_ratio: float = 0.10,
    test_ratio: float = 0.10,
    min_images_per_class: int = 5,
) -> Dict[str, int]:
    if output_dir.exists():
        shutil.rmtree(output_dir)
    for split_name in ["train", "val", "test"]:
        (output_dir / split_name).mkdir(parents=True, exist_ok=True)

    final_counts: Dict[str, int] = {}
    for class_dir in sorted(merged_dir.iterdir()):
        if not class_dir.is_dir():
            continue

        images = sorted([p for p in class_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS])
        if len(images) < min_images_per_class:
            print(f"[WARN] Skipping class {class_dir.name}: only {len(images)} images found.")
            continue

        img_paths = [str(p) for p in images]
        labels = [class_dir.name] * len(images)

        train_paths, temp_paths, _, temp_labels = train_test_split(
            img_paths,
            labels,
            test_size=(val_ratio + test_ratio),
            random_state=SEED,
            stratify=labels,
        )

        relative_test_ratio = test_ratio / (val_ratio + test_ratio)
        val_paths, test_paths = train_test_split(
            temp_paths,
            test_size=relative_test_ratio,
            random_state=SEED,
            stratify=temp_labels,
        )

        split_map = {"train": train_paths, "val": val_paths, "test": test_paths}
        for split_name, paths in split_map.items():
            split_class_dir = output_dir / split_name / class_dir.name
            split_class_dir.mkdir(parents=True, exist_ok=True)
            for src in paths:
                src_path = Path(src)
                dst_path = split_class_dir / src_path.name
                shutil.copy2(src_path, dst_path)

        final_counts[class_dir.name] = len(images)

    cleanup_memory()
    return final_counts


def build_transforms(image_size: int, is_training: bool) -> transforms.Compose:
    if is_training:
        return transforms.Compose([
            transforms.Resize(int(image_size * 1.15)),
            transforms.RandomResizedCrop(image_size, scale=(0.75, 1.0)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomVerticalFlip(p=0.2),
            transforms.RandomRotation(degrees=20),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.15, hue=0.02),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
    return transforms.Compose([
        transforms.Resize(int(image_size * 1.15)),
        transforms.CenterCrop(image_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])


def build_weighted_sampler(image_folder_dataset: datasets.ImageFolder) -> WeightedRandomSampler:
    class_counts = Counter([label for _, label in image_folder_dataset.samples])
    sample_weights = [1.0 / class_counts[label] for _, label in image_folder_dataset.samples]
    weights_tensor = torch.DoubleTensor(sample_weights)
    return WeightedRandomSampler(weights=weights_tensor, num_samples=len(weights_tensor), replacement=True)


def make_dataset(split_dir: Path, image_size: int, is_training: bool) -> datasets.ImageFolder:
    return datasets.ImageFolder(root=str(split_dir), transform=build_transforms(image_size, is_training))


def dry_run_batch_size(
    dataset: datasets.ImageFolder,
    model: nn.Module,
    device: torch.device,
    num_classes: int,
    initial_candidates: Sequence[int],
) -> int:
    # Try large batch sizes first, then back off aggressively on OOM.
    model.train()
    criterion = nn.CrossEntropyLoss().to(device)
    enabled_amp = device.type == "cuda"

    candidate_loader_dataset: Dataset[Any]
    if len(dataset) > 64:
        candidate_loader_dataset = Subset(dataset, list(range(64)))
    else:
        candidate_loader_dataset = dataset

    successful_batch_size = initial_candidates[-1]

    for batch_size in initial_candidates:
        cleanup_memory()
        try:
            loader = DataLoader(
                candidate_loader_dataset,
                batch_size=batch_size,
                shuffle=True,
                num_workers=0,
                pin_memory=(device.type == "cuda"),
            )
            inputs, labels = next(iter(loader))
            inputs = inputs.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)

            optimizer = optim.AdamW(model.parameters(), lr=1e-5)
            optimizer.zero_grad(set_to_none=True)

            with autocast(enabled=enabled_amp):
                outputs = model(inputs)
                loss = criterion(outputs, labels)

            loss.backward()
            optimizer.step()
            successful_batch_size = batch_size
            break
        except RuntimeError as exc:
            if "out of memory" in str(exc).lower():
                print(f"[WARN] OOM during batch size probe at batch_size={batch_size}. Trying smaller batch.")
                cleanup_memory()
                continue
            raise

    cleanup_memory()
    return successful_batch_size


def build_dataloaders(
    prepared_dir: Path,
    image_size: int,
    model: nn.Module,
    num_classes: int,
    base_batch_candidates: Sequence[int],
) -> Tuple[DataLoader, DataLoader, DataLoader, List[str], int]:
    train_ds = make_dataset(prepared_dir / "train", image_size=image_size, is_training=True)
    val_ds = make_dataset(prepared_dir / "val", image_size=image_size, is_training=False)
    test_ds = make_dataset(prepared_dir / "test", image_size=image_size, is_training=False)

    class_names = train_ds.classes
    actual_batch_size = dry_run_batch_size(
        dataset=train_ds,
        model=model,
        device=DEVICE,
        num_classes=num_classes,
        initial_candidates=base_batch_candidates,
    )

    sampler = build_weighted_sampler(train_ds)
    train_loader = DataLoader(
        train_ds,
        batch_size=actual_batch_size,
        sampler=sampler,
        num_workers=NUM_WORKERS,
        pin_memory=(DEVICE.type == "cuda"),
        persistent_workers=(NUM_WORKERS > 0),
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=max(2, actual_batch_size),
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=(DEVICE.type == "cuda"),
        persistent_workers=(NUM_WORKERS > 0),
    )
    test_loader = DataLoader(
        test_ds,
        batch_size=max(2, actual_batch_size),
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=(DEVICE.type == "cuda"),
        persistent_workers=(NUM_WORKERS > 0),
    )

    cleanup_memory()
    return train_loader, val_loader, test_loader, class_names, actual_batch_size


# ============================================================
# CELL 5: HUGGING FACE REFERENCE SNAPSHOTS AND HYBRID MODELS
# ============================================================

HF_REFERENCE_REPOS = {
    "Model_A_EfficientNet_Reference": "VisionaryQuant/5_Crop_Disease_Detection",
    "Model_B_ViT_Reference": "marwaALzaabi/plant-disease-detection-vit",
    "Model_C_Reference": "Priyabolem/plant-disease-detection",
    "Model_D_Reference": "mesabo/agri-plant-disease-resnet50",
    "Model_E_Reference": "FransiMengesha/plantdiseasedetectionsystem",
}

def download_reference_model_snapshots(reference_dir: Path) -> Dict[str, str]:
    resolved = {}
    for label, repo_id in HF_REFERENCE_REPOS.items():
        try:
            repo_path = snapshot_download(
                repo_id=repo_id,
                local_dir=reference_dir / label,
                local_dir_use_symlinks=False,
                ignore_patterns=["*.bin", "*.pt", "*.pth", "*.onnx", "*.msgpack", "*.h5"],
            )
            resolved[label] = repo_path
        except Exception as exc:
            print(f"[WARN] Could not snapshot {repo_id}: {exc}")
    return resolved


class EfficientNetEdge(nn.Module):
    def __init__(self, num_classes: int):
        super().__init__()
        self.model = timm.create_model("efficientnet_b3", pretrained=True, num_classes=num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.model(x)


class VisionTransformerHeavy(nn.Module):
    def __init__(self, num_classes: int):
        super().__init__()
        self.model = timm.create_model("vit_base_patch16_224", pretrained=True, num_classes=num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.model(x)


class HybridRoutingSystem(nn.Module):
    # This wrapper is used for PyTorch inference orchestration.
    # In production, the ONNX export is kept focused on the edge model for latency.
    def __init__(self, edge_model: nn.Module, heavy_model: nn.Module, threshold: float = 0.85):
        super().__init__()
        self.edge_model = edge_model
        self.heavy_model = heavy_model
        self.threshold = threshold

    @torch.no_grad()
    def route(self, x_edge: torch.Tensor, x_vit: torch.Tensor) -> Dict[str, Any]:
        edge_logits = self.edge_model(x_edge)
        edge_probs = torch.softmax(edge_logits, dim=1)
        edge_conf, edge_pred = torch.max(edge_probs, dim=1)

        if edge_conf.item() >= self.threshold:
            return {
                "route": "efficientnet_b3",
                "confidence": float(edge_conf.item()),
                "prediction_index": int(edge_pred.item()),
                "logits": edge_logits,
            }

        heavy_logits = self.heavy_model(x_vit)
        heavy_probs = torch.softmax(heavy_logits, dim=1)
        heavy_conf, heavy_pred = torch.max(heavy_probs, dim=1)
        return {
            "route": "vit_base_patch16_224",
            "confidence": float(heavy_conf.item()),
            "prediction_index": int(heavy_pred.item()),
            "logits": heavy_logits,
        }


# ============================================================
# CELL 6: TRAINING LOOP, MIXED PRECISION, EARLY STOPPING, AND
#         CHECKPOINT MANAGEMENT
# ============================================================

@dataclass
class TrainConfig:
    model_name: str
    epochs: int
    learning_rate: float
    weight_decay: float
    patience: int
    image_size: int
    checkpoint_path: Path


def accuracy_from_logits(logits: torch.Tensor, labels: torch.Tensor) -> float:
    preds = torch.argmax(logits, dim=1)
    return float((preds == labels).float().mean().item())


def train_one_epoch(
    model: nn.Module,
    loader: DataLoader,
    optimizer: optim.Optimizer,
    criterion: nn.Module,
    scaler: GradScaler,
    device: torch.device,
) -> Tuple[float, float]:
    model.train()
    running_loss = 0.0
    running_acc = 0.0
    total_batches = 0
    amp_enabled = (device.type == "cuda")

    for inputs, labels in loader:
        inputs = inputs.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)

        optimizer.zero_grad(set_to_none=True)

        try:
            with autocast(enabled=amp_enabled):
                logits = model(inputs)
                loss = criterion(logits, labels)

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()

            running_loss += float(loss.item())
            running_acc += accuracy_from_logits(logits.detach(), labels)
            total_batches += 1
        except RuntimeError as exc:
            if "out of memory" in str(exc).lower():
                print("[WARN] CUDA OOM during training batch. Clearing cache and continuing.")
                optimizer.zero_grad(set_to_none=True)
                cleanup_memory()
                continue
            raise

        del inputs, labels, logits, loss
        cleanup_memory()

    if total_batches == 0:
        return float("inf"), 0.0

    return running_loss / total_batches, running_acc / total_batches


@torch.no_grad()
def evaluate(model: nn.Module, loader: DataLoader, criterion: nn.Module, device: torch.device) -> Tuple[float, float]:
    model.eval()
    total_loss = 0.0
    total_acc = 0.0
    total_batches = 0

    for inputs, labels in loader:
        inputs = inputs.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)

        logits = model(inputs)
        loss = criterion(logits, labels)

        total_loss += float(loss.item())
        total_acc += accuracy_from_logits(logits, labels)
        total_batches += 1

        del inputs, labels, logits, loss
        cleanup_memory()

    if total_batches == 0:
        return float("inf"), 0.0

    return total_loss / total_batches, total_acc / total_batches


def train_model(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    config: TrainConfig,
    class_names: Sequence[str],
) -> Dict[str, Any]:
    model = model.to(DEVICE)
    criterion = nn.CrossEntropyLoss().to(DEVICE)
    optimizer = optim.AdamW(model.parameters(), lr=config.learning_rate, weight_decay=config.weight_decay)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=2, verbose=True)
    scaler = GradScaler(enabled=(DEVICE.type == "cuda"))

    best_val_loss = float("inf")
    best_val_acc = 0.0
    epochs_without_improvement = 0
    history: List[Dict[str, float]] = []

    for epoch in range(1, config.epochs + 1):
        start_time = time.time()

        train_loss, train_acc = train_one_epoch(model, train_loader, optimizer, criterion, scaler, DEVICE)
        val_loss, val_acc = evaluate(model, val_loader, criterion, DEVICE)
        scheduler.step(val_loss)

        epoch_seconds = time.time() - start_time
        history.append({
            "epoch": epoch,
            "train_loss": train_loss,
            "train_acc": train_acc,
            "val_loss": val_loss,
            "val_acc": val_acc,
            "epoch_seconds": epoch_seconds,
        })

        print(
            f"[{config.model_name}] Epoch {epoch:02d}/{config.epochs} | "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} | "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.4f} | "
            f"time={epoch_seconds:.1f}s"
        )

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_val_acc = val_acc
            epochs_without_improvement = 0
            checkpoint_payload = {
                "model_name": config.model_name,
                "state_dict": model.state_dict(),
                "class_names": list(class_names),
                "image_size": config.image_size,
                "best_val_loss": best_val_loss,
                "best_val_acc": best_val_acc,
                "history": history,
            }
            torch.save(checkpoint_payload, config.checkpoint_path)
            print(f"[INFO] Saved improved checkpoint to {config.checkpoint_path}")
        else:
            epochs_without_improvement += 1

        cleanup_memory()

        if epochs_without_improvement >= config.patience:
            print(f"[INFO] Early stopping activated for {config.model_name}.")
            break

    best_checkpoint = torch.load(config.checkpoint_path, map_location="cpu")
    model.load_state_dict(best_checkpoint["state_dict"])
    model = model.to(DEVICE)
    cleanup_memory()

    return {
        "model": model,
        "checkpoint": best_checkpoint,
        "history": history,
        "best_val_loss": best_val_loss,
        "best_val_acc": best_val_acc,
    }


@torch.no_grad()
def evaluate_test_set(model: nn.Module, loader: DataLoader, class_names: Sequence[str]) -> Dict[str, Any]:
    criterion = nn.CrossEntropyLoss().to(DEVICE)
    test_loss, test_acc = evaluate(model, loader, criterion, DEVICE)
    return {
        "test_loss": test_loss,
        "test_acc": test_acc,
        "num_classes": len(class_names),
    }


# ============================================================
# CELL 7: EXPORTS, BUNDLE ASSETS, INFERENCE SCRIPT GENERATION,
#         AND PLATFORM-AGNOSTIC DOWNLOAD
# ============================================================

def export_edge_model_to_onnx(model: nn.Module, image_size: int, output_path: Path) -> None:
    model.eval()
    model_cpu = model.to("cpu")
    dummy = torch.randn(1, 3, image_size, image_size, dtype=torch.float32)

    torch.onnx.export(
        model_cpu,
        dummy,
        str(output_path),
        export_params=True,
        opset_version=17,
        input_names=["image"],
        output_names=["logits"],
        dynamic_axes={"image": {0: "batch_size"}, "logits": {0: "batch_size"}},
    )

    onnx_model = onnx.load(str(output_path))
    onnx.checker.check_model(onnx_model)
    cleanup_memory()


def write_inference_script(
    output_path: Path,
    class_map_filename: str = "class_map_multilingual.json",
    edge_onnx_filename: str = "efficientnet_b3_edge.onnx",
    vit_checkpoint_filename: str = "vit_base_patch16_224_best.pth",
) -> None:
    script = f'''
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
import timm
import torch
from PIL import Image
from torchvision import transforms


EDGE_IMAGE_SIZE = 300
VIT_IMAGE_SIZE = 224
CONFIDENCE_THRESHOLD = 0.85


def load_assets(base_dir: Path):
    class_map = json.loads((base_dir / "{class_map_filename}").read_text(encoding="utf-8"))
    class_names = list(class_map.keys())

    edge_session = ort.InferenceSession(str(base_dir / "{edge_onnx_filename}"), providers=["CPUExecutionProvider"])

    vit_bundle = torch.load(base_dir / "{vit_checkpoint_filename}", map_location="cpu")
    vit_model = timm.create_model("vit_base_patch16_224", pretrained=False, num_classes=len(class_names))
    vit_model.load_state_dict(vit_bundle["state_dict"])
    vit_model.eval()

    return class_map, class_names, edge_session, vit_model


def preprocess(image_path: str, image_size: int) -> torch.Tensor:
    transform = transforms.Compose([
        transforms.Resize(int(image_size * 1.15)),
        transforms.CenterCrop(image_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    image = Image.open(image_path).convert("RGB")
    return transform(image).unsqueeze(0)


@torch.no_grad()
def predict(image_path: str, base_dir: str = "."):
    base_path = Path(base_dir)
    class_map, class_names, edge_session, vit_model = load_assets(base_path)

    edge_input = preprocess(image_path, EDGE_IMAGE_SIZE).numpy().astype(np.float32)
    edge_logits = edge_session.run(["logits"], {{"image": edge_input}})[0]
    edge_probs = torch.softmax(torch.from_numpy(edge_logits), dim=1)
    edge_conf, edge_pred = torch.max(edge_probs, dim=1)

    if float(edge_conf.item()) >= CONFIDENCE_THRESHOLD:
        predicted_class = class_names[int(edge_pred.item())]
        return {{
            "route": "efficientnet_b3_onnx",
            "confidence": float(edge_conf.item()),
            "class_id": int(edge_pred.item()),
            "class_name": predicted_class,
            "translations": class_map[predicted_class],
        }}

    vit_input = preprocess(image_path, VIT_IMAGE_SIZE)
    vit_logits = vit_model(vit_input)
    vit_probs = torch.softmax(vit_logits, dim=1)
    vit_conf, vit_pred = torch.max(vit_probs, dim=1)
    predicted_class = class_names[int(vit_pred.item())]

    return {{
        "route": "vit_base_patch16_224_pytorch",
        "confidence": float(vit_conf.item()),
        "class_id": int(vit_pred.item()),
        "class_name": predicted_class,
        "translations": class_map[predicted_class],
    }}


if __name__ == "__main__":
    import sys
    image_path = sys.argv[1]
    result = predict(image_path)
    print(json.dumps(result, ensure_ascii=False, indent=2))
'''
    output_path.write_text(textwrap.dedent(script).strip() + "\n", encoding="utf-8")


def create_deploy_package(package_zip_path: Path, files_to_include: Sequence[Path]) -> None:
    with zipfile.ZipFile(package_zip_path, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for file_path in files_to_include:
            if file_path.exists():
                zf.write(file_path, arcname=file_path.name)


def trigger_download(file_path: Path) -> None:
    try:
        from IPython.display import FileLink, display  # type: ignore
        display(FileLink(str(file_path)))
    except Exception:
        pass

    if RUNTIME.platform_name == "colab":
        try:
            from google.colab import files  # type: ignore
            files.download(str(file_path))
            return
        except Exception:
            pass

    print(f"[INFO] Deployment package ready at: {file_path}")


# ============================================================
# CELL 8: ORCHESTRATION - END-TO-END AUTOMATED EXECUTION
# ============================================================

def main() -> None:
    print(f"[INFO] Runtime platform: {RUNTIME.platform_name}")
    print(f"[INFO] Workspace: {RUNTIME.workspace_dir}")
    print(f"[INFO] Device: {DEVICE}")

    configure_kaggle_credentials()

    # --------------------------------------------------------
    # Download reference Hugging Face snapshots for traceability.
    # --------------------------------------------------------
    reference_snapshot_info = download_reference_model_snapshots(RUNTIME.reference_models_dir)
    (RUNTIME.artifacts_dir / "reference_model_snapshots.json").write_text(
        json.dumps(reference_snapshot_info, indent=2),
        encoding="utf-8",
    )

    # --------------------------------------------------------
    # Download datasets from KaggleHub plus TensorFlow Datasets.
    # --------------------------------------------------------
    dataset_roots: List[Path] = []
    kaggle_dataset_refs = [
        "vipoooool/new-plant-diseases-dataset",
        "emmarex/plantdisease",
    ]

    for dataset_ref in kaggle_dataset_refs:
        path = download_kaggle_dataset(dataset_ref, RUNTIME.data_dir)
        if path is not None:
            dataset_roots.append(path)
        cleanup_memory()

    tfds_root = download_tfds_plant_village(RUNTIME.data_dir)
    if tfds_root is not None:
        dataset_roots.append(tfds_root)

    if not dataset_roots:
        raise RuntimeError("No dataset sources were downloaded successfully. Please verify connectivity and credentials.")

    # --------------------------------------------------------
    # Merge, deduplicate, and normalize classes across all sources.
    # --------------------------------------------------------
    merged_counts = merge_image_directories(dataset_roots, RUNTIME.merged_dir)
    if not merged_counts:
        raise RuntimeError("Merged dataset is empty after deduplication.")

    merged_class_names = sorted(merged_counts.keys())
    class_map_path = RUNTIME.artifacts_dir / "class_map_multilingual.json"
    class_map = save_multilingual_class_map(merged_class_names, class_map_path)

    dataset_summary = {
        "runtime_platform": RUNTIME.platform_name,
        "device": str(DEVICE),
        "merged_counts": merged_counts,
        "num_classes": len(merged_class_names),
        "total_images": int(sum(merged_counts.values())),
        "reference_snapshots": reference_snapshot_info,
    }
    (RUNTIME.artifacts_dir / "dataset_summary.json").write_text(
        json.dumps(dataset_summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # --------------------------------------------------------
    # Split dataset into train / val / test directories.
    # --------------------------------------------------------
    split_counts = split_merged_dataset(
        merged_dir=RUNTIME.merged_dir,
        output_dir=RUNTIME.split_dir,
        val_ratio=0.10,
        test_ratio=0.10,
        min_images_per_class=5,
    )
    if not split_counts:
        raise RuntimeError("No class survived the splitting stage. Dataset may be too small or malformed.")

    cleanup_memory()

    # --------------------------------------------------------
    # Build and train Model A: EfficientNet-B3 for fast inference.
    # --------------------------------------------------------
    num_classes = len(sorted([d.name for d in (RUNTIME.split_dir / "train").iterdir() if d.is_dir()]))
    edge_model = EfficientNetEdge(num_classes=num_classes)

    edge_train_loader, edge_val_loader, edge_test_loader, class_names, edge_batch_size = build_dataloaders(
        prepared_dir=RUNTIME.split_dir,
        image_size=300,
        model=edge_model,
        num_classes=num_classes,
        base_batch_candidates=[64, 48, 32, 24, 16, 12, 8, 4, 2],
    )

    edge_checkpoint_path = RUNTIME.artifacts_dir / "efficientnet_b3_best.pth"
    edge_config = TrainConfig(
        model_name="efficientnet_b3",
        epochs=10,
        learning_rate=2e-4,
        weight_decay=1e-4,
        patience=3,
        image_size=300,
        checkpoint_path=edge_checkpoint_path,
    )
    edge_result = train_model(edge_model, edge_train_loader, edge_val_loader, edge_config, class_names)
    edge_metrics = evaluate_test_set(edge_result["model"], edge_test_loader, class_names)
    print(f"[INFO] EfficientNet-B3 test metrics: {edge_metrics}")

    cleanup_memory()

    # --------------------------------------------------------
    # Build and train Model B: ViT for high-accuracy fallback.
    # --------------------------------------------------------
    vit_model = VisionTransformerHeavy(num_classes=num_classes)

    vit_train_loader, vit_val_loader, vit_test_loader, _, vit_batch_size = build_dataloaders(
        prepared_dir=RUNTIME.split_dir,
        image_size=224,
        model=vit_model,
        num_classes=num_classes,
        base_batch_candidates=[24, 16, 12, 8, 6, 4, 2],
    )

    vit_checkpoint_path = RUNTIME.artifacts_dir / "vit_base_patch16_224_best.pth"
    vit_config = TrainConfig(
        model_name="vit_base_patch16_224",
        epochs=8,
        learning_rate=1e-4,
        weight_decay=1e-4,
        patience=3,
        image_size=224,
        checkpoint_path=vit_checkpoint_path,
    )
    vit_result = train_model(vit_model, vit_train_loader, vit_val_loader, vit_config, class_names)
    vit_metrics = evaluate_test_set(vit_result["model"], vit_test_loader, class_names)
    print(f"[INFO] ViT test metrics: {vit_metrics}")

    cleanup_memory()

    # --------------------------------------------------------
    # Build the runtime hybrid router and save a combined .pth.
    # --------------------------------------------------------
    hybrid_router = HybridRoutingSystem(
        edge_model=edge_result["model"].eval(),
        heavy_model=vit_result["model"].eval(),
        threshold=0.85,
    )

    combined_bundle_path = RUNTIME.artifacts_dir / "hybrid_ensemble_bundle.pth"
    torch.save(
        {
            "threshold": 0.85,
            "class_names": class_names,
            "class_map": class_map,
            "edge_model_name": "efficientnet_b3",
            "edge_image_size": 300,
            "edge_state_dict": edge_result["model"].state_dict(),
            "heavy_model_name": "vit_base_patch16_224",
            "heavy_image_size": 224,
            "heavy_state_dict": vit_result["model"].state_dict(),
            "edge_metrics": edge_metrics,
            "vit_metrics": vit_metrics,
            "edge_batch_size": edge_batch_size,
            "vit_batch_size": vit_batch_size,
            "runtime_platform": RUNTIME.platform_name,
        },
        combined_bundle_path,
    )

    # --------------------------------------------------------
    # Export the low-latency edge model to ONNX for production.
    # --------------------------------------------------------
    edge_onnx_path = RUNTIME.artifacts_dir / "efficientnet_b3_edge.onnx"
    export_edge_model_to_onnx(edge_result["model"], image_size=300, output_path=edge_onnx_path)

    # --------------------------------------------------------
    # Run one sanity-check hybrid inference pass if test data exists.
    # --------------------------------------------------------
    sample_test_dir = RUNTIME.split_dir / "test"
    sample_image: Optional[Path] = None
    for candidate in sample_test_dir.rglob("*"):
        if candidate.is_file() and candidate.suffix.lower() in IMAGE_EXTENSIONS:
            sample_image = candidate
            break

    if sample_image is not None:
        edge_tf = build_transforms(300, is_training=False)
        vit_tf = build_transforms(224, is_training=False)
        with Image.open(sample_image) as img:
            img = img.convert("RGB")
            edge_tensor = edge_tf(img).unsqueeze(0).to(DEVICE)
            vit_tensor = vit_tf(img).unsqueeze(0).to(DEVICE)
        hybrid_output = hybrid_router.route(edge_tensor, vit_tensor)
        preview = {
            "sample_image": str(sample_image),
            "route": hybrid_output["route"],
            "confidence": hybrid_output["confidence"],
            "prediction_index": hybrid_output["prediction_index"],
            "predicted_class": class_names[hybrid_output["prediction_index"]],
            "translations": class_map[class_names[hybrid_output["prediction_index"]]],
        }
        (RUNTIME.artifacts_dir / "hybrid_preview.json").write_text(
            json.dumps(preview, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        del edge_tensor, vit_tensor
        cleanup_memory()

    # --------------------------------------------------------
    # Write a production-style inference script into the package.
    # --------------------------------------------------------
    inference_script_path = RUNTIME.package_dir / "inference_hybrid.py"
    write_inference_script(inference_script_path)

    # --------------------------------------------------------
    # Copy package contents.
    # --------------------------------------------------------
    shutil.copy2(class_map_path, RUNTIME.package_dir / "class_map_multilingual.json")
    shutil.copy2(edge_checkpoint_path, RUNTIME.package_dir / edge_checkpoint_path.name)
    shutil.copy2(vit_checkpoint_path, RUNTIME.package_dir / vit_checkpoint_path.name)
    shutil.copy2(combined_bundle_path, RUNTIME.package_dir / combined_bundle_path.name)
    shutil.copy2(edge_onnx_path, RUNTIME.package_dir / edge_onnx_path.name)
    shutil.copy2(RUNTIME.artifacts_dir / "dataset_summary.json", RUNTIME.package_dir / "dataset_summary.json")
    if (RUNTIME.artifacts_dir / "hybrid_preview.json").exists():
        shutil.copy2(RUNTIME.artifacts_dir / "hybrid_preview.json", RUNTIME.package_dir / "hybrid_preview.json")

    # --------------------------------------------------------
    # Zip all deployable assets into a single package.
    # --------------------------------------------------------
    deploy_zip_path = RUNTIME.artifacts_dir / "deploy_package.zip"
    package_files = sorted([p for p in RUNTIME.package_dir.iterdir() if p.is_file()])
    create_deploy_package(deploy_zip_path, package_files)

    # --------------------------------------------------------
    # Save final training metadata for downstream auditing.
    # --------------------------------------------------------
    final_manifest = {
        "runtime_platform": RUNTIME.platform_name,
        "device": str(DEVICE),
        "workspace_dir": str(RUNTIME.workspace_dir),
        "class_count": len(class_names),
        "classes": class_names,
        "edge_checkpoint": str(edge_checkpoint_path),
        "vit_checkpoint": str(vit_checkpoint_path),
        "combined_bundle": str(combined_bundle_path),
        "edge_onnx": str(edge_onnx_path),
        "deploy_zip": str(deploy_zip_path),
        "edge_metrics": edge_metrics,
        "vit_metrics": vit_metrics,
        "edge_batch_size": edge_batch_size,
        "vit_batch_size": vit_batch_size,
    }
    (RUNTIME.artifacts_dir / "final_manifest.json").write_text(
        json.dumps(final_manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # --------------------------------------------------------
    # Trigger a platform-agnostic download or clickable file link.
    # --------------------------------------------------------
    trigger_download(deploy_zip_path)

    print("[INFO] End-to-end training and packaging complete.")
    print(json.dumps(final_manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()