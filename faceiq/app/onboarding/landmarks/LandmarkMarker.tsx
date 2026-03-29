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
    <div className="space-y-3 section-enter">
      {/* Header */}
      <div className="space-y-2 text-center section-enter section-delay-1">
        <div className="flex items-center justify-center gap-3">
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300 ${
              profileType === "front"
                ? isFemaleAccent
                  ? "bg-pink-500/20 text-pink-100 border border-pink-500/40"
                  : "bg-sky-500/20 text-sky-100 border border-sky-500/40"
                : "bg-secondary/50 text-muted-foreground border border-border/50"
            }`}
          >
            {profileType === "front" && <CheckCircle2 className="size-3" />}
            Front Profile
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300 ${
              profileType === "side"
                ? isFemaleAccent
                  ? "bg-pink-500/20 text-pink-100 border border-pink-500/40"
                  : "bg-sky-500/20 text-sky-100 border border-sky-500/40"
                : "bg-secondary/50 text-muted-foreground border border-border/50"
            }`}
          >
            {isCompleted && <CheckCircle2 className="size-3" />}
            Side Profile
          </div>
        </div>

        <h2 className="text-lg font-semibold tracking-tight text-sky-100 sm:text-xl">
          Mark facial landmarks
        </h2>
        <p className="text-xs text-muted-foreground">
          Click on your {profileType} profile photo to mark the key facial landmarks. Follow the
          instructions for each point.
        </p>
      </div>

      {/* Main content */}
      <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
        {/* Canvas area */}
        <div className="space-y-4 section-enter section-delay-2">
          <div
            ref={containerRef}
            className="canvas-container relative overflow-hidden rounded-2xl border border-border/70 bg-background/70"
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className={`w-full cursor-crosshair transition-opacity duration-500 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              style={{ display: "block" }}
            />

            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Loading image...</div>
              </div>
            )}

            {/* Progress overlay */}
            {!isCompleted && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="rounded-xl border border-border/70 bg-card/95 backdrop-blur-sm p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-foreground">
                      {currentLandmarkIndex + 1} / {landmarkDefinitions.length}
                    </span>
                    <span className="text-xs text-muted-foreground">{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary/70 overflow-hidden">
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
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-3">
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

            <div className="text-xs text-muted-foreground">
              Click to undo: {currentLandmarks.length} landmarks placed
            </div>
          </div>
        </div>

        {/* Instructions panel */}
        <div className="space-y-4">
          {!isCompleted ? (
            <>
              <div
                className={`rounded-2xl border p-3 transition-all duration-300 ${
                  isFemaleAccent
                    ? "border-pink-500/40 bg-pink-500/5"
                    : "border-sky-500/40 bg-sky-500/5"
                }`}
              >
                <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  <Info className="size-4" />
                  Current landmark
                </div>

                <div className="space-y-3">
                  <div
                    className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-semibold ${
                      isFemaleAccent
                        ? "bg-pink-500/20 text-pink-100"
                        : "bg-sky-500/20 text-sky-100"
                    }`}
                  >
                    #{currentLandmarkIndex + 1}
                  </div>

                  <h3 className="text-lg font-semibold text-foreground">
                    {currentLandmark?.label}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Click on the exact position of this landmark on your {profileType} profile
                    photo. Be as precise as possible for accurate analysis.
                  </p>
                </div>
              </div>

              {/* Landmark list */}
              <div className="rounded-2xl border border-border/70 bg-background/70 p-5">
                <div className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  All landmarks
                </div>

                <div className={`space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar ${isFemaleAccent ? 'custom-scrollbar-pink' : ''}`}>
                  {landmarkDefinitions.map((landmark, index) => (
                    <div
                      key={landmark.id}
                      className={`flex items-center gap-3 rounded-lg p-2 transition-all duration-200 ${
                        index === currentLandmarkIndex
                          ? isFemaleAccent
                            ? "bg-pink-500/10 border border-pink-500/30"
                            : "bg-sky-500/10 border border-sky-500/30"
                          : index < currentLandmarkIndex
                          ? "bg-secondary/50 border border-border/50"
                          : "bg-transparent border border-transparent"
                      }`}
                    >
                      <div
                        className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
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
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span
                        className={`text-xs ${
                          index <= currentLandmarkIndex
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {landmark.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center space-y-3">
              <div className="flex justify-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/20">
                  <CheckCircle2 className="size-8 text-emerald-100" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-emerald-100">All landmarks marked!</h3>
              <p className="text-sm text-emerald-200/80">
                You've successfully marked all facial landmarks on both front and side profiles.
                Click continue to proceed with the analysis.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-border/50">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          className="w-full justify-center sm:w-auto gap-2"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        {isCompleted && (
          <Button
            type="button"
            size="lg"
            onClick={handleContinue}
            className={
              "w-full justify-center gap-2 transform-gpu bg-gradient-to-r text-primary-foreground transition-all duration-300 sm:w-auto hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.85)] " +
              accentGlow
            }
          >
            Continue to analysis
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
