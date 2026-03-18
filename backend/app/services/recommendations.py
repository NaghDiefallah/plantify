DEFAULT_RECOMMENDATION = (
    "Isolate the plant, remove visibly affected leaves, improve airflow, and apply an "
    "appropriate fungicide or bactericide based on local extension guidance."
)

TREATMENT_MAP: dict[str, str] = {
    "healthy": "Plant appears healthy. Continue balanced watering, sunlight, and preventive monitoring.",
    "apple_scab": "Remove fallen leaves, prune crowded branches, and apply protective fungicide in wet seasons.",
    "black_rot": "Prune infected tissue, sanitize tools, and apply registered fungicide preventively.",
    "powdery_mildew": "Increase airflow, avoid overhead irrigation, and treat early with sulfur or potassium bicarbonate.",
    "late_blight": "Remove infected leaves immediately, avoid leaf wetness, and use blight-labeled fungicides.",
    "early_blight": "Rotate crops, mulch to reduce soil splash, and apply broad-spectrum fungicide as needed.",
    "leaf_spot": "Limit overhead watering, remove infected debris, and apply copper-based treatment if severe.",
    "bacterial_spot": "Remove infected tissue, sanitize tools, and apply copper sprays while reducing moisture stress.",
}


def recommendation_for_label(label: str) -> str:
    normalized = label.lower().replace("___", "_").replace(" ", "_")

    if "healthy" in normalized:
        return TREATMENT_MAP["healthy"]

    for key, value in TREATMENT_MAP.items():
        if key == "healthy":
            continue
        if key in normalized:
            return value

    return DEFAULT_RECOMMENDATION
