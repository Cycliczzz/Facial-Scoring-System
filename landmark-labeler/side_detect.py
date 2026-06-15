"""
Side Profile Detection using pytorch_face_landmark (39-point profile mode)

Dependencies:
  pip install torch torchvision opencv-python numpy
  git clone https://github.com/Nitin-Mane/pytorch_face_landmark.git
  or: pip install face-alignment (alternative, supports profile)

Usage:
  python side_detect.py <image_path>
  python side_detect.py <image_path> --output detection.json
  
Output:
  A JSON file with 39 landmark points for side profile images.
  Load this JSON in side-profile-labeler.html to map to 31 custom landmarks.
"""

import cv2
import numpy as np
import json
import sys
import os
import argparse

# ============================================================
# DETECTION METHODS
# ============================================================

def detect_with_face_alignment(image_path):
    """
    Use face-alignment library (supports 2D/3D landmarks, including profile).
    This is a simpler alternative to pytorch_face_landmark.
    
    pip install face-alignment
    """
    try:
        import face_alignment
    except ImportError:
        print("⚠️  face-alignment not installed. Install with: pip install face-alignment")
        return None

    print("🔍 Using face-alignment for profile detection...")
    
    fa = face_alignment.FaceAlignment(
        face_alignment.LandmarksType.TWO_D,
        flip_input=False,
        device='cpu'  # or 'cuda' if GPU available
    )
    
    image = cv2.imread(image_path)
    if image is None:
        print(f"❌ Cannot read image: {image_path}")
        return None
    
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    h, w = image.shape[:2]
    
    # face_alignment returns list of faces, each with shape (N, 2) where N=68 for frontal
    # For profile images it still detects 68 points, but profile-relevant indices are available
    preds = fa.get_landmarks(image_rgb)
    
    if not preds or len(preds) == 0:
        print("⚠️  No face detected with face-alignment")
        return None
    
    landmarks = preds[0]  # Shape: (68, 2) for 2D
    points = []
    
    for i, (x, y) in enumerate(landmarks):
        points.append({
            'index': i,
            'x': round(float(x) / w, 6),
            'y': round(float(y) / h, 6),
            'x_px': int(x),
            'y_px': int(y)
        })
    
    print(f"✅ face-alignment: detected {len(points)} points")
    return {
        'source': 'face-alignment (68-point)',
        'image': os.path.basename(image_path),
        'image_size': {'w': w, 'h': h},
        'landmark_type': '2D_68',
        'total_points': len(points),
        'landmarks': points,
        'notes': 'Profile landmarks are a subset of 68. Key indices: nose tip=30, chin=8, forehead=27 etc.'
    }


def detect_with_mediapipe(image_path):
    """
    Use MediaPipe Face Landmarker (478 points) for profile detection.
    MediaPipe works reasonably well on profile faces.
    This does NOT require pytorch_face_landmark.
    """
    try:
        import mediapipe as mp
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision
    except ImportError:
        print("⚠️  mediapipe not installed. Install with: pip install mediapipe")
        return None

    print("🔍 Using MediaPipe Face Landmarker (478 points)...")
    
    image = cv2.imread(image_path)
    if image is None:
        print(f"❌ Cannot read image: {image_path}")
        return None
    
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    h, w = image.shape[:2]
    
    # Try to find the model file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, 'face_landmarker_v2_with_blendshapes.task')
    
    if not os.path.exists(model_path):
        print("📥 Downloading MediaPipe model...")
        import urllib.request
        url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
        urllib.request.urlretrieve(url, model_path)
        print("✅ Model downloaded")
    
    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        output_face_blendshapes=False,
        running_mode=vision.RunningMode.IMAGE,
        num_faces=1
    )
    landmarker = vision.FaceLandmarker.create_from_options(options)
    
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
    result = landmarker.detect(mp_image)
    
    if not result.face_landmarks or len(result.face_landmarks) == 0:
        print("⚠️  No face detected with MediaPipe")
        return None
    
    face_landmarks = result.face_landmarks[0]
    points = []
    
    for i, lm in enumerate(face_landmarks):
        points.append({
            'index': i,
            'x': round(float(lm.x), 6),
            'y': round(float(lm.y), 6),
            'z': round(float(lm.z), 6) if hasattr(lm, 'z') else 0,
            'x_px': int(lm.x * w),
            'y_px': int(lm.y * h)
        })
    
    # Determine facing direction
    nose_tip_x = face_landmarks[1].x if len(face_landmarks) > 1 else 0.5
    facing = 'left' if nose_tip_x < 0.5 else 'right'
    
    print(f"✅ MediaPipe: detected {len(points)} points (facing {facing})")
    return {
        'source': 'MediaPipe Face Landmarker (478-point v2)',
        'image': os.path.basename(image_path),
        'image_size': {'w': w, 'h': h},
        'landmark_type': 'mediapipe_478',
        'total_points': len(points),
        'facing_direction': facing,
        'landmarks': points,
        'notes': 'All 478 points. Use index: 1=nose_tip, 6=nose_bridge_root, 8=glabella, 10=forehead, 152=chin, 94=subnasale, 168=rhinion, 195=columella'
    }


def detect_with_dlib(image_path):
    """
    Use dlib's 68-point face landmark predictor.
    Works best on frontal faces but can detect profile.
    Requires: shape_predictor_68_face_landmarks.dat
    """
    try:
        import dlib
    except ImportError:
        print("⚠️  dlib not installed. Install with: pip install dlib")
        return None

    print("🔍 Using dlib 68-point landmark predictor...")
    
    # Find predictor model
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    predictor_paths = [
        os.path.join(project_root, 'dlib_models', 'shape_predictor_68_face_landmarks.dat'),
        os.path.join(script_dir, 'shape_predictor_68_face_landmarks.dat'),
        'shape_predictor_68_face_landmarks.dat',
    ]
    
    predictor_path = None
    for p in predictor_paths:
        if os.path.exists(p):
            predictor_path = p
            break
    
    if not predictor_path:
        print("⚠️  shape_predictor_68_face_landmarks.dat not found")
        print("   Download from: http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2")
        print(f"   Place in: {predictor_paths[0]}")
        return None
    
    image = cv2.imread(image_path)
    if image is None:
        print(f"❌ Cannot read image: {image_path}")
        return None
    
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    h, w = image.shape[:2]
    
    detector = dlib.get_frontal_face_detector()
    predictor = dlib.shape_predictor(predictor_path)
    
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    rects = detector(gray, 1)
    
    if len(rects) == 0:
        print("⚠️  No face detected with dlib")
        return None
    
    shape = predictor(gray, rects[0])
    points = []
    
    for i in range(68):
        x = shape.part(i).x
        y = shape.part(i).y
        points.append({
            'index': i,
            'x': round(float(x) / w, 6),
            'y': round(float(y) / h, 6),
            'x_px': int(x),
            'y_px': int(y)
        })
    
    print(f"✅ dlib: detected {len(points)} points")
    return {
        'source': 'dlib 68-point landmark predictor',
        'image': os.path.basename(image_path),
        'image_size': {'w': w, 'h': h},
        'landmark_type': '2D_68_dlib',
        'total_points': len(points),
        'landmarks': points,
        'notes': '68-point dlib. Indices: nose tip=30, chin=8'
    }


# ============================================================
# MANUAL MARKER (fallback - generate empty template)
# ============================================================

def generate_empty_template(image_path):
    """Generate an empty JSON template for manual marking."""
    image = cv2.imread(image_path)
    if image is None:
        return None
    
    h, w = image.shape[:2]
    
    return {
        'source': 'empty_template',
        'image': os.path.basename(image_path),
        'image_size': {'w': w, 'h': h},
        'landmark_type': 'manual',
        'total_points': 0,
        'landmarks': [],
        'notes': 'No detection model loaded. Use side-profile-labeler.html for manual placement.'
    }


# ============================================================
# MAIN
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description='Detect facial landmarks for side profile images',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Detection Methods (tried in order):
  face-alignment  - 68-point (pip install face-alignment)
  mediapipe       - 478-point (pip install mediapipe) [default fallback]
  dlib            - 68-point (pip install dlib + model file)
  template        - Empty template for manual labeling

Examples:
  python side_detect.py profile_photo.jpg
  python side_detect.py profile_photo.jpg --method mediapipe
  python side_detect.py profile_photo.jpg --output my_detection.json
  python side_detect.py profile_photo.jpg --method all
        """
    )
    
    parser.add_argument('image', help='Path to side profile image')
    parser.add_argument('--method', '-m', 
                        default='auto',
                        choices=['auto', 'face-alignment', 'mediapipe', 'dlib', 'all'],
                        help='Detection method (default: auto = tries face-alignment first, falls back to mediapipe)')
    parser.add_argument('--output', '-o',
                        default=None,
                        help='Output JSON file path (default: side_detection.json in current dir)')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.image):
        print(f"❌ File not found: {args.image}")
        sys.exit(1)
    
    result = None
    methods_tried = []
    
    if args.method == 'auto':
        # Try face-alignment first (better for profile), then MediaPipe
        print("🔄 AUTO mode: trying face-alignment, then MediaPipe...\n")
        
        result = detect_with_face_alignment(args.image)
        if result:
            methods_tried.append('face-alignment')
        else:
            print("   ↪ face-alignment failed, trying MediaPipe...\n")
            result = detect_with_mediapipe(args.image)
            if result:
                methods_tried.append('mediapipe')
            else:
                print("   ↪ MediaPipe failed, trying dlib...\n")
                result = detect_with_dlib(args.image)
                if result:
                    methods_tried.append('dlib')
    
    elif args.method == 'face-alignment':
        result = detect_with_face_alignment(args.image)
        if result:
            methods_tried.append('face-alignment')
    
    elif args.method == 'mediapipe':
        result = detect_with_mediapipe(args.image)
        if result:
            methods_tried.append('mediapipe')
    
    elif args.method == 'dlib':
        result = detect_with_dlib(args.image)
        if result:
            methods_tried.append('dlib')
    
    elif args.method == 'all':
        print("🔄 Trying ALL methods...\n")
        all_results = {}
        
        mp_result = detect_with_mediapipe(args.image)
        if mp_result:
            all_results['mediapipe'] = mp_result
        
        fa_result = detect_with_face_alignment(args.image)
        if fa_result:
            all_results['face_alignment'] = fa_result
        
        dlib_result = detect_with_dlib(args.image)
        if dlib_result:
            all_results['dlib'] = dlib_result
        
        if all_results:
            result = {
                'source': 'combined',
                'image': os.path.basename(args.image),
                'methods_used': list(all_results.keys()),
                'results': all_results
            }
            methods_tried = list(all_results.keys())
        else:
            print("❌ No method succeeded")
            sys.exit(1)
    
    # Fallback to empty template
    if result is None:
        print("\n⚠️  All detection methods failed. Generating empty template for manual marking.")
        result = generate_empty_template(args.image)
        methods_tried.append('template')
    
    # Determine output path
    if args.output:
        output_path = args.output
    else:
        output_dir = os.path.dirname(os.path.abspath(args.image))
        base_name = os.path.splitext(os.path.basename(args.image))[0]
        output_path = os.path.join(output_dir, f'{base_name}_detection.json')
    
    # Write JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*60}")
    print(f"✅ Detection saved to: {output_path}")
    print(f"   Methods used: {', '.join(methods_tried)}")
    if 'landmarks' in result:
        print(f"   Points detected: {result['total_points']}")
    print(f"\n📖 Next: Open side-profile-labeler.html in browser")
    print(f"   1. Upload the same image")
    print(f"   2. Click 'Load PT Detection' and select: {os.path.basename(output_path)}")
    print(f"   3. Map 31 custom landmarks to detected points")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()