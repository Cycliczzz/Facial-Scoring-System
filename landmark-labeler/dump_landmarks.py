"""
Script dump toàn bộ 478 landmarks từ MediaPipe để xác định đúng vùng
Chạy: python dump_landmarks.py <path_to_image>
"""

import cv2
import numpy as np
import sys
import os

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# MediaPipe Face Landmark indices chuẩn (từ Google MediaPipe documentation)
# https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_landmark/face_landmark.tflite

# Các chỉ số chuẩn từ MediaPipe:
# face_oval / contour: 0-16 (chin contour), 17-25 (right contour), 26-32 (left contour)
# left_eyebrow: 33-41 (left), 42-50 (right) - nhưng thực tế MediaPipe 478 có khác

# Tôi sẽ dump tất cả landmarks và phân tích thủ công

def main():
    if len(sys.argv) < 2:
        print("Usage: python dump_landmarks.py <image_path>")
        return
    
    img_path = sys.argv[1]
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        return
    
    # Load model
    model_path = os.path.join(os.path.dirname(__file__), 'face_landmarker_v2_with_blendshapes.task')
    if not os.path.exists(model_path):
        print("Downloading model...")
        import urllib.request
        url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
        urllib.request.urlretrieve(url, model_path)
        print("Model downloaded!")
    
    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        output_face_blendshapes=False,
        running_mode=vision.RunningMode.IMAGE,
        num_faces=1
    )
    landmarker = vision.FaceLandmarker.create_from_options(options)
    
    # Load image
    img = cv2.imread(img_path)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    h, w = img.shape[:2]
    
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
    result = landmarker.detect(mp_image)
    
    if not result.face_landmarks or len(result.face_landmarks) == 0:
        print("No face detected!")
        return
    
    landmarks = result.face_landmarks[0]
    
    print(f"\n{'='*80}")
    print(f"MEDIAPIPE FACE LANDMARKS - 478 points")
    print(f"Image size: {w}x{h}")
    print(f"{'='*80}\n")
    
    # Phân tích theo vùng dựa trên tọa độ thực tế
    # Với ảnh front profile:
    # - x gần 0 = bên trái ảnh (tai trái)
    # - x gần 1 = bên phải ảnh (tai phải)
    # - y gần 0 = đỉnh đầu
    # - y gần 1 = cằm
    
    # In tất cả landmarks với tọa độ
    print(f"{'Index':>5} | {'x':>8} | {'y':>8} | {'z':>8} | {'x_px':>5} | {'y_px':>5}")
    print("-"*60)
    
    for i, lm in enumerate(landmarks):
        x_px = int(lm.x * w)
        y_px = int(lm.y * h)
        print(f"{i:5d} | {lm.x:8.4f} | {lm.y:8.4f} | {lm.z:8.4f} | {x_px:5d} | {y_px:5d}")
    
    # Phân tích vùng dựa trên tọa độ
    print(f"\n{'='*80}")
    print("PHÂN TÍCH VÙNG DỰA TRÊN TỌA ĐỘ")
    print(f"{'='*80}\n")
    
    # Tìm các điểm đặc biệt
    # Điểm có y nhỏ nhất (cao nhất - forehead/trán)
    min_y_idx = min(range(len(landmarks)), key=lambda i: landmarks[i].y)
    max_y_idx = max(range(len(landmarks)), key=lambda i: landmarks[i].y)
    min_x_idx = min(range(len(landmarks)), key=lambda i: landmarks[i].x)
    max_x_idx = max(range(len(landmarks)), key=lambda i: landmarks[i].x)
    
    print(f"Điểm cao nhất (trán): index {min_y_idx} (y={landmarks[min_y_idx].y:.4f})")
    print(f"Điểm thấp nhất (cằm): index {max_y_idx} (y={landmarks[max_y_idx].y:.4f})")
    print(f"Điểm trái nhất: index {min_x_idx} (x={landmarks[min_x_idx].x:.4f})")
    print(f"Điểm phải nhất: index {max_x_idx} (x={landmarks[max_x_idx].x:.4f})")
    
    # Tìm mắt (left eye - bên trái ảnh, right eye - bên phải ảnh)
    # Mắt thường ở khoảng y=0.3-0.45
    eye_y_range = lambda y: 0.25 < y < 0.50
    
    # Left eye (bên trái ảnh, x nhỏ)
    left_eye_candidates = [(i, lm) for i, lm in enumerate(landmarks) 
                          if eye_y_range(lm.y) and lm.x < 0.35]
    # Right eye (bên phải ảnh, x lớn)
    right_eye_candidates = [(i, lm) for i, lm in enumerate(landmarks) 
                           if eye_y_range(lm.y) and lm.x > 0.65]
    
    print(f"\nLeft eye candidates (x<0.35, y=0.25-0.50): {len(left_eye_candidates)} points")
    for i, lm in left_eye_candidates[:10]:
        print(f"  {i}: ({lm.x:.4f}, {lm.y:.4f})")
    
    print(f"\nRight eye candidates (x>0.65, y=0.25-0.50): {len(right_eye_candidates)} points")
    for i, lm in right_eye_candidates[:10]:
        print(f"  {i}: ({lm.x:.4f}, {lm.y:.4f})")
    
    # Nose tip - thường ở giữa, y khoảng 0.5-0.6
    nose_candidates = [(i, lm) for i, lm in enumerate(landmarks) 
                      if 0.40 < lm.x < 0.60 and 0.45 < lm.y < 0.65]
    print(f"\nNose candidates (x=0.4-0.6, y=0.45-0.65): {len(nose_candidates)} points")
    for i, lm in nose_candidates[:15]:
        print(f"  {i}: ({lm.x:.4f}, {lm.y:.4f})")
    
    # Lips - ở dưới mũi, y khoảng 0.6-0.75
    lips_candidates = [(i, lm) for i, lm in enumerate(landmarks) 
                      if 0.30 < lm.x < 0.70 and 0.60 < lm.y < 0.80]
    print(f"\nLips candidates (x=0.3-0.7, y=0.6-0.8): {len(lips_candidates)} points")
    for i, lm in lips_candidates[:20]:
        print(f"  {i}: ({lm.x:.4f}, {lm.y:.4f})")

if __name__ == '__main__':
    main()
