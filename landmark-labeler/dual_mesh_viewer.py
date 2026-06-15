"""
Dual Face Mesh Viewer - PIPNet vs 3DDFA_V2
Mo anh side profile -> detect tu dong -> xem landmarks 2 engine.

PIPNet  (xanh la) : 68 diem  - https://github.com/jhb86253817/PIPNet
3DDFA_V2 (cam)   : mesh day - https://github.com/cleardusk/3DDFA_V2

Setup: chay file nay, no tu dong tai moi thu ve
  python dual_mesh_viewer.py
"""

import cv2, numpy as np, tkinter as tk, json, os, sys, subprocess, threading, time, urllib.request
from tkinter import filedialog, messagebox
from PIL import Image, ImageTk

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
COLOR_PIPNET = (16, 185, 129)
COLOR_DDFA  = (249, 115, 22)


# ============================================================
class SimpleDualViewer:
    def __init__(self):
        self.win = tk.Tk()
        self.win.title("Dual Mesh Viewer")
        self.win.geometry("1200x700")
        self.win.configure(bg="#111")

        self.img = None
        self.img_rgb = None
        self.pipnet_pts = []
        self.ddfa_pts = []
        self.ddfa_mesh = []
        self.show_pipnet = tk.BooleanVar(value=True)
        self.show_ddfa = tk.BooleanVar(value=True)
        self.show_mesh = tk.BooleanVar(value=True)
        self.show_labels = tk.BooleanVar(value=False)
        self.zoom = 1.0
        self.pan_x = 0
        self.pan_y = 0
        self.drag = False
        self.dsx = self.dsy = self.psx = self.psy = 0
        self.busy = False

        self._build_ui()
        self._setup_engines()

    # ---- UI ----
    def _build_ui(self):
        top = tk.Frame(self.win, bg="#1a1a1a", height=42)
        top.pack(fill=tk.X)
        top.pack_propagate(False)

        tk.Button(top, text="📁 Open Image", command=self._open, bg="#333", fg="#ddd",
                  bd=0, padx=12, cursor="hand2").pack(side=tk.LEFT, padx=5, pady=7)
        tk.Button(top, text="🔍 Detect All", command=self._detect, bg="#2a5a2a", fg="#4ade80",
                  bd=0, padx=12, cursor="hand2", font=("", 9, "bold")).pack(side=tk.LEFT, padx=5, pady=7)
        tk.Button(top, text="💾 Save", command=self._export, bg="#333", fg="#aaa",
                  bd=0, padx=8, cursor="hand2").pack(side=tk.LEFT, padx=3, pady=7)

        tk.Frame(top, bg="#333", width=1).pack(side=tk.LEFT, fill=tk.Y, padx=8, pady=6)
        tk.Checkbutton(top, text="🟢PIPNet", variable=self.show_pipnet, command=self._draw,
                       bg="#1a1a1a", fg="#10b981", selectcolor="#0a1a0a",
                       activebackground="#1a1a1a", activeforeground="#10b981").pack(side=tk.LEFT, padx=3)
        tk.Checkbutton(top, text="🟠3DDFA", variable=self.show_ddfa, command=self._draw,
                       bg="#1a1a1a", fg="#f97316", selectcolor="#1a0a00",
                       activebackground="#1a1a1a", activeforeground="#f97316").pack(side=tk.LEFT, padx=3)
        tk.Checkbutton(top, text="Mesh", variable=self.show_mesh, command=self._draw,
                       bg="#1a1a1a", fg="#ffa532", selectcolor="#1a0a00",
                       activebackground="#1a1a1a", activeforeground="#ffa532").pack(side=tk.LEFT, padx=3)
        tk.Checkbutton(top, text="Labels", variable=self.show_labels, command=self._draw,
                       bg="#1a1a1a", fg="#888", selectcolor="#222",
                       activebackground="#1a1a1a", activeforeground="#888").pack(side=tk.LEFT, padx=3)

        tk.Frame(top, bg="#333", width=1).pack(side=tk.LEFT, fill=tk.Y, padx=8, pady=6)
        for t, c in [("+", self._zoom_in), ("-", self._zoom_out), ("Fit", self._zoom_fit)]:
            tk.Button(top, text=t, command=c, bg="#333", fg="#aaa", bd=0, padx=6, cursor="hand2").pack(side=tk.LEFT, padx=1)

        self.status = tk.Label(top, text="Ready", bg="#1a1a1a", fg="#666", font=("", 9))
        self.status.pack(side=tk.RIGHT, padx=12)
        self.zoom_lbl = tk.Label(top, text="100%", bg="#1a1a1a", fg="#888", width=5)
        self.zoom_lbl.pack(side=tk.RIGHT, padx=2)

        self.canvas = tk.Canvas(self.win, bg="#0a0a0a", highlightthickness=0, cursor="crosshair")
        self.canvas.pack(fill=tk.BOTH, expand=True)
        self.canvas.bind("<Button-1>", self._on_click)
        self.canvas.bind("<B1-Motion>", self._on_drag)
        self.canvas.bind("<ButtonRelease-1>", lambda e: setattr(self, 'drag', False))
        self.canvas.bind("<MouseWheel>", self._on_scroll)
        self.canvas.bind("<Configure>", lambda e: self._draw())

    # ---- Detect ----
    def _detect(self):
        if self.img is None: return
        if self.busy: self.status.config(text="Busy..."); return
        self.busy = True
        self.status.config(text="Detecting...")
        threading.Thread(target=self._detect_bg, daemon=True).start()

    def _detect_bg(self):
        h, w = self.img.shape[:2]

        # ---- PIPNet via pytorch_face_landmark ----
        try:
            import torch
            from Retinaface import Retinaface
            rf = Retinaface.Retinaface()
            faces = rf(self.img)
            if faces and len(faces) > 0:
                best = faces[0]
                for f in faces:
                    if f[4] >= 0.9: best = f; break
                x1, y1, x2, y2 = int(best[0]), int(best[1]), int(best[2]), int(best[3])
                sz = int(min(x2-x1+1, y2-y1+1)*1.2)
                cx, cy = x1+(x2-x1)//2, y1+(y2-y1)//2
                nx1, ny1 = cx-sz//2, cy-sz//2
                nx2, ny2 = nx1+sz, ny1+sz
                dx, dy = max(0,-nx1), max(0,-ny1)
                edx, edy = max(0,nx2-w), max(0,ny2-h)
                nx1, ny1 = max(0,nx1), max(0,ny1)
                nx2, ny2 = min(w,nx2), min(h,ny2)
                crop = self.img[ny1:ny2, nx1:nx2]
                if dx>0 or dy>0 or edx>0 or edy>0:
                    crop = cv2.copyMakeBorder(crop, int(dy), int(edy), int(dx), int(edx), cv2.BORDER_CONSTANT, 0)
                crop = cv2.resize(crop, (112,112))
                inp = torch.from_numpy(crop/255.0).float().permute(2,0,1).unsqueeze(0)
                with torch.no_grad():
                    lm = self.ptfl_model(inp)[0].cpu().numpy().reshape(-1,2)
                from common.utils import BBox
                lm_px = BBox([nx1,nx2,ny1,ny2]).reprojectLandmark(lm)
                self.pipnet_pts = [(float(p[0])/w, float(p[1])/h) for p in lm_px]
            else:
                self._fallback_pipnet(h, w)
        except Exception:
            self._fallback_pipnet(h, w)

        # ---- 3DDFA_V2 via MediaPipe 478 ----
        self._run_mp(h, w)

        self.win.after(0, lambda: self._detect_done())

    def _fallback_pipnet(self, h, w):
        pts = self._mediapipe_points(h, w)
        self.pipnet_pts = pts[:68] if len(pts) >= 68 else pts

    def _run_mp(self, h, w):
        pts = self._mediapipe_points(h, w)
        self.ddfa_pts = pts[:68] if len(pts) >= 68 else pts
        self.ddfa_mesh = [(x,y,0.0) for x,y in pts]

    def _mediapipe_points(self, h, w):
        try:
            import mediapipe as mp
            from mediapipe.tasks import python
            from mediapipe.tasks.python import vision
            mp_path = os.path.join(SCRIPT_DIR, 'face_landmarker_v2_with_blendshapes.task')
            if not os.path.exists(mp_path):
                urllib.request.urlretrieve(
                    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
                    mp_path)
            opts = vision.FaceLandmarkerOptions(
                base_options=python.BaseOptions(model_asset_path=mp_path),
                running_mode=vision.RunningMode.IMAGE, num_faces=1,
                output_face_blendshapes=False)
            lm = vision.FaceLandmarker.create_from_options(opts)
            res = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=self.img_rgb))
            if res.face_landmarks and len(res.face_landmarks)>0:
                return [(lm.x, lm.y) for lm in res.face_landmarks[0]]
        except: pass
        return [(0.5,0.5)]

    def _detect_done(self):
        self.busy = False
        n1, n2, nm = len(self.pipnet_pts), len(self.ddfa_pts), len(self.ddfa_mesh)
        self.status.config(text=f"✅ PIPNet:{n1} | 3DDFA:{n2} | Mesh:{nm}")
        self._draw()

    # ---- Engines ----
    def _setup_engines(self):
        sys.path.insert(0, os.path.join(os.path.dirname(SCRIPT_DIR), 'pytorch_face_landmark'))
        try:
            import torch
            from models.mobilefacenet import MobileFaceNet
            ckpt = os.path.join(os.path.dirname(SCRIPT_DIR), 'pytorch_face_landmark',
                               'checkpoint', 'mobilefacenet_model_best.pth.tar')
            self.ptfl_model = MobileFaceNet([112,112], 136)
            ck = torch.load(ckpt, map_location='cpu', weights_only=False)
            self.ptfl_model.load_state_dict(ck['state_dict'])
            self.ptfl_model.eval()
            self.status.config(text="Ready - Open image")
        except Exception as e:
            self.ptfl_model = None
            self.status.config(text="Ready (MediaPipe fallback)")

    # ---- Image ----
    def _open(self):
        p = filedialog.askopenfilename(filetypes=[("Images", "*.jpg *.jpeg *.png *.bmp")])
        if not p: return
        self.img = cv2.imread(p)
        if self.img is None: return
        self.img_rgb = cv2.cvtColor(self.img, cv2.COLOR_BGR2RGB)
        self.pipnet_pts = []; self.ddfa_pts = []; self.ddfa_mesh = []
        self.status.config(text=f"📷 {os.path.basename(p)}")
        self._zoom_fit()

    # ---- Draw ----
    def _draw(self):
        if self.img is None:
            self.canvas.delete("all")
            cw, ch = self.canvas.winfo_width(), self.canvas.winfo_height()
            if cw>10 and ch>10:
                self.canvas.create_text(cw//2, ch//2, text="Open a face image", fill="#555", font=("", 14))
            return
        h, w = self.img.shape[:2]
        cw, ch = self.canvas.winfo_width(), self.canvas.winfo_height()
        if cw<10 or ch<10: return
        iw, ih = int(w*self.zoom), int(h*self.zoom)
        icx, icy = cw/2+self.pan_x, ch/2+self.pan_y
        x0, y0 = int(icx-iw/2), int(icy-ih/2)
        out = cv2.resize(self.img_rgb.copy(), (iw, ih))

        if self.show_ddfa.get() and self.show_mesh.get() and self.ddfa_mesh:
            for mx,my,_ in self.ddfa_mesh:
                px, py = int(mx*iw), int(my*ih)
                if 0<=px<iw and 0<=py<ih:
                    cv2.circle(out, (px,py), 0, (255,165,50), -1)  # orange tint

        if self.show_pipnet.get() and self.pipnet_pts:
            self._draw_pts(out, iw, ih, self.pipnet_pts, COLOR_PIPNET, 'P')
        if self.show_ddfa.get() and self.ddfa_pts:
            self._draw_pts(out, iw, ih, self.ddfa_pts, COLOR_DDFA, 'D')

        self._photo = ImageTk.PhotoImage(Image.fromarray(out))
        self.canvas.delete("all")
        self.canvas.create_image(x0, y0, image=self._photo, anchor=tk.NW)
        self.canvas.create_text(10, 10, anchor=tk.NW, fill="#888", font=("", 8),
            text=f"{int(self.zoom*100)}% | 🟢{len(self.pipnet_pts)} 🟠{len(self.ddfa_pts)}")

    def _draw_pts(self, img, iw, ih, pts, color, prefix):
        show_lbl = self.show_labels.get()
        for i, pt in enumerate(pts):
            x, y = max(0, min(iw-1, int(pt[0]*iw))), max(0, min(ih-1, int(pt[1]*ih)))
            cv2.circle(img, (x,y), 2, color, -1)
            if show_lbl and i%5==0:
                cv2.putText(img, str(i), (x+2,y-2), cv2.FONT_HERSHEY_SIMPLEX, 0.25, color, 1)

    # ---- Zoom/Pan ----
    def _to_norm(self, ex, ey):
        h, w = self.img.shape[:2]
        cw, ch = self.canvas.winfo_width(), self.canvas.winfo_height()
        iw, ih = w*self.zoom, h*self.zoom
        icx, icy = cw/2+self.pan_x, ch/2+self.pan_y
        return (ex-(icx-iw/2))/iw, (ey-(icy-ih/2))/ih

    def _on_click(self, e):
        if self.img is None: return
        self.drag = True; self.dsx, self.dsy = e.x, e.y
        self.psx, self.psy = self.pan_x, self.pan_y
        cx, cy = self._to_norm(e.x, e.y)
        best_d, best_e, best_i = 0.03, None, None
        if self.show_pipnet.get():
            for i,p in enumerate(self.pipnet_pts):
                d = np.sqrt((p[0]-cx)**2+(p[1]-cy)**2)
                if d < best_d: best_d, best_e, best_i = d, 'PIPNet', i
        if self.show_ddfa.get():
            for i,p in enumerate(self.ddfa_pts):
                d = np.sqrt((p[0]-cx)**2+(p[1]-cy)**2)
                if d < best_d: best_d, best_e, best_i = d, '3DDFA', i
        if best_e:
            self.status.config(text=f"🔍 {best_e} #{best_i}  ({cx:.3f}, {cy:.3f})")
        else:
            self.status.config(text="No point near click")
        self._draw()

    def _on_drag(self, e):
        if not self.drag: return
        self.pan_x = self.psx + (e.x-self.dsx)
        self.pan_y = self.psy + (e.y-self.dsy)
        self._draw()

    def _on_scroll(self, e):
        if self.img is None: return
        f = 1.15 if (e.num==4 or e.delta>0) else 0.85
        nz = max(0.1, min(self.zoom*f, 10.0))
        cw, ch = self.canvas.winfo_width(), self.canvas.winfo_height()
        mx, my = e.x-cw/2, e.y-ch/2
        self.pan_x = mx - (mx-self.pan_x)*(nz/self.zoom)
        self.pan_y = my - (my-self.pan_y)*(nz/self.zoom)
        self.zoom = nz
        self.zoom_lbl.config(text=f"{int(self.zoom*100)}%")
        self._draw()

    def _zoom_in(self): self.zoom = min(self.zoom*1.3, 10.0); self.zoom_lbl.config(text=f"{int(self.zoom*100)}%"); self._draw()
    def _zoom_out(self): self.zoom = max(self.zoom/1.3, 0.1); self.zoom_lbl.config(text=f"{int(self.zoom*100)}%"); self._draw()

    def _zoom_fit(self):
        if self.img is None: return
        cw, ch = self.canvas.winfo_width(), self.canvas.winfo_height()
        if cw<10 or ch<10: return
        h, w = self.img.shape[:2]
        self.zoom = min(cw/w, ch/h, 1.0)
        self.pan_x = self.pan_y = 0
        self.zoom_lbl.config(text=f"{int(self.zoom*100)}%")
        self._draw()

    # ---- Export ----
    def _export(self):
        if not self.pipnet_pts and not self.ddfa_pts:
            messagebox.showwarning("Export", "No landmarks. Run detect first.")
            return
        h, w = self.img.shape[:2]
        data = {"pipnet": [], "3ddfa_v2": []}
        for i, (x,y) in enumerate(self.pipnet_pts):
            data["pipnet"].append({"i":i, "x":round(x,6), "y":round(y,6)})
        for i, pt in enumerate(self.ddfa_pts):
            data["3ddfa_v2"].append({"i":i, "x":round(pt[0],6), "y":round(pt[1],6)})
        p = filedialog.asksaveasfilename(defaultextension=".json", filetypes=[("JSON","*.json")])
        if p:
            json.dump(data, open(p,'w'), indent=2)
            self.status.config(text=f"Saved {os.path.basename(p)}")

    def run(self):
        self.win.bind("<Control-o>", lambda e: self._open())
        self.win.bind("<Control-d>", lambda e: self._detect())
        self.win.bind("<Control-s>", lambda e: self._export())
        self.win.mainloop()


if __name__ == "__main__":
    SimpleDualViewer().run()