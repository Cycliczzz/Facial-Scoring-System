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
  onHover,
}: {
  measurement: MeasurementResult
  isSelected: boolean
  onClick: () => void
  onHover: () => void
}) {
  const scoreColor = getScoreColor(measurement.score)
  const scoreBg = getScoreBg(measurement.score)

  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-500 ease-out group relative overflow-hidden ${
        isSelected
          ? "bg-primary/15 border-primary/60 shadow-[0_0_20px_rgba(var(--primary)/0.3)] scale-[1.02] z-10"
          : "bg-card/50 border-border/50 hover:bg-card/80 hover:border-primary/30 hover:shadow-[0_0_15px_rgba(var(--primary)/0.15)] hover:scale-[1.01]"
      }`}
    >
      {/* Animated glow overlay */}
      <div className={`absolute inset-0 rounded-lg transition-opacity duration-500 ease-out ${
        isSelected 
          ? "opacity-100 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent animate-pulse"
          : "opacity-0 group-hover:opacity-100 bg-gradient-to-r from-primary/3 via-transparent to-transparent"
      }`} />
      {/* Left border glow indicator */}
      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full transition-all duration-500 ease-out ${
        isSelected ? "h-full bg-primary shadow-[0_0_8px_var(--primary)]" : "h-0 bg-primary/50 group-hover:h-3/4"
      }`} />
      <div className="flex items-center justify-between gap-2 relative z-[1]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-semibold truncate transition-colors duration-300 ${
              isSelected ? "text-primary drop-shadow-[0_0_4px_rgba(var(--primary)/0.5)]" : "text-foreground group-hover:text-primary/90"
            }`}>{measurement.name}</span>
            {measurement.isIdeal && (
              <CheckCircle2 className={`size-3 shrink-0 transition-all duration-300 ${isSelected ? "text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]" : "text-emerald-400"}`} />
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
            <div className={`text-sm font-bold transition-all duration-300 ${scoreColor} ${
              isSelected ? "drop-shadow-[0_0_6px_currentColor]" : ""
            }`}>{measurement.value.toFixed(1)}</div>
            <div className="text-[9px] text-muted-foreground">{measurement.unit}</div>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-500 ease-out ${scoreBg} ${
            isSelected ? "shadow-[0_0_12px_currentColor] scale-110" : "group-hover:shadow-[0_0_6px_currentColor] group-hover:scale-105"
          }`}>
            <span className={`text-xs font-bold transition-all duration-300 ${scoreColor} ${
              isSelected ? "drop-shadow-[0_0_4px_currentColor]" : ""
            }`}>{measurement.score.toFixed(1)}</span>
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
  color: string, alpha: number, _label?: string
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
  ctx.fillStyle = color
  ctx.beginPath(); ctx.arc(x1, y1, 3, 0, 2 * Math.PI); ctx.fill()
  ctx.beginPath(); ctx.arc(x2, y2, 3, 0, 2 * Math.PI); ctx.fill()
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
  alpha: number,
  boxValue?: number
) {
  const L = (...ids: string[]) => {
    for (const id of ids) {
      if (lm[id]) return lm[id]
    }
    return null
  }

  switch (measurementId) {
    case "lateral_canthal_tilt": {
      const GLOW = "rgba(255,255,255,0.95)"
      const DASHED = "rgba(255,255,255,0.5)"
      // Left eye: line (10,11) + dashed horizontal from 10 going left
      const lmc = L("left_medial_canthus"), llc = L("left_lateral_canthus")
      if (lmc && llc) {
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawMeasurementLine(ctx, lmc.x + dx, lmc.y + dy, llc.x + dx, llc.y + dy, GLOW, 1.0)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        // Dashed horizontal from left medial canthus going left 60px
        ctx.setLineDash([5, 5])
        ctx.strokeStyle = DASHED; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(lmc.x + dx, lmc.y + dy); ctx.lineTo(lmc.x + dx - 60, lmc.y + dy); ctx.stroke()
        ctx.setLineDash([])
        // Use normalized 0-1 coordinates for angle calculation
        const lnx = lmc.x / dw, lny = lmc.y / dh
        const llx = llc.x / dw, lly = llc.y / dh
        const lDeg = Math.abs(Math.atan2(lly - lny, llx - lnx) * (180 / Math.PI))
        const lAngle = lDeg > 90 ? 180 - lDeg : lDeg
        ctx.font = "bold 11px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "left"; ctx.textBaseline = "middle"
        ctx.fillText(`${lAngle.toFixed(1)}°`, lmc.x + dx - 70, lmc.y + dy - 12)
      }
      // Right eye: line (21,22) + dashed horizontal from 21 going right
      const rmc = L("right_medial_canthus"), rlc = L("right_lateral_canthus")
      if (rmc && rlc) {
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawMeasurementLine(ctx, rmc.x + dx, rmc.y + dy, rlc.x + dx, rlc.y + dy, GLOW, 1.0)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        ctx.setLineDash([5, 5])
        ctx.strokeStyle = DASHED; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(rmc.x + dx, rmc.y + dy); ctx.lineTo(rmc.x + dx + 60, rmc.y + dy); ctx.stroke()
        ctx.setLineDash([])
        // Use normalized 0-1 coordinates for angle calculation
        const rnx = rmc.x / dw, rny = rmc.y / dh
        const rlx = rlc.x / dw, rly = rlc.y / dh
        const rDeg = Math.abs(Math.atan2(rly - rny, rlx - rnx) * (180 / Math.PI))
        const rAngle = rDeg > 90 ? 180 - rDeg : rDeg
        ctx.font = "bold 11px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "right"; ctx.textBaseline = "middle"
        ctx.fillText(`${rAngle.toFixed(1)}°`, rmc.x + dx + 70, rmc.y + dy - 12)
      }
      break
    }
    case "nose_bridge_to_width": {
      const GLOW = "rgba(255,255,255,0.95)"
      const DIM = "rgba(255,255,255,0.4)"
      const lb = L("left_nose_bridge"), rb = L("right_nose_bridge"), ln = L("left_nose_side"), rn = L("right_nose_side")
      if (lb && rb && ln && rn) {
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawMeasurementLine(ctx, ln.x + dx, ln.y + dy, rn.x + dx, rn.y + dy, GLOW, 1.0)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        drawMeasurementLine(ctx, lb.x + dx, lb.y + dy, rb.x + dx, rb.y + dy, DIM, 1.0)
        const bw = Math.sqrt(((rb.x / dw - lb.x / dw) ** 2) + ((rb.y / dh - lb.y / dh) ** 2))
        const nw = Math.sqrt(((rn.x / dw - ln.x / dw) ** 2) + ((rn.y / dh - ln.y / dh) ** 2))
        const ratio = nw > 0 ? Number((bw / nw).toFixed(2)) : 0
        ctx.font = "bold 12px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "center"; ctx.textBaseline = "bottom"
        ctx.fillText(`${ratio}`, (ln.x + rn.x) / 2 + dx, ln.y + dy - 8)
      }
      break
    }
    case "bitemporal_width": {
      const lt = L("left_temple"), rt = L("right_temple"), lc = L("left_cheekbone"), rc = L("right_cheekbone")
      if (lt && rt) drawMeasurementLine(ctx, lt.x + dx, lt.y + dy, rt.x + dx, rt.y + dy, WHITE, alpha, "Bitemp")
      if (lc && rc) drawMeasurementLine(ctx, lc.x + dx, lc.y + dy, rc.x + dx, rc.y + dy, WHITE_DIM, alpha * 0.5, "Bizyg")
      break
    }
    case "cheekbone_height": {
      const GLOW = "rgba(255,255,255,0.95)"
      const DASHED = "rgba(255,255,255,0.35)"
      const DIM = "rgba(255,255,255,0.4)"
      const lc = L("left_cheekbone"), rc = L("right_cheekbone")
      const lp = L("left_pupil"), rp = L("right_pupil")
      const cb = L("cupids_bow")
      if (lc && rc && lp && rp && cb) {
        const cheekMid = { x: (lc.x + rc.x) / 2, y: (lc.y + rc.y) / 2 }
        const pupilMid = { x: (lp.x + rp.x) / 2, y: (lp.y + rp.y) / 2 }
        // Dashed lines
        ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.strokeStyle = DASHED
        ctx.beginPath(); ctx.moveTo(lp.x + dx, lp.y + dy); ctx.lineTo(rp.x + dx, rp.y + dy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(lc.x + dx, lc.y + dy); ctx.lineTo(rc.x + dx, rc.y + dy); ctx.stroke()
        ctx.setLineDash([]); ctx.lineWidth = 2
        // a: cupid's bow to cheekbone midpoint - highlighted
        const a = Math.sqrt(((cb.x - cheekMid.x) / dw) ** 2 + ((cb.y - cheekMid.y) / dh) ** 2)
        // b: pupil midpoint to cheekbone midpoint - dim
        const b = Math.sqrt(((pupilMid.x - cheekMid.x) / dw) ** 2 + ((pupilMid.y - cheekMid.y) / dh) ** 2)
        const total = a + b
        const aPct = total > 0 ? Number((a / total) * 100) : 0
        const bPct = total > 0 ? Number((b / total) * 100) : 0
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawMeasurementLine(ctx, cb.x + dx, cb.y + dy, cheekMid.x + dx, cheekMid.y + dy, GLOW, 1.0)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        ctx.font = "bold 13px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "left"; ctx.textBaseline = "middle"
        ctx.fillText(`${aPct.toFixed(1)}%`, Math.max(cb.x, cheekMid.x) + dx + 6, (cb.y + cheekMid.y) / 2 + dy)
        // b line dim
        drawMeasurementLine(ctx, pupilMid.x + dx, pupilMid.y + dy, cheekMid.x + dx, cheekMid.y + dy, DIM, 1.0)
        ctx.font = "bold 12px sans-serif"; ctx.fillStyle = DIM; ctx.textAlign = "left"; ctx.textBaseline = "middle"
        ctx.fillText(`${bPct.toFixed(1)}%`, Math.max(pupilMid.x, cheekMid.x) + dx + 6, (pupilMid.y + cheekMid.y) / 2 + dy)
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
      const GLOW = "rgba(255,255,255,0.95)"
      const lc = L("left_cheekbone"), luj = L("left_upper_jaw_angle"), llj = L("left_lower_jaw_angle"), lcn = L("left_chin")
      const rc = L("right_cheekbone"), ruj = L("right_upper_jaw_angle"), rlj = L("right_lower_jaw_angle"), rcn = L("right_chin")
      const drawSide = (cheek: any, upper: any, lower: any, chin: any) => {
        if (!cheek || !upper || !lower || !chin) return 0
        const dx1 = upper.x - cheek.x, dy1 = upper.y - cheek.y  // cheek→upper direction
        const dx2 = chin.x - lower.x, dy2 = chin.y - lower.y    // lower→chin direction
        const det = dx1 * dy2 - dy1 * dx2
        if (Math.abs(det) > 0.001) {
          const t = ((lower.x - cheek.x) * dy2 - (lower.y - cheek.y) * dx2) / det
          const ix = cheek.x + dx1 * t, iy = cheek.y + dy1 * t
          // Draw two rays FROM intersection TO the landmarks (47=cheek, 45=chin), stop at landmarks
          drawMeasurementLine(ctx, ix + dx, iy + dy, cheek.x + dx, cheek.y + dy, GLOW, 1.0)
          drawMeasurementLine(ctx, ix + dx, iy + dy, chin.x + dx, chin.y + dy, GLOW, 1.0)
          // Angle between the two rays (from intersection to cheek, from intersection to chin)
          const a1 = Math.atan2(cheek.y - iy, cheek.x - ix)
          const a2 = Math.atan2(chin.y - iy, chin.x - ix)
          let diff = a2 - a1
          while (diff < -Math.PI) diff += 2 * Math.PI
          while (diff > Math.PI) diff -= 2 * Math.PI
          const obtuseDeg = Math.abs((diff * 180) / Math.PI)
          const rad = 25
          // Draw arc between the two rays and place text inside the angle
          const drawCCW = diff < 0
          const bisector = a1 + diff / 2
          ctx.strokeStyle = GLOW; ctx.lineWidth = 1.5; ctx.setLineDash([])
          ctx.beginPath(); ctx.arc(ix + dx, iy + dy, rad, a1, a2, drawCCW); ctx.stroke()
          ctx.font = "bold 11px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "center"; ctx.textBaseline = "middle"
          ctx.fillText(`${obtuseDeg.toFixed(1)}°`, ix + dx + (rad + 14) * Math.cos(bisector), iy + dy + (rad + 14) * Math.sin(bisector))
          return obtuseDeg
        }
        return 0
      }
      drawSide(lc, luj, llj, lcn)
      drawSide(rc, ruj, rlj, rcn)
      break
    }
    case "top_third":
    case "middle_third":
    case "lower_third": {
      // Draw all 3 facial thirds with active one highlighted
      const h = L("hairline"), nb = L("nasal_base"), cb = L("chin_bottom")
      const lbh = L("left_brow_head"), lbi = L("left_brow_inner_corner")
      const rbh = L("right_brow_head"), rbi = L("right_brow_inner_corner")
      if (lbh && lbi && rbh && rbi && h && nb && cb) {
        const lmy = (lbh.y + lbi.y) / 2
        const rmy = (rbh.y + rbi.y) / 2
        const browY = (lmy + rmy) / 2
        const midX = (lbh.x + lbi.x + rbh.x + rbi.x) / 4
        const totalH = cb.y - h.y
        const topPct = Number(((browY - h.y) / totalH * 100).toFixed(1))
        const midPct = Number(((nb.y - browY) / totalH * 100).toFixed(1))
        const lowPct = Number(((cb.y - nb.y) / totalH * 100).toFixed(1))
        const DIM = "rgba(255,255,255,0.4)"
        const GLOW = "rgba(255,255,255,0.95)"
        const drawSegment = (y1: number, y2: number, color: string, pct: number, glow: boolean) => {
          if (glow) { ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)" }
          drawMeasurementLine(ctx, midX + dx, y1 + dy, midX + dx, y2 + dy, color, 1.0)
          const my = (y1 + y2) / 2
          ctx.font = "bold 14px sans-serif"
          ctx.fillStyle = color
          ctx.textAlign = "left"
          ctx.textBaseline = "middle"
          ctx.fillText(`${pct}%`, midX + dx + 8, my + dy)
          ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        }
        drawSegment(h.y, browY, measurementId === "top_third" ? GLOW : DIM, topPct, measurementId === "top_third")
        drawSegment(browY, nb.y, measurementId === "middle_third" ? GLOW : DIM, midPct, measurementId === "middle_third")
        drawSegment(nb.y, cb.y, measurementId === "lower_third" ? GLOW : DIM, lowPct, measurementId === "lower_third")
      }
      break
    }
    case "eye_aspect_ratio": {
      const GLOW = "rgba(255,255,255,0.95)"
      const DIM = "rgba(255,255,255,0.4)"
      // Left eye
      const lue = L("left_upper_eyelid"), lle = L("left_lower_eyelid")
      const lmc = L("left_medial_canthus"), llc = L("left_lateral_canthus")
      if (lue && lle && lmc && llc) {
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawMeasurementLine(ctx, lmc.x + dx, lmc.y + dy, llc.x + dx, llc.y + dy, GLOW, 1.0)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        drawMeasurementLine(ctx, lue.x + dx, lue.y + dy, lle.x + dx, lle.y + dy, DIM, 1.0)
        const lW = Math.abs(llc.x - lmc.x) / dw
        const lH = Math.abs(lle.y - lue.y) / dh
        const lRatio = lH > 0 ? Number((lW / lH).toFixed(2)) : 0
        ctx.font = "bold 12px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "left"; ctx.textBaseline = "middle"
        ctx.fillText(`${lRatio}`, Math.max(llc.x, lmc.x) + dx + 6, (lmc.y + llc.y) / 2 + dy)
      }
      // Right eye
      const rue = L("right_upper_eyelid"), rle = L("right_lower_eyelid")
      const rmc = L("right_medial_canthus"), rlc = L("right_lateral_canthus")
      if (rue && rle && rmc && rlc) {
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawMeasurementLine(ctx, rmc.x + dx, rmc.y + dy, rlc.x + dx, rlc.y + dy, GLOW, 1.0)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        drawMeasurementLine(ctx, rue.x + dx, rue.y + dy, rle.x + dx, rle.y + dy, DIM, 1.0)
        const rW = Math.abs(rlc.x - rmc.x) / dw
        const rH = Math.abs(rle.y - rue.y) / dh
        const rRatio = rH > 0 ? Number((rW / rH).toFixed(2)) : 0
        ctx.font = "bold 12px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "right"; ctx.textBaseline = "middle"
        ctx.fillText(`${rRatio}`, Math.min(rmc.x, rlc.x) + dx - 6, (rmc.y + rlc.y) / 2 + dy)
      }
      break
    }
    case "mouth_corner_position": {
      const ml = L("left_mouth_corner"), mr = L("right_mouth_corner"), mm = L("mouth_middle")
      if (ml && mr && mm) {
        const GLOW = "rgba(255,255,255,0.95)"
        const DASHED = "rgba(255,255,255,0.35)"
        // Horizontal dashed line through mouth_middle (point 40)
        ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.strokeStyle = DASHED
        ctx.beginPath(); ctx.moveTo(dx, mm.y + dy); ctx.lineTo(dx + dw, mm.y + dy); ctx.stroke()
        ctx.setLineDash([]); ctx.lineWidth = 2
        // Vertical highlighted lines from 36,37 to horizontal
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawMeasurementLine(ctx, ml.x + dx, ml.y + dy, ml.x + dx, mm.y + dy, GLOW, 1.0)
        drawMeasurementLine(ctx, mr.x + dx, mr.y + dy, mr.x + dx, mm.y + dy, GLOW, 1.0)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        // Signed distance: positive if above (y smaller)
        const distL = mm.y - ml.y
        const distR = mm.y - mr.y
        const avgDist = (distL + distR) / 2
        ctx.font = "bold 12px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "center"; ctx.textBaseline = "top"
        ctx.fillText(`${avgDist.toFixed(1)}mm`, (ml.x + mr.x) / 2 + dx, mm.y + dy + 6)
      }
      break
    }
    case "eye_separation_ratio": {
      const GLOW = "rgba(255,255,255,0.95)"
      const DIM = "rgba(255,255,255,0.4)"
      const lp = L("left_pupil"), rp = L("right_pupil"), lc = L("left_cheekbone"), rc = L("right_cheekbone")
      if (lp && rp && lc && rc) {
        drawMeasurementLine(ctx, lp.x + dx, lp.y + dy, rp.x + dx, rp.y + dy, GLOW, 1.0)
        drawMeasurementLine(ctx, lc.x + dx, lc.y + dy, rc.x + dx, rc.y + dy, DIM, 1.0)
        const pupilDist = Math.sqrt((rp.x - lp.x) ** 2 + (rp.y - lp.y) ** 2)
        const faceW = Math.sqrt((rc.x - lc.x) ** 2 + (rc.y - lc.y) ** 2)
        const pct = faceW > 0 ? Number(((pupilDist / faceW) * 100).toFixed(1)) : 0
        ctx.font = "bold 14px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "center"; ctx.textBaseline = "bottom"
        ctx.fillText(`${pct}%`, (lp.x + rp.x) / 2 + dx, lp.y + dy - 8)
      }
      break
    }
    case "eyebrow_tilt": {
      const GLOW = "rgba(255,255,255,0.95)"
      const DIM = "rgba(255,255,255,0.35)"
      const lh = L("left_brow_head"), li = L("left_brow_inner_corner"), la = L("left_brow_arch"), lpk = L("left_brow_peak")
      const rh = L("right_brow_head"), ri = L("right_brow_inner_corner"), ra = L("right_brow_arch"), rpk = L("right_brow_peak")
      const drawSide = (h: any, i: any, a: any, p: any, sideColor: string) => {
        if (!h || !i || !a || !p) return 0
        const sx = (h.x + i.x) / 2, sy = (h.y + i.y) / 2
        const ex = (a.x + p.x) / 2, ey = (a.y + p.y) / 2
        const dxBrow = ex - sx, dyBrow = ey - sy
        // Dashed horizontal reference through start point
        ctx.setLineDash([5, 5]); ctx.lineWidth = 1.2; ctx.strokeStyle = DIM
        ctx.beginPath(); ctx.moveTo(sx + dx - 60, sy + dy); ctx.lineTo(sx + dx + 60, sy + dy); ctx.stroke()
        ctx.setLineDash([]); ctx.lineWidth = 2
        // Highlighted brow tilt segment
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawMeasurementLine(ctx, sx + dx, sy + dy, ex + dx, ey + dy, sideColor, 1.0)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        // Acute angle (0-90°) from horizontal, with sign: positive=upward, negative=downward
        // In image coords y↓, so negate dy to make upward=positive
        const signedDeg = Math.atan2(-dyBrow, dxBrow) * (180 / Math.PI)
        const acuteDeg = Math.abs(signedDeg) > 90 ? (180 - Math.abs(signedDeg)) * Math.sign(signedDeg) : signedDeg
        ctx.font = "bold 11px sans-serif"; ctx.fillStyle = sideColor; ctx.textAlign = "center"; ctx.textBaseline = "bottom"
        ctx.fillText(`${Math.round(acuteDeg * 10) / 10}°`, (sx + ex) / 2 + dx, (sy + ey) / 2 + dy - 5)
        return acuteDeg
      }
      drawSide(lh, li, la, lpk, GLOW)
      drawSide(rh, ri, ra, rpk, GLOW)
      break
    }
    case "face_width_to_height": {
      const lc = L("left_cheekbone"), rc = L("right_cheekbone")
      const lbh = L("left_brow_head"), lbi = L("left_brow_inner_corner")
      const rbh = L("right_brow_head"), rbi = L("right_brow_inner_corner")
      const cp = L("cupids_bow")
      if (lbh && lbi && rbh && rbi && cp && lc && rc) {
        const lmy = (lbh.y + lbi.y) / 2
        const rmy = (rbh.y + rbi.y) / 2
        const browY = (lmy + rmy) / 2
        const midX = (lbh.x + lbi.x + rbh.x + rbi.x) / 4
        // Use raw pixel coords (matching calculator which scales x by aspect)
        const fw = Math.abs(rc.x - lc.x)
        const fh = Math.abs(cp.y - browY)
        const ratio = fh > 0 ? Number((fw / fh).toFixed(2)) : 0
        const GLOW = "rgba(255,255,255,0.95)"
        const DIM = "rgba(255,255,255,0.4)"
        // Width line with glow + ratio
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawMeasurementLine(ctx, lc.x + dx, lc.y + dy, rc.x + dx, rc.y + dy, GLOW, 1.0)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        ctx.font = "bold 14px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "left"; ctx.textBaseline = "bottom"
        ctx.fillText(`${ratio}`, Math.max(lc.x, rc.x) + dx + 8, lc.y + dy - 8)
        // Height line dim
        drawMeasurementLine(ctx, midX + dx, browY + dy, midX + dx, cp.y + dy, DIM, 1.0)
      }
      break
    }
    case "interpupillary_mouth_width": {
      const GLOW = "rgba(255,255,255,0.95)"
      const DIM = "rgba(255,255,255,0.4)"
      const lp = L("left_pupil"), rp = L("right_pupil"), lm = L("left_mouth_corner"), rm = L("right_mouth_corner")
      if (lp && rp && lm && rm) {
        // Dim line: (2,3) = interpupillary
        drawMeasurementLine(ctx, lp.x + dx, lp.y + dy, rp.x + dx, rp.y + dy, DIM, 1.0)
        // Highlighted line: (36,37) = mouth width
        drawMeasurementLine(ctx, lm.x + dx, lm.y + dy, rm.x + dx, rm.y + dy, GLOW, 1.0)
        const mouthW = Math.sqrt((rm.x - lm.x) ** 2 + (rm.y - lm.y) ** 2)
        const pupilDist = Math.sqrt((rp.x - lp.x) ** 2 + (rp.y - lp.y) ** 2)
        const ratio = pupilDist > 0 ? Number(((mouthW / pupilDist) * 100).toFixed(1)) : 0
        ctx.font = "bold 14px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "center"; ctx.textBaseline = "bottom"
        ctx.fillText(`${ratio}%`, (lm.x + rm.x) / 2 + dx, lm.y + dy - 8)
      }
      break
    }
    case "jaw_frontal_angle": {
      const GLOW = "rgba(255,255,255,0.95)"
      const DIM = "rgba(255,255,255,0.35)"
      const gl = L("left_lower_jaw_angle"), lc = L("left_chin"), gr = L("right_lower_jaw_angle"), rc = L("right_chin")
      if (gl && lc && gr && rc) {
        // Use raw pixel coords for angle calculation (matching calculator which scales x by aspect)
        const dx1 = lc.x - gl.x, dy1 = lc.y - gl.y, dx2 = rc.x - gr.x, dy2 = rc.y - gr.y
        const det = dx1 * dy2 - dy1 * dx2
        if (Math.abs(det) > 0.001) {
          const ext = 4, ex1 = dx1 * ext, ey1 = dy1 * ext, ex2 = dx2 * ext, ey2 = dy2 * ext
          const det2 = ex1 * ey2 - ey1 * ex2
          if (Math.abs(det2) > 0.001) {
            const t = ((gr.x - gl.x) * ey2 - (gr.y - gl.y) * ex2) / det2
            const ax = gl.x + ex1 * t, ay = gl.y + ey1 * t
            // Draw extended lines from jaw angles through chin all the way to intersection
            ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
            ctx.strokeStyle = GLOW; ctx.lineWidth = 2; ctx.setLineDash([])
            ctx.beginPath(); ctx.moveTo(gl.x + dx, gl.y + dy); ctx.lineTo(ax + dx, ay + dy); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(gr.x + dx, gr.y + dy); ctx.lineTo(ax + dx, ay + dy); ctx.stroke()
            // Draw dots at endpoints
            ctx.fillStyle = GLOW
            ctx.beginPath(); ctx.arc(gl.x + dx, gl.y + dy, 3, 0, 2*Math.PI); ctx.fill()
            ctx.beginPath(); ctx.arc(lc.x + dx, lc.y + dy, 3, 0, 2*Math.PI); ctx.fill()
            ctx.beginPath(); ctx.arc(gr.x + dx, gr.y + dy, 3, 0, 2*Math.PI); ctx.fill()
            ctx.beginPath(); ctx.arc(rc.x + dx, rc.y + dy, 3, 0, 2*Math.PI); ctx.fill()
            ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
            // Dashed reference segments from chin to intersection
            ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.strokeStyle = DIM
            ctx.beginPath(); ctx.moveTo(lc.x + dx, lc.y + dy); ctx.lineTo(ax + dx, ay + dy); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(rc.x + dx, rc.y + dy); ctx.lineTo(ax + dx, ay + dy); ctx.stroke()
            ctx.setLineDash([]); ctx.lineWidth = 2
            // Angle arc and value - use pixel-space coords (same as calculator's aspect-scaled space)
            const angleDeg = Math.abs(Math.atan2(det, dx1 * dx2 + dy1 * dy2)) * (180 / Math.PI)
            const finalAngle = angleDeg > 180 ? 360 - angleDeg : angleDeg
            // Ray directions: from intersection toward jaw angles (opposite to jaw→chin vectors)
            const ra1 = Math.atan2(gl.y - ay, gl.x - ax), ra2 = Math.atan2(gr.y - ay, gr.x - ax)
            let rdiff = ra2 - ra1
            while (rdiff < -Math.PI) rdiff += 2 * Math.PI
            while (rdiff > Math.PI) rdiff -= 2 * Math.PI
            // Draw the smaller sector (between the two rays)
            const drawCCW = rdiff < 0
            const bisector = ra1 + rdiff / 2
            ctx.strokeStyle = GLOW; ctx.lineWidth = 2; ctx.setLineDash([])
            const arcRadius = 35
            ctx.beginPath(); ctx.arc(ax + dx, ay + dy, arcRadius, ra1, ra2, drawCCW); ctx.stroke()
            ctx.font = "bold 13px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "center"; ctx.textBaseline = "middle"
            // Place text just above the arc (slightly outside, away from vertex)
            const textR = arcRadius + 12
            ctx.fillText(`${finalAngle.toFixed(1)}°`, ax + dx + textR * Math.cos(bisector), ay + dy + textR * Math.sin(bisector))
          }
        }
      }
      break
    }
    case "intercanthal_nasal_width": {
      const GLOW = "rgba(255,255,255,0.95)"
      const DIM = "rgba(255,255,255,0.4)"
      const lm = L("left_medial_canthus"), rm = L("right_medial_canthus"), ln = L("left_nose_side"), rn = L("right_nose_side")
      if (lm && rm && ln && rn) {
        drawMeasurementLine(ctx, lm.x + dx, lm.y + dy, rm.x + dx, rm.y + dy, DIM, 1.0)
        drawMeasurementLine(ctx, ln.x + dx, ln.y + dy, rn.x + dx, rn.y + dy, GLOW, 1.0)
        const noseW = Math.sqrt((rn.x - ln.x) ** 2 + (rn.y - ln.y) ** 2)
        const icd = Math.sqrt((rm.x - lm.x) ** 2 + (rm.y - lm.y) ** 2)
        const ratio = icd > 0 ? Number((noseW / icd).toFixed(4)) : 0
        ctx.font = "bold 12px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "center"; ctx.textBaseline = "bottom"
        ctx.fillText(`${ratio}`, (ln.x + rn.x) / 2 + dx, ln.y + dy - 8)
      }
      break
    }
    case "one_eye_apart": {
      const GLOW = "rgba(255,255,255,0.95)"
      const DIM = "rgba(255,255,255,0.4)"
      const li = L("left_medial_canthus"), ri = L("right_medial_canthus")
      const llo = L("left_lateral_canthus"), rlo = L("right_lateral_canthus")
      if (li && ri && llo && rlo) {
        drawMeasurementLine(ctx, li.x + dx, li.y + dy, llo.x + dx, llo.y + dy, DIM, 1.0)
        drawMeasurementLine(ctx, ri.x + dx, ri.y + dy, rlo.x + dx, rlo.y + dy, DIM, 1.0)
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawMeasurementLine(ctx, li.x + dx, li.y + dy, ri.x + dx, ri.y + dy, GLOW, 1.0)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        const icd = Math.sqrt(((ri.x / dw - li.x / dw) ** 2) + ((ri.y / dh - li.y / dh) ** 2))
        const lw = Math.sqrt(((llo.x / dw - li.x / dw) ** 2) + ((llo.y / dh - li.y / dh) ** 2))
        const rw = Math.sqrt(((rlo.x / dw - ri.x / dw) ** 2) + ((rlo.y / dh - ri.y / dh) ** 2))
        const avgW = (lw + rw) / 2
        const ratio = avgW > 0 ? Number((icd / avgW).toFixed(2)) : 0
        ctx.font = "bold 12px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "center"; ctx.textBaseline = "bottom"
        ctx.fillText(`${ratio}`, (li.x + ri.x) / 2 + dx, li.y + dy - 8)
      }
      break
    }
    case "midface_ratio": {
      const GLOW = "rgba(255,255,255,0.95)"
      const DIM = "rgba(255,255,255,0.4)"
      const lp = L("left_pupil"), rp = L("right_pupil"), ic = L("inner_cupids_bow")
      if (lp && rp && ic) {
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawMeasurementLine(ctx, lp.x + dx, lp.y + dy, rp.x + dx, rp.y + dy, GLOW, 1.0)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        // Normalize all to 0-1
        const lx1 = lp.x / dw, ly1 = lp.y / dh, lx2 = rp.x / dw, ly2 = rp.y / dh
        const icx = ic.x / dw, icy = ic.y / dh
        const pDist = Math.sqrt((lx2 - lx1) ** 2 + (ly2 - ly1) ** 2)
        const A = ly2 - ly1; const B = lx1 - lx2; const C = lx2 * ly1 - lx1 * ly2
        const distToLine = Math.abs(A * icx + B * icy + C) / Math.sqrt(A * A + B * B)
        const ratio = distToLine > 0 ? Number((pDist / distToLine).toFixed(4)) : 0
        ctx.font = "bold 14px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "center"; ctx.textBaseline = "bottom"
        ctx.fillText(`${ratio}`, (lx1 + lx2) / 2 * dw + dx, ly1 * dh + dy - 8)
        // Dim perpendicular line from inner cupid's bow to pupil line
        const t = -((lx1 - icx) * (lx2 - lx1) + (ly1 - icy) * (ly2 - ly1)) / ((lx2 - lx1) ** 2 + (ly2 - ly1) ** 2)
        const px = (lx1 + t * (lx2 - lx1)) * dw + dx
        const py = (ly1 + t * (ly2 - ly1)) * dh + dy
        drawMeasurementLine(ctx, icx * dw + dx, icy * dh + dy, px, py, DIM, 1.0)
      }
      break
    }
    case "ipsilateral_alar_angle": {
      const GLOW = "rgba(255,255,255,0.95)"
      const nb = L("nasal_base"), le = L("left_eyelid_hood_end"), re = L("right_eyelid_hood_end")
      if (nb && le && re) {
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawMeasurementLine(ctx, nb.x + dx, nb.y + dy, le.x + dx, le.y + dy, GLOW, 1.0)
        drawMeasurementLine(ctx, nb.x + dx, nb.y + dy, re.x + dx, re.y + dy, GLOW, 1.0)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        // Normalize to 0-1 space for correct angle
        const nbx = nb.x / dw, nby = nb.y / dh
        const lex = le.x / dw, ley = le.y / dh
        const rex = re.x / dw, rey = re.y / dh
        const v1x = lex - nbx, v1y = ley - nby
        const v2x = rex - nbx, v2y = rey - nby
        const cross = v1x * v2y - v1y * v2x
        const dot = v1x * v2x + v1y * v2y
        const angle = Math.abs(Math.atan2(cross, dot)) * (180 / Math.PI)
        const a1 = Math.atan2(v1y, v1x)
        const a2 = Math.atan2(v2y, v2x)
        const midA = (a1 + a2) / 2
        const rad = 30
        ctx.strokeStyle = GLOW; ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(nb.x + dx, nb.y + dy, rad, a1, a2); ctx.stroke()
        ctx.font = "bold 13px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "center"; ctx.textBaseline = "middle"
        ctx.fillText(`${angle.toFixed(1)}°`, nb.x + dx + (rad + 15) * Math.cos(midA), nb.y + dy + (rad + 15) * Math.sin(midA))
      }
      break
    }
    case "mouth_width_to_nose_width": {
      const lm = L("left_mouth_corner"), rm = L("right_mouth_corner"), ln = L("left_nose_side"), rn = L("right_nose_side")
      const GLOW = "rgba(255,255,255,0.95)"
      const DIM = "rgba(255,255,255,0.4)"
      if (lm && rm) {
        const mW = Math.abs(rm.x - lm.x) / dw
        const nW = ln && rn ? Math.abs(rn.x - ln.x) / dw : 1
        const ratio = nW > 0 ? Number((mW / nW).toFixed(4)) : 0
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawMeasurementLine(ctx, lm.x + dx, lm.y + dy, rm.x + dx, rm.y + dy, GLOW, 1.0)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        ctx.font = "bold 14px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "center"; ctx.textBaseline = "bottom"
        ctx.fillText(`${ratio}`, (lm.x + rm.x) / 2 + dx, lm.y + dy - 8)
      }
      if (ln && rn) drawMeasurementLine(ctx, ln.x + dx, ln.y + dy, rn.x + dx, rn.y + dy, DIM, 1.0)
      break
    }
    case "total_facial_width_to_height": {
      const lc = L("left_cheekbone"), rc = L("right_cheekbone"), h = L("hairline"), cb = L("chin_bottom")
      if (lc && rc) drawMeasurementLine(ctx, lc.x + dx, lc.y + dy, rc.x + dx, rc.y + dy, WHITE, alpha, "TFW")
      if (h && cb) drawMeasurementLine(ctx, h.x + dx, h.y + dy, cb.x + dx, cb.y + dy, WHITE_DIM, alpha * 0.5, "TFH")
      break
    }
    case "chin_to_philtrum": {
      const llc = L("lower_lip_center"), cb = L("chin_bottom")
      const cp = L("cupids_bow"), nb = L("nasal_base")
      if (llc && cb && cp && nb) {
        const chinH = Math.abs(cb.y - llc.y)
        const philH = Math.abs(cp.y - nb.y)
        const ratio = Number((chinH / philH).toFixed(2))
        const GLOW = "rgba(255,255,255,0.95)"
        const DIM = "rgba(255,255,255,0.4)"
        // Chin with glow + ratio
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawMeasurementLine(ctx, llc.x + dx, llc.y + dy, cb.x + dx, cb.y + dy, GLOW, 1.0)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        ctx.font = "bold 14px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "left"; ctx.textBaseline = "middle"
        ctx.fillText(`${ratio}`, Math.max(llc.x, cb.x) + dx + 8, (llc.y + cb.y) / 2 + dy)
        // Philtrum dim
        drawMeasurementLine(ctx, cp.x + dx, cp.y + dy, nb.x + dx, nb.y + dy, DIM, 1.0)
      }
      break
    }
    case "eyebrow_low_setedness": {
      const GLOW = "rgba(255,255,255,0.95)"
      const DIM = "rgba(255,255,255,0.4)"
      const DASHED = "rgba(255,255,255,0.3)"
      const lue = L("left_upper_eyelid"), lle = L("left_lower_eyelid")
      const rue = L("right_upper_eyelid"), rle = L("right_lower_eyelid")
      const lp = L("left_pupil"), rp = L("right_pupil")
      const lb = L("left_brow_inner_corner"), rb = L("right_brow_inner_corner")
      if (lue && lle && rue && rle && lp && rp && lb && rb) {
        drawMeasurementLine(ctx, rue.x + dx, rue.y + dy, rle.x + dx, rle.y + dy, DIM, 1.0)
        drawMeasurementLine(ctx, lue.x + dx, lue.y + dy, lle.x + dx, lle.y + dy, DIM, 1.0)
        ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.strokeStyle = DASHED
        ctx.beginPath(); ctx.moveTo(lp.x + dx, lp.y + dy); ctx.lineTo(rp.x + dx, rp.y + dy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(lb.x + dx, lb.y + dy); ctx.lineTo(rb.x + dx, rb.y + dy); ctx.stroke()
        ctx.setLineDash([]); ctx.lineWidth = 2
        const pmx = (lp.x + rp.x) / 2, pmy = (lp.y + rp.y) / 2
        const bmx = (lb.x + rb.x) / 2, bmy = (lb.y + rb.y) / 2
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawMeasurementLine(ctx, pmx + dx, pmy + dy, bmx + dx, bmy + dy, GLOW, 1.0)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        const leh = Math.abs(lle.y / dh - lue.y / dh)
        const reh = Math.abs(rle.y / dh - rue.y / dh)
        const avgEh = (leh + reh) / 2
        const hl = Math.sqrt(((bmx / dw - pmx / dw) ** 2) + ((bmy / dh - pmy / dh) ** 2))
        const ratio = avgEh > 0 ? Number((hl / avgEh).toFixed(2)) : 0
        ctx.font = "bold 12px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "left"; ctx.textBaseline = "middle"
        ctx.fillText(`${ratio}`, (pmx + bmx) / 2 + dx + 5, (pmy + bmy) / 2 + dy)
      }
      break
    }
    case "brow_length_to_face_width": {
      const GLOW = "rgba(255,255,255,0.95)"
      const DIM = "rgba(255,255,255,0.4)"
      const li = L("left_brow_inner_corner"), lt = L("left_brow_tail")
      const ri = L("right_brow_inner_corner"), rt = L("right_brow_tail")
      const zl = L("left_cheekbone"), zr = L("right_cheekbone")
      if (li && lt && ri && rt && zl && zr) {
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawMeasurementLine(ctx, li.x + dx, li.y + dy, lt.x + dx, lt.y + dy, GLOW, 1.0)
        drawMeasurementLine(ctx, ri.x + dx, ri.y + dy, rt.x + dx, rt.y + dy, GLOW, 1.0)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        drawMeasurementLine(ctx, zl.x + dx, zl.y + dy, zr.x + dx, zr.y + dy, DIM, 1.0)
        const lbw = Math.sqrt(((lt.x / dw - li.x / dw) ** 2) + ((lt.y / dh - li.y / dh) ** 2))
        const rbw = Math.sqrt(((rt.x / dw - ri.x / dw) ** 2) + ((rt.y / dh - ri.y / dh) ** 2))
        const avgBw = (lbw + rbw) / 2
        const fw = Math.sqrt(((zr.x / dw - zl.x / dw) ** 2) + ((zr.y / dh - zl.y / dh) ** 2))
        const ratio = fw > 0 ? Number((avgBw / fw).toFixed(2)) : 0
        ctx.font = "bold 12px sans-serif"; ctx.fillStyle = DIM; ctx.textAlign = "center"; ctx.textBaseline = "bottom"
        ctx.fillText(`${ratio}`, (zl.x + zr.x) / 2 + dx, zl.y + dy - 8)
      }
      break
    }
    case "nose_tip_position": {
      const nb = L("nose_bottom"), h = L("hairline"), cb = L("chin_bottom")
      if (nb && h && cb) drawMeasurementLine(ctx, h.x + dx, h.y + dy, nb.x + dx, nb.y + dy, WHITE, alpha, "Nose Pos")
      break
    }
    case "deviation_iaa_jfa": {
      const GLOW = "rgba(255,255,255,0.95)"
      const DIM = "rgba(255,255,255,0.4)"
      const nb = L("nasal_base"), le = L("left_eyelid_hood_end"), re = L("right_eyelid_hood_end")
      const gl = L("left_lower_jaw_angle"), lc = L("left_chin"), gr = L("right_lower_jaw_angle"), rc = L("right_chin")
      let iaaDeg = 0, jfaDeg = 0
      // Draw IAA: angle at nasal_base between (14) and (25)
      if (nb && le && re) {
        drawMeasurementLine(ctx, nb.x + dx, nb.y + dy, le.x + dx, le.y + dy, GLOW, 1.0)
        drawMeasurementLine(ctx, nb.x + dx, nb.y + dy, re.x + dx, re.y + dy, GLOW, 1.0)
        const v1x = le.x - nb.x, v1y = le.y - nb.y, v2x = re.x - nb.x, v2y = re.y - nb.y
        const cross = v1x * v2y - v1y * v2x
        const dot = v1x * v2x + v1y * v2y
        iaaDeg = Math.abs(Math.atan2(cross, dot)) * (180 / Math.PI)
        const a1 = Math.atan2(v1y, v1x), a2 = Math.atan2(v2y, v2x)
        const rad = 25
        ctx.strokeStyle = GLOW; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.arc(nb.x + dx, nb.y + dy, rad, a1, a2); ctx.stroke()
        const midA = (a1 + a2) / 2
        ctx.font = "bold 11px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "center"; ctx.textBaseline = "middle"
        ctx.fillText(`IAA ${iaaDeg.toFixed(1)}°`, nb.x + dx + (rad + 14) * Math.cos(midA), nb.y + dy + (rad + 14) * Math.sin(midA))
      }
      // Draw JFA: angle formed by (43→45) & (44→46) at intersection
      if (gl && lc && gr && rc) {
        const dx1 = lc.x - gl.x, dy1 = lc.y - gl.y, dx2 = rc.x - gr.x, dy2 = rc.y - gr.y
        const det = dx1 * dy2 - dy1 * dx2
        if (Math.abs(det) > 0.001) {
          const ext = 4, ex1 = dx1 * ext, ey1 = dy1 * ext, ex2 = dx2 * ext, ey2 = dy2 * ext
          const det2 = ex1 * ey2 - ey1 * ex2
          if (Math.abs(det2) > 0.001) {
            const t = ((gr.x - gl.x) * ey2 - (gr.y - gl.y) * ex2) / det2
            const ax = gl.x + ex1 * t, ay = gl.y + ey1 * t
            drawMeasurementLine(ctx, gl.x + dx, gl.y + dy, ax + dx, ay + dy, GLOW, 1.0)
            drawMeasurementLine(ctx, gr.x + dx, gr.y + dy, ax + dx, ay + dy, GLOW, 1.0)
            jfaDeg = Math.abs(Math.atan2(det, dx1 * dx2 + dy1 * dy2)) * (180 / Math.PI)
            if (jfaDeg > 180) jfaDeg = 360 - jfaDeg
            const ra1 = Math.atan2(gl.y - ay, gl.x - ax), ra2 = Math.atan2(gr.y - ay, gr.x - ax)
            let rdiff = ra2 - ra1
            while (rdiff < -Math.PI) rdiff += 2 * Math.PI
            while (rdiff > Math.PI) rdiff -= 2 * Math.PI
            const drawCCW = rdiff < 0
            const bisector = ra1 + rdiff / 2
            const rad = 30
            ctx.strokeStyle = GLOW; ctx.lineWidth = 1.5
            ctx.beginPath(); ctx.arc(ax + dx, ay + dy, rad, ra1, ra2, drawCCW); ctx.stroke()
            ctx.font = "bold 11px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "center"; ctx.textBaseline = "middle"
            ctx.fillText(`JFA ${jfaDeg.toFixed(1)}°`, ax + dx + (rad + 14) * Math.cos(bisector), ay + dy + (rad + 14) * Math.sin(bisector))
          }
        }
      }
      break
    }
    case "lower_lip_to_upper_lip": {
      const llc = L("lower_lip_center"), mm = L("mouth_middle"), cp = L("cupids_bow")
      if (llc && mm && cp) {
        const lowerH = Math.abs(mm.y - llc.y)
        const upperH = Math.abs(cp.y - mm.y)
        const ratio = upperH > 0 ? Number((lowerH / upperH).toFixed(2)) : 0
        const GLOW = "rgba(255,255,255,0.95)"
        const DIM = "rgba(255,255,255,0.4)"
        // Lower lip with glow + ratio
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawMeasurementLine(ctx, llc.x + dx, llc.y + dy, mm.x + dx, mm.y + dy, GLOW, 1.0)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        ctx.font = "bold 14px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "left"; ctx.textBaseline = "middle"
        ctx.fillText(`${ratio}`, llc.x + dx + 8, (llc.y + mm.y) / 2 + dy)
        // Upper lip dim (mouth middle to cupid's bow)
        drawMeasurementLine(ctx, mm.x + dx, mm.y + dy, cp.x + dx, cp.y + dy, DIM, 1.0)
      }
      break
    }
    case "lower_third_proportion": {
      const GLOW = "rgba(255,255,255,0.95)"
      const DIM = "rgba(255,255,255,0.4)"
      const nb = L("nasal_base"), mm = L("mouth_middle"), cb = L("chin_bottom")
      if (nb && mm && cb) {
        drawMeasurementLine(ctx, nb.x + dx, nb.y + dy, mm.x + dx, mm.y + dy, GLOW, 1.0)
        drawMeasurementLine(ctx, nb.x + dx, nb.y + dy, cb.x + dx, cb.y + dy, DIM, 1.0)
        const upperH = Math.abs(mm.y - nb.y)
        const totalH = Math.abs(cb.y - nb.y)
        const pct = totalH > 0 ? Number(((upperH / totalH) * 100).toFixed(1)) : 0
        ctx.font = "bold 14px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "left"; ctx.textBaseline = "middle"
        ctx.fillText(`${pct}%`, Math.max(nb.x, mm.x) + dx + 8, (nb.y + mm.y) / 2 + dy)
      }
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
    { id: "left_eyelid_hood_end", x: 0.43, y: 0.30, label: "L Hood End", group: "eyes" },
    { id: "right_pupil", x: 0.65, y: 0.32, label: "R Pupil", group: "eyes" },
    { id: "right_medial_canthus", x: 0.70, y: 0.32, label: "R Medial", group: "eyes" },
    { id: "right_lateral_canthus", x: 0.60, y: 0.32, label: "R Lateral", group: "eyes" },
    { id: "right_upper_eyelid", x: 0.65, y: 0.30, label: "R Upper", group: "eyes" },
    { id: "right_lower_eyelid", x: 0.65, y: 0.34, label: "R Lower", group: "eyes" },
    { id: "right_eyelid_hood_end", x: 0.57, y: 0.30, label: "R Hood End", group: "eyes" },
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
  const [activeTab, setActiveTab] = useState<"front" | "side">("front")

  const imgRef = useRef<HTMLImageElement | null>(null)
  const loadedImagesRef = useRef<Set<string>>(new Set())

  const isFemaleAccent = initialGender === "female"

  // Load data + image dimensions for aspect ratio correction
  const [frontAspect, setFrontAspect] = useState(1)
  const [sideAspect, setSideAspect] = useState(1)
  const [aspectsReady, setAspectsReady] = useState(false)

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

    // Load image dimensions for aspect ratio correction
    const loadImageAspect = (src: string): Promise<number> => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img.width / img.height)
        img.onerror = () => resolve(1)
        img.src = src
      })
    }
    const frontSrc = frontImg || "/hero-samples/sample-1.jpg"
    const sideSrc = sideImg || "/hero-samples/sample-3.jpg"
    Promise.all([loadImageAspect(frontSrc), loadImageAspect(sideSrc)]).then(([fa, sa]) => {
      setFrontAspect(fa)
      setSideAspect(sa)
      setAspectsReady(true)
    })
  }, [])

  useEffect(() => {
    if (aspectsReady && (frontLandmarks.length > 0 || sideLandmarks.length > 0)) {
      const analysis = calculateAnalysis(frontLandmarks, sideLandmarks, initialGender, initialEthnicity as any, frontAspect, sideAspect)
      setResults(analysis)
    }
  }, [aspectsReady, frontLandmarks, sideLandmarks, frontAspect, sideAspect, initialGender, initialEthnicity])

  const currentImage = profileView === "front" ? frontImageUrl : sideImageUrl
  const currentLandmarks = profileView === "front" ? frontLandmarks : sideLandmarks
  const currentMeasurements = profileView === "front"
    ? (results?.frontMeasurements || [])
    : (results?.sideMeasurements || [])

  const tabMeasurements = activeTab === "front" ? (results?.frontMeasurements || []) : (results?.sideMeasurements || [])
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
      // Define display order for front profile landmarks
      const FRONT_LANDMARK_ORDER: Record<string, number> = {
        hairline: 1,
        left_pupil: 2, right_pupil: 3,
        left_nose_side: 4, right_nose_side: 5,
        lower_lip_center: 6,
        chin_bottom: 7,
        left_temple: 8, right_temple: 9,
        left_medial_canthus: 10, left_lateral_canthus: 11,
        left_upper_eyelid: 12, left_lower_eyelid: 13,
        left_eyelid_hood_end: 14,
        left_brow_head: 15, left_brow_inner_corner: 16,
        left_brow_arch: 17, left_brow_peak: 18, left_brow_tail: 19,
        left_upper_eyelid_crease: 20,
        right_medial_canthus: 21, right_lateral_canthus: 22,
        right_upper_eyelid: 23, right_lower_eyelid: 24,
        right_eyelid_hood_end: 25,
        right_brow_head: 26, right_brow_inner_corner: 27,
        right_brow_arch: 28, right_brow_peak: 29, right_brow_tail: 30,
        right_upper_eyelid_crease: 31,
        nasal_base: 32, nose_bottom: 33,
        left_nose_bridge: 34, right_nose_bridge: 35,
        left_mouth_corner: 36, right_mouth_corner: 37,
        cupids_bow: 38, inner_cupids_bow: 39,
        mouth_middle: 40,
        left_upper_jaw_angle: 41, right_upper_jaw_angle: 42,
        left_lower_jaw_angle: 43, right_lower_jaw_angle: 44,
        left_chin: 45, right_chin: 46,
        left_cheekbone: 47, right_cheekbone: 48,
      }
      currentLandmarks.forEach((lm, idx) => {
        const color = lm.color || (isFemaleAccent ? "#ec4899" : "#38bdf8")
        const px = lm.x * drawWidth + drawX
        const py = lm.y * drawHeight + drawY
        ctx.shadowBlur = 5
        ctx.shadowColor = color
        ctx.beginPath(); ctx.arc(px, py, 3, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill()
        ctx.beginPath(); ctx.arc(px, py, 1.5, 0, 2 * Math.PI); ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill()
        ctx.shadowBlur = 0
        // Draw number label for front profile
        if (profileView === "front") {
          const num = FRONT_LANDMARK_ORDER[lm.id]
          if (num !== undefined) {
            ctx.font = "bold 9px sans-serif"
            ctx.fillStyle = "rgba(255,255,255,0.85)"
            ctx.textAlign = "center"
            ctx.textBaseline = "bottom"
            ctx.fillText(String(num), px, py - 6)
          }
        }
      })
    }

    // Only draw measurement visual when one is selected
    if (selectedMeasurement) {
      drawMeasurement(ctx, selectedMeasurement.id, lmMap, drawX, drawY, drawWidth, drawHeight, 0.9, selectedMeasurement.value)
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
              {(["front","side"] as const).map(t => (
                <button key={t} onClick={() => { setActiveTab(t); setSelectedMeasurement(null); if (t === "front" && profileView !== "front") { setProfileView("front"); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); setImageLoaded(false) } else if (t === "side" && profileView !== "side") { setProfileView("side"); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); setImageLoaded(false) } }} className={`flex-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${activeTab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/50"}`}>
                  {t === "front" ? `Front (${results?.frontMeasurements.length || 0})` : `Side (${results?.sideMeasurements.length || 0})`}
                </button>
              ))}
            </div>
            <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
              {sortedMeasurements.length === 0 ? <div className="text-center py-8 text-xs text-muted-foreground">No measurements found</div> : sortedMeasurements.map(m => (
                <MeasurementCard key={m.id} measurement={m} isSelected={selectedMeasurement?.id === m.id} onClick={() => handleMeasurementClick(m)} onHover={() => setSelectedMeasurement(m)} />
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