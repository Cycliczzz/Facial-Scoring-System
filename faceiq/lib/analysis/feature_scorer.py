"""
CLI wrapper for Features rating/face_analyzer.py - outputs JSON feature scores.
Called by Next.js /api/feature-analysis endpoint.

Uses analyze_face() which runs MediaPipe 478-landmark mesh
+ PyTorch blur occlusion scoring per facial region.
"""
import sys
import os
import json
import traceback
import warnings
import matplotlib
matplotlib.use("Agg")
warnings.filterwarnings("ignore")
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
FEATURES_DIR = os.path.join(ROOT_DIR, "..", "..", "..", "Features rating")
sys.path.insert(0, FEATURES_DIR)
sys.path.insert(0, os.path.join(FEATURES_DIR, "code", "scut"))


# Landmark center positions for each feature region (normalized 0-1)
# Based on MediaPipe 478-point mesh, approximate centers per region
FEATURE_CENTERS = {
    "Left Eye": {"x": 0.33, "y": 0.35},
    "Right Eye": {"x": 0.67, "y": 0.35},
    "Nose": {"x": 0.50, "y": 0.48},
    "Mouth": {"x": 0.50, "y": 0.62},
    "L Eyebrow": {"x": 0.33, "y": 0.25},
    "R Eyebrow": {"x": 0.67, "y": 0.25},
    "Skin": {"x": 0.50, "y": 0.52},
    "Hair": {"x": 0.50, "y": 0.10},
}

# Region display order and grouping
REGION_ORDER = [
    "Left Eye",
    "Right Eye",
    "L Eyebrow",
    "R Eyebrow",
    "Nose",
    "Mouth",
    "Skin",
    "Hair",
]


def format_results(result):
    """Convert analyze_face() output into flat feature list format."""
    if result is None:
        return {"error": "No face detected or analysis failed"}

    deltas = result.get("deltas", {})
    score_10 = result.get("score_10", 5.0)

    features = []
    for region_name in REGION_ORDER:
        delta = deltas.get(region_name, 0.0)
        center = FEATURE_CENTERS.get(region_name, {"x": 0.5, "y": 0.5})

        # Normalize 0-100: positive delta = attractive (higher score)
        norm_score = max(0, min(100, 50 + delta * 200))

        features.append({
            "name": region_name.lower().replace(" ", "_"),
            "display_name": region_name,
            "score": round(norm_score, 1),
            "value": round(delta, 4),
            "region": _region_group(region_name),
            "landmark_center": {"x": center["x"], "y": center["y"]},
        })

    overall_score = round(score_10 * 10, 1)

    return {
        "overall_score": overall_score,
        "score_raw": result.get("score", 0),
        "features": features,
        "summary": result.get("summary", ""),
    }


def _region_group(region_name):
    """Map region name to display group."""
    mapping = {
        "Left Eye": "Eyes",
        "Right Eye": "Eyes",
        "Nose": "Nose",
        "Mouth": "Mouth",
        "L Eyebrow": "Eyebrows",
        "R Eyebrow": "Eyebrows",
        "Skin": "Face Shape",
        "Hair": "Forehead",
    }
    return mapping.get(region_name, region_name)


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python feature_scorer.py <image_path>"}))
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(json.dumps({"error": f"Image not found: {image_path}"}))
        sys.exit(1)

    try:
        from face_analyzer import analyze_face

        result = analyze_face(image_path, mat_path=None, cb=None)

        formatted = format_results(result)
        print(json.dumps({"success": True, "data": formatted}))
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "traceback": traceback.format_exc()[:500]
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()