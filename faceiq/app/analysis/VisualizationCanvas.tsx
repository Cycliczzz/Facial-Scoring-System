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
        const lm = landmarks.reduce((acc: any, l: any) => { acc[l.id] = l; return acc }, {} as Record<string, any>)
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

  const drawDashedLine = (p1: any, p2: any, c: string = "rgba(255,255,255,0.3)") => {
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

  const drawHLine = (y: number, c: string = "rgba(255,255,255,0.2)") => {
    ctx.strokeStyle = c
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(drawX, y + drawY)
    ctx.lineTo(drawX + drawWidth, y + drawY)
    ctx.stroke()
    ctx.setLineDash([])
  }

  const drawVLine = (x: number, c: string = "rgba(255,255,255,0.2)") => {
    ctx.strokeStyle = c
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(x + drawX, drawY)
    ctx.lineTo(x + drawX, drawY + drawHeight)
    ctx.stroke()
    ctx.setLineDash([])
  }

  switch (measurementId) {
    case "lateral_canthal_tilt": {
      const inner = lm["right_eye_inner"] || lm["right_medial_canthus"]
      const outer = lm["right_eye_outer"] || lm["right_lateral_canthus"]
      drawLine(inner, outer, highlightColor)
      drawHLine(inner?.y || 0)
      drawPoint(inner, highlightColor)
      drawPoint(outer, highlightColor)
      drawLabel(inner, "Inner")
      drawLabel(outer, "Outer")
      break
    }
    case "nose_bridge_to_width": {
      const nasion = lm["nasion"] || lm["nasal_bridge_root"]
      const tip = lm["nose_tip"]
      const left = lm["nose_left"] || lm["left_nose_side"]
      const right = lm["nose_right"] || lm["right_nose_side"]
      drawLine(nasion, tip, color)
      drawLine(left, right, highlightColor)
      drawPoint(nasion, color); drawPoint(tip, color)
      drawPoint(left, highlightColor); drawPoint(right, highlightColor)
      break
    }
    case "bitemporal_width": {
      const tl = lm["temple_left"] || lm["left_temple"]
      const tr = lm["temple_right"] || lm["right_temple"]
      const zl = lm["zygoma_left"] || lm["left_cheekbone"]
      const zr = lm["zygoma_right"] || lm["right_cheekbone"]
      drawLine(tl, tr, color); drawLine(zl, zr, highlightColor)
      drawPoint(tl, color); drawPoint(tr, color)
      drawPoint(zl, highlightColor); drawPoint(zr, highlightColor)
      break
    }
    case "neck_width": {
      const nl = lm["neck_left"] || lm["left_neck_point"]
      const nr = lm["neck_right"] || lm["right_neck_point"]
      const zl = lm["zygoma_left"] || lm["left_cheekbone"]
      const zr = lm["zygoma_right"] || lm["right_cheekbone"]
      drawLine(nl, nr, highlightColor); drawLine(zl, zr, color)
      drawPoint(nl, highlightColor); drawPoint(nr, highlightColor)
      drawPoint(zl, color); drawPoint(zr, color)
      break
    }
    case "ear_protrusion_angle": {
      const top = lm["ear_left_top"] || lm["left_outer_ear"]
      const bot = lm["ear_left_bottom"]
      const back = lm["ear_left_back"]
      drawLine(top, bot, color)
      if (back) {
        const ref = { x: back.x + 50, y: back.y }
        drawLine(back, ref, highlightColor)
        drawAngle(back, top, ref, angleColor)
        drawPoint(back, highlightColor)
      }
      drawPoint(top, color); drawPoint(bot, color)
      break
    }
    case "cheekbone_height": {
      const zygo = lm["zygoma_left"] || lm["left_cheekbone"]
      const chin = lm["chin"] || lm["chin_bottom"]
      const hair = lm["hairline"]
      drawLine(zygo, chin, color); drawLine(hair, chin, highlightColor)
      drawPoint(zygo, color); drawPoint(chin, color); drawPoint(hair, highlightColor)
      break
    }
    case "cupids_bow_depth": {
      const center = lm["lip_center"] || lm["cupids_bow"]
      const left = lm["lip_left"] || lm["left_mouth_corner"]
      const right = lm["lip_right"] || lm["right_mouth_corner"]
      drawLine(left, right, color)
      const midY = (left.y + right.y) / 2
      drawDashedLine(center, { x: center.x, y: midY }, highlightColor)
      drawPoint(center, highlightColor); drawPoint(left, color); drawPoint(right, color)
      break
    }
    case "bigonial_width": {
      const gl = lm["gonion_left"] || lm["left_lower_jaw_angle"]
      const gr = lm["gonion_right"] || lm["right_lower_jaw_angle"]
      const zl = lm["zygoma_left"] || lm["left_cheekbone"]
      const zr = lm["zygoma_right"] || lm["right_cheekbone"]
      drawLine(gl, gr, highlightColor); drawLine(zl, zr, color)
      drawPoint(gl, highlightColor); drawPoint(gr, highlightColor)
      drawPoint(zl, color); drawPoint(zr, color)
      break
    }
    case "jaw_slope": {
      const gonion = lm["gonion_left"] || lm["left_lower_jaw_angle"]
      const chin = lm["chin"] || lm["chin_bottom"]
      drawLine(gonion, chin, highlightColor)
      drawHLine(gonion?.y || 0)
      drawPoint(gonion, highlightColor); drawPoint(chin, color)
      break
    }
    case "eye_aspect_ratio": {
      const ei = lm["right_eye_inner"] || lm["right_medial_canthus"]
      const eo = lm["right_eye_outer"] || lm["right_lateral_canthus"]
      const et = lm["right_eye_top"] || lm["right_upper_eyelid"]
      const eb = lm["right_eye_bottom"] || lm["right_lower_eyelid"]
      drawLine(ei, eo, color); drawLine(et, eb, highlightColor)
      drawPoint(ei, color); drawPoint(eo, color)
      drawPoint(et, highlightColor); drawPoint(eb, highlightColor)
      break
    }
    case "eye_separation_ratio": {
      const ri = lm["right_eye_inner"] || lm["right_medial_canthus"]
      const li = lm["left_eye_inner"] || lm["left_medial_canthus"]
      const zl = lm["zygoma_left"] || lm["left_cheekbone"]
      const zr = lm["zygoma_right"] || lm["right_cheekbone"]
      drawLine(ri, li, highlightColor); drawLine(zl, zr, color)
      drawPoint(ri, highlightColor); drawPoint(li, highlightColor)
      drawPoint(zl, color); drawPoint(zr, color)
      break
    }
    case "eyebrow_tilt": {
      const bi = lm["right_brow_inner"] || lm["right_brow_head"]
      const bo = lm["right_brow_outer"] || lm["right_brow_tail"]
      drawLine(bi, bo, highlightColor)
      drawHLine(bi?.y || 0)
      drawPoint(bi, highlightColor); drawPoint(bo, color)
      break
    }
    case "face_width_to_height": {
      const zl = lm["zygoma_left"] || lm["left_cheekbone"]
      const zr = lm["zygoma_right"] || lm["right_cheekbone"]
      const hair = lm["hairline"]; const chin = lm["chin"] || lm["chin_bottom"]
      drawLine(zl, zr, color); drawLine(hair, chin, highlightColor)
      drawPoint(zl, color); drawPoint(zr, color)
      drawPoint(hair, highlightColor); drawPoint(chin, highlightColor)
      break
    }
    case "jaw_frontal_angle": {
      const gl = lm["gonion_left"] || lm["left_lower_jaw_angle"]
      const gr = lm["gonion_right"] || lm["right_lower_jaw_angle"]
      const chin = lm["chin"] || lm["chin_bottom"]
      drawLine(gl, chin, color); drawLine(gr, chin, color)
      drawAngle(chin, gl, gr, angleColor)
      drawPoint(gl, color); drawPoint(gr, color); drawPoint(chin, highlightColor)
      drawLabel(chin, "JFA")
      break
    }
    case "ipsilateral_alar_angle": {
      const tip = lm["nose_tip"]
      const left = lm["nose_left"] || lm["left_nose_side"]
      const right = lm["nose_right"] || lm["right_nose_side"]
      drawLine(left, tip, color); drawLine(right, tip, color)
      drawAngle(tip, left, right, angleColor)
      drawPoint(tip, highlightColor); drawPoint(left, color); drawPoint(right, color)
      drawLabel(tip, "IAA")
      break
    }
    case "mouth_width_to_nose_width": {
      const ml = lm["mouth_left"] || lm["left_mouth_corner"]
      const mr = lm["mouth_right"] || lm["right_mouth_corner"]
      const nl = lm["nose_left"] || lm["left_nose_side"]
      const nr = lm["nose_right"] || lm["right_nose_side"]
      drawLine(ml, mr, highlightColor); drawLine(nl, nr, color)
      drawPoint(ml, highlightColor); drawPoint(mr, highlightColor)
      drawPoint(nl, color); drawPoint(nr, color)
      break
    }
    case "intercanthal_nasal_width": {
      const ri = lm["right_eye_inner"] || lm["right_medial_canthus"]
      const li = lm["left_eye_inner"] || lm["left_medial_canthus"]
      const nl = lm["nose_left"] || lm["left_nose_side"]
      const nr = lm["nose_right"] || lm["right_nose_side"]
      drawLine(ri, li, highlightColor); drawLine(nl, nr, color)
      drawPoint(ri, highlightColor); drawPoint(li, highlightColor)
      drawPoint(nl, color); drawPoint(nr, color)
      break
    }
    case "interpupillary_mouth_width": {
      const rp = lm["right_pupil"]; const lp = lm["left_pupil"]
      const ml = lm["mouth_left"] || lm["left_mouth_corner"]
      const mr = lm["mouth_right"] || lm["right_mouth_corner"]
      drawLine(rp, lp, highlightColor); drawLine(ml, mr, color)
      drawPoint(rp, highlightColor); drawPoint(lp, highlightColor)
      drawPoint(ml, color); drawPoint(mr, color)
      break
    }
    case "one_eye_apart": {
      const rp = lm["right_pupil"]; const lp = lm["left_pupil"]
      const ei = lm["right_eye_inner"] || lm["right_medial_canthus"]
      const eo = lm["right_eye_outer"] || lm["right_lateral_canthus"]
      drawLine(rp, lp, highlightColor); drawLine(ei, eo, color)
      drawPoint(rp, highlightColor); drawPoint(lp, highlightColor)
      drawPoint(ei, color); drawPoint(eo, color)
      break
    }
    case "chin_to_philtrum": {
      const chin = lm["chin"] || lm["chin_bottom"]
      const sub = lm["subnasale"]; const lip = lm["lip_center"] || lm["cupids_bow"]
      drawLine(chin, lip, highlightColor); drawLine(sub, lip, color)
      drawPoint(chin, highlightColor); drawPoint(sub, color); drawPoint(lip, color)
      break
    }
    case "eyebrow_low_setedness": {
      const bb = lm["right_brow_bottom"]
      const et = lm["right_eye_top"] || lm["right_upper_eyelid"]
      drawLine(bb, et, highlightColor)
      drawPoint(bb, highlightColor); drawPoint(et, color)
      break
    }
    case "brow_length_to_face_width": {
      const bi = lm["right_brow_inner"] || lm["right_brow_head"]
      const bo = lm["right_brow_outer"] || lm["right_brow_tail"]
      const zl = lm["zygoma_left"] || lm["left_cheekbone"]
      const zr = lm["zygoma_right"] || lm["right_cheekbone"]
      drawLine(bi, bo, highlightColor); drawLine(zl, zr, color)
      drawPoint(bi, highlightColor); drawPoint(bo, highlightColor)
      drawPoint(zl, color); drawPoint(zr, color)
      break
    }
    case "nose_tip_position": {
      const tip = lm["nose_tip"]; const nas = lm["nasion"] || lm["nasal_bridge_root"]
      const chin = lm["chin"] || lm["chin_bottom"]
      drawLine(nas, chin, color); drawVLine(tip?.x || 0, highlightColor)
      drawPoint(tip, highlightColor); drawPoint(nas, color); drawPoint(chin, color)
      break
    }
    case "lower_lip_to_upper_lip": {
      const llb = lm["lower_lip_bottom"] || lm["lower_lip"]
      const lip = lm["lip_center"] || lm["cupids_bow"]
      const ult = lm["upper_lip_top"] || lm["upper_lip"]
      drawLine(llb, lip, highlightColor); drawLine(lip, ult, color)
      drawPoint(llb, highlightColor); drawPoint(lip, color); drawPoint(ult, color)
      break
    }
    case "nasal_tip_angle": {
      const tip = lm["nose_tip"]; const col = lm["columella"]
      const bridge = lm["nose_bridge"] || lm["rhinion"]
      drawLine(col, tip, color); drawLine(bridge, tip, color)
      drawAngle(tip, col, bridge, angleColor)
      drawPoint(tip, highlightColor); drawPoint(col, color); drawPoint(bridge, color)
      drawLabel(tip, "NTA")
      break
    }
    case "nasofrontal_angle": {
      const nas = lm["nasion"] || lm["nasal_bridge_root"]
      const fore = lm["forehead"]; const tip = lm["nose_tip"]
      drawLine(fore, nas, color); drawLine(nas, tip, color)
      drawAngle(nas, fore, tip, angleColor)
      drawPoint(nas, highlightColor); drawPoint(fore, color); drawPoint(tip, color)
      drawLabel(nas, "NFA")
      break
    }
    case "nasofacial_angle": {
      const nas = lm["nasion"] || lm["nasal_bridge_root"]
      const tip = lm["nose_tip"]; const chin = lm["chin"] || lm["chin_point"]
      drawLine(nas, tip, color); drawLine(tip, chin, color)
      drawAngle(tip, nas, chin, angleColor)
      drawPoint(nas, color); drawPoint(tip, highlightColor); drawPoint(chin, color)
      drawLabel(tip, "NFA")
      break
    }
    case "nasomental_angle": {
      const nas = lm["nasion"] || lm["nasal_bridge_root"]
      const tip = lm["nose_tip"]; const chin = lm["chin_tip"] || lm["chin_point"]
      drawLine(nas, tip, color); drawLine(tip, chin, color)
      drawAngle(tip, nas, chin, angleColor)
      drawPoint(nas, color); drawPoint(tip, highlightColor); drawPoint(chin, color)
      drawLabel(tip, "NMA")
      break
    }
    case "nasolabial_angle": {
      const sub = lm["subnasale"]; const col = lm["columella"]
      const ul = lm["upper_lip"]
      drawLine(col, sub, color); drawLine(sub, ul, color)
      drawAngle(sub, col, ul, angleColor)
      drawPoint(sub, highlightColor); drawPoint(col, color); drawPoint(ul, color)
      drawLabel(sub, "NLA")
      break
    }
    case "nasal_projection": {
      const tip = lm["nose_tip"]; const sub = lm["subnasale"]
      const nas = lm["nasion"] || lm["nasal_bridge_root"]
      drawLine(tip, sub, highlightColor); drawLine(nas, tip, color)
      drawPoint(tip, highlightColor); drawPoint(sub, color); drawPoint(nas, color)
      break
    }
    case "nasal_width_to_height": {
      const tip = lm["nose_tip"]; const nas = lm["nasion"] || lm["nasal_bridge_root"]
      const nl = lm["nose_left"] || lm["left_nose_side"]
      const nr = lm["nose_right"] || lm["right_nose_side"]
      drawLine(nas, tip, color); drawLine(nl, nr, highlightColor)
      drawPoint(nas, color); drawPoint(tip, color)
      drawPoint(nl, highlightColor); drawPoint(nr, highlightColor)
      break
    }
    case "mentolabial_angle": {
      const ll = lm["lower_lip"]; const chin = lm["chin"] || lm["labiomental_fold"]
      const ct = lm["chin_tip"] || lm["chin_point"]
      drawLine(ll, chin, color); drawLine(chin, ct, color)
      drawAngle(chin, ll, ct, angleColor)
      drawPoint(ll, color); drawPoint(chin, highlightColor); drawPoint(ct, color)
      drawLabel(chin, "MLA")
      break
    }
    case "upper_forehead_slope": {
      const hair = lm["hairline"] || lm["hairline_profile"]
      const fore = lm["forehead"]; const nas = lm["nasion"] || lm["nasal_bridge_root"]
      drawLine(hair, nas, highlightColor); drawHLine(hair?.y || 0)
      drawPoint(hair, highlightColor); drawPoint(nas, color)
      break
    }
    case "facial_convexity_nasion": {
      const nas = lm["nasion"] || lm["nasal_bridge_root"]
      const tip = lm["nose_tip"]; const chin = lm["chin"] || lm["chin_point"]
      drawLine(nas, tip, color); drawLine(tip, chin, color)
      drawAngle(tip, nas, chin, angleColor)
      drawPoint(nas, color); drawPoint(tip, highlightColor); drawPoint(chin, color)
      drawLabel(tip, "FC")
      break
    }
    case "total_facial_convexity": {
      const g = lm["glabella"]; const sub = lm["subnasale"]
      const chin = lm["chin"] || lm["chin_point"]
      drawLine(g, sub, color); drawLine(sub, chin, color)
      drawAngle(sub, g, chin, angleColor)
      drawPoint(g, color); drawPoint(sub, highlightColor); drawPoint(chin, color)
      drawLabel(sub, "TFC")
      break
    }
    case "facial_convexity_glabella": {
      const g = lm["glabella"]; const tip = lm["nose_tip"]
      const chin = lm["chin"] || lm["chin_point"]
      drawLine(g, tip, color); drawLine(tip, chin, color)
      drawAngle(tip, g, chin, angleColor)
      drawPoint(g, color); drawPoint(tip, highlightColor); drawPoint(chin, color)
      drawLabel(tip, "FCG")
      break
    }
    case "gonial_angle": {
      const gon = lm["gonion"] || lm["lower_jaw_angle"]
      const ram = lm["ramus"] || lm["upper_jaw_angle"]
      const man = lm["mandible"] || lm["chin_point"]
      drawLine(ram, gon, color); drawLine(gon, man, color)
      drawAngle(gon, ram, man, angleColor)
      drawPoint(gon, highlightColor); drawPoint(ram, color); drawPoint(man, color)
      drawLabel(gon, "GA")
      break
    }
    case "mandibular_plane_angle": {
      const gon = lm["gonion"] || lm["lower_jaw_angle"]
      const chin = lm["chin"] || lm["chin_point"]
      drawLine(gon, chin, highlightColor); drawHLine(gon?.y || 0)
      drawPoint(gon, highlightColor); drawPoint(chin, color)
      break
    }
    case "submental_cervical_angle": {
      const chin = lm["chin"] || lm["chin_point"]
      const neck = lm["neck"] || lm["neck_point"]
      const cerv = lm["cervical"] || lm["cervical_point"]
      drawLine(chin, neck, color); drawLine(neck, cerv, color)
      drawAngle(neck, chin, cerv, angleColor)
      drawPoint(chin, color); drawPoint(neck, highlightColor); drawPoint(cerv, color)
      drawLabel(neck, "SCA")
      break
    }
    case "browridge_inclination": {
      const br = lm["browridge"]; const nas = lm["nasion"] || lm["nasal_bridge_root"]
      const fore = lm["forehead"]
      drawLine(fore, br, color); drawLine(br, nas, color)
      drawAngle(br, fore, nas, angleColor)
      drawPoint(br, highlightColor); drawPoint(fore, color); drawPoint(nas, color)
      drawLabel(br, "BIA")
      break
    }
    case "nose_tip_rotation": {
      const tip = lm["nose_tip"]; const col = lm["columella"]
      const sub = lm["subnasale"]
      drawLine(col, tip, color); drawLine(tip, sub, color)
      drawAngle(tip, col, sub, angleColor)
      drawPoint(tip, highlightColor); drawPoint(col, color); drawPoint(sub, color)
      drawLabel(tip, "NTRA")
      break
    }
    case "z_angle": {
      const chin = lm["chin"] || lm["chin_point"]
      const ul = lm["upper_lip"]; const fore = lm["forehead"]
      drawLine(chin, ul, color); drawLine(ul, fore, color)
      drawAngle(ul, chin, fore, angleColor)
      drawPoint(chin, color); drawPoint(ul, highlightColor); drawPoint(fore, color)
      drawLabel(ul, "ZA")
      break
    }
    case "frankfort_tip_angle": {
      const trag = lm["tragus"]; const orb = lm["orbitale"]
      const tip = lm["nose_tip"]
      drawLine(trag, orb, color); drawLine(orb, tip, color)
      drawAngle(orb, trag, tip, angleColor)
      drawPoint(trag, color); drawPoint(orb, highlightColor); drawPoint(tip, color)
      drawLabel(orb, "FTA")
      break
    }
    case "interior_midface_projection": {
      const sub = lm["subnasale"]; const tip = lm["nose_tip"]
      const zygo = lm["zygoma"] || lm["cheekbone"]
            drawLine(sub, tip, color); drawLine(tip, zygo, color)
      drawAngle(tip, sub, zygo, angleColor)
      drawPoint(sub, color); drawPoint(tip, highlightColor); drawPoint(zygo, color)
      drawLabel(tip, "IMPA")
      break
    }
    case "ramus_to_mandible": {
      const gon = lm["gonion"] || lm["lower_jaw_angle"]
      const rt = lm["ramus_top"] || lm["upper_jaw_angle"]
      const chin = lm["chin"] || lm["chin_point"]
      drawLine(rt, gon, color); drawLine(gon, chin, highlightColor)
      drawPoint(rt, color); drawPoint(gon, highlightColor); drawPoint(chin, color)
      break
    }
    case "gonion_to_mouth": {
      const gon = lm["gonion"] || lm["lower_jaw_angle"]
      const mc = lm["mouth_corner"]
      const nas = lm["nasion"] || lm["nasal_bridge_root"]
      const chin = lm["chin"] || lm["chin_point"]
      drawLine(gon, mc, highlightColor); drawLine(nas, chin, color)
      drawPoint(gon, highlightColor); drawPoint(mc, color)
      drawPoint(nas, color); drawPoint(chin, color)
      break
    }
    default: {
      Object.entries(lm).forEach(([id, pt]) => {
        drawPoint(pt, id.includes("nose") ? "#10b981" : id.includes("eye") ? "#ef4444" : "#38bdf8")
      })
      break
    }
  }
}