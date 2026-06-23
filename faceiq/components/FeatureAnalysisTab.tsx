"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkles, AlertCircle, EyeOff, RefreshCw, Award,
  TrendingUp, TrendingDown, CheckCircle2, Plus, Minus,
  Maximize2, Search, Info, X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeatureItem {
  name: string;
  display_name: string;
  score: number;
  value: number;
  region: string;
  landmark_center: { x: number; y: number };
}

interface FeatureAnalysisData {
  overall_score: number;
  features: FeatureItem[];
}

// ─── Color helpers (match Harmony tab exactly) ────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-amber-400";
  return "text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 8) return "bg-emerald-500/20 border-emerald-500/30";
  if (score >= 6) return "bg-amber-500/20 border-amber-500/30";
  return "bg-red-500/20 border-red-500/30";
}

function getScoreRing(score: number): string {
  if (score >= 8) return "stroke-emerald-400";
  if (score >= 6) return "stroke-amber-400";
  return "stroke-red-400";
}

function normScore(s: number): number { return s / 10; }

// ─── Score Gauge ─────────────────────────────────────────────────────────────

function ScoreGauge({ score, label, size = "md" }: { score: number; label: string; size?: "sm" | "md" | "lg" }) {
  const radius = size === "lg" ? 54 : size === "md" ? 42 : 30;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score / 10, 1);
  const strokeDashoffset = circumference * (1 - progress);
  const strokeWidth = size === "lg" ? 6 : size === "md" ? 5 : 4;
  const svgSize = (radius + strokeWidth) * 2 + 4;

  return (
    <div className="relative flex flex-col items-center gap-1">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="transform -rotate-90 absolute inset-0">
          <circle cx={radius + strokeWidth + 2} cy={radius + strokeWidth + 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
          <circle cx={radius + strokeWidth + 2} cy={radius + strokeWidth + 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={getScoreRing(score)} style={{ transition: "stroke-dashoffset 1.5s ease-in-out" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${size === "lg" ? "text-3xl" : size === "md" ? "text-2xl" : "text-lg"} ${getScoreColor(score)}`}>{score.toFixed(1)}</span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

// ─── Feature Card ────────────────────────────────────────────────────────────

function FeatureCard({ feature, isSelected, onClick, onHover }: { feature: FeatureItem; isSelected: boolean; onClick: () => void; onHover: () => void }) {
  const s = normScore(feature.score);
  const scoreColor = getScoreColor(s);
  const scoreBg = getScoreBg(s);
  return (
    <button onClick={onClick} onMouseEnter={onHover}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-500 ease-out group relative overflow-hidden ${
        isSelected ? "bg-primary/15 border-primary/60 shadow-[0_0_20px_rgba(var(--primary)/0.3)] scale-[1.02] z-10"
                  : "bg-card/50 border-border/50 hover:bg-card/80 hover:border-primary/30 hover:shadow-[0_0_15px_rgba(var(--primary)/0.15)] hover:scale-[1.01]"}`}>
      <div className={`absolute inset-0 rounded-lg transition-opacity duration-500 ease-out ${isSelected ? "opacity-100 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent animate-pulse" : "opacity-0 group-hover:opacity-100 bg-gradient-to-r from-primary/3 via-transparent to-transparent"}`} />
      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full transition-all duration-500 ease-out ${isSelected ? "h-full bg-primary shadow-[0_0_8px_var(--primary)]" : "h-0 bg-primary/50 group-hover:h-3/4"}`} />
      <div className="flex items-center justify-between gap-2 relative z-[1]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-semibold truncate transition-colors duration-300 ${isSelected ? "text-primary drop-shadow-[0_0_4px_rgba(var(--primary)/0.5)]" : "text-foreground group-hover:text-primary/90"}`}>{feature.display_name}</span>
            {s >= 8 && <CheckCircle2 className={`size-3 shrink-0 transition-all duration-300 ${isSelected ? "text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]" : "text-emerald-400"}`} />}
          </div>
          <div className="flex items-center gap-2 mt-0.5"><span className="text-[10px] text-muted-foreground">{feature.region}</span><span className="text-[10px] text-muted-foreground">•</span><span className="text-[10px] text-muted-foreground">Delta: {feature.value >= 0 ? "+" : ""}{feature.value.toFixed(4)}</span></div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right"><div className={`text-sm font-bold transition-all duration-300 ${scoreColor} ${isSelected ? "drop-shadow-[0_0_6px_currentColor]" : ""}`}>{s.toFixed(1)}</div><div className="text-[9px] text-muted-foreground">/10</div></div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-500 ease-out ${scoreBg} ${isSelected ? "shadow-[0_0_12px_currentColor] scale-110" : "group-hover:shadow-[0_0_6px_currentColor] group-hover:scale-105"}`}><span className={`text-xs font-bold transition-all duration-300 ${scoreColor} ${isSelected ? "drop-shadow-[0_0_4px_currentColor]" : ""}`}>{s.toFixed(1)}</span></div>
        </div>
      </div>
    </button>
  );
}

// ─── Feature Detail ──────────────────────────────────────────────────────────

function FeatureDetail({ feature }: { feature: FeatureItem }) {
  const s = normScore(feature.score);
  const scoreColor = getScoreColor(s);
  const scoreBg = getScoreBg(s);
  const Icon = s >= 8 ? CheckCircle2 : TrendingDown;
  const iconColor = s >= 8 ? "text-emerald-400" : s >= 6 ? "text-amber-400" : "text-red-400";
  const label = s >= 8 ? "Strong feature" : s >= 6 ? "Moderate feature" : "Needs improvement";
  return (
    <div className="space-y-3 animate-fadeInUp">
      <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground">{feature.display_name}</h3><div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${scoreBg}`}>Score: <span className={scoreColor}>{s.toFixed(1)}</span>/10</div></div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card/50 rounded-lg p-2.5 border border-border/30"><div className="text-[10px] text-muted-foreground mb-0.5">Delta Value</div><div className={`text-lg font-bold ${scoreColor}`}>{feature.value >= 0 ? "+" : ""}{feature.value.toFixed(4)}</div></div>
        <div className="bg-card/50 rounded-lg p-2.5 border border-border/30"><div className="text-[10px] text-muted-foreground mb-0.5">Region</div><div className="text-lg font-bold text-foreground">{feature.region}</div></div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card/30 rounded-lg p-2.5 border border-border/30"><Icon className={`size-4 ${iconColor}`} /><span>{label}</span></div>
      <p className="text-xs text-muted-foreground/80 leading-relaxed">Delta measures how much this feature contributes to attractiveness.</p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface Props {
  imageBase64: string | null;
  isFemaleAccent?: boolean;
}

export default function FeatureAnalysisTab({ imageBase64, isFemaleAccent = false }: Props) {
  const [data, setData] = useState<FeatureAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<FeatureItem | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<FeatureItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Auto-zoom animation states (exact Harmony copy)
  const animZoomRef = useRef<number | null>(null);
  const [animZoom, setAnimZoom] = useState(1);
  const [animPanX, setAnimPanX] = useState(0);
  const [animPanY, setAnimPanY] = useState(0);
  const [animAlpha, setAnimAlpha] = useState(0);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const runAnalysis = useCallback(async () => {
    if (!imageBase64) { setError("No image available."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/feature-analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64 }) });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || "Analysis failed");
      if (result.success && result.data) setData(result.data);
      else throw new Error("Unexpected response");
    } catch (err: any) { setError(err.message || "Failed to analyze features."); }
    finally { setLoading(false); }
  }, [imageBase64]);

  useEffect(() => { if (imageBase64) runAnalysis(); }, [imageBase64, runAnalysis]);

  // Load image
  useEffect(() => {
    if (!imageBase64) return;
    const img = new window.Image();
    img.onload = () => { imgRef.current = img; setImgLoaded(true); };
    img.src = imageBase64;
    return () => { img.onload = null; };
  }, [imageBase64]);

  // Auto-zoom animation: when feature hovered/selected (EXACT Harmony copy)
  const activeFeature = selectedFeature || hoveredFeature;

  useEffect(() => {
    if (!activeFeature) {
      const st = Date.now(); const dur = 1200;
      const initZ = animZoom, initPX = animPanX, initPY = animPanY;
      const animate = () => {
        const t = Math.min((Date.now() - st) / dur, 1);
        const e = 1 - Math.pow(1 - t, 3);
        setAnimZoom(initZ + (1 - initZ) * e);
        setAnimPanX(initPX + (0 - initPX) * e);
        setAnimPanY(initPY + (0 - initPY) * e);
        setAnimAlpha(1 - e);
        if (t < 1) animZoomRef.current = requestAnimationFrame(animate);
      };
      animZoomRef.current = requestAnimationFrame(animate);
      return () => { if (animZoomRef.current) cancelAnimationFrame(animZoomRef.current); };
    }
    const c = activeFeature.landmark_center;
    const cw = containerRef.current?.clientWidth || 800;
    const ch = containerRef.current?.clientHeight || 600;
    const tpx = -(c.x - 0.5) * cw;
    const tpy = -(c.y - 0.5) * ch;
    const tz = 1.4;
    const st = Date.now(); const dur = 1200;
    const initZ = animZoom, initPX = animPanX, initPY = animPanY;
    const animate = () => {
      const t = Math.min((Date.now() - st) / dur, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setAnimZoom(initZ + (tz - initZ) * e);
      setAnimPanX(initPX + (tpx - initPX) * e);
      setAnimPanY(initPY + (tpy - initPY) * e);
      setAnimAlpha(e);
      if (t < 1) animZoomRef.current = requestAnimationFrame(animate);
    };
    animZoomRef.current = requestAnimationFrame(animate);
    return () => { if (animZoomRef.current) cancelAnimationFrame(animZoomRef.current); };
  }, [selectedFeature?.name, hoveredFeature?.name]);

  const effectiveZoom = activeFeature ? animZoom : zoomLevel;
  const effectivePan = activeFeature ? { x: animPanX, y: animPanY } : panOffset;

  // Draw canvas (EXACT Harmony pattern: dependency on animZoom/animPanX/animPanY/animAlpha)
  useEffect(() => {
    if (!imgLoaded || !canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const container = containerRef.current;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    if (containerW <= 0 || containerH <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerW * dpr;
    canvas.height = containerH * dpr;
    canvas.style.width = `${containerW}px`;
    canvas.style.height = `${containerH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const img = imgRef.current!;
    const imgAspect = img.width / img.height;
    const containerAspect = containerW / containerH;
    let dw: number, dh: number, dx: number, dy: number;
    if (imgAspect > containerAspect) { dw = containerW; dh = containerW / imgAspect; dx = 0; dy = (containerH - dh) / 2; }
    else { dh = containerH; dw = containerH * imgAspect; dx = (containerW - dw) / 2; dy = 0; }

    const cx = containerW / 2;
    const cy = containerH / 2;

    ctx.clearRect(0, 0, containerW, containerH);
    ctx.save();
    ctx.translate(cx + effectivePan.x, cy + effectivePan.y);
    ctx.scale(effectiveZoom, effectiveZoom);
    ctx.translate(-(dx + dw / 2), -(dy + dh / 2));
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();

  }, [imgLoaded, effectiveZoom, effectivePan, hoveredFeature, selectedFeature]);

  const features = data?.features || [];
  const filtered = features.filter(f => f.display_name.toLowerCase().includes(searchQuery.toLowerCase()) || f.region.toLowerCase().includes(searchQuery.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => sortOrder === "desc" ? normScore(b.score) - normScore(a.score) : normScore(a.score) - normScore(b.score));
  const overall10 = data ? normScore(data.overall_score) : 0;
  const strong = features.filter(f => normScore(f.score) >= 8);
  const weak = features.filter(f => normScore(f.score) < 6);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-24 h-24"><div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 opacity-20 animate-pulse blur-xl" /><div className="absolute inset-2 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" /><Sparkles className="absolute inset-0 m-auto w-8 h-8 text-white/50 animate-pulse" /></div>
          <p className="text-lg font-semibold text-white">Analyzing Features</p><p className="text-sm text-white/40">Extracting facial regions & computing scores...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-4 max-w-md"><div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center"><AlertCircle className="w-8 h-8 text-red-400" /></div><p className="text-lg font-semibold text-white">Analysis Failed</p><p className="text-sm text-white/40 mt-1">{error}</p><button onClick={runAnalysis} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.08] hover:border-white/[0.15] text-white/70 hover:text-white text-sm font-medium transition-all duration-300"><RefreshCw className="w-4 h-4" />Retry</button></div>
      </div>
    );
  }
  if (!imageBase64) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-4 max-w-md"><div className="w-16 h-16 mx-auto rounded-full bg-white/5 border border-white/[0.06] flex items-center justify-center"><EyeOff className="w-8 h-8 text-white/20" /></div><p className="text-lg font-semibold text-white/60">No Image Available</p><p className="text-sm text-white/30 mt-1">Upload a front profile photo to analyze facial features.</p></div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* ─── LEFT: Feature List ─── */}
          <div className="lg:col-span-3 space-y-3">
            <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" /><input type="text" placeholder="Search features..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-9 pl-8 pr-8 rounded-lg bg-card border border-border/50 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50" />{searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="size-3" /></button>}</div>
            <div className="flex items-center gap-0.5 bg-card border border-border/50 rounded-lg p-0.5">
              <span className="flex-1 px-2 py-1 rounded text-[10px] font-medium text-center bg-primary/10 text-primary">Features ({features.length})</span>
              <div className="w-px h-4 bg-border/50 mx-0.5" />
              <div className="relative group/sort">
                <button className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all"><span>{sortOrder === "desc" ? "▼" : "▲"}</span><span className="hidden sm:inline">{sortOrder === "desc" ? "Highest" : "Lowest"}</span></button>
                <div className="absolute right-0 top-full mt-0.5 w-36 bg-card border border-border/60 rounded-lg shadow-xl opacity-0 invisible group-hover/sort:opacity-100 group-hover/sort:visible transition-all duration-200 z-50 overflow-hidden">
                  <button onClick={() => setSortOrder("desc")} className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] transition-all ${sortOrder === "desc" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"}`}><TrendingDown className={`size-3 ${sortOrder === "desc" ? "text-emerald-400" : ""}`} />Highest First</button>
                  <button onClick={() => setSortOrder("asc")} className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] transition-all ${sortOrder === "asc" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"}`}><TrendingUp className={`size-3 ${sortOrder === "asc" ? "text-amber-400" : ""}`} />Lowest First</button>
                </div>
              </div>
            </div>
            <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
              {sorted.length === 0 ? <div className="text-center py-8 text-xs text-muted-foreground">No features found</div> : sorted.map(f => (
                <FeatureCard key={f.name} feature={f} isSelected={selectedFeature?.name === f.name} onClick={() => setSelectedFeature(selectedFeature?.name === f.name ? null : f)} onHover={() => setHoveredFeature(f)} />
              ))}
            </div>
          </div>

          {/* ─── CENTER: Image Canvas ─── */}
          <div className="lg:col-span-6 flex flex-col gap-3">
            <div className="relative bg-card/30 border border-border/50 rounded-xl overflow-hidden shadow-lg">
              <div className="absolute top-2 left-2 z-10">
                <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg p-1 shadow-lg flex items-center gap-0.5">
                  <button onClick={() => setZoomLevel(z => Math.min(z + 0.25, 4))} className="p-1 hover:bg-secondary/50 rounded transition-colors"><Plus className="size-3.5 text-foreground" /></button>
                  <button onClick={() => setZoomLevel(z => Math.max(z - 0.25, 0.5))} className="p-1 hover:bg-secondary/50 rounded transition-colors"><Minus className="size-3.5 text-foreground" /></button>
                  <button onClick={() => { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }} className="p-1 hover:bg-secondary/50 rounded transition-colors"><Maximize2 className="size-3.5 text-foreground" /></button>
                  <div className="w-px h-4 bg-border/50 mx-0.5" />
                  <span className="text-[10px] font-bold text-foreground px-1 min-w-[36px] text-center">{Math.round(effectiveZoom * 100)}%</span>
                </div>
              </div>
              <div ref={containerRef} className="w-full" style={{ height: "calc(100vh - 200px)", minHeight: "400px" }}>
                <canvas ref={canvasRef} className="w-full h-full" style={{ display: imgLoaded ? "block" : "none" }} />
                {!imgLoaded && <div className="absolute inset-0 flex items-center justify-center"><div className="flex flex-col items-center gap-2"><div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /><span className="text-xs text-muted-foreground">Loading image...</span></div></div>}
              </div>
              <div className="px-3 py-1.5 border-t border-border/50 bg-card/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><span>Front Profile</span><span>•</span><span>{features.length} features</span><span>•</span><span>Zoom: {Math.round(effectiveZoom * 100)}%</span></div>
                <div className="flex items-center gap-2">{selectedFeature && <button onClick={() => setSelectedFeature(null)} className="text-[10px] text-primary hover:text-primary/80 transition-colors">Clear selection</button>}</div>
              </div>
            </div>
            {selectedFeature && <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-lg animate-fadeInUp"><FeatureDetail feature={selectedFeature} /></div>}
          </div>

          {/* ─── RIGHT: Score Overview + Insights ─── */}
          <div className="lg:col-span-3 space-y-3">
            <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-lg">
              <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5"><Award className="size-3.5 text-primary" />Score Overview</h3>
              <div className="flex items-center justify-center"><ScoreGauge score={overall10} label="Overall" size="lg" /></div>
              <div className="mt-3 flex justify-center gap-2">
                {strong.length > 0 && <span className="px-2 py-0.5 text-[10px] rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">{strong.length} Strong</span>}
                {weak.length > 0 && <span className="px-2 py-0.5 text-[10px] rounded-full border border-red-500/20 bg-red-500/10 text-red-400">{weak.length} Weak</span>}
              </div>
            </div>
            <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-lg">
              <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5"><Sparkles className="size-3.5 text-primary" />Insights</h3>
              {strong.length > 0 && <div className="mb-3"><div className="text-[10px] text-emerald-400 font-medium mb-1.5 flex items-center gap-1"><TrendingUp className="size-3" />Top Features</div><div className="space-y-1">{strong.slice(0, 3).map((f, i) => (<div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><div className="size-1.5 rounded-full bg-emerald-400 shrink-0" />{f.display_name} ({normScore(f.score).toFixed(1)})</div>))}</div></div>}
              {weak.length > 0 && <div><div className="text-[10px] text-red-400 font-medium mb-1.5 flex items-center gap-1"><TrendingDown className="size-3" />Areas to Improve</div><div className="space-y-1">{weak.slice(0, 3).map((f, i) => (<div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><div className="size-1.5 rounded-full bg-red-400 shrink-0" />{f.display_name} ({normScore(f.score).toFixed(1)})</div>))}</div></div>}
            </div>
            <div className="bg-card/50 border border-border/50 rounded-xl p-3 shadow-lg">
              <h3 className="text-[10px] font-semibold text-foreground mb-2 flex items-center gap-1.5"><Info className="size-3 text-primary" />Legend</h3>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><div className="size-3 rounded-full bg-emerald-500/30 border border-emerald-500/50" /><span>Score ≥ 8.0 (Strong)</span></div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><div className="size-3 rounded-full bg-amber-500/30 border border-amber-500/50" /><span>Score 6.0 – 7.9 (Moderate)</span></div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><div className="size-3 rounded-full bg-red-500/30 border border-red-500/50" /><span>Score {'<'} 6.0 (Weak)</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}