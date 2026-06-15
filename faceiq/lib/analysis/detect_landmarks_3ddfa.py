"""
3DDFA_V2 Landmark Detection Script
===================================
Uses 3DDFA_V2 ONNX models to detect facial landmarks for both front and side profiles.

Front profile:
  - Returns face bounding box (rectangle) from FaceBoxes detection
  - Hairline = midpoint of the top edge of the face bounding box
  - Also returns all 38,365 dense mesh points

Side profile:
  - Determines face orientation (left/right facing)
  - Mirrors image if facing left (ensures all side profiles face right)
  - Uses BOTH 2D sparse (68 keypoints) and 2D dense (38,365 mesh points)
  - Maps specific sparse/dense indices to 31 side profile landmarks

CLI Usage:
  python detect_landmarks_3ddfa.py <image_path> <mode: front|side> [--output result.json]
"""

import os
import sys
import json
import argparse
import numpy as np
import cv2
import yaml

# Add 3DDFA_V2 to path
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(_SCRIPT_DIR)))
_3DDFA_DIR = os.path.join(_PROJECT_ROOT, "3DDFA_V2")

if _3DDFA_DIR not in sys.path:
    sys.path.insert(0, _3DDFA_DIR)

os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'
os.environ['OMP_NUM_THREADS'] = '4'

from FaceBoxes.FaceBoxes_ONNX import FaceBoxes_ONNX
from TDDFA_ONNX import TDDFA_ONNX


# ============================================================
# Model singleton (lazy load)
# ============================================================
_model_cache = {
    "face_boxes": None,
    "tddfa": None,
}


def _load_models():
    """Lazy-load ONNX models."""
    if _model_cache["face_boxes"] is not None:
        return _model_cache["face_boxes"], _model_cache["tddfa"]

    cfg_path = os.path.join(_3DDFA_DIR, "configs", "mb1_120x120.yml")
    with open(cfg_path, "r") as f:
        cfg = yaml.load(f, Loader=yaml.SafeLoader)

    # Fix relative paths to be absolute
    for key in ["checkpoint_fp", "bfm_fp", "param_mean_std_fp"]:
        if key in cfg:
            cfg[key] = os.path.join(_3DDFA_DIR, cfg[key])

    _model_cache["face_boxes"] = FaceBoxes_ONNX()
    _model_cache["tddfa"] = TDDFA_ONNX(**cfg)
    return _model_cache["face_boxes"], _model_cache["tddfa"]


# ============================================================
# SIDE PROFILE LANDMARK MAPPING
# ============================================================
# Two separate mappings:
#   - SPARSE: indices into the 68-point 2D sparse model
#   - DENSE:  indices into the 38,365-point 2D dense mesh
#
# Dynamic landmarks (computed, no fixed index):
#   - top_of_head:    top-most mesh point (min Y)
#   - occiput:        back-most point of upper head
#   - neck_point:     below cervical point at front of neck
#   - hairline_profile: intersection of line (31615,31670) with top of face bbox
#   - porion:         point slightly behind porion_base (17327)
#   - tragus:         point slightly behind tragus_base (17331)

SIDE_SPARSE_MAP = {
    # (landmark_id, sparse_index)
    "nose_tip":           30,   # Nose Tip
    "corneal_apex":       37,   # Corneal Apex
    "lower_eyelid":       41,   # Lower Eyelid
    "nasal_bridge_root":  27,   # Nasal Bridge Root
    "rhinion":            28,   # Rhinion
    "supratip":           29,   # Supratip
    "subnasale":          33,   # Subnasale
    "upper_lip":          51,   # Upper Lip
    "mouth_corner":       48,   # Mouth Corner
    "lower_lip":          57,   # Lower Lip
    "upper_jaw_angle":    3,    # Upper Jaw Angle
    "lower_jaw_angle":    5,    # Lower Jaw Angle
}

SIDE_DENSE_MAP = {
    # (landmark_id, dense_index)
    "orbitale":           10855,  # Orbitale - lowest point of eye socket
    "intertragic_notch":  17109,  # Intertragic Notch
    "cheekbone":          22478,  # Cheekbone
    "eyelid_end":         1961,   # Eyelid End
    "glabella":           31324,  # Glabella
    "forehead":           31172,  # Forehead - most forward point
    "infratip":           8195,   # Infratip
    "columella":          8197,   # Columella
    "subalare":           13727,  # Subalare
    "labiomental_fold":   8843,   # Labiomental Fold
    "chin_point":         36160,  # Chin Point (pogonion)
    "chin_bottom":        36143,  # Chin Bottom (menton)
    "cervical_point":     35587,  # Cervical Point
    # Base references for dynamic computation
    "porion_base":        17327,  # Reference point for porion
    "tragus_base":        17331,  # Reference point for tragus
    # Hairline reference points (line endpoints)
    "hairline_line_a":    31615,  # First point of hairline intersection line
    "hairline_line_b":    31670,  # Second point of hairline intersection line
}


# ============================================================
# Direction helpers
# ============================================================

def _backward_direction(pts_2d):
    """Return the unit vector pointing 'backward' (toward back of head)
    based on nose-to-forehead vector rotated 180 degrees.

    For a right-facing profile (nose on right), backward = negative X.
    For a left-facing profile (nose on left), backward = positive X.
    """
    nose_idx = SIDE_SPARSE_MAP.get("nose_tip", 30)
    forehead_idx = SIDE_DENSE_MAP.get("forehead", 31172)

    if nose_idx >= pts_2d.shape[1] or forehead_idx >= pts_2d.shape[1]:
        # Fallback: nose on right side -> backward is left (negative X)
        return np.array([-1.0, 0.0])

    # Forward vector from forehead toward nose tip
    fx = pts_2d[0, nose_idx] - pts_2d[0, forehead_idx]
    fy = pts_2d[1, nose_idx] - pts_2d[1, forehead_idx]
    f_len = np.sqrt(fx * fx + fy * fy)
    if f_len < 1e-6:
        return np.array([-1.0, 0.0])

    forward = np.array([fx, fy]) / f_len
    backward = -forward
    return backward


def _point_behind(base_idx, pts_2d, search_radius=0.03, min_step=0.002):
    """Given a base mesh index, find the mesh point that lies
    slightly behind it (toward the back of the head), within
    a local search region.

    Returns the mesh index of the best candidate point.
    """
    if base_idx >= pts_2d.shape[1]:
        return base_idx

    base_x = pts_2d[0, base_idx]
    base_y = pts_2d[1, base_idx]
    backward = _backward_direction(pts_2d)

    # Search nearby mesh points that are in the backward direction from base
    best_score = -float('inf')
    best_idx = base_idx

    # Only consider points close to base point
    dists = np.sqrt(
        (pts_2d[0, :] - base_x) ** 2 +
        (pts_2d[1, :] - base_y) ** 2
    )
    nearby_mask = dists < search_radius

    if np.sum(nearby_mask) < 3:
        # Very few nearby points; extend the search
        nearby_mask = dists < search_radius * 3

    nearby_indices = np.where(nearby_mask)[0]
    if len(nearby_indices) == 0:
        return base_idx

    for idx in nearby_indices:
        if idx == base_idx:
            continue
        dx = pts_2d[0, idx] - base_x
        dy = pts_2d[1, idx] - base_y
        d_len = np.sqrt(dx * dx + dy * dy)
        if d_len < min_step:
            continue

        # Compute how "behind" this point is (dot product with backward direction)
        behind_score = (dx * backward[0] + dy * backward[1]) / d_len

        # Also prefer points at similar Y height
        y_similarity = 1.0 - min(1.0, abs(dy) / max(d_len, 0.001))

        # Combined score: behindness + some Y similarity
        score = behind_score * 0.8 + y_similarity * 0.2

        if score > best_score:
            best_score = score
            best_idx = idx

    return int(best_idx)


# ============================================================
# Dynamic landmark computation functions
# ============================================================

def _find_top_of_head(ver):
    """Find the top-most point of the mesh (minimum Y = vertex of head)."""
    pts_2d = ver[:2, :]
    idx = np.argmin(pts_2d[1, :])
    return int(idx)


def _find_occiput(ver):
    """Find the back-most point of the head (occiput).
    Since all side profiles are normalized to face right (nose on right),
    the back of head is on the left side (min X).
    """
    pts_2d = ver[:2, :]
    # Consider only the upper half of the face (above nose tip)
    nose_tip_idx = SIDE_SPARSE_MAP.get("nose_tip", 30)
    nose_y = pts_2d[1, nose_tip_idx] if nose_tip_idx < pts_2d.shape[1] else pts_2d[1, :].mean()
    upper_mask = pts_2d[1, :] < nose_y
    if np.sum(upper_mask) < 10:
        upper_mask = np.ones(pts_2d.shape[1], dtype=bool)
    # Back of head = min X (face normalized to right)
    idx = int(np.argmin(pts_2d[0, upper_mask]))
    upper_indices = np.where(upper_mask)[0]
    return int(upper_indices[idx])


def _find_hairline_profile(pts_2d_dense, face_box):
    """Compute hairline (profile) as the intersection of the line
    through dense points 31615 and 31670 with the top edge of the
    face detection bounding box.

    Args:
        pts_2d_dense: (2, 38365) array of pixel coordinates
        face_box: (x1, y1, x2, y2) in pixel coordinates

    Returns:
        (x, y) in pixel coordinates, or None if computation fails
    """
    idx_a = SIDE_DENSE_MAP.get("hairline_line_a", 31615)
    idx_b = SIDE_DENSE_MAP.get("hairline_line_b", 31670)

    if idx_a >= pts_2d_dense.shape[1] or idx_b >= pts_2d_dense.shape[1]:
        # Fallback: return midpoint of top edge
        x1, y1, x2, y2 = face_box
        return (float((x1 + x2) / 2.0), float(y1))

    # Points A and B in pixel coordinates
    ax, ay = float(pts_2d_dense[0, idx_a]), float(pts_2d_dense[1, idx_a])
    bx, by = float(pts_2d_dense[0, idx_b]), float(pts_2d_dense[1, idx_b])

    x1, y1, x2, y2 = [float(v) for v in face_box[:4]]
    top_y = y1  # Y-coordinate of top edge

    # Line AB: parametric form A + t*(B - A)
    # Find t where y = top_y
    dy = by - ay
    if abs(dy) < 1e-6:
        # Line is horizontal, can't find intersection
        # Fallback: midpoint of top edge
        return (float((x1 + x2) / 2.0), float(top_y))

    t = (top_y - ay) / dy

    # Compute intersection x
    ix = ax + t * (bx - ax)

    # Clamp x to be within the face box width (with some margin)
    margin = (x2 - x1) * 0.3
    ix = max(x1 - margin, min(x2 + margin, ix))

    return (float(ix), float(top_y))


def _find_tragus(pts_2d_dense):
    """Tragus = point slightly behind the tragus_base (17331).
    User: "Lùi lại phía sau đầu so với 17331 một tí"
    """
    base_idx = SIDE_DENSE_MAP.get("tragus_base", 17331)
    return _point_behind(base_idx, pts_2d_dense,
                         search_radius=0.025, min_step=0.001)


def _find_porion(pts_2d_dense):
    """Porion = point slightly behind the porion_base (17327).
    User: "Lùi lại phía sau đầu so với 17327 một tí"
    Porion is the highest point of the external ear canal opening,
    typically slightly behind and above the tragus.
    """
    base_idx = SIDE_DENSE_MAP.get("porion_base", 17327)
    behind_idx = _point_behind(base_idx, pts_2d_dense,
                                search_radius=0.025, min_step=0.001)

    # Also prefer slightly higher Y (lower value) if multiple candidates exist
    base_x = pts_2d_dense[0, base_idx]
    base_y = pts_2d_dense[1, base_idx]

    backward = _backward_direction(pts_2d_dense)
    candidates = np.where(
        (np.sqrt((pts_2d_dense[0, :] - base_x)**2 + (pts_2d_dense[1, :] - base_y)**2) < 0.03)
    )[0]

    if len(candidates) > 1:
        best_score = -float('inf')
        best_idx = behind_idx
        for idx in candidates:
            dx = pts_2d_dense[0, idx] - base_x
            dy = pts_2d_dense[1, idx] - base_y
            d_len = np.sqrt(dx*dx + dy*dy)
            if d_len < 0.001:
                continue
            behind_score = (dx * backward[0] + dy * backward[1]) / d_len
            # Prefer above (lower Y = negative dy)
            up_score = -dy / max(d_len, 0.001)
            score = behind_score * 0.7 + up_score * 0.3
            if score > best_score:
                best_score = score
                best_idx = idx
        return int(best_idx)

    return int(behind_idx)


def _find_neck_point(pts_2d_dense):
    """Neck Point = below cervical point, at the front of the neck."""
    cervical_idx = SIDE_DENSE_MAP.get("cervical_point", 35587)
    if cervical_idx >= pts_2d_dense.shape[1]:
        return cervical_idx

    cx, cy = pts_2d_dense[0, cervical_idx], pts_2d_dense[1, cervical_idx]

    # Find points below cervical (higher Y) with similar X
    candidates = np.where(
        (pts_2d_dense[1, :] > cy) &
        (np.abs(pts_2d_dense[0, :] - cx) < 0.03)
    )[0]
    if len(candidates) > 0:
        # Choose the one farthest down (max Y)
        best = candidates[np.argmax(pts_2d_dense[1, candidates])]
        return int(best)

    # Fallback: find the lowest point near the cervical X
    candidates = np.where(np.abs(pts_2d_dense[0, :] - cx) < 0.05)[0]
    if len(candidates) > 0:
        best = candidates[np.argmax(pts_2d_dense[1, candidates])]
        return int(best)

    return cervical_idx


def _determine_facing(pts_2d_sparse):
    """Determine if face is facing left or right based on nose tip position.

    For side profile images, if the nose tip is on the left side of
    the image center, the face is facing left. Otherwise, it's facing right.

    Uses sparse index 30 (nose tip).
    """
    nose_idx = SIDE_SPARSE_MAP.get("nose_tip", 30)
    if nose_idx >= pts_2d_sparse.shape[1]:
        return "left"  # default

    # In normalized coordinates (0-1), center is 0.5
    # For side profiles, nose tip x > 0.5 indicates facing right
    nose_x = pts_2d_sparse[0, nose_idx]
    return "left" if nose_x < 0.5 else "right"


# ============================================================
# DETECTION FUNCTIONS
# ============================================================

def detect_front(image_path):
    """
    Detect front profile landmarks using 3DDFA_V2.

    Hairline = midpoint of the top edge of the face bounding box
    from FaceBoxes detection. This gives a consistent reference
    point at the top-center of the detected face rectangle.

    Returns:
        dict with:
        - face_box: {x1, y1, x2, y2} bounding rectangle
        - hairline: {x, y} midpoint of the top edge of the face box
        - image_size: {w, h}
        - mesh_points: list of all 38,365 points with indices
    """
    face_boxes_model, tddfa = _load_models()

    img = cv2.imread(image_path)
    if img is None:
        return {"error": f"Cannot read image: {image_path}"}

    h, w = img.shape[:2]

    # Step 1: Face detection
    boxes = face_boxes_model(img)
    if len(boxes) == 0:
        return {"error": "No face detected", "image_size": {"w": w, "h": h}}

    # Use the largest face box
    best_box = max(boxes, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
    x1, y1, x2, y2 = [int(round(float(v))) for v in best_box[:4]]

    # Hairline = midpoint of the top edge of the face bounding box
    hairline_x = (x1 + x2) / 2.0 / w
    hairline_y = y1 / h

    # Also run dense mesh for additional points
    param_lst, roi_box_lst = tddfa(img, boxes)
    ver_lst = tddfa.recon_vers(param_lst, roi_box_lst, dense_flag=True)

    # Convert mesh to normalized coordinates
    mesh_points = []
    if ver_lst and len(ver_lst) > 0:
        ver = ver_lst[0]
        for i in range(ver.shape[1]):
            mesh_points.append({
                "index": i,
                "x": round(float(ver[0, i]) / w, 6),
                "y": round(float(ver[1, i]) / h, 6),
            })

    return {
        "mode": "front",
        "image_size": {"w": w, "h": h},
        "face_box": {
            "x1": round(x1 / w, 6),
            "y1": round(y1 / h, 6),
            "x2": round(x2 / w, 6),
            "y2": round(y2 / h, 6),
        },
        "hairline": {
            "x": round(hairline_x, 6),
            "y": round(hairline_y, 6),
        },
        "total_mesh_points": len(mesh_points),
        "mesh_points": mesh_points,
    }


def detect_side(image_path):
    """
    Detect side profile landmarks using 3DDFA_V2.

    Pipeline:
    1. Detect face & get sparse mesh (68 points) to determine orientation
    2. If facing LEFT → mirror image horizontally → re-detect face boxes
    3. Run BOTH sparse (68) and dense (38,365) reconstruction
    4. Map landmarks using correct indices per model type
    5. Compute dynamic landmarks (tragus, porion, hairline, etc.)

    Returns:
        dict with:
        - landmarks: dict of {id: {id, label, x, y, mesh_index, model_type}}
        - image_size: {w, h}
        - facing_direction: "right" (always, after normalization)
        - original_facing: "left" or "right" (before mirror)
        - was_mirrored: bool
        - mesh_points: all 38,365 dense points
    """
    face_boxes_model, tddfa = _load_models()

    img = cv2.imread(image_path)
    if img is None:
        return {"error": f"Cannot read image: {image_path}"}

    original_h, original_w = img.shape[:2]
    was_mirrored = False
    original_facing = "unknown"

    # -----------------------------------------------------------
    # Step 1: Initial face detection + sparse mesh for orientation
    # -----------------------------------------------------------
    boxes = face_boxes_model(img)
    if len(boxes) == 0:
        return {"error": "No face detected", "image_size": {"w": original_w, "h": original_h}}

    param_lst, roi_box_lst = tddfa(img, boxes)
    ver_sparse_lst = tddfa.recon_vers(param_lst, roi_box_lst, dense_flag=False)

    if not ver_sparse_lst or len(ver_sparse_lst) == 0:
        return {"error": "Sparse mesh reconstruction failed",
                "image_size": {"w": original_w, "h": original_h}}

    ver_sparse = ver_sparse_lst[0]  # (3, 68)
    pts_2d_sparse_initial = ver_sparse[:2, :]

    # Normalize to [0, 1] for facing determination
    pts_sparse_norm = pts_2d_sparse_initial.copy()
    pts_sparse_norm[0, :] /= original_w
    pts_sparse_norm[1, :] /= original_h
    original_facing = _determine_facing(pts_sparse_norm)

    # -----------------------------------------------------------
    # Step 2: Mirror image if facing left
    # -----------------------------------------------------------
    if original_facing == "left":
        img = cv2.flip(img, 1)  # horizontal flip
        was_mirrored = True

        # Re-detect face on mirrored image
        boxes = face_boxes_model(img)
        if len(boxes) == 0:
            return {"error": "No face detected after mirroring",
                    "image_size": {"w": original_w, "h": original_h}}

    h, w = img.shape[:2]

    # -----------------------------------------------------------
    # Step 3: Full reconstruction (sparse + dense)
    # -----------------------------------------------------------
    param_lst, roi_box_lst = tddfa(img, boxes)

    # Dense mesh (38,365 points)
    ver_dense_lst = tddfa.recon_vers(param_lst, roi_box_lst, dense_flag=True)
    if not ver_dense_lst or len(ver_dense_lst) == 0:
        return {"error": "Dense mesh reconstruction failed",
                "image_size": {"w": w, "h": h}}

    ver_dense = ver_dense_lst[0]  # (3, 38365)
    num_dense = ver_dense.shape[1]
    pts_2d_dense_px = ver_dense[:2, :]  # (2, 38365) in pixel coords

    # Sparse mesh (68 keypoints)
    ver_sparse_lst = tddfa.recon_vers(param_lst, roi_box_lst, dense_flag=False)
    if not ver_sparse_lst or len(ver_sparse_lst) == 0:
        return {"error": "Sparse mesh reconstruction failed",
                "image_size": {"w": w, "h": h}}

    ver_sparse = ver_sparse_lst[0]  # (3, 68)
    num_sparse = ver_sparse.shape[1]
    pts_2d_sparse_px = ver_sparse[:2, :]  # (2, 68) in pixel coords

    # Get face bounding box (for hairline computation)
    best_box = max(boxes, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
    x1, y1, x2, y2 = [int(round(float(v))) for v in best_box[:4]]

    # -----------------------------------------------------------
    # Step 4: Build landmark mapping
    # -----------------------------------------------------------
    landmarks = {}

    # Helper to add a dense landmark
    def add_dense(lm_id, mesh_idx):
        if mesh_idx < num_dense:
            landmarks[lm_id] = {
                "x": round(float(pts_2d_dense_px[0, mesh_idx]) / w, 6),
                "y": round(float(pts_2d_dense_px[1, mesh_idx]) / h, 6),
                "mesh_index": int(mesh_idx),
                "model_type": "2d_dense",
            }

    # Helper to add a sparse landmark
    def add_sparse(lm_id, sparse_idx):
        if sparse_idx < num_sparse:
            landmarks[lm_id] = {
                "x": round(float(pts_2d_sparse_px[0, sparse_idx]) / w, 6),
                "y": round(float(pts_2d_sparse_px[1, sparse_idx]) / h, 6),
                "mesh_index": int(sparse_idx),
                "model_type": "2d_sparse",
            }

    # ---- Landmarks from 2D SPARSE (68 keypoints) ----
    for lm_id, sparse_idx in SIDE_SPARSE_MAP.items():
        add_sparse(lm_id, sparse_idx)

    # ---- Landmarks from 2D DENSE (38,365 mesh) ----
    for lm_id, dense_idx in SIDE_DENSE_MAP.items():
        # Skip base references (not final landmarks)
        if lm_id in ("porion_base", "tragus_base", "hairline_line_a", "hairline_line_b"):
            continue
        add_dense(lm_id, dense_idx)

    # ---- Dynamic landmarks (user-specified computation) ----
    # Only 3 out of 31 have computed positions based on explicit base-index references:
    #   - Tragus: lùi lại phía sau đầu so với 17331
    #   - Porion: lùi lại phía sau đầu so với 17327
    #   - Hairline (Profile): giao điểm line (31615,31670) với top face bbox
    #   - Top of Head, Occiput, Neck Point: KHÔNG detect vì user chưa cấp mapping

    add_dense("tragus", _find_tragus(pts_2d_dense_px))
    add_dense("porion", _find_porion(pts_2d_dense_px))

    hairline_result = _find_hairline_profile(pts_2d_dense_px, (x1, y1, x2, y2))
    if hairline_result is not None:
        hx, hy = hairline_result
        landmarks["hairline_profile"] = {
            "x": round(float(hx) / w, 6),
            "y": round(float(hy) / h, 6),
            "mesh_index": SIDE_DENSE_MAP.get("hairline_line_a", 31615),
            "model_type": "computed",
        }

    # -----------------------------------------------------------
    # Step 5: Convert all mesh points (for reference/frontend)
    # -----------------------------------------------------------
    mesh_points = []
    for i in range(num_dense):
        mesh_points.append({
            "index": i,
            "x": round(float(pts_2d_dense_px[0, i]) / w, 6),
            "y": round(float(pts_2d_dense_px[1, i]) / h, 6),
        })

    # -----------------------------------------------------------
    # Step 6: Label mapping
    # -----------------------------------------------------------
    SIDE_LABELS = {
        "top_of_head": "Top of Head",
        "occiput": "Occiput",
        "hairline_profile": "Hairline (Profile)",
        "forehead": "Forehead",
        "glabella": "Glabella",
        "nasal_bridge_root": "Nasal Bridge Root",
        "rhinion": "Rhinion",
        "supratip": "Supratip",
        "nose_tip": "Nose Tip",
        "infratip": "Infratip",
        "columella": "Columella",
        "subnasale": "Subnasale",
        "subalare": "Subalare",
        "upper_lip": "Upper Lip",
        "mouth_corner": "Mouth Corner",
        "lower_lip": "Lower Lip",
        "labiomental_fold": "Labiomental Fold",
        "chin_point": "Chin Point",
        "chin_bottom": "Chin Bottom",
        "upper_jaw_angle": "Upper Jaw Angle",
        "lower_jaw_angle": "Lower Jaw Angle",
        "porion": "Porion",
        "tragus": "Tragus",
        "intertragic_notch": "Intertragic Notch",
        "orbitale": "Orbitale",
        "corneal_apex": "Corneal Apex",
        "eyelid_end": "Eyelid End",
        "lower_eyelid": "Lower Eyelid",
        "cheekbone": "Cheekbone",
        "cervical_point": "Cervical Point",
        "neck_point": "Neck Point",
    }

    result_landmarks = {}
    for lm_id, data in landmarks.items():
        result_landmarks[lm_id] = {
            "id": lm_id,
            "label": SIDE_LABELS.get(lm_id, lm_id),
            "x": data["x"],
            "y": data["y"],
            "mesh_index": data["mesh_index"],
            "model_type": data.get("model_type", "unknown"),
        }

    return {
        "mode": "side",
        "image_size": {"w": w, "h": h},
        "original_image_size": {"w": original_w, "h": original_h},
        "facing_direction": "right",  # Always right after normalization
        "original_facing": original_facing,
        "was_mirrored": was_mirrored,
        "total_dense_points": num_dense,
        "total_sparse_points": num_sparse,
        "landmarks": result_landmarks,
        "mesh_points": mesh_points,
    }


# ============================================================
# CLI
# ============================================================
def main():
    parser = argparse.ArgumentParser(description="3DDFA_V2 Landmark Detection")
    parser.add_argument("image", help="Path to input image")
    parser.add_argument("mode", choices=["front", "side"], help="Detection mode")
    parser.add_argument("--output", "-o", default=None, help="Output JSON file path")
    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(json.dumps({"error": f"File not found: {args.image}"}))
        sys.exit(1)

    try:
        if args.mode == "front":
            result = detect_front(args.image)
        else:
            result = detect_side(args.image)
    except Exception as e:
        import traceback
        traceback.print_exc()
        result = {"error": str(e)}

    json_str = json.dumps(result, ensure_ascii=False)
    print(json_str)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()