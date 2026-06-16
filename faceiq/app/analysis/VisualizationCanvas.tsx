"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ZoomIn, ZoomOut, Maximize2, Grid3x3, Eye, EyeOff } from "lucide-react"
import type { MeasurementResult } from "@/lib/analysis/types"

interface VisualizationCanvasProps {
  imageUrl: string
  measurementId: string | null
  profileType: "front" | "side"
}

export function VisualizationCanvas({ imageUrl, measurementId, profileType }: VisualizationCanvasProps) {
  const profileView = profileType
  const selectedMeasurement = measurementId ? { id: measurementId } as MeasurementResult : null
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [showGrid, setShowGrid] = useState(false)
  const [showMeasurements, setShowMeasurements] = useState(true)

  const drawVisualization = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.src = imageUrl
    img.onload = () => {
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
        drawWidth = canvas.width
        drawHeight = drawWidth / imgAspectRatio
        drawX = 0
        drawY = (canvas.height - drawHeight) / 2
      } else {
        drawHeight = canvas.height
        drawWidth = drawHeight * imgAspectRatio
        drawX = (canvas.width - drawWidth) / 2
        drawY = 0
      }

      ctx.save()
      const zoomCenterX = canvas.width / 2
      const zoomCenterY = canvas.height / 2
      ctx.translate(zoomCenterX + panOffset.x, zoomCenterY + panOffset.y)
      ctx.scale(zoomLevel, zoomLevel)
      ctx.translate(-zoomCenterX, -zoomCenterY)
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

      if (showGrid) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)"
        ctx.lineWidth = 1
        const gridSize = 50
        for (let x = drawX; x < drawX + drawWidth; x += gridSize) {
          ctx.beginPath(); ctx.moveTo(x, drawY); ctx.lineTo(x, drawY + drawHeight); ctx.stroke()
        }
        for (let y = drawY; y < drawY + drawHeight; y += gridSize) {
          ctx.beginPath(); ctx.moveTo(drawX, y); ctx.lineTo(drawX + drawWidth, y); ctx.stroke()
        }
      }

      if (showMeasurements && selectedMeasurement) {
        const landmarks = JSON.parse(
          localStorage.getItem(profileView === "front" ? "frontLandmarks" : "sideLandmarks") || "[]"
        )
        // Denormalize landmark coordinates from 0-1 ratio to pixel positions
        const lm = landmarks.reduce((acc: any, l: any) => {
          acc[l.id] = { ...l, x: l.x * drawWidth, y: l.y * drawHeight }
          return acc
        }, {} as Record<string, any>)
        drawMeasurementOnCanvas(ctx, selectedMeasurement.id, lm, drawX, drawY, drawWidth, drawHeight)
      }

      ctx.restore()
    }
  }, [selectedMeasurement, profileView, zoomLevel, panOffset, showGrid, showMeasurements, imageUrl])

  useEffect(() => { drawVisualization() }, [drawVisualization])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    setLastMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    if (zoomLevel > 1) setIsPanning(true)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanning || zoomLevel <= 1) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top
    setPanOffset(prev => ({ x: prev.x + (currentX - lastMousePos.x), y: prev.y + (currentY - lastMousePos.y) }))
    setLastMousePos({ x: currentX, y: currentY })
  }

  const handleMouseUp = () => setIsPanning(false)
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 4))
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))
  const handleResetZoom = () => { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }) }

  return (
    <div className="flex flex-col flex-1">
      <div className="p-1.5 border-b border-border/50 bg-card/30 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={handleZoomIn} className="p-1 hover:bg-secondary/50 rounded transition-colors" title="Zoom In">
            <ZoomIn className="size-3 text-foreground" />
          </button>
          <button onClick={handleZoomOut} className="p-1 hover:bg-secondary/50 rounded transition-colors" title="Zoom Out">
            <ZoomOut className="size-3 text-foreground" />
          </button>
          <button onClick={handleResetZoom} className="p-1 hover:bg-secondary/50 rounded transition-colors" title="Reset Zoom">
            <Maximize2 className="size-3 text-foreground" />
          </button>
          <span className="text-[10px] text-muted-foreground px-1">{Math.round(zoomLevel * 100)}%</span>
          <div className="w-px h-3 bg-border/50 mx-1" />
          <button onClick={() => setShowGrid(!showGrid)}
            className={`p-1 rounded transition-colors ${showGrid ? "bg-secondary/70" : "hover:bg-secondary/50"}`} title="Toggle Grid">
            <Grid3x3 className="size-3 text-foreground" />
          </button>
          <button onClick={() => setShowMeasurements(!showMeasurements)}
            className={`p-1 rounded transition-colors ${showMeasurements ? "bg-secondary/70" : "hover:bg-secondary/50"}`} title="Toggle Measurements">
            {showMeasurements ? <Eye className="size-3 text-foreground" /> : <EyeOff className="size-3 text-foreground" />}
          </button>
        </div>
        {selectedMeasurement && (
          <div className="text-xs text-foreground font-medium truncate max-w-[300px]">
            {selectedMeasurement.name}
          </div>
        )}
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-black/40">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {!selectedMeasurement && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center space-y-2">
              <Eye className="size-8 text-muted-foreground/50 mx-auto" />
              <p className="text-xs text-muted-foreground">Select a measurement from the left panel to visualize</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function drawMeasurementOnCanvas(
  ctx: CanvasRenderingContext2D,
  measurementId: string,
  lm: Record<string, { x: number; y: number }>,
  drawX: number, drawY: number, drawWidth: number, drawHeight: number
) {
  const color = "#38bdf8"
  const highlightColor = "#fbbf24"
  const angleColor = "#f472b6"
  const textColor = "#ffffff"
  const dimColor = "rgba(255,255,255,0.3)"

  ctx.lineWidth = 2
  ctx.setLineDash([])

  const drawLine = (p1: any, p2: any, c: string = color) => {
    if (!p1 || !p2) return
    ctx.strokeStyle = c
    ctx.beginPath()
    ctx.moveTo(p1.x + drawX, p1.y + drawY)
    ctx.lineTo(p2.x + drawX, p2.y + drawY)
    ctx.stroke()
  }

  const drawAngle = (vertex: any, p1: any, p2: any, c: string = angleColor) => {
    if (!vertex || !p1 || !p2) return
    const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x)
    const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x)
    const radius = 30
    ctx.strokeStyle = c
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(vertex.x + drawX, vertex.y + drawY, radius, a1, a2)
    ctx.stroke()
    ctx.lineWidth = 2
  }

  const drawPoint = (p: any, c: string = color) => {
    if (!p) return
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(p.x + drawX, p.y + drawY, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 1
    ctx.stroke()
  }

  const drawLabel = (_p: any, _text: string, _c?: string) => {
    // No-op: labels removed from all measurements
  }

  const drawDashedLine = (p1: any, p2: any, c: string = dimColor) => {
    if (!p1 || !p2) return
    ctx.strokeStyle = c
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(p1.x + drawX, p1.y + drawY)
    ctx.lineTo(p2.x + drawX, p2.y + drawY)
    ctx.stroke()
    ctx.setLineDash([])
  }

  const drawHLine = (y: number, c: string = dimColor) => {
    ctx.strokeStyle = c
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(drawX, y + drawY)
    ctx.lineTo(drawX + drawWidth, y + drawY)
    ctx.stroke()
    ctx.setLineDash([])
  }

  const drawVLine = (x: number, c: string = dimColor) => {
    ctx.strokeStyle = c
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(x + drawX, drawY)
    ctx.lineTo(x + drawX, drawY + drawHeight)
    ctx.stroke()
    ctx.setLineDash([])
  }

  const drawDimensionLine = (p1: any, p2: any, _label: string, c: string = highlightColor) => {
    if (!p1 || !p2) return
    drawLine(p1, p2, c)
  }

  const drawAngleArc = (vertex: any, p1: any, p2: any, _label: string, c: string = angleColor) => {
    if (!vertex || !p1 || !p2) return
    const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x)
    const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x)
    const radius = 30
    ctx.strokeStyle = c
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(vertex.x + drawX, vertex.y + drawY, radius, a1, a2)
    ctx.stroke()
  }

  const drawSLine = (p1: any, p2: any, c: string = "#f97316") => {
    if (!p1 || !p2) return
    ctx.strokeStyle = c
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.moveTo(p1.x + drawX, p1.y + drawY)
    ctx.lineTo(p2.x + drawX, p2.y + drawY)
    ctx.stroke()
    ctx.setLineDash([])
  }

  const projectPointToLine = (p: any, a: any, b: any) => {
    if (!p || !a || !b) return null
    const abx = b.x - a.x
    const aby = b.y - a.y
    const apx = p.x - a.x
    const apy = p.y - a.y
    const abLenSq = abx * abx + aby * aby
    if (abLenSq === 0) return { x: a.x, y: a.y }
    const t = (apx * abx + apy * aby) / abLenSq
    return { x: a.x + abx * t, y: a.y + aby * t }
  }

  const offsetPoint = (origin: any, directionFrom: any, directionTo: any, length = 40) => {
    if (!origin || !directionFrom || !directionTo) return null
    const vx = directionTo.x - directionFrom.x
    const vy = directionTo.y - directionFrom.y
    const vLen = Math.hypot(vx, vy)
    if (vLen === 0) return { x: origin.x, y: origin.y }
    return { x: origin.x + (vx / vLen) * length, y: origin.y + (vy / vLen) * length }
  }

  switch (measurementId) {
    // ============================================================
    // FRONT PROFILE VISUALIZATIONS (33)
    // ============================================================

    case "lateral_canthal_tilt": {
      const leftInner = lm["left_medial_canthus"]
      const leftOuter = lm["left_lateral_canthus"]
      const rightInner = lm["right_medial_canthus"]
      const rightOuter = lm["right_lateral_canthus"]
      const drawTilt = (inner: any, outer: any, arcLabel: string, arcColor: string) => {
        if (!inner || !outer) return
        drawLine(inner, outer, highlightColor)
        drawHLine(inner.y)
        drawPoint(inner, highlightColor)
        drawPoint(outer, highlightColor)
        const a1 = Math.atan2(0, 1)
        const a2 = Math.atan2(outer.y - inner.y, outer.x - inner.x)
        ctx.strokeStyle = arcColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(inner.x + drawX, inner.y + drawY, 22, a1, a2)
        ctx.stroke()
        const midA = (a1 + a2) / 2
        ctx.fillStyle = arcColor
        ctx.font = "bold 10px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(arcLabel, inner.x + drawX + 32 * Math.cos(midA), inner.y + drawY + 32 * Math.sin(midA))
      }
      drawTilt(leftInner, leftOuter, "L", angleColor)
      drawTilt(rightInner, rightOuter, "R", angleColor)
      break
    }

    case "nose_bridge_to_width": {
      const lb = lm["left_nose_bridge"]     // 34
      const rb = lm["right_nose_bridge"]    // 35
      const ls = lm["left_nose_side"]       // 4
      const rs = lm["right_nose_side"]      // 5
      if (lb && rb && ls && rs) {
        // Highlighted line: (4,5) = nose side width
        drawLine(ls, rs, highlightColor)
        // Dim line: (34,35) = nose bridge width
        drawLine(lb, rb, color)
        drawPoint(ls, highlightColor)
        drawPoint(rs, highlightColor)
        drawPoint(lb, color)
        drawPoint(rb, color)
        // Calculate ratio = bridgeWidth / noseWidth
        const bridgeW = Math.sqrt((rb.x - lb.x) ** 2 + (rb.y - lb.y) ** 2)
        const noseW = Math.sqrt((rs.x - ls.x) ** 2 + (rs.y - ls.y) ** 2)
        const ratio = noseW > 0 ? bridgeW / noseW : 0
        // Display ratio above highlighted line
        const midX = (ls.x + rs.x) / 2 + drawX
        const midY = (ls.y + rs.y) / 2 + drawY - 12
        ctx.font = "bold 11px sans-serif"
        ctx.fillStyle = highlightColor
        ctx.textAlign = "center"
        ctx.fillText(`${ratio.toFixed(2)}`, midX, midY)
      }
      break
    }

    case "bitemporal_width": {
      const tl = lm["left_temple"]
      const tr = lm["right_temple"]
      const zl = lm["left_cheekbone"]
      const zr = lm["right_cheekbone"]
      if (tl && tr && zl && zr) {
        drawDimensionLine(tl, tr, "Bitemporal", highlightColor)
        drawDimensionLine(zl, zr, "Bizygomatic", color)
        drawPoint(tl, highlightColor)
        drawPoint(tr, highlightColor)
        drawPoint(zl, color)
        drawPoint(zr, color)
      }
      break
    }

    case "cheekbone_height": {
      const leftCheek = lm["left_cheekbone"]
      const rightCheek = lm["right_cheekbone"]
      const leftPupil = lm["left_pupil"]
      const rightPupil = lm["right_pupil"]
      const cb = lm["cupids_bow"]
      if (leftCheek && rightCheek && cb && leftPupil && rightPupil) {
        drawLine(leftCheek, rightCheek, dimColor)
        drawLine(leftPupil, rightPupil, dimColor)
        const cheekProj = projectPointToLine(cb, leftCheek, rightCheek)
        const pupilProj = projectPointToLine(cb, leftPupil, rightPupil)
        if (cheekProj) drawDashedLine(cb, cheekProj, highlightColor)
        if (pupilProj) drawDashedLine(cb, pupilProj, color)
        drawPoint(cb, highlightColor)
        drawPoint(leftCheek, dimColor)
        drawPoint(rightCheek, dimColor)
        drawPoint(leftPupil, dimColor)
        drawPoint(rightPupil, dimColor)
      }
      break
    }

    case "cupids_bow_depth": {
      const peak = lm["cupids_bow"]
      const dip = lm["inner_cupids_bow"]
      if (peak && dip) {
        drawLine(peak, dip, highlightColor)
        drawPoint(peak, color)
        drawPoint(dip, highlightColor)
        drawLabel(peak, "Peak")
        drawLabel(dip, "Dip")
        // Vertical dimension line
        const midX = (peak.x + dip.x) / 2
        drawDashedLine({ x: midX, y: peak.y }, { x: midX, y: dip.y }, highlightColor)
      }
      break
    }

    case "bigonial_width": {
      // a = distance between left & right UPPER jaw angles; b = bizygomatic (cheekbone) width
      const gl = lm["left_upper_jaw_angle"]
      const gr = lm["right_upper_jaw_angle"]
      const zl = lm["left_cheekbone"]
      const zr = lm["right_cheekbone"]
      if (gl && gr && zl && zr) {
        drawDimensionLine(gl, gr, "Bigonial", highlightColor)
        drawDimensionLine(zl, zr, "Bizygomatic", color)
        drawPoint(gl, highlightColor)
        drawPoint(gr, highlightColor)
        drawPoint(zl, color)
        drawPoint(zr, color)
      }
      break
    }


    case "jaw_slope": {
      const leftCheek = lm["left_cheekbone"]
      const leftUpper = lm["left_upper_jaw_angle"]
      const leftLower = lm["left_lower_jaw_angle"]
      const leftChin = lm["left_chin"] || lm["chin_bottom"]
      const rightCheek = lm["right_cheekbone"]
      const rightUpper = lm["right_upper_jaw_angle"]
      const rightLower = lm["right_lower_jaw_angle"]
      const rightChin = lm["right_chin"] || lm["chin_bottom"]
      const drawJawSlope = (cheek: any, upper: any, lower: any, chin: any, arcLabel: string) => {
        if (!cheek || !upper || !lower || !chin) return
        drawLine(cheek, upper, highlightColor)
        drawLine(lower, chin, color)
        const arcEnd = offsetPoint(upper, lower, chin, 35)
        if (arcEnd) drawAngleArc(upper, cheek, arcEnd, arcLabel, angleColor)
        drawPoint(upper, highlightColor)
        drawPoint(cheek, color)
        drawPoint(lower, color)
        drawPoint(chin, color)
      }
      drawJawSlope(leftCheek, leftUpper, leftLower, leftChin, "L")
      drawJawSlope(rightCheek, rightUpper, rightLower, rightChin, "R")
      break
    }

    case "top_third":
    case "middle_third":
    case "lower_third": {
      // Show all 3 facial thirds; active = white glow, inactive = dim
      const hair = lm["hairline"]
      const chin = lm["chin_bottom"]
      const nasalBase = lm["nasal_base"]
      const lbh = lm["left_brow_head"], lbi = lm["left_brow_inner_corner"]
      const rbh = lm["right_brow_head"], rbi = lm["right_brow_inner_corner"]
      if (hair && chin && nasalBase && lbh && lbi && rbh && rbi) {
        const browY = (lbh.y + lbi.y + rbh.y + rbi.y) / 4
        const midX = (lbh.x + lbi.x + rbh.x + rbi.x) / 4
        const totalH = chin.y - hair.y
        const topPct = Number(((browY - hair.y) / totalH * 100).toFixed(1))
        const midPct = Number(((nasalBase.y - browY) / totalH * 100).toFixed(1))
        const lowPct = Number(((chin.y - nasalBase.y) / totalH * 100).toFixed(1))
        const DIM = "rgba(255,255,255,0.4)"
        const GLOW = "rgba(255,255,255,0.95)"
        const drawSegment = (y1: number, y2: number, color: string, pct: number, glow: boolean) => {
          if (glow) { ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)" }
          drawLine({ x: midX, y: y1 }, { x: midX, y: y2 }, color)
          drawPoint({ x: midX, y: y1 }, color)
          drawPoint({ x: midX, y: y2 }, color)
          ctx.font = "bold 14px sans-serif"; ctx.fillStyle = color; ctx.textAlign = "left"; ctx.textBaseline = "middle"
          ctx.fillText(`${pct}%`, midX + drawX + 8, (y1 + y2) / 2 + drawY)
          ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        }
        drawSegment(hair.y, browY, measurementId === "top_third" ? GLOW : DIM, topPct, measurementId === "top_third")
        drawSegment(browY, nasalBase.y, measurementId === "middle_third" ? GLOW : DIM, midPct, measurementId === "middle_third")
        drawSegment(nasalBase.y, chin.y, measurementId === "lower_third" ? GLOW : DIM, lowPct, measurementId === "lower_third")
      }
      break
    }

    case "eye_aspect_ratio": {
      const GLOW = "rgba(255,255,255,0.95)"
      const DIM = "rgba(255,255,255,0.4)"
      // Left eye
      const lue = lm["left_upper_eyelid"], lle = lm["left_lower_eyelid"]
      const lmc = lm["left_medial_canthus"], llc = lm["left_lateral_canthus"]
      if (lue && lle && lmc && llc) {
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawLine(lmc, llc, GLOW); drawPoint(lmc, GLOW); drawPoint(llc, GLOW)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        drawLine(lue, lle, DIM); drawPoint(lue, DIM); drawPoint(lle, DIM)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        const lW = Math.abs(llc.x - lmc.x) / drawWidth; const lH = Math.abs(lle.y - lue.y) / drawHeight
        const lRatio = lH > 0 ? Number((lW / lH).toFixed(2)) : 0
        ctx.font = "bold 12px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "left"; ctx.textBaseline = "middle"
        ctx.fillText(`${lRatio}`, Math.max(llc.x, lmc.x) + drawX + 6, (lue.y + lle.y) / 2 + drawY)
      }
      // Right eye
      const rue = lm["right_upper_eyelid"], rle = lm["right_lower_eyelid"]
      const rmc = lm["right_medial_canthus"], rlc = lm["right_lateral_canthus"]
      if (rue && rle && rmc && rlc) {
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawLine(rmc, rlc, GLOW); drawPoint(rmc, GLOW); drawPoint(rlc, GLOW)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        drawLine(rue, rle, DIM); drawPoint(rue, DIM); drawPoint(rle, DIM)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        const rW = Math.abs(rlc.x - rmc.x) / drawWidth; const rH = Math.abs(rle.y - rue.y) / drawHeight
        const rRatio = rH > 0 ? Number((rW / rH).toFixed(2)) : 0
        ctx.font = "bold 12px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "right"; ctx.textBaseline = "middle"
        ctx.fillText(`${rRatio}`, Math.min(rmc.x, rlc.x) + drawX - 6, (rue.y + rle.y) / 2 + drawY)
      }
      break
    }

    case "mouth_corner_position": {
      const ml = lm["left_mouth_corner"]
      const mr = lm["right_mouth_corner"]
      const mouthMid = lm["mouth_middle"]
      if (ml && mr && mouthMid) {
        // Horizontal dashed line through mouth_middle (point 40)
        drawHLine(mouthMid.y, highlightColor)
        // Vertical highlighted lines from points 36 and 37 down to the horizontal line
        drawLine(ml, { x: ml.x, y: mouthMid.y }, highlightColor)
        drawLine(mr, { x: mr.x, y: mouthMid.y }, highlightColor)
        drawPoint(ml, highlightColor)
        drawPoint(mr, highlightColor)
        drawPoint(mouthMid, highlightColor)
        // Signed distances: positive if point above line (smaller y in image coords)
        const distL = mouthMid.y - ml.y  // positive if ml is above mouthMid
        const distR = mouthMid.y - mr.y  // positive if mr is above mouthMid
        const avgDist = (distL + distR) / 2
        // Display averaged signed distance near the horizontal line
        const labelX = (ml.x + mr.x) / 2 + drawX
        const labelY = mouthMid.y + drawY + 18
        ctx.font = "bold 11px sans-serif"
        ctx.fillStyle = highlightColor
        ctx.textAlign = "center"
        ctx.fillText(`${avgDist.toFixed(1)}`, labelX, labelY)
      }
      break
    }

    case "eye_separation_ratio": {
      const lp = lm["left_pupil"]
      const rp = lm["right_pupil"]
      const lc = lm["left_cheekbone"]
      const rc = lm["right_cheekbone"]
      if (lp && rp && lc && rc) {
        drawDimensionLine(lp, rp, "Pupils", highlightColor)
        drawDimensionLine(lc, rc, "Cheekbones", color)
        drawPoint(lp, highlightColor)
        drawPoint(rp, highlightColor)
        drawPoint(lc, color)
        drawPoint(rc, color)
      }
      break
    }

    case "eyebrow_tilt": {
      // Left: mid(15,16) → mid(17,18), Right: mid(26,27) → mid(28,29)
      // Signed angle from horizontal, positive = upward
      const mid = (a: any, b: any) => (a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null)
      const drawBrowTilt = (head: any, inner: any, arch: any, peak: any) => {
        const start = mid(head, inner)
        const end = mid(arch, peak)
        if (!start || !end) return
        drawLine(start, end, highlightColor)
        drawPoint(start, highlightColor)
        drawPoint(end, highlightColor)
        // Signed angle from horizontal (atan2 gives correct sign in image coords)
        const signedAngle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI)
        // Display signed angle above the segment
        const midPt = { x: (start.x + end.x) / 2 + drawX, y: (start.y + end.y) / 2 + drawY }
        ctx.font = "bold 11px sans-serif"
        ctx.fillStyle = highlightColor
        ctx.textAlign = "center"
        ctx.textBaseline = "bottom"
        ctx.fillText(`${signedAngle.toFixed(1)}°`, midPt.x, midPt.y - 5)
      }
      drawBrowTilt(lm["left_brow_head"], lm["left_brow_inner_corner"], lm["left_brow_arch"], lm["left_brow_peak"])
      drawBrowTilt(lm["right_brow_head"], lm["right_brow_inner_corner"], lm["right_brow_arch"], lm["right_brow_peak"])
      break
    }


    case "face_width_to_height": {
      const zl = lm["left_cheekbone"]
      const zr = lm["right_cheekbone"]
      const lbh = lm["left_brow_head"], lbi = lm["left_brow_inner_corner"]
      const rbh = lm["right_brow_head"], rbi = lm["right_brow_inner_corner"]
      const cp = lm["cupids_bow"]
      if (zl && zr && lbh && lbi && rbh && rbi && cp) {
        const browY = (lbh.y + lbi.y + rbh.y + rbi.y) / 4
        const midX = (lbh.x + lbi.x + rbh.x + rbi.x) / 4
        const fw = Math.abs(zr.x - zl.x)
        const fh = Math.abs(cp.y - browY)
        const ratio = Number((fw / fh).toFixed(2))
        const GLOW = "rgba(255,255,255,0.95)"
        const DIM = "rgba(255,255,255,0.4)"
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawLine(zl, zr, GLOW)
        drawPoint(zl, GLOW); drawPoint(zr, GLOW)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        ctx.font = "bold 14px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "left"; ctx.textBaseline = "bottom"
        ctx.fillText(`${ratio}`, Math.max(zl.x, zr.x) + drawX + 8, zl.y + drawY - 8)
        drawLine({ x: midX, y: browY }, { x: midX, y: cp.y }, DIM)
        drawPoint({ x: midX, y: browY }, DIM); drawPoint({ x: midX, y: cp.y }, DIM)
      }
      break
    }

    case "interpupillary_mouth_width": {
      const rp = lm["right_pupil"]
      const lp = lm["left_pupil"]
      const ml = lm["left_mouth_corner"]
      const mr = lm["right_mouth_corner"]
      if (rp && lp && ml && mr) {
        drawDimensionLine(rp, lp, "Pupils", highlightColor)
        drawDimensionLine(ml, mr, "Mouth", color)
        drawPoint(rp, highlightColor)
        drawPoint(lp, highlightColor)
        drawPoint(ml, color)
        drawPoint(mr, color)
      }
      break
    }

    case "jaw_frontal_angle": {
      // Connect (43,45) and (44,46) with highlighted lines, extend them to intersect
      const gl = lm["left_lower_jaw_angle"]    // 43
      const gr = lm["right_lower_jaw_angle"]   // 44
      const lc = lm["left_chin"]               // 45
      const rc = lm["right_chin"]              // 46
      if (gl && gr && lc && rc) {
        // Draw original lines highlighted
        drawLine(gl, lc, highlightColor)
        drawLine(gr, rc, highlightColor)
        // Find intersection point of the two extended lines
        // Line 1: gl→lc, Line 2: gr→rc
        // Parametric: L1 = gl + t*(lc-gl), L2 = gr + u*(rc-gr)
        const dx1 = lc.x - gl.x, dy1 = lc.y - gl.y
        const dx2 = rc.x - gr.x, dy2 = rc.y - gr.y
        const det = dx1 * dy2 - dy1 * dx2
        if (Math.abs(det) > 0.001) {
          // Extend far enough for intersection
          const extFactor = 5
          const l1End = { x: gl.x + dx1 * extFactor, y: gl.y + dy1 * extFactor }
          const l2End = { x: gr.x + dx2 * extFactor, y: gr.y + dy2 * extFactor }
          // Compute intersection using extended points
          const ex1 = l1End.x - gl.x, ey1 = l1End.y - gl.y
          const ex2 = l2End.x - gr.x, ey2 = l2End.y - gr.y
          const det2 = ex1 * ey2 - ey1 * ex2
          if (Math.abs(det2) > 0.001) {
            const t = ((gr.x - gl.x) * ey2 - (gr.y - gl.y) * ex2) / det2
            const apex = { x: gl.x + ex1 * t, y: gl.y + ey1 * t }
            // Draw angle arc at intersection
            const angleDeg = Math.abs(Math.atan2(det, dx1 * dx2 + dy1 * dy2)) * (180 / Math.PI)
            const finalAngle = angleDeg > 180 ? 360 - angleDeg : angleDeg
            const a1 = Math.atan2(lc.y - gl.y, lc.x - gl.x)
            const a2 = Math.atan2(rc.y - gr.y, rc.x - gr.x)
            ctx.strokeStyle = angleColor
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(apex.x + drawX, apex.y + drawY, 30, a1, a2)
            ctx.stroke()
            // Display angle value
            const midA = (a1 + a2) / 2
            ctx.fillStyle = angleColor
            ctx.font = "bold 11px sans-serif"
            ctx.textAlign = "center"
            ctx.fillText(`${finalAngle.toFixed(1)}°`, apex.x + drawX + 40 * Math.cos(midA), apex.y + drawY + 40 * Math.sin(midA))
          }
        }
        drawPoint(gl, color); drawPoint(gr, color)
        drawPoint(lc, highlightColor); drawPoint(rc, highlightColor)
      }
      break
    }


    case "intercanthal_nasal_width": {
      const ri = lm["right_medial_canthus"]
      const li = lm["left_medial_canthus"]
      const ls = lm["left_nose_side"]
      const rs = lm["right_nose_side"]
      if (ri && li && ls && rs) {
        drawDimensionLine(ri, li, "Intercanthal", highlightColor)
        drawDimensionLine(ls, rs, "Nasal", color)
        drawPoint(ri, highlightColor)
        drawPoint(li, highlightColor)
        drawPoint(ls, color)
        drawPoint(rs, color)
      }
      break
    }

    case "one_eye_apart": {
      const li = lm["left_medial_canthus"]     // 10
      const ri = lm["right_medial_canthus"]    // 21
      const llo = lm["left_lateral_canthus"]    // 11
      const rlo = lm["right_lateral_canthus"]   // 22
      if (li && ri && llo && rlo) {
        // Lines (10,11) and (21,22) - eye widths
        drawLine(li, llo, color)
        drawLine(ri, rlo, color)
        // Highlighted line (10,21) - intercanthal distance
        drawLine(li, ri, highlightColor)
        drawPoint(li, highlightColor)
        drawPoint(ri, highlightColor)
        drawPoint(llo, color)
        drawPoint(rlo, color)
        // Calculate and display ratio
        const intercanthal = Math.sqrt((ri.x - li.x) ** 2 + (ri.y - li.y) ** 2)
        const leftEyeW = Math.sqrt((llo.x - li.x) ** 2 + (llo.y - li.y) ** 2)
        const rightEyeW = Math.sqrt((rlo.x - ri.x) ** 2 + (rlo.y - ri.y) ** 2)
        const avgEyeW = (leftEyeW + rightEyeW) / 2
        const ratio = avgEyeW > 0 ? intercanthal / avgEyeW : 0
        // Display ratio above highlighted line
        const midX = (li.x + ri.x) / 2 + drawX
        const midY = (li.y + ri.y) / 2 + drawY - 12
        ctx.font = "bold 11px sans-serif"
        ctx.fillStyle = highlightColor
        ctx.textAlign = "center"
        ctx.fillText(`${ratio.toFixed(2)}`, midX, midY)
      }
      break
    }

    case "midface_ratio": {
      const rp = lm["right_pupil"]
      const lp = lm["left_pupil"]
      const icb = lm["inner_cupids_bow"]
      if (rp && lp && icb) {
        // Draw interpupillary line (width)
        drawDimensionLine(rp, lp, "Width", highlightColor)
        drawPoint(rp, highlightColor)
        drawPoint(lp, highlightColor)
        const proj = projectPointToLine(icb, lp, rp)
        if (proj) {
          drawDashedLine(icb, proj, color)
          drawPoint(proj, dimColor)
        }
        drawPoint(icb, color)
        drawLabel(icb, "Inner Cupid's Bow")
        drawLabel(rp, "Right Pupil")
        drawLabel(lp, "Left Pupil")
      }
      break
    }

    case "ipsilateral_alar_angle": {
      const base = lm["nasal_base"]
      const left = lm["left_eyelid_hood_end"]
      const right = lm["right_eyelid_hood_end"]
      if (base && left && right) {
        drawLine(base, left, color)
        drawLine(base, right, color)
        drawAngleArc(base, left, right, "IAA", angleColor)
        drawPoint(base, highlightColor)
        drawPoint(left, color)
        drawPoint(right, color)
      }
      break
    }

    case "mouth_width_to_nose_width": {
      const ml = lm["left_mouth_corner"]
      const mr = lm["right_mouth_corner"]
      const nl = lm["left_nose_side"]
      const nr = lm["right_nose_side"]
      if (ml && mr && nl && nr) {
        drawDimensionLine(ml, mr, "Mouth", highlightColor)
        drawDimensionLine(nl, nr, "Nose", color)
        drawPoint(ml, highlightColor)
        drawPoint(mr, highlightColor)
        drawPoint(nl, color)
        drawPoint(nr, color)
      }
      break
    }

    case "total_facial_width_to_height": {
      const zl = lm["left_cheekbone"]
      const zr = lm["right_cheekbone"]
      const hair = lm["hairline"]
      const chin = lm["chin_bottom"]
      if (zl && zr && hair && chin) {
        drawDimensionLine(zl, zr, "Width", color)
        drawDimensionLine(hair, chin, "Height", highlightColor)
        drawPoint(zl, color)
        drawPoint(zr, color)
        drawPoint(hair, highlightColor)
        drawPoint(chin, highlightColor)
      }
      break
    }

    case "chin_to_philtrum": {
      const llc = lm["lower_lip_center"]
      const cb = lm["chin_bottom"]
      const cp = lm["cupids_bow"]
      const nb = lm["nasal_base"]
      if (llc && cb && cp && nb) {
        const chinH = Math.abs(cb.y - llc.y)
        const philH = Math.abs(cp.y - nb.y)
        const ratio = Number((chinH / philH).toFixed(2))
        const GLOW = "rgba(255,255,255,0.95)"
        const DIM = "rgba(255,255,255,0.4)"
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawLine(llc, cb, GLOW)
        drawPoint(llc, GLOW); drawPoint(cb, GLOW)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        ctx.font = "bold 14px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "left"; ctx.textBaseline = "middle"
        ctx.fillText(`${ratio}`, Math.max(llc.x, cb.x) + drawX + 8, (llc.y + cb.y) / 2 + drawY)
        drawLine(cp, nb, DIM)
        drawPoint(cp, DIM); drawPoint(nb, DIM)
      }
      break
    }

    case "eyebrow_low_setedness": {
      const lUpper = lm["left_upper_eyelid"]
      const lLower = lm["left_lower_eyelid"]
      const rUpper = lm["right_upper_eyelid"]
      const rLower = lm["right_lower_eyelid"]
      const lp = lm["left_pupil"]
      const rp = lm["right_pupil"]
      const lBrow = lm["left_brow_inner_corner"]
      const rBrow = lm["right_brow_inner_corner"]
      if (lUpper && lLower && rUpper && rLower && lp && rp && lBrow && rBrow) {
        // Solid lines for eye heights: (23,24) and (12,13)
        drawLine(rUpper, rLower, dimColor)
        drawLine(lUpper, lLower, dimColor)
        // Dashed lines for pupils and brow inner corners: (2,3) and (16,27)
        drawDashedLine(lp, rp, dimColor)
        drawDashedLine(lBrow, rBrow, dimColor)
        // Midpoints
        const pupilMid = { x: (lp.x + rp.x) / 2, y: (lp.y + rp.y) / 2 }
        const browMid = { x: (lBrow.x + rBrow.x) / 2, y: (lBrow.y + rBrow.y) / 2 }
        // Highlighted line connecting midpoints
        drawLine(pupilMid, browMid, highlightColor)
        drawPoint(pupilMid, highlightColor)
        drawPoint(browMid, highlightColor)
        // Calculate: a = avg of eye heights, ratio = highlighted / a
        const leftEyeH = Math.abs(lLower.y - lUpper.y)
        const rightEyeH = Math.abs(rLower.y - rUpper.y)
        const a = (leftEyeH + rightEyeH) / 2
        const highlightedLen = Math.sqrt((browMid.x - pupilMid.x) ** 2 + (browMid.y - pupilMid.y) ** 2)
        const ratio = a > 0 ? highlightedLen / a : 0
        // Display ratio next to highlighted line
        const midX = (pupilMid.x + browMid.x) / 2 + drawX
        const midY = (pupilMid.y + browMid.y) / 2 + drawY
        ctx.font = "bold 11px sans-serif"
        ctx.fillStyle = highlightColor
        ctx.textAlign = "left"
        ctx.textBaseline = "middle"
        ctx.fillText(`${ratio.toFixed(2)}`, midX + 5, midY)
      }
      break
    }

    case "brow_length_to_face_width": {
      // Connect (16,19) and (27,30) highlighted, connect (47,48)
      // ratio = avg((16,19), (27,30)) / (47,48)
      const li = lm["left_brow_inner_corner"]   // 16
      const lt = lm["left_brow_tail"]            // 19
      const ri = lm["right_brow_inner_corner"]   // 27
      const rt = lm["right_brow_tail"]           // 30
      const zl = lm["left_cheekbone"]            // 47
      const zr = lm["right_cheekbone"]           // 48
      if (li && lt && ri && rt && zl && zr) {
        // Highlighted brow length lines
        drawLine(li, lt, highlightColor)
        drawLine(ri, rt, highlightColor)
        drawPoint(li, highlightColor)
        drawPoint(lt, highlightColor)
        drawPoint(ri, highlightColor)
        drawPoint(rt, highlightColor)
        // Face width line
        drawLine(zl, zr, color)
        drawPoint(zl, color)
        drawPoint(zr, color)
        // Calculate ratio
        const leftBrow = Math.sqrt((lt.x - li.x) ** 2 + (lt.y - li.y) ** 2)
        const rightBrow = Math.sqrt((rt.x - ri.x) ** 2 + (rt.y - ri.y) ** 2)
        const avgBrow = (leftBrow + rightBrow) / 2
        const faceW = Math.sqrt((zr.x - zl.x) ** 2 + (zr.y - zl.y) ** 2)
        const ratio = faceW > 0 ? avgBrow / faceW : 0
        // Display ratio above face width line
        const midX = (zl.x + zr.x) / 2 + drawX
        const midY = (zl.y + zr.y) / 2 + drawY - 10
        ctx.font = "bold 11px sans-serif"
        ctx.fillStyle = color
        ctx.textAlign = "center"
        ctx.fillText(`${ratio.toFixed(2)}`, midX, midY)
      }
      break
    }


    case "nose_tip_position": {
      const base = lm["nasal_base"]
      const tip = lm["nose_bottom"]
      if (base && tip) {
        drawLine(base, tip, highlightColor)
        drawPoint(base, color)
        drawPoint(tip, highlightColor)
      }
      break
    }

    case "deviation_iaa_jfa": {
      // Show both IAA and JFA angles
      const base = lm["nasal_base"]
      const left = lm["left_eyelid_hood_end"]
      const right = lm["right_eyelid_hood_end"]
      const gl = lm["left_lower_jaw_angle"]
      const gr = lm["right_lower_jaw_angle"]
      const lc = lm["left_chin"]
      const rc = lm["right_chin"]
      if (base && left && right) {
        drawLine(base, left, color)
        drawLine(base, right, color)
        drawAngleArc(base, left, right, "IAA", angleColor)
        drawPoint(base, color)
        drawPoint(left, color)
        drawPoint(right, color)
      }
      if (gl && gr && lc && rc) {
        drawLine(gl, lc, dimColor)
        drawLine(gr, rc, dimColor)
        const apex = { x: (lc.x + rc.x) / 2, y: (lc.y + rc.y) / 2 }
        drawAngleArc(apex, { x: apex.x + (lc.x - gl.x), y: apex.y + (lc.y - gl.y) }, { x: apex.x + (rc.x - gr.x), y: apex.y + (rc.y - gr.y) }, "JFA", "#a78bfa")
        drawPoint(gl, color)
        drawPoint(gr, color)
        drawPoint(lc, color)
        drawPoint(rc, color)
      }
      break
    }


    case "lower_lip_to_upper_lip": {
      const ll = lm["lower_lip_center"]
      const mouth = lm["mouth_middle"]
      const cupid = lm["cupids_bow"]
      if (ll && mouth && cupid) {
        const lowerH = Math.abs(mouth.y - ll.y)
        const upperH = Math.abs(cupid.y - mouth.y)
        const ratio = upperH > 0 ? Number((lowerH / upperH).toFixed(2)) : 0
        const GLOW = "rgba(255,255,255,0.95)"
        const DIM = "rgba(255,255,255,0.4)"
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,255,255,0.8)"
        drawLine(ll, mouth, GLOW)
        drawPoint(ll, GLOW); drawPoint(mouth, GLOW)
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
        ctx.font = "bold 14px sans-serif"; ctx.fillStyle = GLOW; ctx.textAlign = "left"; ctx.textBaseline = "middle"
        ctx.fillText(`${ratio}`, ll.x + drawX + 8, (ll.y + mouth.y) / 2 + drawY)
        drawLine(mouth, cupid, DIM)
        drawPoint(mouth, DIM); drawPoint(cupid, DIM)
      }
      break
    }

    case "lower_third_proportion": {
      const base = lm["nasal_base"]
      const mouth = lm["mouth_middle"]
      const chin = lm["chin_bottom"]
      if (base && mouth && chin) {
        drawLine(base, chin, dimColor)
        drawLine(base, mouth, highlightColor)
        drawPoint(base, highlightColor)
        drawPoint(mouth, color)
        drawPoint(chin, color)
      }
      break
    }

    // ============================================================
    // SIDE PROFILE VISUALIZATIONS (32)
    // ============================================================

    case "nasal_tip_angle": {
      const tip = lm["nose_tip"]
      const col = lm["columella"]
      const rh = lm["rhinion"]
      if (tip && col && rh) {
        drawLine(col, tip, color)
        drawLine(rh, tip, color)
        drawAngleArc(tip, col, rh, "NTA", angleColor)
        drawPoint(tip, highlightColor)
        drawPoint(col, color)
        drawPoint(rh, color)
      }
      break
    }

    case "nasal_width_to_height": {
      const sub = lm["subalare"]
      const nas = lm["nasal_bridge_root"]
      const tip = lm["nose_tip"]
      if (sub && nas && tip) {
        drawDimensionLine(nas, tip, "Height", color)
        drawDimensionLine(sub, nas, "Width", highlightColor)
        drawPoint(sub, highlightColor)
        drawPoint(nas, color)
        drawPoint(tip, color)
      }
      break
    }

    case "upper_lip_s_line": {
      const ul = lm["upper_lip"]
      const tip = lm["nose_tip"]
      const chin = lm["chin_point"]
      if (ul && tip && chin) {
        drawSLine(tip, chin, "#f97316")
        drawPoint(tip, color)
        drawPoint(chin, color)
        drawPoint(ul, highlightColor)
        drawLabel(ul, "Upper lip")
        // Perpendicular line from upper lip to S-line
        drawDashedLine(ul, { x: ul.x, y: ul.y }, highlightColor)
      }
      break
    }

    case "nasal_projection": {
      const tip = lm["nose_tip"]
      const sub = lm["subnasale"]
      const nas = lm["nasal_bridge_root"]
      if (tip && sub && nas) {
        drawLine(nas, tip, color)
        drawDimensionLine(tip, sub, "Projection", highlightColor)
        drawPoint(tip, highlightColor)
        drawPoint(sub, color)
        drawPoint(nas, color)
      }
      break
    }

    case "nasofrontal_angle": {
      const fore = lm["forehead"]
      const nas = lm["nasal_bridge_root"]
      const tip = lm["nose_tip"]
      if (fore && nas && tip) {
        drawLine(fore, nas, color)
        drawLine(nas, tip, color)
        drawAngleArc(nas, fore, tip, "NFA", angleColor)
        drawPoint(nas, highlightColor)
        drawPoint(fore, color)
        drawPoint(tip, color)
      }
      break
    }

    case "recession_frankfort": {
      const por = lm["porion"]
      const orb = lm["orbitale"]
      const cornea = lm["corneal_apex"]
      if (por && orb && cornea) {
        drawSLine(por, orb, "#f97316")
        drawPoint(por, color)
        drawPoint(orb, color)
        drawPoint(cornea, highlightColor)
        drawLabel(cornea, "Cornea")
        // Perpendicular line
        drawDashedLine(cornea, { x: cornea.x, y: cornea.y }, highlightColor)
      }
      break
    }

    case "holdaway_h_line": {
      const chin = lm["chin_point"]
      const ul = lm["upper_lip"]
      const ll = lm["lower_lip"]
      if (chin && ul && ll) {
        drawSLine(chin, ul, "#f97316")
        drawPoint(chin, color)
        drawPoint(ul, color)
        drawPoint(ll, highlightColor)
        drawLabel(ll, "Lower lip")
        drawDashedLine(ll, { x: ll.x, y: ll.y }, highlightColor)
      }
      break
    }

    case "mentolabial_angle": {
      const ll = lm["lower_lip"]
      const fold = lm["labiomental_fold"]
      const chin = lm["chin_point"]
      if (ll && fold && chin) {
        drawLine(ll, fold, color)
        drawLine(fold, chin, color)
        drawAngleArc(fold, ll, chin, "MLA", angleColor)
        drawPoint(ll, color)
        drawPoint(fold, highlightColor)
        drawPoint(chin, color)
      }
      break
    }

    case "upper_forehead_slope": {
      const hair = lm["hairline_profile"]
      const fore = lm["forehead"]
      if (hair && fore) {
        drawLine(hair, fore, highlightColor)
        drawHLine(hair.y)
        drawPoint(hair, highlightColor)
        drawPoint(fore, color)
        drawLabel(hair, "Hairline")
        drawLabel(fore, "Forehead")
        // Angle arc
        const a1 = Math.atan2(0, 1)
        const a2 = Math.atan2(fore.y - hair.y, fore.x - hair.x)
        ctx.strokeStyle = angleColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(hair.x + drawX, hair.y + drawY, 25, a1, a2)
        ctx.stroke()
        const midA = (a1 + a2) / 2
        ctx.fillStyle = angleColor
        ctx.font = "bold 10px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText("UFS", hair.x + drawX + 35 * Math.cos(midA), hair.y + drawY + 35 * Math.sin(midA))
      }
      break
    }

    case "facial_convexity_nasion": {
      const fore = lm["forehead"]
      const nas = lm["nasal_bridge_root"]
      const chin = lm["chin_point"]
      if (fore && nas && chin) {
        drawLine(fore, nas, color)
        drawLine(nas, chin, color)
        drawAngleArc(nas, fore, chin, "FCN", angleColor)
        drawPoint(nas, highlightColor)
        drawPoint(fore, color)
        drawPoint(chin, color)
      }
      break
    }

    case "anterior_facial_depth": {
      const nas = lm["nasal_bridge_root"]
      const chin = lm["chin_point"]
      const hair = lm["hairline_profile"]
      const chinB = lm["chin_bottom"]
      if (nas && chin && hair && chinB) {
        drawDimensionLine(nas, chin, "Depth", highlightColor)
        drawDimensionLine(hair, chinB, "Height", color)
        drawPoint(nas, highlightColor)
        drawPoint(chin, highlightColor)
        drawPoint(hair, color)
        drawPoint(chinB, color)
      }
      break
    }

    case "upper_lip_e_line": {
      const ul = lm["upper_lip"]
      const tip = lm["nose_tip"]
      const chin = lm["chin_point"]
      if (ul && tip && chin) {
        drawSLine(tip, chin, "#f97316")
        drawPoint(tip, color)
        drawPoint(chin, color)
        drawPoint(ul, highlightColor)
        drawLabel(ul, "Upper lip")
        drawDashedLine(ul, { x: ul.x, y: ul.y }, highlightColor)
      }
      break
    }

    case "submental_cervical_angle": {
      const chin = lm["chin_point"]
      const neck = lm["neck_point"]
      const cerv = lm["cervical_point"]
      if (chin && neck && cerv) {
        drawLine(chin, neck, color)
        drawLine(neck, cerv, color)
        drawAngleArc(neck, chin, cerv, "SCA", angleColor)
        drawPoint(chin, color)
        drawPoint(neck, highlightColor)
        drawPoint(cerv, color)
      }
      break
    }

    case "facial_depth_to_height": {
      const occ = lm["occiput"]
      const gla = lm["glabella"]
      const hair = lm["hairline_profile"]
      const chinB = lm["chin_bottom"]
      if (occ && gla && hair && chinB) {
        drawDimensionLine(occ, gla, "Depth", highlightColor)
        drawDimensionLine(hair, chinB, "Height", color)
        drawPoint(occ, highlightColor)
        drawPoint(gla, highlightColor)
        drawPoint(hair, color)
        drawPoint(chinB, color)
      }
      break
    }

    case "browridge_inclination": {
      const fore = lm["forehead"]
      const gla = lm["glabella"]
      const nas = lm["nasal_bridge_root"]
      if (fore && gla && nas) {
        drawLine(fore, gla, color)
        drawLine(gla, nas, color)
        drawAngleArc(gla, fore, nas, "BIA", angleColor)
        drawPoint(gla, highlightColor)
        drawPoint(fore, color)
        drawPoint(nas, color)
      }
      break
    }

    case "total_facial_convexity": {
      const gla = lm["glabella"]
      const sub = lm["subnasale"]
      const chin = lm["chin_point"]
      if (gla && sub && chin) {
        drawLine(gla, sub, color)
        drawLine(sub, chin, color)
        drawAngleArc(sub, gla, chin, "TFC", angleColor)
        drawPoint(gla, color)
        drawPoint(sub, highlightColor)
        drawPoint(chin, color)
      }
      break
    }

    case "facial_convexity_glabella": {
      const fore = lm["forehead"]
      const gla = lm["glabella"]
      const tip = lm["nose_tip"]
      if (fore && gla && tip) {
        drawLine(fore, gla, color)
        drawLine(gla, tip, color)
        drawAngleArc(gla, fore, tip, "FCG", angleColor)
        drawPoint(gla, highlightColor)
        drawPoint(fore, color)
        drawPoint(tip, color)
      }
      break
    }

    case "orbital_vector": {
      const cornea = lm["corneal_apex"]
      const orb = lm["orbitale"]
      const cheek = lm["cheekbone"]
      if (cornea && orb && cheek) {
        drawSLine(orb, cheek, "#f97316")
        drawPoint(orb, color)
        drawPoint(cheek, color)
        drawPoint(cornea, highlightColor)
        drawLabel(cornea, "Cornea")
        drawDashedLine(cornea, { x: cornea.x, y: cornea.y }, highlightColor)
      }
      break
    }

    case "interior_midface_projection": {
      const sub = lm["subnasale"]
      const tip = lm["nose_tip"]
      const cheek = lm["cheekbone"]
      if (sub && tip && cheek) {
        drawLine(sub, tip, color)
        drawLine(tip, cheek, color)
        drawAngleArc(tip, sub, cheek, "IMPA", angleColor)
        drawPoint(sub, color)
        drawPoint(tip, highlightColor)
        drawPoint(cheek, color)
      }
      break
    }

    case "z_angle": {
      const chin = lm["chin_point"]
      const ul = lm["upper_lip"]
      if (chin && ul) {
        drawLine(chin, ul, highlightColor)
        drawHLine(chin.y)
        drawPoint(chin, highlightColor)
        drawPoint(ul, color)
        drawLabel(chin, "Chin")
        drawLabel(ul, "Upper lip")
        // Angle arc
        const a1 = Math.atan2(0, 1)
        const a2 = Math.atan2(ul.y - chin.y, ul.x - chin.x)
        ctx.strokeStyle = angleColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(chin.x + drawX, chin.y + drawY, 25, a1, a2)
        ctx.stroke()
        const midA = (a1 + a2) / 2
        ctx.fillStyle = angleColor
        ctx.font = "bold 10px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText("ZA", chin.x + drawX + 35 * Math.cos(midA), chin.y + drawY + 35 * Math.sin(midA))
      }
      break
    }

    case "nose_tip_rotation": {
      const tip = lm["nose_tip"]
      const col = lm["columella"]
      const sub = lm["subnasale"]
      if (tip && col && sub) {
        drawLine(col, tip, color)
        drawLine(tip, sub, color)
        drawAngleArc(tip, col, sub, "NTRA", angleColor)
        drawPoint(tip, highlightColor)
        drawPoint(col, color)
        drawPoint(sub, color)
      }
      break
    }

    case "nasolabial_angle": {
      const col = lm["columella"]
      const sub = lm["subnasale"]
      const ul = lm["upper_lip"]
      if (col && sub && ul) {
        drawLine(col, sub, color)
        drawLine(sub, ul, color)
        drawAngleArc(sub, col, ul, "NLA", angleColor)
        drawPoint(sub, highlightColor)
        drawPoint(col, color)
        drawPoint(ul, color)
      }
      break
    }

    case "nasofacial_angle": {
      const nas = lm["nasal_bridge_root"]
      const tip = lm["nose_tip"]
      const chin = lm["chin_point"]
      if (nas && tip && chin) {
        drawLine(nas, tip, color)
        drawLine(tip, chin, color)
        drawAngleArc(tip, nas, chin, "NFA", angleColor)
        drawPoint(nas, color)
        drawPoint(tip, highlightColor)
        drawPoint(chin, color)
      }
      break
    }

    case "nasomental_angle": {
      const nas = lm["nasal_bridge_root"]
      const tip = lm["nose_tip"]
      const chin = lm["chin_point"]
      if (nas && tip && chin) {
        drawLine(nas, tip, color)
        drawLine(tip, chin, color)
        drawAngleArc(tip, nas, chin, "NMA", angleColor)
        drawPoint(nas, color)
        drawPoint(tip, highlightColor)
        drawPoint(chin, color)
      }
      break
    }

    case "frankfort_tip_angle": {
      const por = lm["porion"]
      const orb = lm["orbitale"]
      const tip = lm["nose_tip"]
      if (por && orb && tip) {
        drawLine(por, orb, color)
        drawLine(orb, tip, color)
        drawAngleArc(orb, por, tip, "FTA", angleColor)
        drawPoint(por, color)
        drawPoint(orb, highlightColor)
        drawPoint(tip, color)
      }
      break
    }

    case "lower_lip_s_line": {
      const ll = lm["lower_lip"]
      const tip = lm["nose_tip"]
      const chin = lm["chin_point"]
      if (ll && tip && chin) {
        drawSLine(tip, chin, "#f97316")
        drawPoint(tip, color)
        drawPoint(chin, color)
        drawPoint(ll, highlightColor)
        drawLabel(ll, "Lower lip")
        drawDashedLine(ll, { x: ll.x, y: ll.y }, highlightColor)
      }
      break
    }

    case "lower_lip_e_line": {
      const ll = lm["lower_lip"]
      const tip = lm["nose_tip"]
      const chin = lm["chin_point"]
      if (ll && tip && chin) {
        drawSLine(tip, chin, "#f97316")
        drawPoint(tip, color)
        drawPoint(chin, color)
        drawPoint(ll, highlightColor)
        drawLabel(ll, "Lower lip")
        drawDashedLine(ll, { x: ll.x, y: ll.y }, highlightColor)
      }
      break
    }

    case "lower_lip_burstone": {
      const ll = lm["lower_lip"]
      const sub = lm["subnasale"]
      const chin = lm["chin_point"]
      if (ll && sub && chin) {
        drawSLine(sub, chin, "#f97316")
        drawPoint(sub, color)
        drawPoint(chin, color)
        drawPoint(ll, highlightColor)
        drawLabel(ll, "Lower lip")
        drawDashedLine(ll, { x: ll.x, y: ll.y }, highlightColor)
      }
      break
    }

    case "gonial_angle": {
      const uja = lm["upper_jaw_angle"]
      const lja = lm["lower_jaw_angle"]
      const chin = lm["chin_point"]
      if (uja && lja && chin) {
        drawLine(uja, lja, color)
        drawLine(lja, chin, color)
        drawAngleArc(lja, uja, chin, "GA", angleColor)
        drawPoint(uja, color)
        drawPoint(lja, highlightColor)
        drawPoint(chin, color)
      }
      break
    }

    case "mandibular_plane_angle": {
      const lja = lm["lower_jaw_angle"]
      const chin = lm["chin_point"]
      if (lja && chin) {
        drawLine(lja, chin, highlightColor)
        drawHLine(lja.y)
        drawPoint(lja, highlightColor)
        drawPoint(chin, color)
        drawLabel(lja, "Gonion")
        drawLabel(chin, "Chin")
        // Angle arc
        const a1 = Math.atan2(0, 1)
        const a2 = Math.atan2(chin.y - lja.y, chin.x - lja.x)
        ctx.strokeStyle = angleColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(lja.x + drawX, lja.y + drawY, 25, a1, a2)
        ctx.stroke()
        const midA = (a1 + a2) / 2
        ctx.fillStyle = angleColor
        ctx.font = "bold 10px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText("MPA", lja.x + drawX + 35 * Math.cos(midA), lja.y + drawY + 35 * Math.sin(midA))
      }
      break
    }

    case "ramus_to_mandible": {
      const uja = lm["upper_jaw_angle"]
      const lja = lm["lower_jaw_angle"]
      const chin = lm["chin_point"]
      if (uja && lja && chin) {
        drawDimensionLine(uja, lja, "Ramus", color)
        drawDimensionLine(lja, chin, "Mandible", highlightColor)
        drawPoint(uja, color)
        drawPoint(lja, highlightColor)
        drawPoint(chin, color)
      }
      break
    }

    case "gonion_to_mouth": {
      const lja = lm["lower_jaw_angle"]
      const mc = lm["mouth_corner"]
      const hair = lm["hairline_profile"]
      const chinB = lm["chin_bottom"]
      if (lja && mc && hair && chinB) {
        drawDimensionLine(lja, mc, "Gonion-Mouth", highlightColor)
        drawDimensionLine(hair, chinB, "Face height", color)
        drawPoint(lja, highlightColor)
        drawPoint(mc, color)
        drawPoint(hair, color)
        drawPoint(chinB, color)
      }
      break
    }

    default: {
      // Draw all landmarks as reference with numbering
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
      Object.entries(lm).forEach(([id, pt]) => {
        const c = id.includes("nose") ? "#10b981" : id.includes("eye") ? "#ef4444" : "#38bdf8"
        drawPoint(pt, c)
        const num = FRONT_LANDMARK_ORDER[id]
        if (num !== undefined) {
          ctx.font = "bold 10px sans-serif"
          ctx.fillStyle = "rgba(255,255,255,0.9)"
          ctx.textAlign = "center"
          ctx.textBaseline = "bottom"
          ctx.fillText(String(num), pt.x + drawX, pt.y + drawY - 8)
        }
      })
      break
    }
  }
}
