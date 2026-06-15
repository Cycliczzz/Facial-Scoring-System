"""
Side Profile Landmark Labeler GUI
Upload anh side profile -> detect landmarks -> click point -> xem index -> match voi 31 custom landmarks.

2 engine:
  MediaPipe Face Landmarker (478 points)
  face-alignment (68-point, PyTorch SOTA, hỗ trợ profile)

Dependencies:
  pip install opencv-python pillow numpy mediapipe face-alignment torch torchvision

Usage:
  python side_labeler_gui.py
"""

import cv2
import numpy as np
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PIL import Image, ImageTk
import json
import os
import sys
import urllib.request

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# ============================================================
# SIDE PROFILE LANDMARK DEFINITIONS (31 points from README)
# ============================================================
SIDE_LANDMARKS = [
    ("top_of_head",       "Top of Head",          "#6b7280", "Diem cao nhat hop so"),
    ("occiput",           "Occiput",              "#6b7280", "Diem nho ra sau dau nhat"),
    ("hairline_profile",  "Hairline (Profile)",   "#f59e0b", "Duong chan toc profile"),
    ("glabella",          "Glabella",             "#f59e0b", "Diem giua tran, giua hai chan may"),
    ("forehead",          "Forehead",             "#f59e0b", "Diem nho nhat phia truoc tran"),
    ("nasal_bridge_root", "Nasal Bridge Root",    "#f97316", "Goc song mui"),
    ("rhinion",           "Rhinion",              "#f97316", "Diem thap nhat phan xuong mui"),
    ("supratip",          "Supratip",             "#f97316", "Diem tren chop mui"),
    ("nose_tip",          "Nose Tip",             "#f97316", "Chop mui"),
    ("infratip",          "Infratip",             "#f97316", "Diem duoi chop mui"),
    ("columella",         "Columella",            "#f97316", "Tru mui"),
    ("subnasale",         "Subnasale",            "#f97316", "Goc mui, noi mui tiep xuc moi tren"),
    ("subalare",          "Subalare",             "#f97316", "Diem duoi canh mui"),
    ("upper_lip",         "Upper Lip",            "#ec4899", "Diem nho nhat moi tren"),
    ("lower_lip",         "Lower Lip",            "#ec4899", "Diem nho nhat moi duoi"),
    ("mouth_corner",      "Mouth Corner",         "#ec4899", "Khoe mieng (profile)"),
    ("labiomental_fold",  "Labiomental Fold",     "#8b5cf6", "Ranh moi-cam"),
    ("chin_point",        "Chin Point",           "#8b5cf6", "Dinh cam"),
    ("chin_bottom",       "Chin Bottom",          "#8b5cf6", "Diem thap nhat cua cam"),
    ("corneal_apex",      "Corneal Apex",         "#38bdf8", "Diem loi nhat giac mac"),
    ("eyelid_end",        "Eyelid End",           "#38bdf8", "Duoi mat - khoe mat ngoai"),
    ("lower_eyelid",      "Lower Eyelid",         "#38bdf8", "Diem thap nhat mi duoi"),
    ("orbitale",          "Orbitale",             "#38bdf8", "Diem thap nhat o mat"),
    ("tragus",            "Tragus",               "#6b7280", "Nap tai - tragus"),
    ("intertragic_notch", "Intertragic Notch",    "#6b7280", "Khe tragus-antitragus"),
    ("porion",            "Porion",               "#6b7280", "Diem cao nhat lo tai ngoai"),
    ("cheekbone",         "Cheekbone",            "#a78bfa", "Diem go ma nho nhat"),
    ("upper_jaw_angle",   "Upper Jaw Angle",      "#8b5cf6", "Goc ham tren"),
    ("lower_jaw_angle",   "Lower Jaw Angle",      "#8b5cf6", "Goc ham duoi (Gonial)"),
    ("cervical_point",    "Cervical Point",       "#6b7280", "Diem co truoc"),
    ("neck_point",        "Neck Point",           "#6b7280", "Diem co"),
]


class SideLabelerGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Side Profile Landmark Labeler - 31 Custom Landmarks")
        self.root.geometry("1500x850")
        self.root.configure(bg="#1a1a1a")
        self.root.minsize(1200, 700)

        self.image = None
        self.image_rgb = None
        self.detected_points = []
        self.detection_source = None       # 'mediapipe' / 'face_alignment'
        self.highlighted_idx = None
        self.mapping = {}
        self.selected_landmark_id = None

        self.zoom = 1.0
        self.pan_x = 0
        self.pan_y = 0
        self.dragging = False
        self.drag_start_x = 0
        self.drag_start_y = 0
        self.pan_start_x = 0
        self.pan_start_y = 0

        # detectors
        self.mp_landmarker = None           # MediaPipe
        self.fa_detector = None             # face_alignment
        self.fa_loaded = False

        self.setup_ui()
        self.init_mediapipe()
        self.try_init_face_alignment()

    # ============================================================
    # UI SETUP
    # ============================================================
    def setup_ui(self):
        menubar = tk.Menu(self.root)
        fm = tk.Menu(menubar, tearoff=0)
        fm.add_command(label="📁 Open Side Photo", command=self.open_image, accelerator="Ctrl+O")
        fm.add_separator()
        fm.add_command(label="💾 Save Mapping", command=self.save_mapping, accelerator="Ctrl+S")
        fm.add_command(label="📤 Export JSON", command=self.export_json)
        fm.add_separator()
        fm.add_command(label="↺ Reset All", command=self.reset_all)
        fm.add_separator()
        fm.add_command(label="Exit", command=self.root.quit)
        menubar.add_cascade(label="File", menu=fm)

        dm = tk.Menu(menubar, tearoff=0)
        dm.add_command(label="🔍 MediaPipe Detect (478 pts)", command=lambda: self.run_detection("mediapipe"), accelerator="Ctrl+D")
        dm.add_command(label="🤖 Face Alignment (68 pts)", command=lambda: self.run_detection("face_alignment"), accelerator="Ctrl+T")
        dm.add_separator()
        dm.add_command(label="🤖 Auto-Assign All", command=self.auto_assign_all)
        menubar.add_cascade(label="Detect", menu=dm)
        self.root.config(menu=menubar)

        mf = tk.Frame(self.root, bg="#1a1a1a")
        mf.pack(fill=tk.BOTH, expand=True)

        # LEFT
        lf = tk.Frame(mf, bg="#111111")
        lf.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        tb = tk.Frame(lf, bg="#222222", height=42)
        tb.pack(fill=tk.X)
        tb.pack_propagate(False)

        tk.Button(tb, text="📁 Open Photo", command=self.open_image, bg="#333", fg="#ddd", bd=0, padx=10,
                  cursor="hand2", font=("", 9)).pack(side=tk.LEFT, padx=4, pady=6)
        tk.Button(tb, text="🔍 MediaPipe (478)", command=lambda: self.run_detection("mediapipe"), bg="#2a3a5e",
                  fg="#88b8ff", bd=0, padx=10, cursor="hand2", font=("", 9)).pack(side=tk.LEFT, padx=4, pady=6)
        self.btn_fa = tk.Button(tb, text="🤖 Face Align (68)", command=lambda: self.run_detection("face_alignment"),
                                 bg="#0a4a2a", fg="#10b981", bd=0, padx=10, cursor="hand2", font=("", 9))
        self.btn_fa.pack(side=tk.LEFT, padx=4, pady=6)

        tk.Label(tb, text="│", bg="#222", fg="#444").pack(side=tk.LEFT, padx=6)
        tk.Button(tb, text="🔍+", command=self.zoom_in, bg="#333", fg="#aaa", bd=0, padx=5, cursor="hand2",
                  font=("", 9)).pack(side=tk.LEFT, padx=1)
        tk.Button(tb, text="🔍-", command=self.zoom_out, bg="#333", fg="#aaa", bd=0, padx=5, cursor="hand2",
                  font=("", 9)).pack(side=tk.LEFT, padx=1)
        tk.Button(tb, text="↺ Fit", command=self.zoom_fit, bg="#333", fg="#aaa", bd=0, padx=5, cursor="hand2",
                  font=("", 9)).pack(side=tk.LEFT, padx=1)
        self.zoom_label = tk.Label(tb, text="100%", bg="#222", fg="#888", width=5, font=("", 9))
        self.zoom_label.pack(side=tk.LEFT, padx=4)

        tk.Label(tb, text="│", bg="#222", fg="#444").pack(side=tk.LEFT, padx=6)
        self.src_label = tk.Label(tb, text="Source: None", bg="#222", fg="#888", font=("", 9))
        self.src_label.pack(side=tk.LEFT, padx=4)
        self.status_label = tk.Label(tb, text="Ready", bg="#222", fg="#666", font=("", 9))
        self.status_label.pack(side=tk.RIGHT, padx=10)

        cf = tk.Frame(lf, bg="#111111")
        cf.pack(fill=tk.BOTH, expand=True)
        self.canvas = tk.Canvas(cf, bg="#111111", highlightthickness=0, cursor="crosshair")
        self.canvas.pack(fill=tk.BOTH, expand=True)
        self.canvas.bind("<Button-1>", self.on_click)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_drag_end)
        self.canvas.bind("<MouseWheel>", self.on_scroll)
        self.canvas.bind("<Button-4>", self.on_scroll)
        self.canvas.bind("<Button-5>", self.on_scroll)
        self.canvas.bind("<Configure>", lambda e: self.render())

        # RIGHT
        rf = tk.Frame(mf, bg="#1a1a1a", width=370)
        rf.pack(side=tk.RIGHT, fill=tk.Y)
        rf.pack_propagate(False)

        hf = tk.Frame(rf, bg="#1a1a1a")
        hf.pack(fill=tk.X, padx=8, pady=(8, 4))
        tk.Label(hf, text="📋 Side Landmarks (31)", bg="#1a1a1a", fg="#10b981",
                 font=("", 11, "bold")).pack(side=tk.LEFT)
        self.prog_label = tk.Label(hf, text="0/31", bg="#1a1a1a", fg="#888", font=("", 11))
        self.prog_label.pack(side=tk.RIGHT)
        self.prog_bar = ttk.Progressbar(rf, length=350, mode="determinate", maximum=31, value=0)
        self.prog_bar.pack(padx=8, pady=(0, 4))

        self.hl_frm = tk.Frame(rf, bg="#1a2800")
        self.hl_frm.pack(fill=tk.X, padx=8, pady=(0, 4))
        self.hl_label = tk.Label(self.hl_frm, text="Click a point → see index", bg="#1a2800", fg="#fbbf24",
                                  font=("Consolas", 10, "bold"), padx=6, pady=4)
        self.hl_label.pack(anchor=tk.W)

        sf = tk.Frame(rf, bg="#1a1a1a")
        sf.pack(fill=tk.X, padx=8, pady=(4, 2))
        tk.Label(sf, text="🔍 Search:", bg="#1a1a1a", fg="#888", font=("", 8)).pack(anchor=tk.W)
        self.search_entry = tk.Entry(sf, bg="#333", fg="#ddd", bd=0, insertbackground="#fff", font=("", 9),
                                     relief=tk.FLAT)
        self.search_entry.pack(fill=tk.X, pady=(1, 0), ipady=4)
        self.search_entry.bind("<KeyRelease>", lambda e: self.refresh_list())

        ff = tk.Frame(rf, bg="#1a1a1a")
        ff.pack(fill=tk.X, padx=8, pady=2)
        self.filter_var = tk.StringVar(value="all")
        for txt, val in [("All", "all"), ("⏳ Pending", "pending"), ("✅ Done", "done"), ("✏️ Custom", "custom")]:
            b = tk.Radiobutton(ff, text=txt, variable=self.filter_var, value=val, bg="#1a1a1a", fg="#888",
                               selectcolor="#333", activebackground="#1a1a1a", activeforeground="#10b981",
                               command=self.refresh_list, indicatoron=0, font=("", 8), padx=6, pady=2, bd=0)
            b.pack(side=tk.LEFT, padx=1)
            if val == "all":
                b.config(fg="#10b981")

        lf2 = tk.Frame(rf, bg="#222")
        lf2.pack(fill=tk.BOTH, expand=True, padx=8, pady=4)
        sb = tk.Scrollbar(lf2)
        sb.pack(side=tk.RIGHT, fill=tk.Y)
        self.listbox = tk.Listbox(lf2, bg="#222", fg="#ccc", bd=0, font=("Consolas", 9),
                                   selectbackground="#0a4a2a", selectforeground="#fff", highlightthickness=0,
                                   yscrollcommand=sb.set, activestyle="none")
        self.listbox.pack(fill=tk.BOTH, expand=True)
        sb.config(command=self.listbox.yview)
        self.listbox.bind("<<ListboxSelect>>", self.on_list_select)

        nf = tk.Frame(rf, bg="#1a1a1a")
        nf.pack(fill=tk.X, padx=8, pady=2)
        self.btn_prev = tk.Button(nf, text="◀ Prev", command=self.go_prev, bg="#333", fg="#aaa", bd=0, padx=8,
                                  cursor="hand2", font=("", 9))
        self.btn_prev.pack(side=tk.LEFT, padx=1)
        self.btn_next = tk.Button(nf, text="Next ▶", command=self.go_next, bg="#333", fg="#aaa", bd=0, padx=8,
                                  cursor="hand2", font=("", 9))
        self.btn_next.pack(side=tk.LEFT, padx=1)
        tk.Button(nf, text="↺ Deselect", command=self.deselect, bg="#333", fg="#888", bd=0, padx=8, cursor="hand2",
                  font=("", 9)).pack(side=tk.RIGHT, padx=1)

        df = tk.Frame(rf, bg="#151515", height=85)
        df.pack(fill=tk.X, padx=8, pady=(4, 2))
        df.pack_propagate(False)
        self.detail_title = tk.Label(df, text="Select a landmark", bg="#151515", fg="#10b981", font=("", 10, "bold"))
        self.detail_title.pack(anchor=tk.W, padx=8, pady=(6, 1))
        self.detail_desc = tk.Label(df, text="", bg="#151515", fg="#888", font=("", 8), wraplength=330, justify=tk.LEFT)
        self.detail_desc.pack(anchor=tk.W, padx=8, pady=(0, 2))

        af = tk.Frame(rf, bg="#1a1a1a")
        af.pack(fill=tk.X, padx=8, pady=4)
        tk.Button(af, text="✅ Match to Highlighted", command=self.match_highlighted, bg="#0a5a2a", fg="#4ade80", bd=0,
                  padx=6, pady=4, cursor="hand2", font=("", 9)).pack(side=tk.LEFT, padx=1, fill=tk.X, expand=True)
        tk.Button(af, text="🗑️ Clear", command=self.clear_landmark, bg="#333", fg="#ef4444", bd=0, padx=6, pady=4,
                  cursor="hand2", font=("", 9)).pack(side=tk.LEFT, padx=1, fill=tk.X, expand=True)

        xf = tk.Frame(rf, bg="#1a1a1a")
        xf.pack(fill=tk.X, padx=8, pady=2)
        tk.Label(xf, text="Type idx:", bg="#1a1a1a", fg="#888", font=("", 8)).pack(side=tk.LEFT)
        self.idx_entry = tk.Entry(xf, bg="#333", fg="#fbbf24", bd=0, insertbackground="#fff",
                                  font=("Consolas", 9), relief=tk.FLAT, width=6)
        self.idx_entry.pack(side=tk.LEFT, padx=4)
        self.idx_entry.bind("<Return>", lambda e: self.match_typed())
        tk.Button(xf, text="Go", command=self.match_typed, bg="#0a5a2a", fg="#4ade80", bd=0, padx=6, cursor="hand2",
                  font=("", 9)).pack(side=tk.LEFT)

        bf = tk.Frame(rf, bg="#1a1a1a")
        bf.pack(fill=tk.X, padx=8, pady=(4, 8))
        tk.Button(bf, text="💾 Save", command=self.save_mapping, bg="#0a5a2a", fg="#4ade80", bd=0, padx=8, pady=5,
                  cursor="hand2", font=("", 10, "bold")).pack(side=tk.LEFT, padx=2, fill=tk.X, expand=True)
        tk.Button(bf, text="📤 Export", command=self.export_json, bg="#2a2a4e", fg="#a0a0ff", bd=0, padx=8, pady=5,
                  cursor="hand2", font=("", 10)).pack(side=tk.LEFT, padx=2, fill=tk.X, expand=True)
        tk.Button(bf, text="↺ Reset", command=self.reset_all, bg="#3a1a1a", fg="#ef4444", bd=0, padx=8, pady=5,
                  cursor="hand2", font=("", 10)).pack(side=tk.LEFT, padx=2, fill=tk.X, expand=True)

        tk.Frame(rf, bg="#1a1a1a").pack(fill=tk.X, padx=8, pady=(0, 4))
        tk.Label(rf, text="↑↓ nav | Click point→# | Enter match | A auto | C clear | Esc deselect",
                 bg="#1a1a1a", fg="#555", font=("", 7)).pack(padx=8)
        self.refresh_list()

    # ============================================================
    # INIT DETECTORS
    # ============================================================
    def init_mediapipe(self):
        try:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(script_dir, "face_landmarker_v2_with_blendshapes.task")
            if not os.path.exists(model_path):
                self.status_label.config(text="⏳ Downloading MediaPipe model...")
                self.root.update()
                url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
                urllib.request.urlretrieve(url, model_path)
            base_options = python.BaseOptions(model_asset_path=model_path)
            options = vision.FaceLandmarkerOptions(base_options=base_options, output_face_blendshapes=False,
                                                    running_mode=vision.RunningMode.IMAGE, num_faces=1)
            self.mp_landmarker = vision.FaceLandmarker.create_from_options(options)
            print("MediaPipe ready")
        except Exception as e:
            print(f"MediaPipe init failed: {e}")

    def try_init_face_alignment(self):
        """Try to load face_alignment (PyTorch 68-point, supports profile)."""
        try:
            import face_alignment
            # Use TWO_D landmarks (68 points, supports profile faces)
            self.fa_detector = face_alignment.FaceAlignment(
                face_alignment.LandmarksType.TWO_D,
                flip_input=False,
                device="cpu"
            )
            self.fa_loaded = True
            print("face_alignment loaded (68-point 2D landmarks)")
        except Exception as e:
            print(f"face_alignment init failed: {e}")
            self.btn_fa.config(state=tk.DISABLED, text="🤖 FA (err)")

    # ============================================================
    # FILE OPS
    # ============================================================
    def open_image(self):
        path = filedialog.askopenfilename(title="Select Side Profile Photo",
                                           filetypes=[("Image files", "*.jpg *.jpeg *.png *.bmp *.tiff")])
        if not path:
            return
        img = cv2.imread(path)
        if img is None:
            self.status_label.config(text="❌ Cannot load image")
            return
        self.image = img
        self.image_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        self.detected_points = []
        self.detection_source = None
        self.highlighted_idx = None
        self.mapping = {}
        self.selected_landmark_id = None
        self.src_label.config(text="Source: None")
        self.hl_label.config(text="Click a point → see index")
        self.status_label.config(text=f"📷 {os.path.basename(path)}")
        self.zoom_fit()
        self.refresh_list()
        self.update_detail()
        self.update_progress()
        self.render()

    # ============================================================
    # DETECTION
    # ============================================================
    def run_detection(self, source):
        if self.image is None:
            self.status_label.config(text="⚠️ Open an image first")
            return
        h, w = self.image.shape[:2]

        if source == "mediapipe":
            if self.mp_landmarker is None:
                self.init_mediapipe()
            if self.mp_landmarker is None:
                return
            try:
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=self.image_rgb)
                res = self.mp_landmarker.detect(mp_img)
                if res.face_landmarks and len(res.face_landmarks) > 0:
                    self.detected_points = [{"x": lm.x, "y": lm.y} for lm in res.face_landmarks[0]]
                    self.detection_source = "mediapipe"
                    self.status_label.config(text=f"✅ MediaPipe: {len(self.detected_points)} pts")
                else:
                    self.status_label.config(text="⚠️ No face detected (MediaPipe)")
                    return
            except Exception as e:
                self.status_label.config(text=f"❌ MediaPipe failed: {e}")
                return

        elif source == "face_alignment":
            if not self.fa_loaded:
                self.status_label.config(text="⚠️ face-alignment not loaded")
                return
            try:
                self.status_label.config(text="⏳ Running face-alignment (PyTorch)...")
                self.root.update()

                # face_alignment returns list of faces, each with shape (68, 2) in pixel coords
                preds = self.fa_detector.get_landmarks(self.image_rgb)

                if not preds or len(preds) == 0:
                    self.status_label.config(text="⚠️ No face detected (face_alignment)")
                    return

                pts = preds[0]  # (68, 2) pixel coordinates
                self.detected_points = []
                for p in pts:
                    self.detected_points.append({
                        "x": float(p[0] / w),
                        "y": float(p[1] / h)
                    })
                self.detection_source = "face_alignment"
                self.status_label.config(text=f"✅ Face Align: {len(self.detected_points)} pts")
            except Exception as e:
                import traceback
                traceback.print_exc()
                self.status_label.config(text=f"❌ FA failed: {str(e)[:60]}")
                return

        self.highlighted_idx = None
        self.mapping = {}
        self.selected_landmark_id = None
        self.hl_label.config(text="Click a point → see index")
        self.src_label.config(text=f"Source: {source}")
        self.refresh_list()
        self.update_detail()
        self.update_progress()
        self.render()

    # ============================================================
    # CANVAS RENDERING
    # ============================================================
    def render(self):
        if self.image is None:
            self.canvas.delete("all")
            self.canvas.create_text(200, 200, text="No image loaded", fill="#555", font=("", 14))
            return
        h, w = self.image.shape[:2]
        cw = self.canvas.winfo_width()
        ch = self.canvas.winfo_height()
        if cw < 10 or ch < 10:
            return
        iw = int(w * self.zoom)
        ih = int(h * self.zoom)
        icx = cw / 2 + self.pan_x
        icy = ch / 2 + self.pan_y
        ix0 = int(icx - iw / 2)
        iy0 = int(icy - ih / 2)
        rgb = cv2.resize(self.image_rgb, (iw, ih))

        is_fa = (self.detection_source == "face_alignment")
        dc = (16, 185, 129) if is_fa else (100, 180, 255)   # green for FA, blue for MP
        ds = 3 if is_fa else 2

        for i, pt in enumerate(self.detected_points):
            x = int(pt["x"] * iw)
            y = int(pt["y"] * ih)
            if i == self.highlighted_idx:
                cv2.circle(rgb, (x, y), 9, (0, 255, 255), 2)
                cv2.circle(rgb, (x, y), 6, (0, 255, 255), -1)
                lbl = str(i)
                fs = 0.5
                (tw, th), _ = cv2.getTextSize(lbl, cv2.FONT_HERSHEY_SIMPLEX, fs, 2)
                cv2.rectangle(rgb, (x - tw // 2 - 3, y - th - 8), (x + tw // 2 + 3, y), (0, 255, 255), -1)
                cv2.rectangle(rgb, (x - tw // 2 - 4, y - th - 9), (x + tw // 2 + 4, y + 1), (255, 255, 255), 1)
                cv2.putText(rgb, lbl, (x - tw // 2, y - 4), cv2.FONT_HERSHEY_SIMPLEX, fs, (0, 0, 0), 2)
            else:
                cv2.circle(rgb, (x, y), ds, dc, -1)

        for lm_id, m in self.mapping.items():
            dn = next((d for d in SIDE_LANDMARKS if d[0] == lm_id), None)
            if not dn:
                continue
            x = int(m["x"] * iw)
            y = int(m["y"] * ih)
            hx = dn[2].lstrip("#")
            r, g, b = tuple(int(hx[i:i + 2], 16) for i in (0, 2, 4))
            cv2.circle(rgb, (x, y), 10, (r, g, b), 1)
            cv2.circle(rgb, (x, y), 6, (r, g, b), -1)
            cv2.circle(rgb, (x, y), 6, (255, 255, 255), 1)
            lbl = dn[1]
            fs = 0.4
            (tw, th), _ = cv2.getTextSize(lbl, cv2.FONT_HERSHEY_SIMPLEX, fs, 1)
            cv2.rectangle(rgb, (x - tw // 2 - 2, y - 16 - th), (x + tw // 2 + 2, y - 10), (30, 30, 30), -1)
            cv2.rectangle(rgb, (x - tw // 2 - 2, y - 16 - th), (x + tw // 2 + 2, y - 10), (r, g, b), 1)
            cv2.putText(rgb, lbl, (x - tw // 2, y - 12), cv2.FONT_HERSHEY_SIMPLEX, fs, (255, 255, 255), 1)

        if self.selected_landmark_id and self.selected_landmark_id in self.mapping:
            m = self.mapping[self.selected_landmark_id]
            cv2.circle(rgb, (int(m["x"] * iw), int(m["y"] * ih)), 14, (255, 200, 0), 2)

        pil = Image.fromarray(rgb)
        self.photo = ImageTk.PhotoImage(pil)
        self.canvas.delete("all")
        self.canvas.create_image(ix0, iy0, image=self.photo, anchor=tk.NW)
        info = f"Zoom:{int(self.zoom * 100)}% | Pts:{len(self.detected_points)} | Mapped:{len(self.mapping)}/31"
        self.canvas.create_text(10, 10, text=info, anchor=tk.NW, fill="#888", font=("", 9))
        if self.highlighted_idx is not None:
            self.canvas.create_text(cw // 2, 10, text=f"Idx #{self.highlighted_idx}", anchor=tk.N,
                                    fill="#fbbf24", font=("", 12, "bold"))

    # ============================================================
    # CANVAS EVENTS
    # ============================================================
    def to_img(self, ex, ey):
        h, w = self.image.shape[:2]
        cw = self.canvas.winfo_width()
        ch = self.canvas.winfo_height()
        iw = w * self.zoom
        ih = h * self.zoom
        icx = cw / 2 + self.pan_x
        icy = ch / 2 + self.pan_y
        ix0 = icx - iw / 2
        iy0 = icy - ih / 2
        return (ex - ix0) / iw, (ey - iy0) / ih

    def on_click(self, event):
        if self.image is None:
            return
        self.dragging = True
        self.drag_start_x = event.x
        self.drag_start_y = event.y
        self.pan_start_x = self.pan_x
        self.pan_start_y = self.pan_y
        cx, cy = self.to_img(event.x, event.y)
        if not self.detected_points:
            return
        best = None
        best_dist = float("inf")
        for i, pt in enumerate(self.detected_points):
            d = np.sqrt((pt["x"] - cx) ** 2 + (pt["y"] - cy) ** 2)
            if d < best_dist:
                best_dist = d
                best = i
        if best is not None and best_dist < 0.03:
            self.highlighted_idx = best
            pt = self.detected_points[best]
            src = "FA" if self.detection_source == "face_alignment" else "MP"
            self.hl_label.config(text=f"📍 {src}#{best}  ({pt['x']:.4f}, {pt['y']:.4f})")
            self.status_label.config(text=f"Click: {src}#{best} | Select landmark → Match")
            self.render()
        else:
            self.highlighted_idx = None
            self.hl_label.config(text="No point (click closer)")
            self.render()

    def on_drag(self, event):
        if not self.dragging:
            return
        self.pan_x = self.pan_start_x + (event.x - self.drag_start_x)
        self.pan_y = self.pan_start_y + (event.y - self.drag_start_y)
        self.render()

    def on_drag_end(self, event):
        self.dragging = False

    def on_scroll(self, event):
        if self.image is None:
            return
        f = 1.15 if (event.num == 4 or event.delta > 0) else 0.85
        nz = max(0.1, min(self.zoom * f, 10.0))
        cw = self.canvas.winfo_width()
        ch = self.canvas.winfo_height()
        mx = event.x - cw / 2
        my = event.y - ch / 2
        self.pan_x = mx - (mx - self.pan_x) * (nz / self.zoom)
        self.pan_y = my - (my - self.pan_y) * (nz / self.zoom)
        self.zoom = nz
        self.zoom_label.config(text=f"{int(self.zoom * 100)}%")
        self.render()

    # ============================================================
    # ZOOM
    # ============================================================
    def zoom_in(self):
        self.zoom = min(self.zoom * 1.3, 10.0)
        self.zoom_label.config(text=f"{int(self.zoom * 100)}%")
        self.render()

    def zoom_out(self):
        self.zoom = max(self.zoom / 1.3, 0.1)
        self.zoom_label.config(text=f"{int(self.zoom * 100)}%")
        self.render()

    def zoom_fit(self):
        if self.image is None:
            return
        cw = self.canvas.winfo_width()
        ch = self.canvas.winfo_height()
        if cw < 10 or ch < 10:
            return
        h, w = self.image.shape[:2]
        self.zoom = min(cw / w, ch / h, 1.0)
        self.pan_x = 0
        self.pan_y = 0
        self.zoom_label.config(text=f"{int(self.zoom * 100)}%")
        self.render()

    # ============================================================
    # LIST
    # ============================================================
    def refresh_list(self):
        self.listbox.delete(0, tk.END)
        st = self.search_entry.get().strip().lower()
        fm = self.filter_var.get()
        filtered = []
        for d in SIDE_LANDMARKS:
            lm_id, label, _, _ = d
            mapped = lm_id in self.mapping
            is_custom = mapped and self.mapping[lm_id].get("source") == "custom"
            if st and st not in label.lower() and st not in lm_id.lower():
                continue
            if fm == "done" and not mapped:
                continue
            if fm == "pending" and mapped:
                continue
            if fm == "custom" and not is_custom:
                continue
            filtered.append(d)
        self.listbox_items = [d[0] for d in filtered]
        for d in filtered:
            lm_id, label, _, _ = d
            mapped = lm_id in self.mapping
            is_custom = mapped and self.mapping[lm_id].get("source") == "custom"
            if mapped:
                m = self.mapping[lm_id]
                pos = f"({m['x'] * 100:.1f}%, {m['y'] * 100:.1f}%)"
                if is_custom:
                    display = f"  ✏️  {label:30s} {pos}"
                else:
                    display = f"  ✅  {label:30s} [Idx#{m.get('ptIndex', '?')}] {pos}"
            else:
                display = f"  ⏳  {label}"
            self.listbox.insert(tk.END, display)
        self.update_progress()

    def on_list_select(self, event):
        sel = self.listbox.curselection()
        if not sel:
            return
        idx = sel[0]
        if idx < len(self.listbox_items):
            self.select_landmark(self.listbox_items[idx])

    def select_landmark(self, lm_id):
        self.selected_landmark_id = lm_id
        self.update_detail()
        self.render()
        for i, ii in enumerate(self.listbox_items):
            if ii == lm_id:
                self.listbox.selection_clear(0, tk.END)
                self.listbox.selection_set(i)
                self.listbox.see(i)
                break
        self.btn_prev.config(state=tk.NORMAL)
        self.btn_next.config(state=tk.NORMAL)

    def deselect(self):
        self.selected_landmark_id = None
        self.listbox.selection_clear(0, tk.END)
        self.update_detail()
        self.render()

    def go_next(self):
        if not self.selected_landmark_id:
            for d in SIDE_LANDMARKS:
                if d[0] not in self.mapping:
                    self.select_landmark(d[0])
                    return
            if SIDE_LANDMARKS:
                self.select_landmark(SIDE_LANDMARKS[0][0])
            return
        ci = next((i for i, d in enumerate(SIDE_LANDMARKS) if d[0] == self.selected_landmark_id), -1)
        self.select_landmark(SIDE_LANDMARKS[(ci + 1) % len(SIDE_LANDMARKS)][0])

    def go_prev(self):
        if not self.selected_landmark_id:
            if SIDE_LANDMARKS:
                self.select_landmark(SIDE_LANDMARKS[-1][0])
            return
        ci = next((i for i, d in enumerate(SIDE_LANDMARKS) if d[0] == self.selected_landmark_id), -1)
        self.select_landmark(SIDE_LANDMARKS[(ci - 1) % len(SIDE_LANDMARKS)][0])

    def update_detail(self):
        if not self.selected_landmark_id:
            self.detail_title.config(text="Select a landmark")
            self.detail_desc.config(text="Click point → see index → select → Match")
            return
        dn = next((d for d in SIDE_LANDMARKS if d[0] == self.selected_landmark_id), None)
        if not dn:
            return
        self.detail_title.config(text=f"🔹 {dn[1]}")
        self.detail_desc.config(text=dn[3])

    def update_progress(self):
        done = len(self.mapping)
        self.prog_label.config(text=f"{done}/31")
        self.prog_bar["value"] = done

    # ============================================================
    # MATCHING
    # ============================================================
    def match_highlighted(self):
        if not self.selected_landmark_id:
            self.status_label.config(text="⚠️ Select landmark first")
            return
        if self.highlighted_idx is None:
            self.status_label.config(text="⚠️ Click a point first")
            return
        if self.highlighted_idx >= len(self.detected_points):
            return
        pt = self.detected_points[self.highlighted_idx]
        src = "face_alignment" if self.detection_source == "face_alignment" else "mediapipe"
        self.mapping[self.selected_landmark_id] = {"x": pt["x"], "y": pt["y"], "source": src,
                                                     "ptIndex": self.highlighted_idx}
        dn = next((d for d in SIDE_LANDMARKS if d[0] == self.selected_landmark_id), None)
        self.status_label.config(text=f"✅ {dn[1]} → Idx #{self.highlighted_idx}")
        self.refresh_list()
        self.update_detail()
        self.update_progress()
        self.render()

    def match_typed(self):
        if not self.selected_landmark_id:
            self.status_label.config(text="⚠️ Select landmark first")
            return
        try:
            idx = int(self.idx_entry.get().strip())
        except ValueError:
            return
        if idx < 0 or idx >= len(self.detected_points):
            self.status_label.config(text=f"⚠️ Invalid index (0-{len(self.detected_points) - 1})")
            return
        pt = self.detected_points[idx]
        src = "face_alignment" if self.detection_source == "face_alignment" else "mediapipe"
        self.mapping[self.selected_landmark_id] = {"x": pt["x"], "y": pt["y"], "source": src, "ptIndex": idx}
        self.highlighted_idx = idx
        self.hl_label.config(text=f"📍 Idx #{idx}  ({pt['x']:.4f}, {pt['y']:.4f})")
        dn = next((d for d in SIDE_LANDMARKS if d[0] == self.selected_landmark_id), None)
        self.status_label.config(text=f"✅ {dn[1]} → Idx #{idx}")
        self.refresh_list()
        self.update_detail()
        self.update_progress()
        self.render()

    def clear_landmark(self):
        if not self.selected_landmark_id:
            return
        if self.selected_landmark_id in self.mapping:
            del self.mapping[self.selected_landmark_id]
        dn = next((d for d in SIDE_LANDMARKS if d[0] == self.selected_landmark_id), None)
        self.status_label.config(text=f"🗑️ Cleared {dn[1]}")
        self.refresh_list()
        self.update_detail()
        self.update_progress()
        self.render()

    # ============================================================
    # AUTO-ASSIGN
    # ============================================================
    def auto_assign_all(self):
        if not self.detected_points:
            self.status_label.config(text="⚠️ Run detection first")
            return
        h = self._heuristic()
        assigned = 0
        for d in SIDE_LANDMARKS:
            lm_id = d[0]
            if lm_id in self.mapping:
                continue
            exp = h.get(lm_id, -1)
            if 0 <= exp < len(self.detected_points):
                pt = self.detected_points[exp]
                self.mapping[lm_id] = {"x": pt["x"], "y": pt["y"], "source": self.detection_source, "ptIndex": exp}
                assigned += 1
        self.status_label.config(text=f"🤖 Auto-assigned {assigned}")
        self.refresh_list()
        self.update_detail()
        self.update_progress()
        self.render()

    def _heuristic(self):
        if self.detection_source == "face_alignment":
            # 68-point (dlib/face_alignment standard ordering)
            # Jawline: 0-16, Right Eyebrow: 17-21, Left Eyebrow: 22-26,
            # Nose: 27-35, Right Eye: 36-41, Left Eye: 42-47, Mouth: 48-67
            return {
                "nose_tip": 30, "nasal_bridge_root": 27, "glabella": 21, "forehead": 19, "hairline_profile": 19,
                "top_of_head": 19, "chin_point": 8, "chin_bottom": 8, "upper_lip": 51, "lower_lip": 57,
                "mouth_corner": 48, "subnasale": 33, "rhinion": 28, "columella": 31, "supratip": 29,
                "infratip": 31, "cheekbone": 1, "tragus": 0, "porion": 0, "intertragic_notch": 0,
                "occiput": 0, "corneal_apex": 42, "eyelid_end": 45, "lower_eyelid": 46, "orbitale": 46,
                "lower_jaw_angle": 4, "upper_jaw_angle": 5, "cervical_point": 8, "neck_point": 8,
                "subalare": 31, "labiomental_fold": 8,
            }
        # MediaPipe 478
        return {
            "nose_tip": 1, "nasal_bridge_root": 6, "glabella": 8, "forehead": 10,
            "hairline_profile": 10, "top_of_head": 10, "upper_lip": 13, "lower_lip": 14,
            "subnasale": 94, "chin_point": 152, "chin_bottom": 199, "rhinion": 168,
            "neck_point": 172, "cervical_point": 172, "columella": 195, "subalare": 49,
            "cheekbone": 50, "corneal_apex": 468, "lower_eyelid": 145, "orbitale": 145,
            "eyelid_end": 33, "mouth_corner": 61, "porion": 234, "tragus": 234,
            "intertragic_notch": 234, "occiput": 234, "upper_jaw_angle": 172,
            "lower_jaw_angle": 4, "supratip": 1, "infratip": 195, "labiomental_fold": 152,
        }

    # ============================================================
    # SAVE / EXPORT / RESET
    # ============================================================
    def save_mapping(self):
        if not self.mapping:
            self.status_label.config(text="⚠️ No mappings")
            return
        path = filedialog.asksaveasfilename(title="Save Mapping", defaultextension=".json",
                                             filetypes=[("JSON", "*.json")])
        if not path:
            return
        import datetime
        data = {"type": "side", "detectionSource": self.detection_source,
                "timestamp": datetime.datetime.now().isoformat(), "totalMapped": len(self.mapping), "mapping": {}}
        for lm_id, m in self.mapping.items():
            dn = next((d for d in SIDE_LANDMARKS if d[0] == lm_id), None)
            data["mapping"][lm_id] = {"label": dn[1] if dn else lm_id, "x": m["x"], "y": m["y"],
                                      "source": m["source"], "ptIndex": m.get("ptIndex")}
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        self.status_label.config(text=f"💾 Saved {os.path.basename(path)}")

    def export_json(self):
        ed = {}
        for d in SIDE_LANDMARKS:
            lm_id = d[0]
            if lm_id in self.mapping:
                m = self.mapping[lm_id]
                ed[lm_id] = {"label": d[1], "ptIndex": m.get("ptIndex"), "source": m.get("source"),
                             "position": {"x": round(m["x"], 6), "y": round(m["y"], 6)}}
            else:
                ed[lm_id] = {"label": d[1], "ptIndex": None, "source": None, "position": None}
        win = tk.Toplevel(self.root)
        win.title("Export")
        win.geometry("600x500")
        win.configure(bg="#1a1a1a")
        tk.Label(win, text="📤 Export Landmark Mapping", bg="#1a1a1a", fg="#10b981", font=("", 13, "bold")).pack(pady=(10, 5))
        tk.Label(win, text=f"{len(self.mapping)}/31 | {self.detection_source or 'manual'}", bg="#1a1a1a",
                 fg="#888", font=("", 9)).pack()
        frm = tk.Frame(win, bg="#1a1a1a")
        frm.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        t = tk.Text(frm, bg="#0f0f13", fg="#ddd", bd=0, font=("Consolas", 10))
        t.pack(fill=tk.BOTH, expand=True)
        t.insert("1.0", json.dumps(ed, indent=2, ensure_ascii=False))
        t.config(state=tk.DISABLED)
        bfrm = tk.Frame(win, bg="#1a1a1a")
        bfrm.pack(pady=(5, 10))

        def cp():
            win.clipboard_clear()
            win.clipboard_append(json.dumps(ed, indent=2, ensure_ascii=False))
            self.status_label.config(text="📋 Copied!")

        tk.Button(bfrm, text="📋 Copy", command=cp, bg="#0a5a2a", fg="#4ade80", bd=0, padx=12, pady=6,
                  cursor="hand2").pack(side=tk.LEFT, padx=4)
        tk.Button(bfrm, text="📁 Save...", command=self.save_mapping, bg="#2a2a4e", fg="#a0a0ff", bd=0, padx=12,
                  pady=6, cursor="hand2").pack(side=tk.LEFT, padx=4)
        tk.Button(bfrm, text="Close", command=win.destroy, bg="#333", fg="#aaa", bd=0, padx=12, pady=6,
                  cursor="hand2").pack(side=tk.LEFT, padx=4)

    def reset_all(self):
        if not messagebox.askyesno("Reset", "Reset all mappings?"):
            return
        self.mapping = {}
        self.selected_landmark_id = None
        self.highlighted_idx = None
        self.hl_label.config(text="Click a point → see index")
        self.refresh_list()
        self.update_detail()
        self.update_progress()
        self.render()
        self.status_label.config(text="↺ All reset")

    # ============================================================
    # KEYBOARD
    # ============================================================
    def setup_kb(self):
        self.root.bind("<Control-o>", lambda e: self.open_image())
        self.root.bind("<Control-s>", lambda e: self.save_mapping())
        self.root.bind("<Control-d>", lambda e: self.run_detection("mediapipe"))
        self.root.bind("<Control-t>", lambda e: self.run_detection("face_alignment"))
        self.root.bind("<Up>", lambda e: self.go_prev())
        self.root.bind("<Down>", lambda e: self.go_next())
        self.root.bind("<Return>", lambda e: self.match_highlighted())
        self.root.bind("<Escape>", lambda e: self.deselect())
        self.root.bind("a", lambda e: self.auto_assign_all() if e.state == 0 else None)
        self.root.bind("c", lambda e: self.clear_landmark() if e.state == 0 else None)

    def run(self):
        self.setup_kb()
        self.root.mainloop()


if __name__ == "__main__":
    SideLabelerGUI().run()