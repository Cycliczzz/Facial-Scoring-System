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

  const drawLabel = (p: any, text: string, c: string = textColor) => {
    if (!p) return
    ctx.fillStyle = c
    ctx.font = "bold 11px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(text, p.x + drawX, p.y + drawY - 12)
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

  const drawDimensionLine = (p1: any, p2: any, label: string, c: string = highlightColor) => {
    if (!p1 || !p2) return
    const mx = (p1.x + p2.x) / 2 + drawX
    const my = (p1.y + p2.y) / 2 + drawY
    drawLine(p1, p2, c)
    ctx.fillStyle = c
    ctx.font = "bold 10px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(label, mx, my - 8)
  }

  const drawAngleArc = (vertex: any, p1: any, p2: any, label: string, c: string = angleColor) => {
    if (!vertex || !p1 || !p2) return
    const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x)
    const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x)
    const radius = 30
    ctx.strokeStyle = c
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(vertex.x + drawX, vertex.y + drawY, radius, a1, a2)
    ctx.stroke()
    // Label at midpoint of arc
    const midAngle = (a1 + a2) / 2
    const lx = vertex.x + drawX + (radius + 12) * Math.cos(midAngle)
    const ly = vertex.y + drawY + (radius + 12) * Math.sin(midAngle)
    ctx.fillStyle = c
    ctx.font = "bold 10px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(label, lx, ly)
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

  switch (measurementId) {
    // ============================================================
    // FRONT PROFILE VISUALIZATIONS (33)
    // ============================================================

    case "lateral_canthal_tilt": {
      // Draw line from medial to lateral canthus + horizontal reference
      const inner = lm["left_medial_canthus"]
      const outer = lm["left_lateral_canthus"]
      if (inner && outer) {
        drawLine(inner, outer, highlightColor)
        drawHLine(inner.y)
        drawPoint(inner, highlightColor)
        drawPoint(outer, highlightColor)
        drawLabel(inner, "Medial")
        drawLabel(outer, "Lateral")
        // Angle arc
        const a1 = Math.atan2(0, 1) // horizontal right
        const a2 = Math.atan2(outer.y - inner.y, outer.x - inner.x)
        ctx.strokeStyle = angleColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(inner.x + drawX, inner.y + drawY, 25, a1, a2)
        ctx.stroke()
        const midA = (a1 + a2) / 2
        ctx.fillStyle = angleColor
        ctx.font = "bold 10px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText("LCT", inner.x + drawX + 35 * Math.cos(midA), inner.y + drawY + 35 * Math.sin(midA))
      }
      break
    }

    case "nose_bridge_to_width": {
      const lb = lm["left_nose_bridge"]
      const rb = lm["right_nose_bridge"]
      const ls = lm["left_nose_side"]
      const rs = lm["right_nose_side"]
      if (lb && rb && ls && rs) {
        drawDimensionLine(lb, rb, "Bridge", highlightColor)
        drawDimensionLine(ls, rs, "Width", color)
        drawPoint(lb, highlightColor)
        drawPoint(rb, highlightColor)
        drawPoint(ls, color)
        drawPoint(rs, color)
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

    case "neck_width": {
      const nl = lm["left_neck_point"]
      const nr = lm["right_neck_point"]
      const zl = lm["left_cheekbone"]
      const zr = lm["right_cheekbone"]
      if (nl && nr && zl && zr) {
        drawDimensionLine(nl, nr, "Neck", highlightColor)
        drawDimensionLine(zl, zr, "Face", color)
        drawPoint(nl, highlightColor)
        drawPoint(nr, highlightColor)
        drawPoint(zl, color)
        drawPoint(zr, color)
      }
      break
    }

    case "ear_protrusion_angle": {
      const ear = lm["left_outer_ear"]
      const cheek = lm["left_cheekbone"]
      if (ear && cheek) {
        drawLine(cheek, ear, highlightColor)
        drawHLine(cheek.y)
        drawPoint(cheek, highlightColor)
        drawPoint(ear, color)
        drawLabel(cheek, "Cheek")
        drawLabel(ear, "Ear")
        // Angle arc
        const a1 = Math.atan2(0, 1)
        const a2 = Math.atan2(ear.y - cheek.y, ear.x - cheek.x)
        ctx.strokeStyle = angleColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cheek.x + drawX, cheek.y + drawY, 25, a1, a2)
        ctx.stroke()
        const midA = (a1 + a2) / 2
        ctx.fillStyle = angleColor
        ctx.font = "bold 10px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText("EPA", cheek.x + drawX + 35 * Math.cos(midA), cheek.y + drawY + 35 * Math.sin(midA))
      }
      break
    }

    case "cheekbone_height": {
      const zygo = lm["left_cheekbone"]
      const chin = lm["chin_bottom"]
      const hair = lm["hairline"]
      if (zygo && chin && hair) {
        drawLine(hair, chin, dimColor)
        drawDashedLine(zygo, { x: zygo.x, y: chin.y }, highlightColor)
        drawPoint(zygo, highlightColor)
        drawPoint(chin, color)
        drawPoint(hair, color)
        drawLabel(zygo, "Cheekbone")
        drawLabel(chin, "Chin")
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
      const gl = lm["left_lower_jaw_angle"]
      const gr = lm["right_lower_jaw_angle"]
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
      const gonion = lm["left_lower_jaw_angle"]
      const chin = lm["left_chin"] || lm["chin_bottom"]
      if (gonion && chin) {
        drawLine(gonion, chin, highlightColor)
        drawHLine(gonion.y)
        drawPoint(gonion, highlightColor)
        drawPoint(chin, color)
        drawLabel(gonion, "Gonion")
        drawLabel(chin, "Chin")
        // Angle arc
        const a1 = Math.atan2(0, 1)
        const a2 = Math.atan2(chin.y - gonion.y, chin.x - gonion.x)
        ctx.strokeStyle = angleColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(gonion.x + drawX, gonion.y + drawY, 25, a1, a2)
        ctx.stroke()
        const midA = (a1 + a2) / 2
        ctx.fillStyle = angleColor
        ctx.font = "bold 10px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText("JS", gonion.x + drawX + 35 * Math.cos(midA), gonion.y + drawY + 35 * Math.sin(midA))
      }
      break
    }

    case "ear_protrusion_ratio": {
      const le = lm["left_outer_ear"]
      const re = lm["right_outer_ear"]
      const zl = lm["left_cheekbone"]
      const zr = lm["right_cheekbone"]
      if (le && re && zl && zr) {
        drawDimensionLine(le, re, "Ear span", highlightColor)
        drawDimensionLine(zl, zr, "Face width", color)
        drawPoint(le, highlightColor)
        drawPoint(re, highlightColor)
        drawPoint(zl, color)
        drawPoint(zr, color)
      }
      break
    }

    case "middle_third": {
      const eye = lm["left_upper_eyelid"] || lm["right_upper_eyelid"]
      const nose = lm["nose_bottom"]
      const hair = lm["hairline"]
      const chin = lm["chin_bottom"]
      if (eye && nose && hair && chin) {
        drawLine(hair, chin, dimColor)
        drawDashedLine(eye, { x: eye.x, y: nose.y }, highlightColor)
        drawPoint(eye, color)
        drawPoint(nose, highlightColor)
        drawPoint(hair, color)
        drawPoint(chin, color)
        drawLabel(eye, "Eye")
        drawLabel(nose, "Nose")
      }
      break
    }

    case "eye_aspect_ratio": {
      const top = lm["left_upper_eyelid"]
      const bot = lm["left_lower_eyelid"]
      const inner = lm["left_medial_canthus"]
      const outer = lm["left_lateral_canthus"]
      if (top && bot && inner && outer) {
        drawDimensionLine(inner, outer, "Width", color)
        drawDimensionLine(top, bot, "Height", highlightColor)
        drawPoint(top, highlightColor)
        drawPoint(bot, highlightColor)
        drawPoint(inner, color)
        drawPoint(outer, color)
      }
      break
    }

    case "mouth_corner_position": {
      const ml = lm["left_mouth_corner"]
      const mr = lm["right_mouth_corner"]
      const hair = lm["hairline"]
      const chin = lm["chin_bottom"]
      if (ml && mr && hair && chin) {
        const midY = (ml.y + mr.y) / 2
        drawLine(hair, chin, dimColor)
        drawHLine(midY, highlightColor)
        drawPoint(ml, color)
        drawPoint(mr, color)
        drawPoint(hair, color)
        drawPoint(chin, color)
        drawLabel(ml, "Mouth")
      }
      break
    }

    case "eye_separation_ratio": {
      const ri = lm["right_medial_canthus"]
      const li = lm["left_medial_canthus"]
      const lo = lm["left_lateral_canthus"]
      if (ri && li && lo) {
        drawDimensionLine(ri, li, "Intercanthal", highlightColor)
        drawDimensionLine(li, lo, "Eye width", color)
        drawPoint(ri, highlightColor)
        drawPoint(li, highlightColor)
        drawPoint(lo, color)
      }
      break
    }

    case "eyebrow_tilt": {
      const bi = lm["left_brow_head"]
      const bo = lm["left_brow_tail"]
      if (bi && bo) {
        drawLine(bi, bo, highlightColor)
        drawHLine(bi.y)
        drawPoint(bi, highlightColor)
        drawPoint(bo, color)
        drawLabel(bi, "Head")
        drawLabel(bo, "Tail")
        // Angle arc
        const a1 = Math.atan2(0, 1)
        const a2 = Math.atan2(bo.y - bi.y, bo.x - bi.x)
        ctx.strokeStyle = angleColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(bi.x + drawX, bi.y + drawY, 25, a1, a2)
        ctx.stroke()
        const midA = (a1 + a2) / 2
        ctx.fillStyle = angleColor
        ctx.font = "bold 10px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText("BT", bi.x + drawX + 35 * Math.cos(midA), bi.y + drawY + 35 * Math.sin(midA))
      }
      break
    }

    case "lower_third": {
      const nose = lm["nose_bottom"]
      const chin = lm["chin_bottom"]
      const hair = lm["hairline"]
      if (nose && chin && hair) {
        drawLine(hair, chin, dimColor)
        drawDashedLine(nose, { x: nose.x, y: chin.y }, highlightColor)
        drawPoint(nose, highlightColor)
        drawPoint(chin, color)
        drawPoint(hair, color)
        drawLabel(nose, "Nose")
        drawLabel(chin, "Chin")
      }
      break
    }

    case "face_width_to_height": {
      const zl = lm["left_cheekbone"]
      const zr = lm["right_cheekbone"]
      const brow = lm["left_brow_head"]
      const mouth = lm["mouth_middle"]
      if (zl && zr && brow && mouth) {
        drawDimensionLine(zl, zr, "Width", color)
        drawDimensionLine(brow, mouth, "Height", highlightColor)
        drawPoint(zl, color)
        drawPoint(zr, color)
        drawPoint(brow, highlightColor)
        drawPoint(mouth, highlightColor)
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
      const gl = lm["left_lower_jaw_angle"]
      const gr = lm["right_lower_jaw_angle"]
      const chin = lm["chin_bottom"]
      if (gl && gr && chin) {
        drawLine(gl, chin, color)
        drawLine(gr, chin, color)
        drawAngleArc(chin, gl, gr, "JFA", angleColor)
        drawPoint(gl, color)
        drawPoint(gr, color)
        drawPoint(chin, highlightColor)
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

    case "top_third": {
      const hair = lm["hairline"]
      const eye = lm["left_upper_eyelid"] || lm["right_upper_eyelid"]
      const chin = lm["chin_bottom"]
      if (hair && eye && chin) {
        drawLine(hair, chin, dimColor)
        drawDashedLine(hair, { x: hair.x, y: eye.y }, highlightColor)
        drawPoint(hair, highlightColor)
        drawPoint(eye, color)
        drawPoint(chin, color)
        drawLabel(hair, "Hairline")
        drawLabel(eye, "Eye")
      }
      break
    }

    case "one_eye_apart": {
      const rp = lm["right_pupil"]
      const lp = lm["left_pupil"]
      const inner = lm["left_medial_canthus"]
      const outer = lm["left_lateral_canthus"]
      if (rp && lp && inner && outer) {
        drawDimensionLine(rp, lp, "Pupils", highlightColor)
        drawDimensionLine(inner, outer, "Eye", color)
        drawPoint(rp, highlightColor)
        drawPoint(lp, highlightColor)
        drawPoint(inner, color)
        drawPoint(outer, color)
      }
      break
    }

    case "midface_ratio": {
      const ri = lm["right_medial_canthus"]
      const li = lm["left_medial_canthus"]
      const mouth = lm["mouth_middle"]
      if (ri && li && mouth) {
        drawDimensionLine(ri, li, "Width", color)
        drawDimensionLine(li, mouth, "Height", highlightColor)
        drawPoint(ri, color)
        drawPoint(li, highlightColor)
        drawPoint(mouth, highlightColor)
      }
      break
    }

    case "ipsilateral_alar_angle": {
      const tip = lm["nose_bottom"]
      const left = lm["left_nose_side"]
      const right = lm["right_nose_side"]
      if (tip && left && right) {
        drawLine(left, tip, color)
        drawLine(right, tip, color)
        drawAngleArc(tip, left, right, "IAA", angleColor)
        drawPoint(tip, highlightColor)
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
      const chin = lm["chin_bottom"]
      const mouth = lm["mouth_middle"]
      const nose = lm["nose_bottom"]
      if (chin && mouth && nose) {
        drawDimensionLine(mouth, chin, "Chin", highlightColor)
        drawDimensionLine(nose, mouth, "Philtrum", color)
        drawPoint(chin, highlightColor)
        drawPoint(mouth, color)
        drawPoint(nose, color)
      }
      break
    }

    case "eyebrow_low_setedness": {
      const brow = lm["left_brow_arch"] || lm["left_brow_peak"]
      const eye = lm["left_upper_eyelid"]
      if (brow && eye) {
        drawDimensionLine(brow, eye, "Brow-Eye", highlightColor)
        drawPoint(brow, highlightColor)
        drawPoint(eye, color)
      }
      break
    }

    case "brow_length_to_face_width": {
      const bi = lm["left_brow_head"]
      const bo = lm["left_brow_tail"]
      const zl = lm["left_cheekbone"]
      const zr = lm["right_cheekbone"]
      if (bi && bo && zl && zr) {
        drawDimensionLine(bi, bo, "Brow", highlightColor)
        drawDimensionLine(zl, zr, "Face", color)
        drawPoint(bi, highlightColor)
        drawPoint(bo, highlightColor)
        drawPoint(zl, color)
        drawPoint(zr, color)
      }
      break
    }

    case "nose_tip_position": {
      const tip = lm["nose_bottom"]
      const hair = lm["hairline"]
      const chin = lm["chin_bottom"]
      if (tip && hair && chin) {
        drawLine(hair, chin, dimColor)
        drawHLine(tip.y, highlightColor)
        drawPoint(tip, highlightColor)
        drawPoint(hair, color)
        drawPoint(chin, color)
        drawLabel(tip, "Nose tip")
      }
      break
    }

    case "deviation_iaa_jfa": {
      // Show both IAA and JFA angles
      const tip = lm["nose_bottom"]
      const left = lm["left_nose_side"]
      const right = lm["right_nose_side"]
      const gl = lm["left_lower_jaw_angle"]
      const gr = lm["right_lower_jaw_angle"]
      const chin = lm["chin_bottom"]
      if (tip && left && right) {
        drawLine(left, tip, color)
        drawLine(right, tip, color)
        drawAngleArc(tip, left, right, "IAA", angleColor)
        drawPoint(tip, color)
        drawPoint(left, color)
        drawPoint(right, color)
      }
      if (gl && gr && chin) {
        drawLine(gl, chin, dimColor)
        drawLine(gr, chin, dimColor)
        drawAngleArc(chin, gl, gr, "JFA", "#a78bfa")
        drawPoint(gl, color)
        drawPoint(gr, color)
        drawPoint(chin, color)
      }
      break
    }

    case "lower_lip_to_upper_lip": {
      const ll = lm["lower_lip_center"]
      const mouth = lm["mouth_middle"]
      const cupid = lm["cupids_bow"]
      if (ll && mouth && cupid) {
        drawDimensionLine(mouth, ll, "Lower lip", highlightColor)
        drawDimensionLine(cupid, mouth, "Upper lip", color)
        drawPoint(ll, highlightColor)
        drawPoint(mouth, color)
        drawPoint(cupid, color)
      }
      break
    }

    case "lower_third_proportion": {
      const nose = lm["nose_bottom"]
      const chin = lm["chin_bottom"]
      const hair = lm["hairline"]
      if (nose && chin && hair) {
        drawLine(hair, chin, dimColor)
        drawDashedLine(nose, { x: nose.x, y: chin.y }, highlightColor)
        drawPoint(nose, highlightColor)
        drawPoint(chin, color)
        drawPoint(hair, color)
        drawLabel(nose, "Nose")
        drawLabel(chin, "Chin")
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
      // Draw all landmarks as reference
      Object.entries(lm).forEach(([id, pt]) => {
        const c = id.includes("nose") ? "#10b981" : id.includes("eye") ? "#ef4444" : "#38bdf8"
        drawPoint(pt, c)
      })
      break
    }
  }
}
