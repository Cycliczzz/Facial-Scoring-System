"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  CheckCircle2, Info, RotateCcw, ArrowRight, ArrowLeft, ZoomIn, ZoomOut, 
  Maximize2, Minus, Plus, MousePointer2, Target, Crosshair, Ruler, 
  Grid3x3, Eye, EyeOff, Layers, Move, GripVertical, Settings, 
  Download, Upload, Save, Trash2, Undo, Redo, Scan, ScanFace,
  ChevronLeft, ChevronRight, Sparkles, Brain, Smartphone, 
  Maximize, Minimize, Search, X, Filter, SortAsc, SortDesc,
  Clock, Calendar, User, Users, Star, Award, Trophy, Crown
} from "lucide-react"

import { Button } from "@/components/ui/button"

interface LandmarkMarkerProps {
  initialGender?: "male" | "female"
  initialEthnicity?: string
}

interface Landmark {
  id: string
  x: number
  y: number
  label: string
  group?: string
  color?: string
}

type ProfileType = "front" | "side"

const FRONT_LANDMARKS = [
  { id: "hairline", label: "Hairline", group: "head", color: "#3b82f6" },
  { id: "left_pupil", label: "Left pupil", group: "eyes", color: "#ef4444" },
  { id: "right_pupil", label: "Right pupil", group: "eyes", color: "#ef4444" },
  { id: "left_nose_side", label: "Left nose side", group: "nose", color: "#10b981" },
  { id: "right_nose_side", label: "Right nose side", group: "nose", color: "#10b981" },
  { id: "lower_lip_center", label: "Lower lip center", group: "mouth", color: "#8b5cf6" },
  { id: "chin_bottom", label: "Chin bottom", group: "chin", color: "#f59e0b" },
  { id: "left_outer_ear", label: "Left outer ear", group: "ears", color: "#ec4899" },
  { id: "right_outer_ear", label: "Right outer ear", group: "ears", color: "#ec4899" },
  { id: "left_temple", label: "Left temple", group: "head", color: "#3b82f6" },
  { id: "right_temple", label: "Right temple", group: "head", color: "#3b82f6" },
  { id: "left_medial_canthus", label: "Left medial canthus", group: "eyes", color: "#ef4444" },
  { id: "left_lateral_canthus", label: "Left Lateral Canthus", group: "eyes", color: "#ef4444" },
  { id: "left_upper_eyelid", label: "Left Upper Eyelid", group: "eyes", color: "#ef4444" },
  { id: "left_lower_eyelid", label: "Left Lower Eyelid", group: "eyes", color: "#ef4444" },
  { id: "left_eyelid_hood_end", label: "Left Eyelid Hood End", group: "eyes", color: "#ef4444" },
  { id: "left_brow_head", label: "Left Brow Head", group: "brows", color: "#f97316" },
  { id: "left_brow_inner_corner", label: "Left Brow Inner Corner", group: "brows", color: "#f97316" },
  { id: "left_brow_arch", label: "Left Brow Arch", group: "brows", color: "#f97316" },
  { id: "left_brow_peak", label: "Left Brow Peak", group: "brows", color: "#f97316" },
  { id: "left_brow_tail", label: "Left Brow Tail", group: "brows", color: "#f97316" },
  { id: "left_upper_eyelid_crease", label: "Left Upper Eyelid Crease", group: "eyes", color: "#ef4444" },
  { id: "right_medial_canthus", label: "Right Medial Canthus", group: "eyes", color: "#ef4444" },
  { id: "right_lateral_canthus", label: "Right Lateral Canthus", group: "eyes", color: "#ef4444" },
  { id: "right_upper_eyelid", label: "Right Upper Eyelid", group: "eyes", color: "#ef4444" },
  { id: "right_lower_eyelid", label: "Right Lower Eyelid", group: "eyes", color: "#ef4444" },
  { id: "right_eyelid_hood_end", label: "Right Eyelid Hood End", group: "eyes", color: "#ef4444" },
  { id: "right_brow_head", label: "Right Brow Head", group: "brows", color: "#f97316" },
  { id: "right_brow_inner_corner", label: "Right Brow Inner Corner", group: "brows", color: "#f97316" },
  { id: "right_brow_arch", label: "Right Brow Arch", group: "brows", color: "#f97316" },
  { id: "right_brow_peak", label: "Right Brow Peak", group: "brows", color: "#f97316" },
  { id: "right_brow_tail", label: "Right Brow Tail", group: "brows", color: "#f97316" },
  { id: "right_upper_eyelid_crease", label: "Right Upper Eyelid Crease", group: "eyes", color: "#ef4444" },
  { id: "nasal_base", label: "Nasal Base", group: "nose", color: "#10b981" },
  { id: "nose_bottom", label: "Nose Bottom", group: "nose", color: "#10b981" },
  { id: "left_nose_bridge", label: "Left Nose Bridge", group: "nose", color: "#10b981" },
  { id: "right_nose_bridge", label: "Right Nose Bridge", group: "nose", color: "#10b981" },
  { id: "left_mouth_corner", label: "Left Mouth Corner", group: "mouth", color: "#8b5cf6" },
  { id: "right_mouth_corner", label: "Right Mouth Corner", group: "mouth", color: "#8b5cf6" },
  { id: "cupids_bow", label: "Cupid's Bow", group: "mouth", color: "#8b5cf6" },
  { id: "inner_cupids_bow", label: "Inner Cupid's Bow", group: "mouth", color: "#8b5cf6" },
  { id: "mouth_middle", label: "Mouth Middle", group: "mouth", color: "#8b5cf6" },
  { id: "left_upper_jaw_angle", label: "Left Upper Jaw Angle", group: "jaw", color: "#f59e0b" },
  { id: "right_upper_jaw_angle", label: "Right Upper Jaw Angle", group: "jaw", color: "#f59e0b" },
  { id: "left_lower_jaw_angle", label: "Left Lower Jaw Angle", group: "jaw", color: "#f59e0b" },
  { id: "right_lower_jaw_angle", label: "Right Lower Jaw Angle", group: "jaw", color: "#f59e0b" },
  { id: "left_chin", label: "Left Chin", group: "chin", color: "#f59e0b" },
  { id: "right_chin", label: "Right Chin", group: "chin", color: "#f59e0b" },
  { id: "left_neck_point", label: "Left Neck Point", group: "neck", color: "#6b7280" },
  { id: "right_neck_point", label: "Right Neck Point", group: "neck", color: "#6b7280" },
  { id: "left_cheekbone", label: "Left Cheekbone", group: "cheeks", color: "#ec4899" },
  { id: "right_cheekbone", label: "Right Cheekbone", group: "cheeks", color: "#ec4899" },
]

const SIDE_LANDMARKS = [
  { id: "top_of_head", label: "Top of Head", group: "head", color: "#3b82f6" },
  { id: "occiput", label: "Occiput", group: "head", color: "#3b82f6" },
  { id: "nose_tip", label: "Nose Tip", group: "nose", color: "#10b981" },
  { id: "neck_point", label: "Neck Point", group: "neck", color: "#6b7280" },
  { id: "porion", label: "Porion", group: "ears", color: "#ec4899" },
  { id: "orbitale", label: "Orbitale", group: "eyes", color: "#ef4444" },
  { id: "tragus", label: "Tragus", group: "ears", color: "#ec4899" },
  { id: "intertragic_notch", label: "Intertragic Notch", group: "ears", color: "#ec4899" },
  { id: "corneal_apex", label: "Corneal Apex", group: "eyes", color: "#ef4444" },
  { id: "cheekbone", label: "Cheekbone", group: "cheeks", color: "#ec4899" },
  { id: "eyelid_end", label: "Eyelid End", group: "eyes", color: "#ef4444" },
  { id: "lower_eyelid", label: "Lower Eyelid", group: "eyes", color: "#ef4444" },
  { id: "hairline_profile", label: "Hairline (Profile)", group: "head", color: "#3b82f6" },
  { id: "glabella", label: "Glabella", group: "head", color: "#3b82f6" },
  { id: "forehead", label: "Forehead", group: "head", color: "#3b82f6" },
  { id: "nasal_bridge_root", label: "Nasal Bridge Root", group: "nose", color: "#10b981" },
  { id: "rhinion", label: "Rhinion", group: "nose", color: "#10b981" },
  { id: "supratip", label: "Supratip", group: "nose", color: "#10b981" },
  { id: "infratip", label: "Infratip", group: "nose", color: "#10b981" },
  { id: "columella", label: "Columella", group: "nose", color: "#10b981" },
  { id: "subnasale", label: "Subnasale", group: "nose", color: "#10b981" },
  { id: "subalare", label: "Subalare", group: "nose", color: "#10b981" },
  { id: "upper_lip", label: "Upper Lip", group: "mouth", color: "#8b5cf6" },
  { id: "mouth_corner", label: "Mouth Corner", group: "mouth", color: "#8b5cf6" },
  { id: "lower_lip", label: "Lower Lip", group: "mouth", color: "#8b5cf6" },
  { id: "labiomental_fold", label: "Labiomental Fold", group: "chin", color: "#f59e0b" },
  { id: "chin_point", label: "Chin Point", group: "chin", color: "#f59e0b" },
  { id: "chin_bottom", label: "Chin Bottom", group: "chin", color: "#f59e0b" },
  { id: "cervical_point", label: "Cervical Point", group: "neck", color: "#6b7280" },
  { id: "upper_jaw_angle", label: "Upper Jaw Angle", group: "jaw", color: "#f59e0b" },
  { id: "lower_jaw_angle", label: "Lower Jaw Angle", group: "jaw", color: "#f59e0b" },
]

export function LandmarkMarker({ initialGender = "male", initialEthnicity }: LandmarkMarkerProps) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [profileType, setProfileType] = useState<ProfileType>("front")
  const [frontLandmarks, setFrontLandmarks] = useState<Landmark[]>([])
  const [sideLandmarks, setSideLandmarks] = useState<Landmark[]>([])
  const [currentLandmarkIndex, setCurrentLandmarkIndex] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [editingLandmarkIndex, setEditingLandmarkIndex] = useState<number | null>(null)
  const [draggingLandmarkIndex, setDraggingLandmarkIndex] = useState<number | null>(null)
  const [showGrid, setShowGrid] = useState(false)
  const [showCrosshair, setShowCrosshair] = useState(false)
  const [landmarkSize, setLandmarkSize] = useState(2) // Smaller default size (2px radius)

  const isFemaleAccent = initialGender === "female"

  // Get uploaded images from localStorage
  const [frontImageUrl, setFrontImageUrl] = useState<string>("")
  const [sideImageUrl, setSideImageUrl] = useState<string>("")

  useEffect(() => {
    // Load images from localStorage
    const frontImg = localStorage.getItem("frontProfileImage")
    const sideImg = localStorage.getItem("sideProfileImage")
    
    setFrontImageUrl(frontImg || "/hero-samples/sample-1.jpg")
    setSideImageUrl(sideImg || "/hero-samples/sample-3.jpg")
  }, [])

  const currentImage = profileType === "front" ? frontImageUrl : sideImageUrl
  const currentLandmarks = profileType === "front" ? frontLandmarks : sideLandmarks
  const landmarkDefinitions = profileType === "front" ? FRONT_LANDMARKS : SIDE_LANDMARKS
  const currentLandmark = landmarkDefinitions[currentLandmarkIndex]

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const img = new Image()
    img.src = currentImage
    img.onload = () => {
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight
      const imgAspectRatio = img.width / img.height

      // Set canvas to container size
      canvas.width = containerWidth
      canvas.height = containerHeight
      setCanvasSize({ width: containerWidth, height: containerHeight })
      setImageLoaded(true)
      drawCanvas()
    }
  }, [currentImage])

  useEffect(() => {
    if (imageLoaded) {
      drawCanvas()
    }
  }, [currentLandmarks, currentLandmarkIndex, imageLoaded, zoomLevel, panOffset, editingLandmarkIndex, showGrid, showCrosshair, landmarkSize])

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.src = currentImage
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Calculate aspect ratio and drawing dimensions
      const imgAspectRatio = img.width / img.height
      const canvasAspectRatio = canvas.width / canvas.height
      
      let drawWidth, drawHeight, drawX, drawY
      
      if (imgAspectRatio > canvasAspectRatio) {
        // Image is wider than canvas
        drawWidth = canvas.width
        drawHeight = drawWidth / imgAspectRatio
        drawX = 0
        drawY = (canvas.height - drawHeight) / 2
      } else {
        // Image is taller than canvas
        drawHeight = canvas.height
        drawWidth = drawHeight * imgAspectRatio
        drawX = (canvas.width - drawWidth) / 2
        drawY = 0
      }
      
      // Apply zoom and pan transformations
      ctx.save()
      
      // Calculate zoom center
      const zoomCenterX = canvas.width / 2
      const zoomCenterY = canvas.height / 2
      
      // Move to center, scale, then move back
      ctx.translate(zoomCenterX + panOffset.x, zoomCenterY + panOffset.y)
      ctx.scale(zoomLevel, zoomLevel)
      ctx.translate(-zoomCenterX, -zoomCenterY)
      
      // Draw image with correct aspect ratio (centered)
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

      // Draw grid if enabled
      if (showGrid) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
        ctx.lineWidth = 1
        const gridSize = 50
        
        // Vertical lines
        for (let x = drawX; x < drawX + drawWidth; x += gridSize) {
          ctx.beginPath()
          ctx.moveTo(x, drawY)
          ctx.lineTo(x, drawY + drawHeight)
          ctx.stroke()
        }
        
        // Horizontal lines
        for (let y = drawY; y < drawY + drawHeight; y += gridSize) {
          ctx.beginPath()
          ctx.moveTo(drawX, y)
          ctx.lineTo(drawX + drawWidth, y)
          ctx.stroke()
        }
      }

      // Draw crosshair if enabled
      if (showCrosshair) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
        ctx.lineWidth = 1
        
        // Horizontal line
        ctx.beginPath()
        ctx.moveTo(drawX, canvas.height / 2)
        ctx.lineTo(drawX + drawWidth, canvas.height / 2)
        ctx.stroke()
        
        // Vertical line
        ctx.beginPath()
        ctx.moveTo(canvas.width / 2, drawY)
        ctx.lineTo(canvas.width / 2, drawY + drawHeight)
        ctx.stroke()
      }

      // Draw existing landmarks (with centering offsets and zoom/pan adjustments)
      currentLandmarks.forEach((landmark, index) => {
        const isActive = index === currentLandmarkIndex - 1 || index === editingLandmarkIndex
        const isDragging = index === draggingLandmarkIndex
        
        // Use smaller landmark size (2px radius by default)
        const size = landmarkSize
        const color = landmark.color || (isFemaleAccent ? "#ec4899" : "#38bdf8")
        const activeColor = isFemaleAccent ? "#f472b6" : "#7dd3fc"

        // Outer glow - smaller for better accuracy
        ctx.shadowBlur = isDragging ? 12 : 8
        ctx.shadowColor = isActive ? activeColor : color

        // Draw circle - MUCH smaller for precision (2-3px radius)
        ctx.beginPath()
        ctx.arc(landmark.x + drawX, landmark.y + drawY, isDragging ? size + 1 : size, 0, 2 * Math.PI)
        ctx.fillStyle = isActive ? activeColor : color
        ctx.fill()

        // Inner circle - even smaller for precision
        ctx.beginPath()
        ctx.arc(landmark.x + drawX, landmark.y + drawY, isDragging ? size * 0.6 : size * 0.5, 0, 2 * Math.PI)
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
        ctx.fill()

        ctx.shadowBlur = 0

        // Draw number - smaller font
        ctx.font = "bold 10px sans-serif"
        ctx.fillStyle = "#fff"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText((index + 1).toString(), landmark.x + drawX, landmark.y + drawY - 15)
      })

      ctx.restore()
    }
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    
    // Get click coordinates relative to canvas
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    
    // Calculate image centering offsets
    const img = new Image()
    img.src = currentImage
    img.onload = () => {
      const imgAspectRatio = img.width / img.height
      const canvasAspectRatio = canvas.width / canvas.height
      
      let drawX, drawY, drawWidth, drawHeight
      
      if (imgAspectRatio > canvasAspectRatio) {
        // Image is wider than canvas
        drawWidth = canvas.width
        drawHeight = drawWidth / imgAspectRatio
        drawX = 0
        drawY = (canvas.height - drawHeight) / 2
      } else {
        // Image is taller than canvas
        drawHeight = canvas.height
        drawWidth = drawHeight * imgAspectRatio
        drawX = (canvas.width - drawWidth) / 2
        drawY = 0
      }
      
      // Adjust for zoom, pan, and centering
      const zoomCenterX = canvas.width / 2
      const zoomCenterY = canvas.height / 2
      const x = ((clickX - panOffset.x - zoomCenterX) / zoomLevel + zoomCenterX - drawX)
      const y = ((clickY - panOffset.y - zoomCenterY) / zoomLevel + zoomCenterY - drawY)

      if (editingLandmarkIndex !== null) {
        // Update existing landmark position
        const updatedLandmarks = [...currentLandmarks]
        updatedLandmarks[editingLandmarkIndex] = {
          ...updatedLandmarks[editingLandmarkIndex],
          x,
          y
        }
        
        if (profileType === "front") {
          setFrontLandmarks(updatedLandmarks)
        } else {
          setSideLandmarks(updatedLandmarks)
        }
        
        setEditingLandmarkIndex(null)
      } else {
        // Check if this landmark already exists
        const existingIndex = currentLandmarks.findIndex(l => l.id === currentLandmark.id)
        
        if (existingIndex !== -1) {
          // Update existing landmark
          const updatedLandmarks = [...currentLandmarks]
          updatedLandmarks[existingIndex] = {
            ...updatedLandmarks[existingIndex],
            x,
            y
          }
          
          if (profileType === "front") {
            setFrontLandmarks(updatedLandmarks)
          } else {
            setSideLandmarks(updatedLandmarks)
          }
        } else {
          // Place new landmark
          const newLandmark: Landmark = {
            id: currentLandmark.id,
            x,
            y,
            label: currentLandmark.label,
            group: currentLandmark.group,
            color: currentLandmark.color,
          }

          if (profileType === "front") {
            const updatedFrontLandmarks = [...frontLandmarks, newLandmark]
            setFrontLandmarks(updatedFrontLandmarks)
            
            // Check if all front landmarks are placed
            if (updatedFrontLandmarks.length === FRONT_LANDMARKS.length) {
              // Automatically switch to side profile
              setTimeout(() => {
                setProfileType("side")
                setCurrentLandmarkIndex(0)
                setImageLoaded(false)
                setZoomLevel(1)
                setPanOffset({ x: 0, y: 0 })
              }, 500) // Small delay for better UX
            } else {
              // Advance to next landmark
              if (currentLandmarkIndex < landmarkDefinitions.length - 1) {
                setCurrentLandmarkIndex(currentLandmarkIndex + 1)
              }
            }
          } else {
            const updatedSideLandmarks = [...sideLandmarks, newLandmark]
            setSideLandmarks(updatedSideLandmarks)
            
            // Check if all side landmarks are placed
            if (updatedSideLandmarks.length === SIDE_LANDMARKS.length) {
              // Mark as completed
              setIsCompleted(true)
            } else {
              // Advance to next landmark
              if (currentLandmarkIndex < landmarkDefinitions.length - 1) {
                setCurrentLandmarkIndex(currentLandmarkIndex + 1)
              }
            }
          }
        }
      }
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    // Store initial mouse position in canvas coordinates
    setLastMousePos({ x: clickX, y: clickY })

    // Check if user clicked on an existing landmark
    const img = new Image()
    img.src = currentImage
    img.onload = () => {
      const imgAspectRatio = img.width / img.height
      const canvasAspectRatio = canvas.width / canvas.height
      
      let drawX, drawY, drawWidth, drawHeight
      
      if (imgAspectRatio > canvasAspectRatio) {
        // Image is wider than canvas
        drawWidth = canvas.width
        drawHeight = drawWidth / imgAspectRatio
        drawX = 0
        drawY = (canvas.height - drawHeight) / 2
      } else {
        // Image is taller than canvas
        drawHeight = canvas.height
        drawWidth = drawHeight * imgAspectRatio
        drawX = (canvas.width - drawWidth) / 2
        drawY = 0
      }

      // Check each landmark to see if click is within its area
      for (let i = 0; i < currentLandmarks.length; i++) {
        const landmark = currentLandmarks[i]
        
        // Calculate landmark position on canvas with zoom and pan adjustments
        const zoomCenterX = canvas.width / 2
        const zoomCenterY = canvas.height / 2
        
        // Transform landmark position through the same zoom/pan transformation as drawing
        const landmarkCanvasX = (landmark.x + drawX - zoomCenterX) * zoomLevel + zoomCenterX + panOffset.x
        const landmarkCanvasY = (landmark.y + drawY - zoomCenterY) * zoomLevel + zoomCenterY + panOffset.y
        
        // Calculate distance from click to landmark
        const distance = Math.sqrt(
          Math.pow(clickX - landmarkCanvasX, 2) + Math.pow(clickY - landmarkCanvasY, 2)
        )
        
        // If click is within 15 pixels of landmark (smaller for precision)
        if (distance < 15) {
          setDraggingLandmarkIndex(i)
          setEditingLandmarkIndex(i)
          return
        }
      }

      // If no landmark was clicked and zoom level > 1, start panning
      if (zoomLevel > 1) {
        setIsPanning(true)
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const currentMouseX = e.clientX - rect.left
    const currentMouseY = e.clientY - rect.top
    
    if (draggingLandmarkIndex !== null) {
      // Professional landmark dragging with proper zoom handling
      // Calculate mouse movement in canvas coordinates
      const deltaX = currentMouseX - lastMousePos.x
      const deltaY = currentMouseY - lastMousePos.y
      
      // For professional dragging, we need to convert screen movement to image coordinates
      // The movement should be inversely proportional to zoom level
      const imageDeltaX = deltaX / zoomLevel
      const imageDeltaY = deltaY / zoomLevel
      
      // Update the landmark position
      const updatedLandmarks = [...currentLandmarks]
      const landmark = updatedLandmarks[draggingLandmarkIndex]
      
      updatedLandmarks[draggingLandmarkIndex] = {
        ...landmark,
        x: landmark.x + imageDeltaX,
        y: landmark.y + imageDeltaY
      }
      
      if (profileType === "front") {
        setFrontLandmarks(updatedLandmarks)
      } else {
        setSideLandmarks(updatedLandmarks)
      }
      
      // Update last mouse position for next movement
      setLastMousePos({ x: currentMouseX, y: currentMouseY })
    } else if (isPanning && zoomLevel > 1) {
      // Professional panning - only when zoomed in
      // Calculate mouse movement
      const deltaX = currentMouseX - lastMousePos.x
      const deltaY = currentMouseY - lastMousePos.y
      
      // Update pan offset
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))
      
      // Update last mouse position
      setLastMousePos({ x: currentMouseX, y: currentMouseY })
    }
  }

  const handleMouseUp = () => {
    if (draggingLandmarkIndex !== null) {
      setDraggingLandmarkIndex(null)
    }
    setIsPanning(false)
  }

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 4)) // Increased max zoom to 4x
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5))
  }

  const handleResetZoom = () => {
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
  }

  const handleZoomToLandmark = () => {
    if (currentLandmarks.length > 0) {
      // Zoom to the last placed landmark
      const lastLandmark = currentLandmarks[currentLandmarks.length - 1]
      const canvas = canvasRef.current
      if (!canvas) return

      const img = new Image()
      img.src = currentImage
      img.onload = () => {
        const imgAspectRatio = img.width / img.height
        const canvasAspectRatio = canvas.width / canvas.height
        
        let drawX, drawY, drawWidth, drawHeight
        
        if (imgAspectRatio > canvasAspectRatio) {
          // Image is wider than canvas
          drawWidth = canvas.width
          drawHeight = drawWidth / imgAspectRatio
          drawX = 0
          drawY = (canvas.height - drawHeight) / 2
        } else {
          // Image is taller than canvas
          drawHeight = canvas.height
          drawWidth = drawHeight * imgAspectRatio
          drawX = (canvas.width - drawWidth) / 2
          drawY = 0
        }

        // Calculate position of landmark on canvas
        const landmarkCanvasX = lastLandmark.x + drawX
        const landmarkCanvasY = lastLandmark.y + drawY
        
        // Set zoom to 2.5x and center on the landmark
        setZoomLevel(2.5)
        setPanOffset({
          x: canvas.width / 2 - landmarkCanvasX * 2.5,
          y: canvas.height / 2 - landmarkCanvasY * 2.5
        })
      }
    }
  }

  const handleZoomToCurrent = () => {
    // Zoom to the center of the image for precise placement
    setZoomLevel(2.5)
    setPanOffset({ x: 0, y: 0 })
  }

  const handleLandmarkClick = (index: number) => {
    setCurrentLandmarkIndex(index)
    setEditingLandmarkIndex(index)
  }

  const handleNextLandmark = () => {
    if (currentLandmarkIndex < landmarkDefinitions.length - 1) {
      setCurrentLandmarkIndex(currentLandmarkIndex + 1)
      setEditingLandmarkIndex(null)
    } else {
      // Check if all landmarks are placed
      if (currentLandmarks.length === landmarkDefinitions.length) {
        if (profileType === "front") {
          // Move to side profile
          setProfileType("side")
          setCurrentLandmarkIndex(0)
          setImageLoaded(false)
          setZoomLevel(1)
          setPanOffset({ x: 0, y: 0 })
        } else {
          // All done (both front and side)
          setIsCompleted(true)
        }
      }
    }
  }

  const handlePreviousLandmark = () => {
    if (currentLandmarkIndex > 0) {
      setCurrentLandmarkIndex(currentLandmarkIndex - 1)
      setEditingLandmarkIndex(null)
    }
  }

  const handleReset = () => {
    if (profileType === "front") {
      setFrontLandmarks([])
    } else {
      setSideLandmarks([])
    }
    setCurrentLandmarkIndex(0)
    setIsCompleted(false)
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
    setEditingLandmarkIndex(null)
  }

  const handleBack = () => {
    if (profileType === "side" && currentLandmarkIndex === 0 && sideLandmarks.length === 0) {
      // Go back to front profile
      setProfileType("front")
      setCurrentLandmarkIndex(frontLandmarks.length)
      setZoomLevel(1)
      setPanOffset({ x: 0, y: 0 })
      setEditingLandmarkIndex(null)
    } else if (currentLandmarkIndex > 0) {
      // Remove last landmark
      if (profileType === "front") {
        setFrontLandmarks(frontLandmarks.slice(0, -1))
      } else {
        setSideLandmarks(sideLandmarks.slice(0, -1))
      }
      setCurrentLandmarkIndex(currentLandmarkIndex - 1)
      setEditingLandmarkIndex(null)
    } else {
      // Navigate back to previous page
      const genderQuery = initialGender ?? "male"
      const ethnicityQuery = initialEthnicity ? `&ethnicity=${initialEthnicity}` : ""
      router.push(`/onboarding/side?gender=${genderQuery}${ethnicityQuery}`)
    }
  }

  const handleContinue = () => {
    // Save landmarks to localStorage for the analysis page
    localStorage.setItem("frontLandmarks", JSON.stringify(frontLandmarks))
    localStorage.setItem("sideLandmarks", JSON.stringify(sideLandmarks))
    
    // Navigate to analysis page with gender and ethnicity params
    const genderQuery = initialGender ?? "male"
    const ethnicityQuery = initialEthnicity ? `&ethnicity=${initialEthnicity}` : ""
    router.push(`/analysis?gender=${genderQuery}${ethnicityQuery}`)
  }

  const accentColor = isFemaleAccent ? "pink" : "sky"
  const accentGlow = isFemaleAccent
    ? "shadow-[0_18px_45px_rgba(236,72,153,0.6)] from-pink-500 to-rose-500"
    : "shadow-[0_18px_45px_rgba(37,99,235,0.75)] from-sky-500 to-blue-500"

  const progress = ((currentLandmarkIndex / landmarkDefinitions.length) * 100).toFixed(0)

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header - Professional and clean */}
      <div className="px-6 py-4 border-b border-border/50 bg-card/50 backdrop-blur-sm rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Facial Landmark Analysis</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Precise anatomical landmark annotation for facial assessment
              </p>
            </div>
            
            {/* Profile type selector - Professional toggle */}
            <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5">
              <button
                onClick={() => {
                  if (profileType !== "front") {
                    setProfileType("front")
                    setCurrentLandmarkIndex(frontLandmarks.length)
                    setImageLoaded(false)
                    setZoomLevel(1)
                    setPanOffset({ x: 0, y: 0 })
                    setEditingLandmarkIndex(null)
                  }
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 ${profileType === "front" 
                  ? isFemaleAccent 
                    ? "bg-pink-500/20 text-pink-100 shadow-inner" 
                    : "bg-sky-500/20 text-sky-100 shadow-inner"
                  : "text-muted-foreground hover:bg-secondary/50"}`}
              >
                <span>Front Profile</span>
                {frontLandmarks.length === FRONT_LANDMARKS.length && (
                  <CheckCircle2 className="size-3" />
                )}
              </button>
              <div className="w-px h-4 bg-border/50" />
              <button
                onClick={() => {
                  if (profileType !== "side" && frontLandmarks.length === FRONT_LANDMARKS.length) {
                    setProfileType("side")
                    setCurrentLandmarkIndex(sideLandmarks.length)
                    setImageLoaded(false)
                    setZoomLevel(1)
                    setPanOffset({ x: 0, y: 0 })
                    setEditingLandmarkIndex(null)
                  }
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 ${profileType === "side" 
                  ? isFemaleAccent 
                    ? "bg-pink-500/20 text-pink-100 shadow-inner" 
                    : "bg-sky-500/20 text-sky-100 shadow-inner"
                  : frontLandmarks.length === FRONT_LANDMARKS.length 
                    ? "text-muted-foreground hover:bg-secondary/50" 
                    : "text-muted-foreground/50 cursor-not-allowed"}`}
                disabled={frontLandmarks.length !== FRONT_LANDMARKS.length}
              >
                <span>Side Profile</span>
                {sideLandmarks.length === SIDE_LANDMARKS.length && (
                  <CheckCircle2 className="size-3" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-foreground">
              {profileType === "front" ? "Front Profile" : "Side Profile"} • Landmark {currentLandmarkIndex + 1} of {landmarkDefinitions.length}
            </span>
            <span className="text-muted-foreground">{progress}% complete</span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary/70 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${isFemaleAccent 
                ? "bg-gradient-to-r from-pink-500 to-rose-500" 
                : "bg-gradient-to-r from-sky-500 to-blue-500"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main content - Full width layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-6 gap-2 p-2 overflow-hidden">
        {/* Left panel - Image (4/6 width for maximum size) */}
        <div className="lg:col-span-4 flex flex-col">
            <div className="flex-1 bg-card/30 border border-border/50 rounded-xl overflow-hidden flex flex-col shadow-lg">
            <div className="p-2 border-b border-border/50 bg-card/50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  {editingLandmarkIndex !== null ? "Editing: " : ""}{currentLandmark?.label || "Select a landmark"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editingLandmarkIndex !== null 
                    ? "Click on the image to update the landmark position" 
                    : `Click on the image to place landmark #${currentLandmarkIndex + 1}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`px-1.5 py-0.5 rounded text-xs font-medium ${isFemaleAccent 
                  ? "bg-pink-500/20 text-pink-100" 
                  : "bg-sky-500/20 text-sky-100"}`}>
                  {currentLandmarks.length}/{landmarkDefinitions.length} placed
                </div>
                {editingLandmarkIndex !== null && (
                  <div className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-100">
                    Editing Mode
                  </div>
                )}
              </div>
            </div>

            {/* Image container with zoom controls - Full width */}
            <div className="flex-1 relative bg-background/5" ref={containerRef}>
              {/* Zoom controls - Compact and professional */}
              <div className="absolute top-1.5 left-1.5 z-10">
                <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded p-1 shadow-lg">
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={handleZoomIn}
                      className="p-0.5 hover:bg-secondary/50 rounded-sm transition-colors flex items-center justify-center"
                      title="Zoom In (+25%)"
                    >
                      <Plus className="size-3 text-foreground" />
                    </button>
                    <button
                      onClick={handleZoomOut}
                      className="p-0.5 hover:bg-secondary/50 rounded-sm transition-colors flex items-center justify-center"
                      title="Zoom Out (-25%)"
                    >
                      <Minus className="size-3 text-foreground" />
                    </button>
                    <button
                      onClick={handleResetZoom}
                      className="p-0.5 hover:bg-secondary/50 rounded-sm transition-colors flex items-center justify-center"
                      title="Reset Zoom (100%)"
                    >
                      <Maximize2 className="size-3 text-foreground" />
                    </button>
                    <div className="w-px h-2.5 bg-border/50 mx-0.5" />
                    <div className="text-xs font-bold text-foreground px-0.5">{Math.round(zoomLevel * 100)}%</div>
                  </div>
                  
                  {/* Intelligent zoom buttons */}
                  <div className="flex items-center gap-0.5 mt-1 pt-1 border-t border-border/30">
                    <button
                      onClick={handleZoomToCurrent}
                      className="p-0.5 hover:bg-secondary/50 rounded-sm transition-colors flex items-center justify-center"
                      title="Zoom to Center (250%)"
                    >
                      <ZoomIn className="size-2.5 text-foreground" />
                    </button>
                    <button
                      onClick={handleZoomToLandmark}
                      className="p-0.5 hover:bg-secondary/50 rounded-sm transition-colors flex items-center justify-center"
                      title="Zoom to Last Landmark"
                      disabled={currentLandmarks.length === 0}
                    >
                      <MousePointer2 className="size-2.5 text-foreground" />
                    </button>
                  </div>

                  {/* Precision tools */}
                  <div className="flex items-center gap-0.5 mt-1 pt-1 border-t border-border/30">
                    <button
                      onClick={() => setShowGrid(!showGrid)}
                      className={`p-0.5 rounded-sm transition-colors flex items-center justify-center ${showGrid ? "bg-secondary/70" : "hover:bg-secondary/50"}`}
                      title="Toggle Grid"
                    >
                      <Grid3x3 className="size-2.5 text-foreground" />
                    </button>
                    <button
                      onClick={() => setShowCrosshair(!showCrosshair)}
                      className={`p-0.5 rounded-sm transition-colors flex items-center justify-center ${showCrosshair ? "bg-secondary/70" : "hover:bg-secondary/50"}`}
                      title="Toggle Crosshair"
                    >
                      <Crosshair className="size-2.5 text-foreground" />
                    </button>
                    <button
                      onClick={() => setLandmarkSize(Math.max(1, landmarkSize - 0.5))}
                      className="p-0.5 hover:bg-secondary/50 rounded-sm transition-colors flex items-center justify-center"
                      title="Decrease Landmark Size"
                    >
                      <Minus className="size-2.5 text-foreground" />
                    </button>
                    <button
                      onClick={() => setLandmarkSize(Math.min(5, landmarkSize + 0.5))}
                      className="p-0.5 hover:bg-secondary/50 rounded-sm transition-colors flex items-center justify-center"
                      title="Increase Landmark Size"
                    >
                      <Plus className="size-2.5 text-foreground" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Canvas - Maximized size */}
              <div className="flex items-center justify-center h-full w-full">
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className={`cursor-crosshair transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"} ${zoomLevel > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
                  style={{ 
                    display: "block",
                    maxHeight: "calc(100vh - 150px)",
                    maxWidth: "100%",
                    width: "100%",
                    height: "auto",
                    borderRadius: "2px"
                  }}
                />
              </div>

              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs text-muted-foreground">Loading image...</div>
                </div>
              )}

              {/* Current landmark indicator - Compact */}
              {!isCompleted && currentLandmark && (
                <div className="absolute top-1.5 right-1.5">
                  <div className={`px-1.5 py-1 rounded backdrop-blur-sm border ${isFemaleAccent
                    ? "bg-pink-500/10 border-pink-500/30 text-pink-100"
                    : "bg-sky-500/10 border-sky-500/30 text-sky-100"}`}>
                    <div className="text-xs font-medium">Current</div>
                    <div className="font-bold text-xs">{currentLandmark.label}</div>
                    <div className="text-xs opacity-80">#{currentLandmarkIndex + 1}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Image controls - Compact */}
            <div className="p-1.5 border-t border-border/50 bg-card/50 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {zoomLevel > 1 ? (
                  <span className="flex items-center gap-0.5">
                    <MousePointer2 className="size-2.5" />
                    Drag to pan • Zoom: {Math.round(zoomLevel * 100)}% • Landmark size: {landmarkSize.toFixed(1)}px
                  </span>
                ) : (
                  "Click on the image to place landmarks"
                )}
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="gap-0.5 h-6 text-xs"
                  disabled={currentLandmarks.length === 0}
                >
                  <RotateCcw className="size-2.5" />
                  Reset
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="gap-0.5 h-6 text-xs"
                >
                  <ArrowLeft className="size-2.5" />
                  Back
                </Button>
                {editingLandmarkIndex !== null && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingLandmarkIndex(null)}
                    className="gap-0.5 h-6 text-xs bg-amber-500/10 border-amber-500/30 text-amber-100 hover:bg-amber-500/20"
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel - Landmark list and instructions (2/6 width) */}
        <div className="lg:col-span-2 flex flex-col gap-2 overflow-hidden">
          {/* Current landmark instructions */}
          <div className={`rounded-xl border p-2 ${isFemaleAccent
            ? "border-pink-500/40 bg-pink-500/5"
            : "border-sky-500/40 bg-sky-500/5"}`}>
            <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
              <Info className="size-2.5" />
              Instructions
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${isFemaleAccent
                  ? "bg-pink-500/20 text-pink-100"
                  : "bg-sky-500/20 text-sky-100"}`}>
                  #{currentLandmarkIndex + 1}
                </div>
                <div className="text-xs text-muted-foreground">
                  {currentLandmarks.length + 1} of {landmarkDefinitions.length}
                </div>
              </div>
              
              <h3 className="font-bold text-foreground text-sm">
                {currentLandmark?.label}
              </h3>
              
              <div className="bg-card/30 rounded p-1.5 border border-border/30">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {editingLandmarkIndex !== null 
                    ? `Click on the new position for ${currentLandmark?.label}. Use zoom for precise adjustment.`
                    : `Click on the exact anatomical position of ${currentLandmark?.label}. Use zoom for millimeter-level precision.`}
                </p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  <span>Click any landmark in the list below to edit its position</span>
                </div>
                <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  <span>Drag any placed landmark to adjust its position</span>
                </div>
                <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                  <span>Use Next/Previous buttons to navigate between landmarks</span>
                </div>
                <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                  <span>Use grid and crosshair for precise alignment</span>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex gap-1 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousLandmark}
                  className="flex-1 gap-0.5 h-6 text-xs"
                  disabled={currentLandmarkIndex === 0}
                >
                  <ArrowLeft className="size-2.5" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleNextLandmark}
                  className="flex-1 gap-0.5 h-6 text-xs"
                  disabled={currentLandmarkIndex >= landmarkDefinitions.length - 1 && currentLandmarks.length === landmarkDefinitions.length}
                >
                  Next
                  <ArrowRight className="size-2.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Landmark progress list */}
          <div className="flex-1 rounded-xl border border-border/50 bg-card/30 p-2 flex flex-col overflow-hidden shadow-inner">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="font-semibold text-foreground text-sm">Landmark Progress</h3>
              <div className="text-xs text-muted-foreground">
                {currentLandmarks.length} placed • {landmarkDefinitions.length - currentLandmarks.length} remaining
              </div>
            </div>
            
            <div className={`flex-1 overflow-y-auto pr-0.5 custom-scrollbar ${isFemaleAccent ? 'custom-scrollbar-pink' : ''}`}>
              <div className="space-y-1">
                {landmarkDefinitions.map((landmark, index) => (
                  <button
                    key={landmark.id}
                    onClick={() => handleLandmarkClick(index)}
                    className={`w-full flex items-center gap-1.5 rounded-md p-1.5 transition-all duration-200 text-left ${index === currentLandmarkIndex
                      ? isFemaleAccent
                        ? "bg-pink-500/10 border border-pink-500/30"
                        : "bg-sky-500/10 border border-sky-500/30"
                      : index < currentLandmarkIndex
                      ? "bg-secondary/20 border border-border/30 hover:bg-secondary/30"
                      : "bg-transparent border border-transparent hover:bg-secondary/10"}`}
                  >
                    <div
                      className={`flex size-5 items-center justify-center rounded-full text-xs font-semibold ${index < currentLandmarkIndex
                        ? "bg-emerald-500/20 text-emerald-100"
                        : index === currentLandmarkIndex
                        ? isFemaleAccent
                          ? "bg-pink-500/20 text-pink-100"
                          : "bg-sky-500/20 text-sky-100"
                        : "bg-secondary/60 text-muted-foreground"}`}
                    >
                      {index < currentLandmarkIndex ? (
                        <CheckCircle2 className="size-2.5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-xs truncate ${index <= currentLandmarkIndex
                        ? "text-foreground"
                        : "text-muted-foreground"}`}>
                        {landmark.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {index < currentLandmarkIndex ? "Placed" : index === currentLandmarkIndex ? "Current" : "Pending"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Completion status */}
          {isCompleted && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2 text-center space-y-1.5">
              <div className="flex justify-center">
                <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/20">
                  <CheckCircle2 className="size-4 text-emerald-100" />
                </div>
              </div>
              <h3 className="font-semibold text-emerald-100 text-xs">All Landmarks Marked!</h3>
              <p className="text-xs text-emerald-200/80">
                {profileType === "front" 
                  ? "Switch to Side Profile to continue." 
                  : "Click continue to proceed with analysis."}
              </p>
              {profileType === "front" ? (
                <Button
                  type="button"
                  onClick={() => {
                    setProfileType("side")
                    setCurrentLandmarkIndex(0)
                    setImageLoaded(false)
                    setZoomLevel(1)
                    setPanOffset({ x: 0, y: 0 })
                  }}
                  className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 border border-emerald-500/40 text-xs"
                >
                  Continue to Side Profile
                  <ArrowRight className="ml-1 size-2.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleContinue}
                  className={`w-full justify-center gap-0.5 text-xs ${accentGlow}`}
                >
                  Complete Analysis
                  <ArrowRight className="size-2.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


       