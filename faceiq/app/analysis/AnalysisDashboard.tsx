"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import {
  RotateCcw, ZoomIn, ZoomOut, Maximize2, Grid3x3, Eye, EyeOff,
  TrendingUp, TrendingDown, CheckCircle2, Info, Search, X,
  ChevronLeft, ChevronRight, Sparkles, Star, Award, Target,
  Ruler, Activity, BarChart3, PieChart, Sliders, Layers,
  ArrowUp, ArrowDown, Minus, Plus, Crosshair, ScanLine,
  GripVertical, Move, Maximize, Minimize, Download, Share2,
  Brain,
  Cpu
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { calculateAnalysis } from "@/lib/analysis/calculator"
import type { AnalysisResults, MeasurementResult, LandmarkPoint } from "@/lib/analysis/types"
import { FRONT_MEASUREMENTS_META, SIDE_MEASUREMENTS_META } from "@/lib/analysis/idealValues"
import AIBeautyTab from "@/components/AIBeautyTab"

// ============================================================
// Types
// ============================================================

interface AnalysisDashboardProps {
  initialGender: "male" | "female"
  initialEthnicity: string
}

type ProfileView = "front" | "side" | "ai"

// ============================================================
// Color helpers
// ============================================================

function getScoreColor(score: number): string {
  if (score >= 8) return "text-emerald-400"
  if (score >= 6) return "text-amber-400"
  return "text-red-400"
}

function getScoreBg(score: number): string {
  if (score >= 8) return "bg-emerald-500/20 border-emerald-500/30"
  if (score >= 6) return "bg-amber-500/20 border-amber-500/30"
  return "bg-red-500/20 border-red-500/30"
}

function getScoreRing(score: number): string {
  if (score >= 8) return "stroke-emerald-400"
  if (score >= 6) return "stroke-amber-400"
  return "stroke-red-400"
}

function getScoreGradient(score: number): string {
  if (score >= 8) return "from-emerald-500 to-green-400"
  if (score >= 6) return "from-amber-500 to-yellow-400"
  return "from-red-500 to-rose-400"
}

// ============================================================
// Score Gauge Component
// ============================================================

function ScoreGauge({ score, label, size = "md" }: { score: number; label: string; size?: "sm" | "md" | "lg" }) {
  const radius = size === "lg" ? 54 : size === "md" ? 42 : 30
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(score / 10, 1)
  const strokeDashoffset = circumference * (1 - progress)
  const strokeWidth = size === "lg" ? 6 : size === "md" ? 5 : 4
  const svgSize = (radius + strokeWidth) * 2 + 4

  return (
    <div className="relative flex flex-col items-center gap-1">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="transform -rotate-90 absolute inset-0">
          <circle
            cx={radius + strokeWidth + 2}
            cy={radius + strokeWidth + 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={radius + strokeWidth + 2}
            cy={radius + strokeWidth + 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={getScoreRing(score)}
            style={{ transition: "stroke-dashoffset 1.5s ease-in-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${size === "lg" ? "text-3xl" : size === "md" ? "text-2xl" : "text-lg"} ${getScoreColor(score)}`}>
            {score.toFixed(1)}
          </span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </div>
  )
}

// ============================================================
// Measurement Card Component
// ============================================================

function MeasurementCard({
  measurement,
  isSelected,
  onClick,
}: {
  measurement: MeasurementResult
  isSelected: boolean
  onClick: () => void
}) {
  const scoreColor = getScoreColor(measurement.score)
  const scoreBg = getScoreBg(measurement.score)

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-200 group ${
        isSelected
          ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/5"
          : "bg-card/50 border-border/50 hover:bg-card/80 hover:border-border/70"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground truncate">{measurement.name}</span>
            {measurement.isIdeal && (
              <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{measurement.category}</span>
            <span className="text-[10px] text-muted-foreground">•</span>
            <span className="text-[10px] text-muted-foreground">
              Ideal: {measurement.idealRange[0]}–{measurement.idealRange[1]} {measurement.unit}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className={`text-sm font-bold ${scoreColor}`}>{measurement.value.toFixed(1)}</div>
            <div className="text-[9px] text-muted-foreground">{measurement.unit}</div>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${scoreBg}`}>
            <span className={`text-xs font-bold ${scoreColor}`}>{measurement.score.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

// ============================================================
// Measurement Detail Panel
// ============================================================

function MeasurementDetail({ measurement }: { measurement: MeasurementResult | null }) {
  if (!measurement) return null

  const scoreColor = getScoreColor(measurement.score)
  const deviationIcon = measurement.deviation === "ideal"
    ? <CheckCircle2 className="size-4 text-emerald-400" />
    : measurement.deviation === "low"
    ? <TrendingDown className="size-4 text-amber-400" />
    : <TrendingUp className="size-4 text-red-400" />

  const deviationLabel = measurement.deviation === "ideal"
    ? "Within ideal range"
    : measurement.deviation === "low"
    ? "Below ideal range"
    : "Above ideal range"

  return (
    <div className="space-y-3 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{measurement.name}</h3>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${getScoreBg(measurement.score)}`}>
          Score: <span className={scoreColor}>{measurement.score.toFixed(1)}</span>/10
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card/50 rounded-lg p-2.5 border border-border/30">
          <div className="text-[10px] text-muted-foreground mb-0.5">Your Value</div>
          <div className={`text-lg font-bold ${scoreColor}`}>
            {measurement.value.toFixed(1)}
            <span className="text-xs text-muted-foreground ml-1">{measurement.unit}</span>
          </div>
        </div>
        <div className="bg-card/50 rounded-lg p-2.5 border border-border/30">
          <div className="text-[10px] text-muted-foreground mb-0.5">Ideal Range</div>
          <div className="text-lg font-bold text-foreground">
            {measurement.idealRange[0]} – {measurement.idealRange[1]}
            <span className="text-xs text-muted-foreground ml-1">{measurement.unit}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card/30 rounded-lg p-2.5 border border-border/30">
        {deviationIcon}
        <span>{deviationLabel}</span>
      </div>

      <p className="text-xs text-muted-foreground/80 leading-relaxed">{measurement.interpretation}</p>
    </div>
  )
}

// ============================================================
// Canvas Drawing Helpers - clean white styling
// ============================================================

function drawMeasurementLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string, alpha: number, label?: string
) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()

  // Draw arrow heads
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 8
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - headLen * Math.cos(angle - 0.4), y2 - headLen * Math.sin(angle - 0.4))
  ctx.lineTo(x2 - headLen * Math.cos(angle + 0.4), y2 - headLen * Math.sin(angle + 0.4))
  ctx.closePath()
  ctx.fill()

  if (label) {
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    ctx.font = "bold 10px sans-serif"
    ctx.fillStyle = color
    ctx.textAlign = "center"
    ctx.textBaseline = "bottom"
    ctx.fillText(label, mx, my - 4)
  }
  ctx.restore()
}

// Unified clean white color: primary = pure white, secondary = white at 45% opacity
const WHITE = "rgba(255,255,255,0.92)"
const WHITE_DIM = "rgba(255,255,255,0.45)"

function drawMeasurement(
  ctx: CanvasRenderingContext2D,
  measurementId: string,
  lm: Record<string, LandmarkPoint>,
  dx: number, dy: number,
  dw: number, dh: number,
  alpha: number
) {
  const L = (...ids: string[]) => {
    for (const id of ids) {
      if (lm[id]) return lm[id]
    }
    return null
  }

  switch (measurementId) {
    case "lateral_canthal_tilt": {
      const m = L("left_medial_canthus", "left_pupil"), l = L("left_lateral_canthus")
      if (m && l) drawMeasurementLine(ctx, m.x + dx, m.y + dy, l.x + dx, l.y + dy, WHITE, alpha, "LCT")
      break
    }
    case "nose_bridge_to_width": {
      const lb = L("left_nose_bridge"), rb = L("right_nose_bridge"), ln = L("left_nose_side"), rn = L("right_nose_side")
      if (lb && rb) drawMeasurementLine(ctx, lb.x + dx, lb.y + dy, rb.x + dx, rb.y + dy, WHITE, alpha, "Bridge")
      if (ln && rn) drawMeasurementLine(ctx, ln.x + dx, ln.y + dy, rn.x + dx, rn.y + dy, WHITE_DIM, alpha * 0.5, "Width")
      break
    }
    case "bitemporal_width": {
      const lt = L("left_temple"), rt = L("right_temple"), lc = L("left_cheekbone"), rc = L("right_cheekbone")
      if (lt && rt) drawMeasurementLine(ctx, lt.x + dx, lt.y + dy, rt.x + dx, rt.y + dy, WHITE, alpha, "Bitemp")
      if (lc && rc) drawMeasurementLine(ctx, lc.x + dx, lc.y + dy, rc.x + dx, rc.y + dy, WHITE_DIM, alpha * 0.5, "Bizyg")
      break
    }
    case "neck_width": {
      const lnk = L("left_neck_point"), rnk = L("right_neck_point")
      if (lnk && rnk) drawMeasurementLine(ctx, lnk.x + dx, lnk.y + dy, rnk.x + dx, rnk.y + dy, WHITE_DIM, alpha, "Neck")
      break
    }
    case "ear_protrusion_angle": {
      const le = L("left_outer_ear"), lc = L("left_cheekbone")
      if (le && lc) drawMeasurementLine(ctx, lc.x + dx, lc.y + dy, le.x + dx, le.y + dy, WHITE, alpha, "Ear")
      break
    }
    case "cheekbone_height": {
      const h = L("hairline"), cb = L("chin_bottom"), lc = L("left_cheekbone")
      if (h && cb && lc) {
        drawMeasurementLine(ctx, h.x + dx, h.y + dy, cb.x + dx, cb.y + dy, "rgba(255,255,255,0.25)", alpha * 0.3, "Face H")
        drawMeasurementLine(ctx, h.x + dx, h.y + dy, lc.x + dx, lc.y + dy, WHITE, alpha, "Cheek H")
      }
      break
    }
    case "cupids_bow_depth": {
      const c = L("cupids_bow"), ic = L("inner_cupids_bow")
      if (c && ic) drawMeasurementLine(ctx, c.x + dx, c.y + dy, ic.x + dx, ic.y + dy, WHITE, alpha, "Cupid")
      break
    }
    case "bigonial_width": {
      const llj = L("left_lower_jaw_angle"), rlj = L("right_lower_jaw_angle")
      if (llj && rlj) drawMeasurementLine(ctx, llj.x + dx, llj.y + dy, rlj.x + dx, rlj.y + dy, WHITE, alpha, "Bigonial")
      break
    }
    case "jaw_slope": {
      const llj = L("left_lower_jaw_angle"), lc = L("left_chin")
      if (llj && lc) drawMeasurementLine(ctx, llj.x + dx, llj.y + dy, lc.x + dx, lc.y + dy, WHITE, alpha, "Jaw")
      break
    }
    case "ear_protrusion_ratio": {
      const le = L("left_outer_ear"), re = L("right_outer_ear")
      if (le && re) drawMeasurementLine(ctx, le.x + dx, le.y + dy, re.x + dx, re.y + dy, WHITE_DIM, alpha, "Ear W")
      break
    }
    case "middle_third": {
      const ue = L("left_upper_eyelid"), nb = L("nose_bottom"), h = L("hairline"), cb = L("chin_bottom")
      if (ue && nb && h && cb) {
        drawMeasurementLine(ctx, ue.x + dx, ue.y + dy, nb.x + dx, nb.y + dy, WHITE, alpha, "Mid 3rd")
      }
      break
    }
    case "eye_aspect_ratio": {
      const ue = L("left_upper_eyelid"), le = L("left_lower_eyelid"), mm = L("left_medial_canthus", "left_pupil"), ll = L("left_lateral_canthus")
      if (ue && le) drawMeasurementLine(ctx, ue.x + dx, ue.y + dy, le.x + dx, le.y + dy, WHITE, alpha, "Eye H")
      if (mm && ll) drawMeasurementLine(ctx, mm.x + dx, mm.y + dy, ll.x + dx, ll.y + dy, WHITE_DIM, alpha * 0.5, "Eye W")
      break
    }
    case "mouth_corner_position": {
      const lm = L("left_mouth_corner"), rm = L("right_mouth_corner"), h = L("hairline"), cb = L("chin_bottom")
      if (lm && rm && h && cb) {
        const my = (lm.y + rm.y) / 2
        drawMeasurementLine(ctx, h.x + dx, h.y + dy, h.x + dx, my + dy, WHITE, alpha, "Mouth")
      }
      break
    }
    case "eye_separation_ratio": {
      const mm = L("left_medial_canthus", "left_pupil"), rm = L("right_medial_canthus", "right_pupil")
      if (mm && rm) drawMeasurementLine(ctx, mm.x + dx, mm.y + dy, rm.x + dx, rm.y + dy, WHITE, alpha, "ICD")
      break
    }
    case "eyebrow_tilt": {
      const bh = L("left_brow_head"), bt = L("left_brow_tail")
      if (bh && bt) drawMeasurementLine(ctx, bh.x + dx, bh.y + dy, bt.x + dx, bt.y + dy, WHITE, alpha, "Brow")
      break
    }
    case "lower_third": {
      const nb = L("nose_bottom"), cb = L("chin_bottom")
      if (nb && cb) drawMeasurementLine(ctx, nb.x + dx, nb.y + dy, cb.x + dx, cb.y + dy, WHITE, alpha, "Low 3rd")
      break
    }
    case "face_width_to_height": {
      const lc = L("left_cheekbone"), rc = L("right_cheekbone"), bh = L("left_brow_head"), mm = L("mouth_middle")
      if (lc && rc) drawMeasurementLine(ctx, lc.x + dx, lc.y + dy, rc.x + dx, rc.y + dy, WHITE, alpha, "FW")
      if (bh && mm) drawMeasurementLine(ctx, bh.x + dx, bh.y + dy, mm.x + dx, mm.y + dy, WHITE_DIM, alpha * 0.5, "FH")
      break
    }
    case "interpupillary_mouth_width": {
      const lp = L("left_pupil"), rp = L("right_pupil"), lm = L("left_mouth_corner"), rm = L("right_mouth_corner")
      if (lp && rp) drawMeasurementLine(ctx, lp.x + dx, lp.y + dy, rp.x + dx, rp.y + dy, WHITE, alpha, "IPD")
      if (lm && rm) drawMeasurementLine(ctx, lm.x + dx, lm.y + dy, rm.x + dx, rm.y + dy, WHITE_DIM, alpha * 0.5, "MW")
      break
    }
    case "jaw_frontal_angle": {
      const llj = L("left_lower_jaw_angle"), lc = L("left_chin"), rlj = L("right_lower_jaw_angle")
      if (llj && lc && rlj) {
        drawMeasurementLine(ctx, llj.x + dx, llj.y + dy, lc.x + dx, lc.y + dy, WHITE, alpha, "JFA")
        drawMeasurementLine(ctx, lc.x + dx, lc.y + dy, rlj.x + dx, rlj.y + dy, WHITE_DIM, alpha * 0.5)
      }
      break
    }
    case "intercanthal_nasal_width": {
      const mm = L("left_medial_canthus", "left_pupil"), rm = L("right_medial_canthus", "right_pupil"), ln = L("left_nose_side"), rn = L("right_nose_side")
      if (mm && rm) drawMeasurementLine(ctx, mm.x + dx, mm.y + dy, rm.x + dx, rm.y + dy, WHITE, alpha, "ICD")
      if (ln && rn) drawMeasurementLine(ctx, ln.x + dx, ln.y + dy, rn.x + dx, rn.y + dy, WHITE_DIM, alpha * 0.5, "NW")
      break
    }
    case "top_third": {
      const h = L("hairline"), ue = L("left_upper_eyelid")
      if (h && ue) drawMeasurementLine(ctx, h.x + dx, h.y + dy, ue.x + dx, ue.y + dy, WHITE, alpha, "Top 3rd")
      break
    }
    case "one_eye_apart": {
      const lp = L("left_pupil"), rp = L("right_pupil"), mm = L("left_medial_canthus", "left_pupil"), ll = L("left_lateral_canthus")
      if (lp && rp) drawMeasurementLine(ctx, lp.x + dx, lp.y + dy, rp.x + dx, rp.y + dy, WHITE, alpha, "IPD")
      if (mm && ll) drawMeasurementLine(ctx, mm.x + dx, mm.y + dy, ll.x + dx, ll.y + dy, WHITE_DIM, alpha * 0.5, "1 Eye")
      break
    }
    case "midface_ratio": {
      const mm = L("left_medial_canthus", "left_pupil"), rm = L("right_medial_canthus", "right_pupil"), m = L("mouth_middle")
      if (mm && rm && m) {
        drawMeasurementLine(ctx, mm.x + dx, mm.y + dy, rm.x + dx, rm.y + dy, WHITE, alpha, "MFW")
        drawMeasurementLine(ctx, mm.x + dx, mm.y + dy, m.x + dx, m.y + dy, WHITE_DIM, alpha * 0.5, "MFH")
      }
      break
    }
    case "ipsilateral_alar_angle": {
      const ln = L("left_nose_side"), nb = L("nose_bottom"), rn = L("right_nose_side")
      if (ln && nb && rn) {
        drawMeasurementLine(ctx, ln.x + dx, ln.y + dy, nb.x + dx, nb.y + dy, WHITE, alpha, "IAA")
        drawMeasurementLine(ctx, nb.x + dx, nb.y + dy, rn.x + dx, rn.y + dy, WHITE_DIM, alpha * 0.5)
      }
      break
    }
    case "mouth_width_to_nose_width": {
      const lm = L("left_mouth_corner"), rm = L("right_mouth_corner"), ln = L("left_nose_side"), rn = L("right_nose_side")
      if (lm && rm) drawMeasurementLine(ctx, lm.x + dx, lm.y + dy, rm.x + dx, rm.y + dy, WHITE, alpha, "MW")
      if (ln && rn) drawMeasurementLine(ctx, ln.x + dx, ln.y + dy, rn.x + dx, rn.y + dy, WHITE_DIM, alpha * 0.5, "NW")
      break
    }
    case "total_facial_width_to_height": {
      const lc = L("left_cheekbone"), rc = L("right_cheekbone"), h = L("hairline"), cb = L("chin_bottom")
      if (lc && rc) drawMeasurementLine(ctx, lc.x + dx, lc.y + dy, rc.x + dx, rc.y + dy, WHITE, alpha, "TFW")
      if (h && cb) drawMeasurementLine(ctx, h.x + dx, h.y + dy, cb.x + dx, cb.y + dy, WHITE_DIM, alpha * 0.5, "TFH")
      break
    }
    case "chin_to_philtrum": {
      const m = L("mouth_middle"), cb = L("chin_bottom"), nb = L("nose_bottom")
      if (m && cb) drawMeasurementLine(ctx, m.x + dx, m.y + dy, cb.x + dx, cb.y + dy, WHITE, alpha, "Chin")
      if (nb && m) drawMeasurementLine(ctx, nb.x + dx, nb.y + dy, m.x + dx, m.y + dy, WHITE_DIM, alpha * 0.5, "Phil")
      break
    }
    case "eyebrow_low_setedness": {
      const ue = L("left_upper_eyelid"), ba = L("left_brow_arch", "left_brow_peak")
      if (ue && ba) drawMeasurementLine(ctx, ue.x + dx, ue.y + dy, ba.x + dx, ba.y + dy, WHITE, alpha, "Brow-Eye")
      break
    }
    case "brow_length_to_face_width": {
      const bh = L("left_brow_head"), bt = L("left_brow_tail")
      if (bh && bt) drawMeasurementLine(ctx, bh.x + dx, bh.y + dy, bt.x + dx, bt.y + dy, WHITE, alpha, "BL")
      break
    }
    case "nose_tip_position": {
      const nb = L("nose_bottom"), h = L("hairline"), cb = L("chin_bottom")
      if (nb && h && cb) drawMeasurementLine(ctx, h.x + dx, h.y + dy, nb.x + dx, nb.y + dy, WHITE, alpha, "Nose Pos")
      break
    }
    case "deviation_iaa_jfa": {
      const ln = L("left_nose_side"), nb = L("nose_bottom"), rn = L("right_nose_side"), llj = L("left_lower_jaw_angle"), lc = L("left_chin"), rlj = L("right_lower_jaw_angle")
      if (ln && nb && rn) {
        drawMeasurementLine(ctx, ln.x + dx, ln.y + dy, nb.x + dx, nb.y + dy, WHITE_DIM, alpha * 0.5)
        drawMeasurementLine(ctx, nb.x + dx, nb.y + dy, rn.x + dx, rn.y + dy, WHITE_DIM, alpha * 0.5)
      }
      if (llj && lc && rlj) {
        drawMeasurementLine(ctx, llj.x + dx, llj.y + dy, lc.x + dx, lc.y + dy, WHITE_DIM, alpha * 0.5)
        drawMeasurementLine(ctx, lc.x + dx, lc.y + dy, rlj.x + dx, rlj.y + dy, WHITE_DIM, alpha * 0.5)
      }
      break
    }
    case "lower_lip_to_upper_lip": {
      const llc = L("lower_lip_center"), mm = L("mouth_middle"), ul = L("upper_lip")
      if (llc && mm) drawMeasurementLine(ctx, llc.x + dx, llc.y + dy, mm.x + dx, mm.y + dy, WHITE, alpha, "LL")
      if (ul && mm) drawMeasurementLine(ctx, ul.x + dx, ul.y + dy, mm.x + dx, mm.y + dy, WHITE_DIM, alpha * 0.5, "UL")
      break
    }
    case "lower_third_proportion": {
      const nb = L("nose_bottom"), cb = L("chin_bottom")
      if (nb && cb) drawMeasurementLine(ctx, nb.x + dx, nb.y + dy, cb.x + dx, cb.y + dy, WHITE, alpha, "Low 3rd")
      break
    }
    case "nasal_tip_angle": {
      const r = L("rhinion"), nt = L("nose_tip"), c = L("columella")
      if (r && nt && c) {
        drawMeasurementLine(ctx, r.x + dx, r.y + dy, nt.x + dx, nt.y + dy, WHITE, alpha, "NTA")
        drawMeasurementLine(ctx, nt.x + dx, nt.y + dy, c.x + dx, c.y + dy, WHITE_DIM, alpha * 0.5)
      }
      break
    }
    case "nasal_width_to_height": {
      const s = L("subnasale"), nt = L("nose_tip"), nbr = L("nasal_bridge_root")
      if (s && nt) drawMeasurementLine(ctx, s.x + dx, s.y + dy, nt.x + dx, nt.y + dy, WHITE, alpha, "Proj")
      if (nbr && s) drawMeasurementLine(ctx, nbr.x + dx, nbr.y + dy, s.x + dx, s.y + dy, WHITE_DIM, alpha * 0.5, "Height")
      break
    }
    case "upper_lip_s_line": {
      const ul = L("upper_lip"), nt = L("nose_tip"), cp = L("chin_point")
      if (ul && nt && cp) {
        drawMeasurementLine(ctx, nt.x + dx, nt.y + dy, cp.x + dx, cp.y + dy, WHITE, alpha, "S-Line")
        const nx = nt.x, ny = nt.y, cx = cp.x, cy = cp.y
        const t = ((ul.x - nx) * (cx - nx) + (ul.y - ny) * (cy - ny)) / ((cx - nx) ** 2 + (cy - ny) ** 2)
        const px = nx + t * (cx - nx), py = ny + t * (cy - ny)
        drawMeasurementLine(ctx, ul.x + dx, ul.y + dy, px + dx, py + dy, WHITE_DIM, alpha * 0.5, "UL")
      }
      break
    }
    case "nasal_projection": {
      const s = L("subnasale"), nt = L("nose_tip")
      if (s && nt) drawMeasurementLine(ctx, s.x + dx, s.y + dy, nt.x + dx, nt.y + dy, WHITE, alpha, "Proj")
      break
    }
    case "nasofrontal_angle": {
      const g = L("glabella"), nbr = L("nasal_bridge_root"), nt = L("nose_tip")
      if (g && nbr && nt) {
        drawMeasurementLine(ctx, g.x + dx, g.y + dy, nbr.x + dx, nbr.y + dy, WHITE, alpha, "NFA")
        drawMeasurementLine(ctx, nbr.x + dx, nbr.y + dy, nt.x + dx, nt.y + dy, WHITE_DIM, alpha * 0.5)
      }
      break
    }
    case "recession_frankfort": {
      const p = L("porion"), o = L("orbitale"), s = L("subnasale")
      if (p && o && s) {
        drawMeasurementLine(ctx, p.x + dx, p.y + dy, o.x + dx, o.y + dy, WHITE, alpha, "Frankfort")
        const t = ((s.x - p.x) * (o.x - p.x) + (s.y - p.y) * (o.y - p.y)) / ((o.x - p.x) ** 2 + (o.y - p.y) ** 2)
        const px = p.x + t * (o.x - p.x), py = p.y + t * (o.y - p.y)
        drawMeasurementLine(ctx, s.x + dx, s.y + dy, px + dx, py + dy, WHITE_DIM, alpha * 0.5, "Rec")
      }
      break
    }
    case "holdaway_h_line": {
      const cp = L("chin_point"), ul = L("upper_lip"), g = L("glabella")
      if (cp && ul && g) {
        drawMeasurementLine(ctx, cp.x + dx, cp.y + dy, ul.x + dx, ul.y + dy, WHITE, alpha, "H-Line")
        drawMeasurementLine(ctx, ul.x + dx, ul.y + dy, g.x + dx, g.y + dy, WHITE_DIM, alpha * 0.5)
      }
      break
    }
    case "mentolabial_angle": {
      const ll = L("lower_lip"), lf = L("labiomental_fold"), cp = L("chin_point")
      if (ll && lf && cp) {
        drawMeasurementLine(ctx, ll.x + dx, ll.y + dy, lf.x + dx, lf.y + dy, WHITE, alpha, "MLA")
        drawMeasurementLine(ctx, lf.x + dx, lf.y + dy, cp.x + dx, cp.y + dy, WHITE_DIM, alpha * 0.5)
      }
      break
    }
    case "upper_forehead_slope": {
      const hp = L("hairline_profile"), f = L("forehead")
      if (hp && f) drawMeasurementLine(ctx, hp.x + dx, hp.y + dy, f.x + dx, f.y + dy, WHITE, alpha, "Forehead")
      break
    }
    case "facial_convexity_nasion": {
      const g = L("glabella"), nbr = L("nasal_bridge_root"), cp = L("chin_point")
      if (g && nbr && cp) {
        drawMeasurementLine(ctx, g.x + dx, g.y + dy, nbr.x + dx, nbr.y + dy, WHITE, alpha, "FCN")
        drawMeasurementLine(ctx, nbr.x + dx, nbr.y + dy, cp.x + dx, cp.y + dy, WHITE_DIM, alpha * 0.5)
      }
      break
    }
    case "anterior_facial_depth": {
      const lj = L("lower_jaw_angle"), cp = L("chin_point")
      if (lj && cp) drawMeasurementLine(ctx, lj.x + dx, lj.y + dy, cp.x + dx, cp.y + dy, WHITE, alpha, "AFD")
      break
    }
    case "upper_lip_e_line": {
      const ul = L("upper_lip"), nt = L("nose_tip"), cp = L("chin_point")
      if (ul && nt && cp) {
        drawMeasurementLine(ctx, nt.x + dx, nt.y + dy, cp.x + dx, cp.y + dy, WHITE, alpha, "E-Line")
        const nx = nt.x, ny = nt.y, cx = cp.x, cy = cp.y
        const t = ((ul.x - nx) * (cx - nx) + (ul.y - ny) * (cy - ny)) / ((cx - nx) ** 2 + (cy - ny) ** 2)
        const px = nx + t * (cx - nx), py = ny + t * (cy - ny)
        drawMeasurementLine(ctx, ul.x + dx, ul.y + dy, px + dx, py + dy, WHITE_DIM, alpha * 0.5, "UL")
      }
      break
    }
    case "submental_cervical_angle": {
      const cbs = L("chin_bottom"), cv = L("cervical_point"), np = L("neck_point")
      if (cbs && cv && np) {
        drawMeasurementLine(ctx, cbs.x + dx, cbs.y + dy, cv.x + dx, cv.y + dy, WHITE_DIM, alpha, "SCA")
        drawMeasurementLine(ctx, cv.x + dx, cv.y + dy, np.x + dx, np.y + dy, WHITE_DIM, alpha * 0.5)
      }
      break
    }
    case "facial_depth_to_height": {
      const lj = L("lower_jaw_angle"), cp = L("chin_point"), nbr = L("nasal_bridge_root"), cbs = L("chin_bottom")
      if (lj && cp) drawMeasurementLine(ctx, lj.x + dx, lj.y + dy, cp.x + dx, cp.y + dy, WHITE, alpha, "Depth")
      if (nbr && cbs) drawMeasurementLine(ctx, nbr.x + dx, nbr.y + dy, cbs.x + dx, cbs.y + dy, WHITE_DIM, alpha * 0.5, "Height")
      break
    }
    case "browridge_inclination": {
      const f = L("forehead"), g = L("glabella")
      if (f && g) drawMeasurementLine(ctx, f.x + dx, f.y + dy, g.x + dx, g.y + dy, WHITE, alpha, "Browridge")
      break
    }
    case "total_facial_convexity": {
      const g = L("glabella"), nt = L("nose_tip"), cp = L("chin_point")
      if (g && nt && cp) {
        drawMeasurementLine(ctx, g.x + dx, g.y + dy, nt.x + dx, nt.y + dy, WHITE, alpha, "TFC")
        drawMeasurementLine(ctx, nt.x + dx, nt.y + dy, cp.x + dx, cp.y + dy, WHITE_DIM, alpha * 0.5)
      }
      break
    }
    case "facial_convexity_glabella": {
      const th = L("top_of_head"), g = L("glabella"), cp = L("chin_point")
      if (th && g && cp) {
        drawMeasurementLine(ctx, th.x + dx, th.y + dy, g.x + dx, g.y + dy, WHITE, alpha, "FCG")
        drawMeasurementLine(ctx, g.x + dx, g.y + dy, cp.x + dx, cp.y + dy, WHITE_DIM, alpha * 0.5)
      }
      break
    }
    case "orbital_vector": {
      const ca = L("corneal_apex"), cs = L("cheekbone")
      if (ca && cs) drawMeasurementLine(ctx, cs.x + dx, cs.y + dy, ca.x + dx, ca.y + dy, WHITE, alpha, "OV")
      break
    }
    case "interior_midface_projection": {
      const s = L("subnasale"), cs = L("cheekbone")
      if (s && cs) drawMeasurementLine(ctx, s.x + dx, s.y + dy, cs.x + dx, cs.y + dy, WHITE, alpha, "IMP")
      break
    }
    case "lower_lip_s_line": {
      const ll = L("lower_lip"), nt = L("nose_tip"), cp = L("chin_point")
      if (ll && nt && cp) {
        drawMeasurementLine(ctx, nt.x + dx, nt.y + dy, cp.x + dx, cp.y + dy, WHITE, alpha, "S-Line")
        const nx = nt.x, ny = nt.y, cx = cp.x, cy = cp.y
        const t = ((ll.x - nx) * (cx - nx) + (ll.y - ny) * (cy - ny)) / ((cx - nx) ** 2 + (cy - ny) ** 2)
        const px = nx + t * (cx - nx), py = ny + t * (cy - ny)
        drawMeasurementLine(ctx, ll.x + dx, ll.y + dy, px + dx, py + dy, WHITE_DIM, alpha * 0.5, "LL")
      }
      break
    }
    case "lower_lip_e_line": {
      const ll = L("lower_lip"), nt = L("nose_tip"), cp = L("chin_point")
      if (ll && nt && cp) {
        drawMeasurementLine(ctx, nt.x + dx, nt.y + dy, cp.x + dx, cp.y + dy, WHITE, alpha, "E-Line")
        const nx = nt.x, ny = nt.y, cx = cp.x, cy = cp.y
        const t = ((ll.x - nx) * (cx - nx) + (ll.y - ny) * (cy - ny)) / ((cx - nx) ** 2 + (cy - ny) ** 2)
        const px = nx + t * (cx - nx), py = ny + t * (cy - ny)
        drawMeasurementLine(ctx, ll.x + dx, ll.y + dy, px + dx, py + dy, WHITE_DIM, alpha * 0.5, "LL")
      }
      break
    }
    case "nasal_bridge_angle": {
      const nbr = L("nasal_bridge_root"), r = L("rhinion")
      if (nbr && r) drawMeasurementLine(ctx, nbr.x + dx, nbr.y + dy, r.x + dx, r.y + dy, WHITE, alpha, "NBA")
      break
    }
    case "nasal_tip_rotation": {
      const c = L("columella"), nt = L("nose_tip"), s = L("subnasale")
      if (c && nt && s) {
        drawMeasurementLine(ctx, c.x + dx, c.y + dy, nt.x + dx, nt.y + dy, WHITE, alpha, "NTR")
        drawMeasurementLine(ctx, nt.x + dx, nt.y + dy, s.x + dx, s.y + dy, WHITE_DIM, alpha * 0.5)
      }
      break
    }
    case "lower_lip_to_chin": {
      const ll = L("lower_lip"), lf = L("labiomental_fold"), cp = L("chin_point")
      if (ll && lf) drawMeasurementLine(ctx, ll.x + dx, ll.y + dy, lf.x + dx, lf.y + dy, WHITE, alpha, "LL-Chin")
      if (lf && cp) drawMeasurementLine(ctx, lf.x + dx, lf.y + dy, cp.x + dx, cp.y + dy, WHITE_DIM, alpha * 0.5)
      break
    }
    case "nasal_depth_to_height": {
      const nbr = L("nasal_bridge_root"), nt = L("nose_tip"), s = L("subnasale")
      if (nbr && nt) drawMeasurementLine(ctx, nbr.x + dx, nbr.y + dy, nt.x + dx, nt.y + dy, WHITE, alpha, "Depth")
      if (nbr && s) drawMeasurementLine(ctx, nbr.x + dx, nbr.y + dy, s.x + dx, s.y + dy, WHITE_DIM, alpha * 0.5, "Height")
      break
    }
    case "upper_lip_to_lower_lip": {
      const ul = L("upper_lip"), ll = L("lower_lip")
      if (ul && ll) drawMeasurementLine(ctx, ul.x + dx, ul.y + dy, ll.x + dx, ll.y + dy, WHITE, alpha, "UL-LL")
      break
    }
    case "chin_angle": {
      const lf = L("labiomental_fold"), cp = L("chin_point"), cbs = L("chin_bottom")
      if (lf && cp && cbs) {
        drawMeasurementLine(ctx, lf.x + dx, lf.y + dy, cp.x + dx, cp.y + dy, WHITE, alpha, "CA")
        drawMeasurementLine(ctx, cp.x + dx, cp.y + dy, cbs.x + dx, cbs.y + dy, WHITE_DIM, alpha * 0.5)
      }
      break
    }
    case "nasal_dorsum_angle": {
      const nbr = L("nasal_bridge_root"), r = L("rhinion"), nt = L("nose_tip")
      if (nbr && r && nt) {
        drawMeasurementLine(ctx, nbr.x + dx, nbr.y + dy, r.x + dx, r.y + dy, WHITE, alpha, "NDA")
        drawMeasurementLine(ctx, r.x + dx, r.y + dy, nt.x + dx, nt.y + dy, WHITE_DIM, alpha * 0.5)
      }
      break
    }
    case "upper_lip_angle": {
      const ul = L("upper_lip"), s = L("subnasale"), ll = L("lower_lip")
      if (ul && s && ll) {
        drawMeasurementLine(ctx, ul.x + dx, ul.y + dy, s.x + dx, s.y + dy, WHITE, alpha, "ULA")
        drawMeasurementLine(ctx, s.x + dx, s.y + dy, ll.x + dx, ll.y + dy, WHITE_DIM, alpha * 0.5)
      }
      break
    }
    case "lower_lip_angle": {
      const s = L("subnasale"), ll = L("lower_lip"), lf = L("labiomental_fold")
      if (s && ll && lf) {
        drawMeasurementLine(ctx, s.x + dx, s.y + dy, ll.x + dx, ll.y + dy, WHITE, alpha, "LLA")
        drawMeasurementLine(ctx, ll.x + dx, ll.y + dy, lf.x + dx, lf.y + dy, WHITE_DIM, alpha * 0.5)
      }
      break
    }
    case "nasal_base_angle": {
      const s = L("subnasale"), nt = L("nose_tip"), c = L("columella")
      if (s && nt && c) {
        drawMeasurementLine(ctx, s.x + dx, s.y + dy, nt.x + dx, nt.y + dy, WHITE, alpha, "NBA")
        drawMeasurementLine(ctx, nt.x + dx, nt.y + dy, c.x + dx, c.y + dy, WHITE_DIM, alpha * 0.5)
      }
      break
    }
    case "facial_taper_angle": {
      const lj = L("lower_jaw_angle"), cp = L("chin_point"), np = L("neck_point")
      if (lj && cp && np) {
        drawMeasurementLine(ctx, lj.x + dx, lj.y + dy, cp.x + dx, cp.y + dy, WHITE, alpha, "FTA")
        drawMeasurementLine(ctx, cp.x + dx, cp.y + dy, np.x + dx, np.y + dy, WHITE_DIM, alpha * 0.5)
      }
      break
    }
  }
}

// ============================================================
// Sample Landmarks (fallback when no landmarks in localStorage)
// ============================================================

function getSampleFrontLandmarks(): LandmarkPoint[] {
  return [
    { id: "hairline", x: 0.5, y: 0.05, label: "Hairline", group: "head" },
    { id: "left_pupil", x: 0.35, y: 0.32, label: "L Pupil", group: "eyes" },
    { id: "left_medial_canthus", x: 0.30, y: 0.32, label: "L Medial", group: "eyes" },
    { id: "left_lateral_canthus", x: 0.40, y: 0.32, label: "L Lateral", group: "eyes" },
    { id: "left_upper_eyelid", x: 0.35, y: 0.30, label: "L Upper", group: "eyes" },
    { id: "left_lower_eyelid", x: 0.35, y: 0.34, label: "L Lower", group: "eyes" },
    { id: "right_pupil", x: 0.65, y: 0.32, label: "R Pupil", group: "eyes" },
    { id: "right_medial_canthus", x: 0.70, y: 0.32, label: "R Medial", group: "eyes" },
    { id: "right_lateral_canthus", x: 0.60, y: 0.32, label: "R Lateral", group: "eyes" },
    { id: "right_upper_eyelid", x: 0.65, y: 0.30, label: "R Upper", group: "eyes" },
    { id: "right_lower_eyelid", x: 0.65, y: 0.34, label: "R Lower", group: "eyes" },
    { id: "left_brow_head", x: 0.28, y: 0.26, label: "L Brow Head", group: "brows" },
    { id: "left_brow_arch", x: 0.35, y: 0.24, label: "L Brow Arch", group: "brows" },
    { id: "left_brow_peak", x: 0.38, y: 0.24, label: "L Brow Peak", group: "brows" },
    { id: "left_brow_tail", x: 0.42, y: 0.26, label: "L Brow Tail", group: "brows" },
    { id: "right_brow_head", x: 0.72, y: 0.26, label: "R Brow Head", group: "brows" },
    { id: "right_brow_arch", x: 0.65, y: 0.24, label: "R Brow Arch", group: "brows" },
    { id: "right_brow_peak", x: 0.62, y: 0.24, label: "R Brow Peak", group: "brows" },
    { id: "right_brow_tail", x: 0.58, y: 0.26, label: "R Brow Tail", group: "brows" },
    { id: "left_nose_side", x: 0.44, y: 0.48, label: "L Nose", group: "nose" },
    { id: "right_nose_side", x: 0.56, y: 0.48, label: "R Nose", group: "nose" },
    { id: "left_nose_bridge", x: 0.47, y: 0.38, label: "L Bridge", group: "nose" },
    { id: "right_nose_bridge", x: 0.53, y: 0.38, label: "R Bridge", group: "nose" },
    { id: "nasal_base", x: 0.5, y: 0.44, label: "Nasal Base", group: "nose" },
    { id: "nose_bottom", x: 0.5, y: 0.52, label: "Nose Bottom", group: "nose" },
    { id: "left_mouth_corner", x: 0.38, y: 0.60, label: "L Mouth", group: "mouth" },
    { id: "right_mouth_corner", x: 0.62, y: 0.60, label: "R Mouth", group: "mouth" },
    { id: "cupids_bow", x: 0.5, y: 0.58, label: "Cupid's Bow", group: "mouth" },
    { id: "inner_cupids_bow", x: 0.5, y: 0.59, label: "Inner Cupid", group: "mouth" },
    { id: "mouth_middle", x: 0.5, y: 0.61, label: "Mouth Mid", group: "mouth" },
    { id: "lower_lip_center", x: 0.5, y: 0.63, label: "Lower Lip", group: "mouth" },
    { id: "left_upper_jaw_angle", x: 0.20, y: 0.55, label: "L Upper Jaw", group: "jaw" },
    { id: "right_upper_jaw_angle", x: 0.80, y: 0.55, label: "R Upper Jaw", group: "jaw" },
    { id: "left_lower_jaw_angle", x: 0.22, y: 0.70, label: "L Lower Jaw", group: "jaw" },
    { id: "right_lower_jaw_angle", x: 0.78, y: 0.70, label: "R Lower Jaw", group: "jaw" },
    { id: "left_chin", x: 0.42, y: 0.82, label: "L Chin", group: "jaw" },
    { id: "right_chin", x: 0.58, y: 0.82, label: "R Chin", group: "jaw" },
    { id: "chin_bottom", x: 0.5, y: 0.88, label: "Chin Bottom", group: "jaw" },
    { id: "left_cheekbone", x: 0.18, y: 0.42, label: "L Cheek", group: "cheeks" },
    { id: "right_cheekbone", x: 0.82, y: 0.42, label: "R Cheek", group: "cheeks" },
    { id: "left_temple", x: 0.12, y: 0.28, label: "L Temple", group: "head" },
    { id: "right_temple", x: 0.88, y: 0.28, label: "R Temple", group: "head" },
  ]
}

function getSampleSideLandmarks(): LandmarkPoint[] {
  return [
    { id: "top_of_head", x: 0.5, y: 0.02, label: "Top", group: "head" },
    { id: "occiput", x: 0.85, y: 0.30, label: "Occiput", group: "head" },
    { id: "hairline_profile", x: 0.45, y: 0.08, label: "Hairline", group: "head" },
    { id: "forehead", x: 0.40, y: 0.18, label: "Forehead", group: "head" },
    { id: "glabella", x: 0.38, y: 0.25, label: "Glabella", group: "head" },
    { id: "nasal_bridge_root", x: 0.35, y: 0.32, label: "Nasion", group: "nose" },
    { id: "rhinion", x: 0.28, y: 0.40, label: "Rhinion", group: "nose" },
    { id: "supratip", x: 0.22, y: 0.46, label: "Supratip", group: "nose" },
    { id: "nose_tip", x: 0.18, y: 0.50, label: "Nose Tip", group: "nose" },
    { id: "infratip", x: 0.20, y: 0.52, label: "Infratip", group: "nose" },
    { id: "columella", x: 0.25, y: 0.53, label: "Columella", group: "nose" },
    { id: "subnasale", x: 0.30, y: 0.54, label: "Subnasale", group: "nose" },
    { id: "subalare", x: 0.28, y: 0.52, label: "Subalare", group: "nose" },
    { id: "upper_lip", x: 0.32, y: 0.58, label: "Upper Lip", group: "lips" },
    { id: "mouth_corner", x: 0.35, y: 0.60, label: "Mouth", group: "lips" },
    { id: "lower_lip", x: 0.33, y: 0.62, label: "Lower Lip", group: "lips" },
    { id: "labiomental_fold", x: 0.38, y: 0.68, label: "Labiomental", group: "chin" },
    { id: "chin_point", x: 0.35, y: 0.78, label: "Chin", group: "chin" },
    { id: "chin_bottom", x: 0.40, y: 0.85, label: "Chin Bottom", group: "chin" },
    { id: "upper_jaw_angle", x: 0.55, y: 0.55, label: "Upper Jaw", group: "jaw" },
    { id: "lower_jaw_angle", x: 0.60, y: 0.72, label: "Lower Jaw", group: "jaw" },
    { id: "porion", x: 0.70, y: 0.30, label: "Porion", group: "head" },
    { id: "tragus", x: 0.72, y: 0.35, label: "Tragus", group: "ears" },
    { id: "intertragic_notch", x: 0.74, y: 0.38, label: "Intertragic", group: "ears" },
    { id: "orbitale", x: 0.45, y: 0.30, label: "Orbitale", group: "eyes" },
    { id: "corneal_apex", x: 0.42, y: 0.32, label: "Cornea", group: "eyes" },
    { id: "eyelid_end", x: 0.44, y: 0.33, label: "Eyelid End", group: "eyes" },
    { id: "lower_eyelid", x: 0.44, y: 0.34, label: "Lower Lid", group: "eyes" },
    { id: "cheekbone", x: 0.55, y: 0.42, label: "Cheekbone", group: "cheeks" },
    { id: "cervical_point", x: 0.65, y: 0.88, label: "Cervical", group: "neck" },
    { id: "neck_point", x: 0.55, y: 0.95, label: "Neck", group: "neck" },
  ]
}

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================

export function AnalysisDashboard({ initialGender, initialEthnicity }: AnalysisDashboardProps) {

  const searchParams = useSearchParams()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [results, setResults] = useState<AnalysisResults | null>(null)
  const [frontLandmarks, setFrontLandmarks] = useState<LandmarkPoint[]>([])
  const [sideLandmarks, setSideLandmarks] = useState<LandmarkPoint[]>([])
  const [frontImageUrl, setFrontImageUrl] = useState("")
  const [sideImageUrl, setSideImageUrl] = useState("")
  const [profileView, setProfileView] = useState<ProfileView>("front")
  const [selectedMeasurement, setSelectedMeasurement] = useState<MeasurementResult | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [showLandmarks, setShowLandmarks] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "front" | "side">("all")

  const imgRef = useRef<HTMLImageElement | null>(null)
  const loadedImagesRef = useRef<Set<string>>(new Set())

  const isFemaleAccent = initialGender === "female"

  // Load data
  useEffect(() => {
    const frontImg = localStorage.getItem("frontProfileImage")
    const sideImg = localStorage.getItem("sideProfileImage")
    const frontLm = localStorage.getItem("frontLandmarks")
    const sideLm = localStorage.getItem("sideLandmarks")

    setFrontImageUrl(frontImg || "/hero-samples/sample-1.jpg")
    setSideImageUrl(sideImg || "/hero-samples/sample-3.jpg")

    if (frontLm) {
      setFrontLandmarks(JSON.parse(frontLm))
    } else {
      const sample = getSampleFrontLandmarks()
      setFrontLandmarks(sample)
      localStorage.setItem("frontLandmarks", JSON.stringify(sample))
    }
    if (sideLm) {
      setSideLandmarks(JSON.parse(sideLm))
    } else {
      const sample = getSampleSideLandmarks()
      setSideLandmarks(sample)
      localStorage.setItem("sideLandmarks", JSON.stringify(sample))
    }
  }, [])

  useEffect(() => {
    if (frontLandmarks.length > 0 || sideLandmarks.length > 0) {
      const analysis = calculateAnalysis(frontLandmarks, sideLandmarks, initialGender, initialEthnicity as any)
      setResults(analysis)
    }
  }, [frontLandmarks, sideLandmarks, initialGender, initialEthnicity])

  const currentImage = profileView === "front" ? frontImageUrl : sideImageUrl
  const currentLandmarks = profileView === "front" ? frontLandmarks : sideLandmarks
  const currentMeasurements = profileView === "front"
    ? (results?.frontMeasurements || [])
    : (results?.sideMeasurements || [])

  const allMeasurements = [...(results?.frontMeasurements || []), ...(results?.sideMeasurements || [])]
  const tabMeasurements = activeTab === "all" ? allMeasurements : activeTab === "front" ? (results?.frontMeasurements || []) : (results?.sideMeasurements || [])
  const filteredMeasurements = tabMeasurements.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const drawCanvas = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const container = containerRef.current
    if (!container) return

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    canvas.width = containerWidth
    canvas.height = containerHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const imgAspectRatio = img.width / img.height
    const canvasAspectRatio = canvas.width / canvas.height
    let drawWidth, drawHeight, drawX, drawY
    if (imgAspectRatio > canvasAspectRatio) {
      drawWidth = canvas.width; drawHeight = drawWidth / imgAspectRatio; drawX = 0; drawY = (canvas.height - drawHeight) / 2
    } else {
      drawHeight = canvas.height; drawWidth = drawHeight * imgAspectRatio; drawX = (canvas.width - drawWidth) / 2; drawY = 0
    }

    ctx.save()
    const zoomCenterX = canvas.width / 2
    const zoomCenterY = canvas.height / 2
    ctx.translate(zoomCenterX + panOffset.x, zoomCenterY + panOffset.y)
    ctx.scale(zoomLevel, zoomLevel)
    ctx.translate(-zoomCenterX, -zoomCenterY)
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

    const lmMap: Record<string, LandmarkPoint> = {}
    currentLandmarks.forEach(lm => { lmMap[lm.id] = { ...lm, x: lm.x * drawWidth, y: lm.y * drawHeight } })

    // Draw landmarks if enabled
    if (showLandmarks) {
      currentLandmarks.forEach((lm) => {
        const color = lm.color || (isFemaleAccent ? "#ec4899" : "#38bdf8")
        const px = lm.x * drawWidth + drawX
        const py = lm.y * drawHeight + drawY
        ctx.shadowBlur = 5
        ctx.shadowColor = color
        ctx.beginPath(); ctx.arc(px, py, 3, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill()
        ctx.beginPath(); ctx.arc(px, py, 1.5, 0, 2 * Math.PI); ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill()
        ctx.shadowBlur = 0
      })
    }

    // Only draw measurement visual when one is selected
    if (selectedMeasurement) {
      drawMeasurement(ctx, selectedMeasurement.id, lmMap, drawX, drawY, drawWidth, drawHeight, 0.9)
    }

    ctx.restore()
  }, [currentImage, currentLandmarks, selectedMeasurement, showLandmarks, zoomLevel, panOffset, isFemaleAccent])

  useEffect(() => {
    if (!currentImage) return
    const img = new Image()
    imgRef.current = img
    img.crossOrigin = "anonymous"
    img.onload = () => { loadedImagesRef.current.add(currentImage); setImageLoaded(true); drawCanvas(img) }
    img.onerror = () => { setImageLoaded(true) }
    img.src = currentImage
    return () => { img.onload = null; img.onerror = null }
  }, [currentImage])

  useEffect(() => {
    if (imageLoaded && imgRef.current) drawCanvas(imgRef.current)
  }, [imageLoaded, drawCanvas])

  const handleMeasurementClick = (m: MeasurementResult) => {
    if (selectedMeasurement?.id === m.id) { setSelectedMeasurement(null); return }
    const isFront = results?.frontMeasurements.some(fm => fm.id === m.id)
    const target: ProfileView = isFront ? "front" : "side"
    if (target !== profileView) { setProfileView(target); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); setImageLoaded(false) }
    setSelectedMeasurement(m)
  }

  const handleProfileChange = (view: ProfileView) => {
    setProfileView(view); setSelectedMeasurement(null); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); setImageLoaded(false)
  }

  const handleTabChange = (tab: "all" | "front" | "side") => {
    setActiveTab(tab); setSelectedMeasurement(null)
    if (tab === "front" && profileView !== "front") { setProfileView("front"); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); setImageLoaded(false) }
    else if (tab === "side" && profileView !== "side") { setProfileView("side"); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); setImageLoaded(false) }
  }

  const sortedMeasurements = [...filteredMeasurements].sort((a, b) => b.score - a.score)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-foreground tracking-tight">Facial Analysis</h1>
              <div className="h-4 w-px bg-border/50" />
              <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5">
                {(["front", "side", "ai"] as ProfileView[]).map(v => (
                  <button
                    key={v}
                    onClick={() => handleProfileChange(v)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 ${
                      profileView === v
                        ? isFemaleAccent ? "bg-pink-500/20 text-pink-100" : "bg-sky-500/20 text-sky-100"
                        : "text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {v === "ai" && <Brain className="size-3" />}
                    {v === "front" ? "Front" : v === "side" ? "Side" : "AI"}
                  </button>
                ))}
              </div>
            </div>
            {results && (
              <div className="flex items-center gap-3">
                <div className="text-right"><div className="text-[10px] text-muted-foreground uppercase tracking-wider">Front</div><div className={`text-sm font-bold ${getScoreColor(results.frontScore)}`}>{results.frontScore.toFixed(1)}</div></div>
                <div className="text-right"><div className="text-[10px] text-muted-foreground uppercase tracking-wider">Side</div><div className={`text-sm font-bold ${getScoreColor(results.sideScore)}`}>{results.sideScore.toFixed(1)}</div></div>
                <div className="text-right"><div className="text-[10px] text-muted-foreground uppercase tracking-wider">Harmony</div><div className={`text-sm font-bold ${getScoreColor(results.harmonyScore)}`}>{results.harmonyScore.toFixed(1)}</div></div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
        {profileView === "ai" && results && (
          <AIBeautyTab results={results} frontLandmarks={frontLandmarks} sideLandmarks={sideLandmarks} frontImage={frontImageUrl} sideImage={sideImageUrl} isFemaleAccent={isFemaleAccent} />
        )}

        {profileView !== "ai" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input type="text" placeholder="Search measurements..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-9 pl-8 pr-8 rounded-lg bg-card border border-border/50 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50" />
              {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="size-3" /></button>}
            </div>
            <div className="flex items-center gap-1 bg-card border border-border/50 rounded-lg p-0.5">
              {(["all","front","side"] as const).map(t => (
                <button key={t} onClick={() => handleTabChange(t)} className={`flex-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${activeTab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/50"}`}>
                  {t === "all" ? `All (${allMeasurements.length})` : t === "front" ? `Front (${results?.frontMeasurements.length || 0})` : `Side (${results?.sideMeasurements.length || 0})`}
                </button>
              ))}
            </div>
            <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
              {sortedMeasurements.length === 0 ? <div className="text-center py-8 text-xs text-muted-foreground">No measurements found</div> : sortedMeasurements.map(m => (
                <MeasurementCard key={m.id} measurement={m} isSelected={selectedMeasurement?.id === m.id} onClick={() => handleMeasurementClick(m)} />
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col gap-3">
            <div className="relative bg-card/30 border border-border/50 rounded-xl overflow-hidden shadow-lg">
              <div className="absolute top-2 left-2 z-10">
                <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg p-1 shadow-lg flex items-center gap-0.5">
                  <button onClick={() => setZoomLevel(z => Math.min(z + 0.25, 4))} className="p-1 hover:bg-secondary/50 rounded transition-colors"><Plus className="size-3.5 text-foreground" /></button>
                  <button onClick={() => setZoomLevel(z => Math.max(z - 0.25, 0.5))} className="p-1 hover:bg-secondary/50 rounded transition-colors"><Minus className="size-3.5 text-foreground" /></button>
                  <button onClick={() => { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }) }} className="p-1 hover:bg-secondary/50 rounded transition-colors"><Maximize2 className="size-3.5 text-foreground" /></button>
                  <div className="w-px h-4 bg-border/50 mx-0.5" />
                  <span className="text-[10px] font-bold text-foreground px-1 min-w-[36px] text-center">{Math.round(zoomLevel * 100)}%</span>
                </div>
              </div>

              <div ref={containerRef} className="w-full" style={{ height: "calc(100vh - 200px)", minHeight: "400px" }}>
                <canvas ref={canvasRef} className="w-full h-full" style={{ display: imageLoaded ? "block" : "none" }} />
                {!imageLoaded && <div className="absolute inset-0 flex items-center justify-center"><div className="flex flex-col items-center gap-2"><div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /><span className="text-xs text-muted-foreground">Loading image...</span></div></div>}
              </div>

              <div className="px-3 py-1.5 border-t border-border/50 bg-card/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{profileView === "front" ? "Front Profile" : "Side Profile"}</span><span>•</span><span>{currentLandmarks.length} landmarks</span><span>•</span><span>Zoom: {Math.round(zoomLevel * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowLandmarks(!showLandmarks)}
                    className={`relative flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all duration-300 ${
                      showLandmarks ? "bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-100 border border-sky-500/30 hover:border-sky-500/50 shadow-[0_0_12px_rgba(14,165,233,0.2)]" : "bg-secondary/30 text-muted-foreground border border-border/30 hover:border-border/50 hover:bg-secondary/40"
                    }`}
                  >
                    <div className={`transition-all duration-300 ${showLandmarks ? "scale-100" : "scale-90 opacity-60"}`}>{showLandmarks ? <Eye className="size-3" /> : <EyeOff className="size-3" />}</div>
                    <span>Landmarks</span>
                    {showLandmarks && <span className="absolute -top-1 -right-1 size-2 rounded-full bg-sky-400 animate-pulse shadow-[0_0_6px_rgba(56,189,248,0.8)]" />}
                  </button>
                  {selectedMeasurement && (
                    <button onClick={() => setSelectedMeasurement(null)} className="text-[10px] text-primary hover:text-primary/80 transition-colors">Clear selection</button>
                  )}
                </div>
              </div>
            </div>

            {selectedMeasurement && (
              <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-lg animate-fadeInUp">
                <MeasurementDetail measurement={selectedMeasurement} />
              </div>
            )}
          </div>

          <div className="lg:col-span-3 space-y-3">
            {results && (
              <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-lg">
                <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5"><Award className="size-3.5 text-primary" />Score Overview</h3>
                <div className="grid grid-cols-3 gap-2"><ScoreGauge score={results.frontScore} label="Front" size="sm" /><ScoreGauge score={results.sideScore} label="Side" size="sm" /><ScoreGauge score={results.harmonyScore} label="Harmony" size="sm" /></div>
                <div className="mt-3 pt-3 border-t border-border/30 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Overall</div>
                  <div className={`text-3xl font-bold ${getScoreColor(results.overallScore)}`}>{results.overallScore.toFixed(1)}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">out of 10.0</div>
                </div>
              </div>
            )}
            {results && Object.keys(results.categoryScores).length > 0 && (
              <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-lg">
                <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5"><BarChart3 className="size-3.5 text-primary" />Category Scores</h3>
                <div className="space-y-2">
                  {Object.entries(results.categoryScores).sort(([,a],[,b]) => b - a).map(([cat, score]) => (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-16 truncate">{cat}</span>
                      <div className="flex-1 h-2 bg-secondary/50 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ${getScoreGradient(score)}`} style={{ width: `${(score/10)*100}%` }} /></div>
                      <span className={`text-[10px] font-bold w-6 text-right ${getScoreColor(score)}`}>{score.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {results && (
              <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-lg">
                <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5"><Sparkles className="size-3.5 text-primary" />Insights</h3>
                {results.topStrengths.length > 0 && <div className="mb-3"><div className="text-[10px] text-emerald-400 font-medium mb-1.5 flex items-center gap-1"><TrendingUp className="size-3" />Top Strengths</div><div className="space-y-1">{results.topStrengths.map((s,i)=>(<div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><div className="size-1.5 rounded-full bg-emerald-400 shrink-0" />{s}</div>))}</div></div>}
                {results.topWeaknesses.length > 0 && <div><div className="text-[10px] text-red-400 font-medium mb-1.5 flex items-center gap-1"><TrendingDown className="size-3" />Areas to Improve</div><div className="space-y-1">{results.topWeaknesses.map((w,i)=>(<div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><div className="size-1.5 rounded-full bg-red-400 shrink-0" />{w}</div>))}</div></div>}
              </div>
            )}
            <div className="bg-card/50 border border-border/50 rounded-xl p-3 shadow-lg">
              <h3 className="text-[10px] font-semibold text-foreground mb-2 flex items-center gap-1.5"><Info className="size-3 text-primary" />Legend</h3>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><div className="size-3 rounded-full bg-emerald-500/30 border border-emerald-500/50" /><span>Score ≥ 8.0 (Excellent)</span></div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><div className="size-3 rounded-full bg-amber-500/30 border border-amber-500/50" /><span>Score 6.0 – 7.9 (Good)</span></div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><div className="size-3 rounded-full bg-red-500/30 border border-red-500/50" /><span>Score {'<'} 6.0 (Needs improvement)</span></div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><CheckCircle2 className="size-3 text-emerald-400" /><span>Within ideal range</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}