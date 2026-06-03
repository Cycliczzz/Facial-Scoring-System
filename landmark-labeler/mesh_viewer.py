"""
MediaPipe Mesh Viewer - Xem 478 landmarks dày đặc, đánh số cố định
Chay: python mesh_viewer.py
Yeu cau: pip install opencv-python mediapipe pillow numpy
"""

import cv2
import numpy as np
import tkinter as tk
from tkinter import filedialog
from PIL import Image, ImageTk
import json
import os
import urllib.request

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


class MeshViewer:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("MediaPipe Mesh Viewer - 478 Landmarks")
        self.root.geometry("1400x800")
        self.root.configure(bg='#1a1a1a')
        
        # State
        self.image = None
        self.image_rgb = None
        self.landmarks = []
        self.selected_idx = None
        self.photo = None
        self.face_landmarker = None
        
        # Zoom & Pan
        self.zoom = 1.0
        self.pan_x = 0
        self.pan_y = 0
        self.dragging = False
        self.drag_start_x = 0
        self.drag_start_y = 0
        self.pan_start_x = 0
        self.pan_start_y = 0
        
        self.setup_ui()
        self.init_mediapipe()
        
    def setup_ui(self):
        main_frame = tk.Frame(self.root, bg='#1a1a1a')
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Left - Image
        left_frame = tk.Frame(main_frame, bg='#111111')
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Toolbar
        toolbar = tk.Frame(left_frame, bg='#222222', height=40)
        toolbar.pack(fill=tk.X)
        toolbar.pack_propagate(False)
        
        tk.Button(toolbar, text="📁 Open Image", command=self.open_image,
                  bg='#333', fg='#ddd', bd=0, padx=12, cursor='hand2').pack(side=tk.LEFT, padx=5, pady=5)
        
        tk.Button(toolbar, text="🔍+", command=lambda: self.zoom_in(),
                  bg='#333', fg='#aaa', bd=0, padx=6, cursor='hand2').pack(side=tk.LEFT, padx=1)
        tk.Button(toolbar, text="🔍-", command=lambda: self.zoom_out(),
                  bg='#333', fg='#aaa', bd=0, padx=6, cursor='hand2').pack(side=tk.LEFT, padx=1)
        tk.Button(toolbar, text="↺ Fit", command=lambda: self.zoom_fit(),
                  bg='#333', fg='#aaa', bd=0, padx=6, cursor='hand2').pack(side=tk.LEFT, padx=1)
        
        self.zoom_label = tk.Label(toolbar, text="100%", bg='#222', fg='#888', width=5)
        self.zoom_label.pack(side=tk.LEFT, padx=2)
        
        self.show_dots = tk.BooleanVar(value=True)
        tk.Checkbutton(toolbar, text="Dots", variable=self.show_dots,
                       command=self.render, bg='#222', fg='#aaa', selectcolor='#333',
                       activebackground='#333', activeforeground='#fff').pack(side=tk.LEFT, padx=5)
        
        tk.Label(toolbar, text="Size:", bg='#222', fg='#888').pack(side=tk.LEFT, padx=(10,2))
        self.size_var = tk.IntVar(value=3)
        tk.Scale(toolbar, from_=1, to=10, orient=tk.HORIZONTAL, variable=self.size_var,
                 command=lambda x: self.render(), bg='#222', fg='#aaa', bd=0,
                 highlightthickness=0, length=80).pack(side=tk.LEFT)
        
        tk.Label(toolbar, text="Font:", bg='#222', fg='#888').pack(side=tk.LEFT, padx=(10,2))
        self.font_var = tk.IntVar(value=10)
        tk.Scale(toolbar, from_=6, to=18, orient=tk.HORIZONTAL, variable=self.font_var,
                 command=lambda x: self.render(), bg='#222', fg='#aaa', bd=0,
                 highlightthickness=0, length=80).pack(side=tk.LEFT)
        
        self.status_label = tk.Label(toolbar, text="No image loaded", bg='#222', fg='#666')
        self.status_label.pack(side=tk.RIGHT, padx=10)
        
        # Canvas
        canvas_frame = tk.Frame(left_frame, bg='#111111')
        canvas_frame.pack(fill=tk.BOTH, expand=True)
        
        self.canvas = tk.Canvas(canvas_frame, bg='#111111', highlightthickness=0, cursor='crosshair')
        self.canvas.pack(fill=tk.BOTH, expand=True)
        
        self.canvas.bind("<Button-1>", self.on_click)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_drag_end)
        self.canvas.bind("<MouseWheel>", self.on_scroll)
        self.canvas.bind("<Button-4>", self.on_scroll)
        self.canvas.bind("<Button-5>", self.on_scroll)
        self.canvas.bind("<Configure>", lambda e: self.render())
        
        # Right - Info panel
        right_frame = tk.Frame(main_frame, bg='#1a1a1a', width=320)
        right_frame.pack(side=tk.RIGHT, fill=tk.Y)
        right_frame.pack_propagate(False)
        
        # Search
        search_frame = tk.Frame(right_frame, bg='#1a1a1a')
        search_frame.pack(fill=tk.X, padx=8, pady=(8,4))
        tk.Label(search_frame, text="🔍 Search index:", bg='#1a1a1a', fg='#888', font=('', 9)).pack(anchor=tk.W)
        self.search_entry = tk.Entry(search_frame, bg='#333', fg='#ddd', bd=0, insertbackground='#fff',
                                      font=('', 10), relief=tk.FLAT)
        self.search_entry.pack(fill=tk.X, pady=(2,0), ipady=4)
        self.search_entry.bind('<KeyRelease>', lambda e: self.update_list())
        
        # Point list
        list_frame = tk.Frame(right_frame, bg='#1a1a1a')
        list_frame.pack(fill=tk.BOTH, expand=True, padx=8, pady=4)
        
        tk.Label(list_frame, text="📋 Points (478):", bg='#1a1a1a', fg='#888', font=('', 9)).pack(anchor=tk.W)
        
        list_container = tk.Frame(list_frame, bg='#222222')
        list_container.pack(fill=tk.BOTH, expand=True, pady=(2,0))
        
        scrollbar = tk.Scrollbar(list_container)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.listbox = tk.Listbox(list_container, bg='#222222', fg='#ccc', bd=0,
                                   font=('Consolas', 9), selectbackground='#446',
                                   selectforeground='#fff', highlightthickness=0,
                                   yscrollcommand=scrollbar.set)
        self.listbox.pack(fill=tk.BOTH, expand=True)
        scrollbar.config(command=self.listbox.yview)
        
        self.listbox.bind('<<ListboxSelect>>', self.on_list_select)
        
        # Detail
        detail_frame = tk.Frame(right_frame, bg='#151515', height=100)
        detail_frame.pack(fill=tk.X, padx=8, pady=(0,8))
        detail_frame.pack_propagate(False)
        
        self.detail_title = tk.Label(detail_frame, text="Click a point to inspect",
                                      bg='#151515', fg='#88f', font=('', 10, 'bold'))
        self.detail_title.pack(anchor=tk.W, padx=8, pady=(6,2))
        
        self.detail_info = tk.Label(detail_frame, text="", bg='#151515', fg='#888',
                                     font=('Consolas', 9), justify=tk.LEFT)
        self.detail_info.pack(anchor=tk.W, padx=8)
        
        # Bottom buttons
        bottom_frame = tk.Frame(right_frame, bg='#1a1a1a')
        bottom_frame.pack(fill=tk.X, padx=8, pady=(0,8))
        
        tk.Button(bottom_frame, text="📤 Export 1 point", command=self.export_one,
                  bg='#333', fg='#aaa', bd=0, padx=8, pady=4, cursor='hand2').pack(side=tk.LEFT, padx=2)
        tk.Button(bottom_frame, text="📤 Export ALL", command=self.export_all,
                  bg='#446', fg='#88f', bd=0, padx=8, pady=4, cursor='hand2').pack(side=tk.LEFT, padx=2)
    
    def init_mediapipe(self):
        try:
            model_path = os.path.join(os.path.dirname(__file__), 'face_landmarker_v2_with_blendshapes.task')
            
            if not os.path.exists(model_path):
                self.status_label.config(text="⏳ Downloading model...")
                self.root.update()
                self.download_model(model_path)
            
            base_options = python.BaseOptions(model_asset_path=model_path)
            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                output_face_blendshapes=False,
                running_mode=vision.RunningMode.IMAGE,
                num_faces=1
            )
            self.face_landmarker = vision.FaceLandmarker.create_from_options(options)
            self.status_label.config(text="✅ MediaPipe ready")
            print("MediaPipe FaceLandmarker initialized")
        except Exception as e:
            print(f"Failed to init MediaPipe: {e}")
            self.status_label.config(text="⚠️ MediaPipe init failed - check model file")
    
    def download_model(self, path):
        url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
        print(f"Downloading model from {url}...")
        urllib.request.urlretrieve(url, path)
        print("Model downloaded!")
    
    def open_image(self):
        path = filedialog.askopenfilename(
            title="Select a face photo",
            filetypes=[("Image files", "*.jpg *.jpeg *.png *.bmp *.tiff")]
        )
        if not path:
            return
        
        self.image = cv2.imread(path)
        if self.image is None:
            self.status_label.config(text="❌ Cannot load image")
            return
        
        self.image_rgb = cv2.cvtColor(self.image, cv2.COLOR_BGR2RGB)
        self.status_label.config(text=f"📷 {os.path.basename(path)}")
        self.zoom_fit()
        self.detect_landmarks()
    
    def detect_landmarks(self):
        if self.image is None or self.face_landmarker is None:
            return
        
        try:
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=self.image_rgb)
            result = self.face_landmarker.detect(mp_image)
            
            self.landmarks = []
            
            if result.face_landmarks and len(result.face_landmarks) > 0:
                for lm in result.face_landmarks[0]:
                    self.landmarks.append((lm.x, lm.y, lm.z))
                
                self.status_label.config(
                    text=self.status_label.cget('text') + f" | ✅ {len(self.landmarks)} landmarks"
                )
            else:
                self.status_label.config(text=self.status_label.cget('text') + " | ⚠️ No face detected")
        except Exception as e:
            print(f"Detection error: {e}")
            self.landmarks = []
            self.status_label.config(text=self.status_label.cget('text') + " | ❌ Detection failed")
        
        self.selected_idx = None
        self.update_list()
        self.render()
    
    def zoom_in(self):
        self.zoom = min(self.zoom * 1.3, 10.0)
        self.zoom_label.config(text=f"{int(self.zoom*100)}%")
        self.render()
    
    def zoom_out(self):
        self.zoom = max(self.zoom / 1.3, 0.1)
        self.zoom_label.config(text=f"{int(self.zoom*100)}%")
        self.render()
    
    def zoom_fit(self):
        if self.image is None:
            return
        canvas_w = self.canvas.winfo_width()
        canvas_h = self.canvas.winfo_height()
        if canvas_w < 10 or canvas_h < 10:
            return
        h, w = self.image.shape[:2]
        self.zoom = min(canvas_w / w, canvas_h / h, 1.0)
        self.pan_x = 0
        self.pan_y = 0
        self.zoom_label.config(text=f"{int(self.zoom*100)}%")
        self.render()
    
    def on_scroll(self, event):
        if self.image is None:
            return
        if event.num == 4 or event.delta > 0:
            factor = 1.15
        else:
            factor = 0.85
        
        new_zoom = max(0.1, min(self.zoom * factor, 10.0))
        
        canvas_w = self.canvas.winfo_width()
        canvas_h = self.canvas.winfo_height()
        mx = event.x - canvas_w / 2
        my = event.y - canvas_h / 2
        
        self.pan_x = mx - (mx - self.pan_x) * (new_zoom / self.zoom)
        self.pan_y = my - (my - self.pan_y) * (new_zoom / self.zoom)
        self.zoom = new_zoom
        
        self.zoom_label.config(text=f"{int(self.zoom*100)}%")
        self.render()
    
    def on_click(self, event):
        if not self.landmarks or self.image is None:
            return
        
        # Start drag
        self.dragging = True
        self.drag_start_x = event.x
        self.drag_start_y = event.y
        self.pan_start_x = self.pan_x
        self.pan_start_y = self.pan_y
        
        # Try to select a point
        h, w = self.image.shape[:2]
        canvas_w = self.canvas.winfo_width()
        canvas_h = self.canvas.winfo_height()
        
        img_cx = canvas_w / 2 + self.pan_x
        img_cy = canvas_h / 2 + self.pan_y
        img_w = w * self.zoom
        img_h = h * self.zoom
        img_x0 = img_cx - img_w / 2
        img_y0 = img_cy - img_h / 2
        
        cx = (event.x - img_x0) / img_w
        cy = (event.y - img_y0) / img_h
        
        best_idx = 0
        best_dist = float('inf')
        
        for i, (lx, ly, lz) in enumerate(self.landmarks):
            d = np.sqrt((lx - cx)**2 + (ly - cy)**2)
            if d < best_dist:
                best_dist = d
                best_idx = i
        
        if best_dist < 0.03:
            self.select_point(best_idx)
    
    def on_drag(self, event):
        if not self.dragging:
            return
        dx = event.x - self.drag_start_x
        dy = event.y - self.drag_start_y
        self.pan_x = self.pan_start_x + dx
        self.pan_y = self.pan_start_y + dy
        self.render()
    
    def on_drag_end(self, event):
        self.dragging = False
    
    def render(self):
        if self.image is None:
            return
        
        h, w = self.image.shape[:2]
        canvas_w = self.canvas.winfo_width()
        canvas_h = self.canvas.winfo_height()
        
        if canvas_w < 10 or canvas_h < 10:
            return
        
        img_w = w * self.zoom
        img_h = h * self.zoom
        img_cx = canvas_w / 2 + self.pan_x
        img_cy = canvas_h / 2 + self.pan_y
        img_x0 = int(img_cx - img_w / 2)
        img_y0 = int(img_cy - img_h / 2)
        
        img_rgb = cv2.resize(self.image_rgb, (int(img_w), int(img_h)))
        
        show_dots = self.show_dots.get()
        dot_size = self.size_var.get()
        
        # Ve tat ca cac diem mau xanh duong nhat
        for i, (lx, ly, lz) in enumerate(self.landmarks):
            x = int(lx * img_w)
            y = int(ly * img_h)
            
            is_sel = (i == self.selected_idx)
            
            if show_dots or is_sel:
                if is_sel:
                    # Diem duoc chon: vang + vien trang + hien so
                    sz = dot_size + 5
                    cv2.circle(img_rgb, (x, y), sz + 3, (255, 255, 255), 2)
                    cv2.circle(img_rgb, (x, y), sz, (0, 255, 255), -1)
                    
                    # Hien so index
                    text = str(i)
                    font_scale = self.font_var.get() / 20
                    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 1)
                    bx1 = x - tw//2 - 3
                    by1 = y - th - 5
                    bx2 = x + tw//2 + 3
                    by2 = y - 2
                    cv2.rectangle(img_rgb, (bx1, by1), (bx2, by2), (0, 255, 255), -1)
                    cv2.rectangle(img_rgb, (bx1-1, by1-1), (bx2+1, by2+1), (255, 255, 255), 1)
                    cv2.putText(img_rgb, text, (x - tw//2, y - 4),
                               cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 0), 1)
                else:
                    # Diem binh thuong: xanh duong nhat
                    cv2.circle(img_rgb, (x, y), dot_size, (100, 180, 255), -1)
        
        pil_img = Image.fromarray(img_rgb)
        self.photo = ImageTk.PhotoImage(pil_img)
        
        self.canvas.delete("all")
        self.canvas.create_image(img_x0, img_y0, image=self.photo, anchor=tk.NW)
        
        info_text = f"Zoom: {int(self.zoom*100)}% | Points: {len(self.landmarks)}"
        self.canvas.create_text(10, 10, text=info_text, anchor=tk.NW,
                                fill='#888', font=('', 9))
    
    def update_list(self):
        self.listbox.delete(0, tk.END)
        
        search_text = self.search_entry.get().strip()
        
        for i in range(len(self.landmarks)):
            if search_text:
                try:
                    if i != int(search_text):
                        continue
                except ValueError:
                    continue
            
            lx, ly, lz = self.landmarks[i]
            display_text = f"#{i:3d}  ({lx*100:5.1f}%, {ly*100:5.1f}%)"
            self.listbox.insert(tk.END, display_text)
    
    def on_list_select(self, event):
        selection = self.listbox.curselection()
        if not selection:
            return
        
        text = self.listbox.get(selection[0])
        if not text or not text.startswith('#'):
            return
        
        # Parse index chinh xac: "# 17" -> 17, "#170" -> 170
        parts = text.split()
        idx_str = parts[0].replace('#', '').strip()
        if not idx_str:
            return
        idx = int(idx_str)
        
        # Chi cap nhat hien thi
        self.selected_idx = idx
        self.render()
        
        lx, ly, lz = self.landmarks[idx]
        self.detail_title.config(text=f"Point #{idx}")
        self.detail_info.config(
            text=f"x = {lx*100:.2f}%\ny = {ly*100:.2f}%\n\n({lx:.4f}, {ly:.4f}, {lz:.4f})"
        )
    
    def select_point(self, idx):
        self.selected_idx = idx
        self.render()
        
        lx, ly, lz = self.landmarks[idx]
        
        self.detail_title.config(text=f"Point #{idx}")
        self.detail_info.config(
            text=f"x = {lx*100:.2f}%\ny = {ly*100:.2f}%\n\n({lx:.4f}, {ly:.4f}, {lz:.4f})"
        )
        
        # Khong goi update_list() o day de tranh reset listbox
        # Chi highlight item trong listbox
        for i in range(self.listbox.size()):
            text = self.listbox.get(i)
            parts = text.split()
            item_idx_str = parts[0].replace('#', '').strip()
            if item_idx_str and int(item_idx_str) == idx:
                self.listbox.selection_clear(0, tk.END)
                self.listbox.selection_set(i)
                self.listbox.see(i)
                break
    
    def export_one(self):
        if self.selected_idx is None:
            self.status_label.config(text="⚠️ Select a point first")
            return
        
        lx, ly, lz = self.landmarks[self.selected_idx]
        data = {
            'mediapipeIndex': self.selected_idx,
            'x': round(lx, 4),
            'y': round(ly, 4),
            'z': round(lz, 4)
        }
        
        self.copy_to_clipboard(json.dumps(data, indent=2))
        self.status_label.config(text=f"📋 Copied point #{self.selected_idx}")
    
    def export_all(self):
        data = {}
        for i, (lx, ly, lz) in enumerate(self.landmarks):
            data[i] = {
                'x': round(lx, 4),
                'y': round(ly, 4),
                'z': round(lz, 4)
            }
        
        self.copy_to_clipboard(json.dumps(data, indent=2))
        self.status_label.config(text=f"📋 Copied all {len(self.landmarks)} points")
    
    def copy_to_clipboard(self, text):
        self.root.clipboard_clear()
        self.root.clipboard_append(text)
    
    def run(self):
        self.root.mainloop()


if __name__ == '__main__':
    app = MeshViewer()
    app.run()
