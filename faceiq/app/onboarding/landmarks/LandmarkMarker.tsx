"use client"

import React, { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Info, RotateCcw, ArrowRight, ArrowLeft } from "lucide-react"

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
}

type ProfileType = "front" | "side"

const FRONT_LANDMARKS = [
  { id: "hairline", label: "Hairline" },
  { id: "left_pupil", label: "Left pupil" },
  { id: "right_pupil", label: "Right pupil" },
  { id: "left_nose_side", label: "Left nose side" },
  { id: "right_nose_side", label: "Right nose side" },
  { id: "lower_lip_center", label: "Lower lip center" },
  { id: "chin_bottom", label: "Chin bottom" },
  { id: "left_outer_ear", label: "Left outer ear" },
  { id: "right_outer_ear", label: "Right outer ear" },
  { id: "left_temple", label: "Left temple" },
  { id: "right_temple", label: "Right temple" },
  { id: "left_medial_canthus", label: "Left medial canthus" },
  { id: "left_lateral_canthus", label: "Left Lateral Canthus" },
  { id: "left_upper_eyelid", label: "Left Upper Eyelid" },
  { id: "left_lower_eyelid", label: "Left Lower Eyelid" },
  { id: "left_eyelid_hood_end", label: "Left Eyelid Hood End" },
  { id: "left_brow_head", label: "Left Brow Head" },
  { id: "left_brow_inner_corner", label: "Left Brow Inner Corner" },
  { id: "left_brow_arch", label: "Left Brow Arch" },
  { id: "left_brow_peak", label: "Left Brow Peak" },
  { id: "left_brow_tail", label: "Left Brow Tail" },
  { id: "left_upper_eyelid_crease", label: "Left Upper Eyelid Crease" },
  { id: "right_medial_canthus", label: "Right Medial Canthus" },
  { id: "right_lateral_canthus", label: "Right Lateral Canthus" },
  { id: "right_upper_eyelid", label: "Right Upper Eyelid" },
  { id: "right_lower_eyelid", label: "Right Lower Eyelid" },
  { id: "right_eyelid_hood_end", label: "Right Eyelid Hood End" },
  { id: "right_brow_head", label: "Right Brow Head" },
  { id: "right_brow_inner_corner", label: "Right Brow Inner Corner" },
  { id: "right_brow_arch", label: "Right Brow Arch" },
  { id: "right_brow_peak", label: "Right Brow Peak" },
  { id: "right_brow_tail", label: "Right Brow Tail" },
  { id: "right_upper_eyelid_crease", label: "Right Upper Eyelid Crease" },
  { id: "nasal_base", label: "Nasal Base" },
  { id: "nose_bottom", label: "Nose Bottom" },
  { id: "left_nose_bridge", label: "Left Nose Bridge" },
  { id: "right_nose_bridge", label: "Right Nose Bridge" },
  { id: "left_mouth_corner", label: "Left Mouth Corner" },
  { id: "right_mouth_corner", label: "Right Mouth Corner" },
  { id: "cupids_bow", label: "Cupid's Bow" },
  { id: "inner_cupids_bow", label: "Inner Cupid's Bow" },
  { id: "mouth_middle", label: "Mouth Middle" },
  { id: "left_upper_jaw_angle", label: "Left Upper Jaw Angle" },
  { id: "right_upper_jaw_angle", label: "Right Upper Jaw Angle" },
  { id: "left_lower_jaw_angle", label: "Left Lower Jaw Angle" },
  { id: "right_lower_jaw_angle", label: "Right Lower Jaw Angle" },
  { id: "left_chin", label: "Left Chin" },
  { id: "right_chin", label: "Right Chin" },
  { id: "left_neck_point", label: "Left Neck Point" },
  { id: "right_neck_point", label: "Right Neck Point" },
  { id: "left_cheekbone", label: "Left Cheekbone" },
  { id: "right_cheekbone", label: "Right Cheekbone" },
]

const SIDE_LANDMARKS = [
  { id: "top_of_head", label: "Top of Head" },
  { id: "occiput", label: "Occiput" },
  { id: "nose_tip", label: "Nose Tip" },
  { id: "neck_point", label: "Neck Point" },
  { id: "porion", label: "Porion" },
  { id: "orbitale", label: "Orbitale" },
  { id: "tragus", label: "Tragus" },
  { id: "intertragic_notch", label: "Intertragic Notch" },
  { id: "corneal_apex", label: "Corneal Apex" },
  { id: "cheekbone", label: "Cheekbone" },
  { id: "eyelid_end", label: "Eyelid End" },
  { id: "lower_eyelid", label: "Lower Eyelid" },
  { id: "hairline_profile", label: "Hairline (Profile)" },
  { id: "glabella", label: "Glabella" },
  { id: "forehead", label: "Forehead" },
  { id: "nasal_bridge_root", label: "Nasal Bridge Root" },
  { id: "rhinion", label: "Rhinion" },
  { id: "supratip", label: "Supratip" },
  { id: "infratip", label: "Infratip" },
  { id: "columella", label: "Columella" },
  { id: "subnasale", label: "Subnasale" },
  { id: "subalare", label: "Subalare" },
  { id: "upper_lip", label: "Upper Lip" },
  { id: "mouth_corner", label: "Mouth Corner" },
  { id: "lower_lip", label: "Lower Lip" },
  { id: "labiomental_fold", label: "Labiomental Fold" },
  { id: "chin_point", label: "Chin Point" },
  { id: "chin_bottom", label: "Chin Bottom" },
  { id: "cervical_point", label: "Cervical Point" },
  { id: "upper_jaw_angle", label: "Upper Jaw Angle" },
  { id: "lower_jaw_angle", label: "Lower Jaw Angle" },
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
      const maxHeight = 320
      const aspectRatio = img.width / img.height

      let width = containerWidth
      let height = width / aspectRatio

      if (height > maxHeight) {
        height = maxHeight
        width = height * aspectRatio
      }

      canvas.width = width
      canvas.height = height
      setCanvasSize({ width, height })
      setImageLoaded(true)
      drawCanvas()
    }
  }, [currentImage])

  useEffect(() => {
    if (imageLoaded) {
      drawCanvas()
    }
  }, [currentLandmarks, currentLandmarkIndex, imageLoaded])

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.src = currentImage
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Draw existing landmarks
      currentLandmarks.forEach((landmark, index) => {
        const isActive = index === currentLandmarkIndex - 1
        drawLandmark(ctx, landmark.x, landmark.y, isActive, index + 1)
      })
    }
  }

  const drawLandmark = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    isActive: boolean,
    number: number
  ) => {
    const color = isFemaleAccent ? "#ec4899" : "#38bdf8"
    const activeColor = isFemaleAccent ? "#f472b6" : "#7dd3fc"

    // Outer glow
    ctx.shadowBlur = 15
    ctx.shadowColor = isActive ? activeColor : color

    // Draw circle
    ctx.beginPath()
    ctx.arc(x, y, isActive ? 8 : 6, 0, 2 * Math.PI)
    ctx.fillStyle = isActive ? activeColor : color
    ctx.fill()

    // Inner circle
    ctx.beginPath()
    ctx.arc(x, y, isActive ? 4 : 3, 0, 2 * Math.PI)
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
    ctx.fill()

    ctx.shadowBlur = 0

    // Draw number
    ctx.font = "bold 11px sans-serif"
    ctx.fillStyle = "#fff"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(number.toString(), x, y - 18)
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentLandmarkIndex >= landmarkDefinitions.length) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newLandmark: Landmark = {
      id: currentLandmark.id,
      x,
      y,
      label: currentLandmark.label,
    }

    if (profileType === "front") {
      setFrontLandmarks([...frontLandmarks, newLandmark])
    } else {
      setSideLandmarks([...sideLandmarks, newLandmark])
    }

    if (currentLandmarkIndex + 1 >= landmarkDefinitions.length) {
      // Completed current profile
      if (profileType === "front") {
        // Move to side profile
        setTimeout(() => {
          setProfileType("side")
          setCurrentLandmarkIndex(0)
          setImageLoaded(false)
        }, 500)
      } else {
        // All done
        setIsCompleted(true)
      }
    } else {
      setCurrentLandmarkIndex(currentLandmarkIndex + 1)
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
  }

  const handleBack = () => {
    if (profileType === "side" && currentLandmarkIndex === 0 && sideLandmarks.length === 0) {
      // Go back to front profile
      setProfileType("front")
      setCurrentLandmarkIndex(frontLandmarks.length)
    } else if (currentLandmarkIndex > 0) {
      // Remove last landmark
      if (profileType === "front") {
        setFrontLandmarks(frontLandmarks.slice(0, -1))
      } else {
        setSideLandmarks(sideLandmarks.slice(0, -1))
      }
      setCurrentLandmarkIndex(currentLandmarkIndex - 1)
    } else {
      // Navigate back to previous page
      const genderQuery = initialGender ?? "male"
      const ethnicityQuery = initialEthnicity ? `&ethnicity=${initialEthnicity}` : ""
      router.push(`/onboarding/side?gender=${genderQuery}${ethnicityQuery}`)
    }
  }

  const handleContinue = () => {
    // TODO: Save landmarks and proceed to analysis
    console.log("Front landmarks:", frontLandmarks)
    console.log("Side landmarks:", sideLandmarks)
    // router.push("/dashboard")
  }

  const accentColor = isFemaleAccent ? "pink" : "sky"
  const accentGlow = isFemaleAccent
    ? "shadow-[0_18px_45px_rgba(236,72,153,0.6)] from-pink-500 to-rose-500"
    : "shadow-[0_18px_45px_rgba(37,99,235,0.75)] from-sky-500 to-blue-500"

  const progress = ((currentLandmarkIndex / landmarkDefinitions.length) * 100).toFixed(0)

  return (
    <div className="space-y-6 section-enter">
      {/* Header with profile tabs */}
      <div className="space-y-4 section-enter section-delay-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Facial Landmark Annotation
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Precisely mark anatomical landmarks on your facial photos for comprehensive analysis
            </p>
          </div>
          
          {/* Profile type selector */}
          <div className="flex items-center gap-2 bg-card/50 border border-border/50 rounded-xl p-1">
            <button
              onClick={() => {
                if (profileType !== "front") {
                  setProfileType("front")
                  setCurrentLandmarkIndex(frontLandmarks.length)
                  setImageLoaded(false)
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                profileType === "front"
                  ? isFemaleAccent
                    ? "bg-pink-500/20 text-pink-100 shadow-inner"
                    : "bg-sky-500/20 text-sky-100 shadow-inner"
                  : "text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              Front Profile
              {frontLandmarks.length === FRONT_LANDMARKS.length && (
                <CheckCircle2 className="inline-block ml-2 size-3" />
              )}
            </button>
            <button
              onClick={() => {
                if (profileType !== "side" && frontLandmarks.length === FRONT_LANDMARKS.length) {
                  setProfileType("side")
                  setCurrentLandmarkIndex(sideLandmarks.length)
                  setImageLoaded(false)
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                profileType === "side"
                  ? isFemaleAccent
                    ? "bg-pink-500/20 text-pink-100 shadow-inner"
                    : "bg-sky-500/20 text-sky-100 shadow-inner"
                  : frontLandmarks.length === FRONT_LANDMARKS.length
                  ? "text-muted-foreground hover:bg-secondary/50"
                  : "text-muted-foreground/50 cursor-not-allowed"
              }`}
              disabled={frontLandmarks.length !== FRONT_LANDMARKS.length}
            >
              Side Profile
              {sideLandmarks.length === SIDE_LANDMARKS.length && (
                <CheckCircle2 className="inline-block ml-2 size-3" />
              )}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              {profileType === "front" ? "Front Profile" : "Side Profile"} Landmarks
            </span>
            <span className="text-muted-foreground">
              {currentLandmarkIndex} of {landmarkDefinitions.length} completed ({progress}%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary/70 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isFemaleAccent
                  ? "bg-gradient-to-r from-pink-500 to-rose-500"
                  : "bg-gradient-to-r from-sky-500 to-blue-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main content - redesigned layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel - Image and controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image container */}
          <div className="bg-card/50 border border-border/50 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border/50 bg-card/80">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {profileType === "front" ? "Front Profile Image" : "Side Profile Image"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Click on the image to place landmark #{currentLandmarkIndex + 1}: {currentLandmark?.label}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isFemaleAccent 
                      ? "bg-pink-500/20 text-pink-100" 
                      : "bg-sky-500/20 text-sky-100"
                  }`}>
                    {currentLandmarks.length} / {landmarkDefinitions.length} placed
                  </div>
                </div>
              </div>
            </div>
            
            <div
              ref={containerRef}
              className="relative bg-background/30 p-4 flex items-center justify-center min-h-[400px]"
            >
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className={`max-w-full max-h-[500px] cursor-crosshair transition-opacity duration-500 border border-border/30 rounded-lg ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                style={{ display: "block" }}
              />

              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-sm text-muted-foreground">Loading image...</div>
                </div>
              )}

              {/* Current landmark indicator */}
              {!isCompleted && currentLandmark && (
                <div className="absolute top-4 right-4">
                  <div className={`px-4 py-2 rounded-lg backdrop-blur-sm border ${
                    isFemaleAccent
                      ? "bg-pink-500/10 border-pink-500/30 text-pink-100"
                      : "bg-sky-500/10 border-sky-500/30 text-sky-100"
                  }`}>
                    <div className="text-xs font-medium uppercase tracking-wider">Current</div>
                    <div className="font-bold text-lg">{currentLandmark.label}</div>
                    <div className="text-xs opacity-80">Click to place</div>
                  </div>
                </div>
              )}
            </div>

            {/* Image controls */}
            <div className="p-4 border-t border-border/50 bg-card/80 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {profileType === "front" 
                  ? "Front profile: 52 landmarks total" 
                  : "Side profile: 31 landmarks total"}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="gap-2"
                  disabled={currentLandmarks.length === 0}
                >
                  <RotateCcw className="size-4" />
                  Reset {profileType} profile
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="gap-2"
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
              </div>
            </div>
          </div>

          {/* Quick navigation */}
          <div className="bg-card/50 border border-border/50 rounded-2xl p-4">
            <h3 className="font-semibold text-foreground mb-3">Landmark Navigation</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {landmarkDefinitions.slice(0, 6).map((landmark, index) => (
                <button
                  key={landmark.id}
                  onClick={() => {
                    if (index <= currentLandmarkIndex) {
                      // Can navigate to completed landmarks
                      setCurrentLandmarkIndex(index)
                    }
                  }}
                  className={`p-3 rounded-lg text-left transition-all duration-200 ${
                    index === currentLandmarkIndex
                      ? isFemaleAccent
                        ? "bg-pink-500/20 border border-pink-500/40"
                        : "bg-sky-500/20 border border-sky-500/40"
                      : index < currentLandmarkIndex
                      ? "bg-secondary/30 border border-border/30"
                      : "bg-card/30 border border-border/20 opacity-50 cursor-not-allowed"
                  }`}
                  disabled={index > currentLandmarkIndex}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${
                      index <= currentLandmarkIndex ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      #{index + 1}
                    </span>
                    {index < currentLandmarkIndex && (
                      <CheckCircle2 className="size-3 text-emerald-400" />
                    )}
                  </div>
                  <div className="text-sm font-medium truncate">{landmark.label}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 text-center">
              <button
                onClick={() => {
                  // Show all landmarks modal or expand view
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View all {landmarkDefinitions.length} landmarks →
              </button>
            </div>
          </div>
        </div>

        {/* Right panel - Landmark list and instructions */}
        <div className="space-y-6">
          {/* Current landmark instructions */}
          <div className={`rounded-2xl border p-5 ${
            isFemaleAccent
              ? "border-pink-500/40 bg-pink-500/5"
              : "border-sky-500/40 bg-sky-500/5"
          }`}>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground mb-4">
              <Info className="size-4" />
              Current Landmark Instructions
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className={`px-4 py-2 rounded-full text-lg font-bold ${
                  isFemaleAccent
                    ? "bg-pink-500/20 text-pink-100"
                    : "bg-sky-500/20 text-sky-100"
                }`}>
                  #{currentLandmarkIndex + 1}
                </div>
                <div className="text-sm text-muted-foreground">
                  {currentLandmarks.length + 1} of {landmarkDefinitions.length}
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-foreground">
                {currentLandmark?.label}
              </h3>
              
              <div className="bg-card/50 rounded-lg p-4 border border-border/30">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Click on the exact anatomical position of <strong>{currentLandmark?.label}</strong> on your {profileType} profile photo. 
                  Ensure you're placing it at the precise location for accurate facial analysis.
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span>Click directly on the image to place this landmark</span>
              </div>
            </div>
          </div>

          {/* Landmark progress list */}
          <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Landmark Progress</h3>
              <div className="text-sm text-muted-foreground">
                {currentLandmarks.length} placed
              </div>
            </div>
            
            <div className={`space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar ${
              isFemaleAccent ? 'custom-scrollbar-pink' : ''
            }`}>
              {landmarkDefinitions.map((landmark, index) => (
                <div
                  key={landmark.id}
                  className={`flex items-center gap-3 rounded-lg p-3 transition-all duration-200 landmark-item ${
                    index === currentLandmarkIndex
                      ? isFemaleAccent
                        ? "bg-pink-500/10 border border-pink-500/30"
                        : "bg-sky-500/10 border border-sky-500/30"
                      : index < currentLandmarkIndex
                      ? "bg-secondary/30 border border-border/30"
                      : "bg-transparent border border-transparent"
                  }`}
                >
                  <div
                    className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold ${
                      index < currentLandmarkIndex
                        ? "bg-emerald-500/20 text-emerald-100"
                        : index === currentLandmarkIndex
                        ? isFemaleAccent
                          ? "bg-pink-500/20 text-pink-100"
                          : "bg-sky-500/20 text-sky-100"
                        : "bg-secondary/70 text-muted-foreground"
                    }`}
                  >
                    {index < currentLandmarkIndex ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${
                      index <= currentLandmarkIndex
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}>
                      {landmark.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {index < currentLandmarkIndex ? "Placed" : index === currentLandmarkIndex ? "Current" : "Pending"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Completion status */}
          {isCompleted && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/20">
                  <CheckCircle2 className="size-8 text-emerald-100" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-emerald-100">All Landmarks Marked!</h3>
              <p className="text-sm text-emerald-200/80">
                You've successfully marked all {landmarkDefinitions.length} landmarks on the {profileType} profile.
                {profileType === "front" ? " Switch to Side Profile to continue." : " Click continue to proceed with analysis."}
              </p>
              {profileType === "front" ? (
                <Button
                  type="button"
                  onClick={() => {
                    setProfileType("side")
                    setCurrentLandmarkIndex(0)
                    setImageLoaded(false)
                  }}
                  className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 border border-emerald-500/40"
                >
                  Continue to Side Profile
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleContinue}
                  className={
                    "w-full justify-center gap-2 transform-gpu bg-gradient-to-r text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.85)] " +
                    accentGlow
                  }
                >
                  Complete Analysis
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/50">
        <div className="text-sm text-muted-foreground">
          {profileType === "front" 
            ? "Front Profile: " + frontLandmarks.length + " of 52 landmarks placed"
            : "Side Profile: " + sideLandmarks.length + " of 31 landmarks placed"}
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          
          {!isCompleted && (
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="gap-2"
              disabled={currentLandmarks.length === 0}
            >
              <RotateCcw className="size-4" />
              Reset Current
            </Button>
          )}
          
          {isCompleted && profileType === "side" && (
            <Button
              type="button"
              onClick={handleContinue}
              className={
                "gap-2 transform-gpu bg-gradient-to-r text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.85)] " +
                accentGlow
              }
            >
              Complete Analysis
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
