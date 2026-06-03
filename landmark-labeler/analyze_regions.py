"""
Phân tích vùng dựa trên tọa độ thực tế từ MediaPipe
Chạy: python analyze_regions.py <image_path>
"""

import cv2
import numpy as np
import sys
import os
import json

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

def main():
    if len(sys.argv) < 2:
        print("Usage: python analyze_regions.py <image_path>")
        return
    
    img_path = sys.argv[1]
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        return
    
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
    
    img = cv2.imread(img_path)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    h, w = img.shape[:2]
    
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
    result = landmarker.detect(mp_image)
    
    if not result.face_landmarks or len(result.face_landmarks) == 0:
        print("No face detected!")
        return
    
    landmarks = result.face_landmarks[0]
    
    # Phân tích dựa trên tọa độ
    # Với ảnh front: x=0 là trái, x=1 là phải, y=0 là trên, y=1 là dưới
    
    # 1. Face contour (oval) - các điểm bao quanh khuôn mặt
    # Điểm có y nhỏ nhất (trán) và lớn nhất (cằm)
    min_y_idx = min(range(len(landmarks)), key=lambda i: landmarks[i].y)
    max_y_idx = max(range(len(landmarks)), key=lambda i: landmarks[i].y)
    
    print(f"\n=== PHAN TICH VUNG DU LIEU THUC TE ===")
    print(f"Image: {w}x{h}")
    print(f"Diem cao nhat (tran): index {min_y_idx} (y={landmarks[min_y_idx].y:.4f})")
    print(f"Diem thap nhat (cam): index {max_y_idx} (y={landmarks[max_y_idx].y:.4f})")
    
    # 2. Xac dinh face_oval: cac diem o bien cua khuon mat
    # Dua tren contour: diem 0-16 la chin, 17-25 la ben phai, 26-32 la ben trai
    # Nhung voi MediaPipe 478, contour la 0-32 (33 diem)
    face_oval = []
    for i in range(33):
        face_oval.append(i)
    # Them cac diem o bien khac
    for i in range(33, 478):
        lm = landmarks[i]
        # Kiem tra neu diem o gan bien (x < 0.15 hoac x > 0.85)
        if lm.x < 0.15 or lm.x > 0.85:
            face_oval.append(i)
    
    print(f"\nFace oval (contour): {len(face_oval)} points")
    print(f"  0-32: {[i for i in range(33)]}")
    
    # 3. Mat trai (left eye) - ben trai anh, x nho
    # Mat thuong o y ~0.35-0.45
    left_eye = []
    for i in range(33, 478):
        lm = landmarks[i]
        if 0.30 < lm.y < 0.50 and 0.30 < lm.x < 0.50:
            left_eye.append(i)
    
    # 4. Mat phai (right eye) - ben phai anh, x lon
    right_eye = []
    for i in range(33, 478):
        lm = landmarks[i]
        if 0.30 < lm.y < 0.50 and 0.50 < lm.x < 0.70:
            right_eye.append(i)
    
    print(f"\nLeft eye candidates (x=0.3-0.5, y=0.3-0.5): {left_eye}")
    print(f"Right eye candidates (x=0.5-0.7, y=0.3-0.5): {right_eye}")
    
    # 5. Long may trai (left eyebrow) - phia tren mat trai
    left_eyebrow = []
    for i in range(33, 478):
        lm = landmarks[i]
        if 0.20 < lm.y < 0.35 and 0.30 < lm.x < 0.50:
            left_eyebrow.append(i)
    
    # 6. Long may phai (right eyebrow)
    right_eyebrow = []
    for i in range(33, 478):
        lm = landmarks[i]
        if 0.20 < lm.y < 0.35 and 0.50 < lm.x < 0.70:
            right_eyebrow.append(i)
    
    print(f"\nLeft eyebrow candidates (x=0.3-0.5, y=0.2-0.35): {left_eyebrow}")
    print(f"Right eyebrow candidates (x=0.5-0.7, y=0.2-0.35): {right_eyebrow}")
    
    # 7. Mui (nose) - o giua, y ~0.4-0.6
    nose = []
    for i in range(33, 478):
        lm = landmarks[i]
        if 0.40 < lm.x < 0.60 and 0.40 < lm.y < 0.65:
            nose.append(i)
    
    print(f"\nNose candidates (x=0.4-0.6, y=0.4-0.65): {nose}")
    
    # 8. Moi (lips) - o duoi mui, y ~0.6-0.75
    lips = []
    for i in range(33, 478):
        lm = landmarks[i]
        if 0.35 < lm.x < 0.65 and 0.60 < lm.y < 0.80:
            lips.append(i)
    
    print(f"\nLips candidates (x=0.35-0.65, y=0.6-0.8): {lips}")
    
    # In tat ca diem co index > 32 de phan tich
    print(f"\n=== TAT CA DIEM (33-477) ===")
    for i in range(33, 478):
        lm = landmarks[i]
        region = "?"
        if i in left_eye: region = "left_eye"
        elif i in right_eye: region = "right_eye"
        elif i in left_eyebrow: region = "left_eyebrow"
        elif i in right_eyebrow: region = "right_eyebrow"
        elif i in nose: region = "nose"
        elif i in lips: region = "lips"
        elif i in face_oval: region = "face_oval"
        print(f"  {i:3d}: ({lm.x:.4f}, {lm.y:.4f}) -> {region}")

if __name__ == '__main__':
    main()
