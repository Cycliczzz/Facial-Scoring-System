"use client"

import React, { useState, useRef, DragEvent, ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { ImageIcon, UploadCloud, CheckCircle2, Loader2, Brain } from "lucide-react"

import { Button } from "@/components/ui/button"
import { detectFrontFromImage, detectSideFromImage, mirrorImageDataUrl } from "@/lib/landmarkDetection"
import type { LandmarkPoint } from "@/lib/analysis/types"

interface SidePhotoUploaderProps {
  initialGender?: "male" | "female"
  initialEthnicity?: string
}

export function SidePhotoUploader({ initialGender = "male", initialEthnicity }: SidePhotoUploaderProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [processingStage, setProcessingStage] = useState<string>("")

  const isFemaleAccent = initialGender === "female"

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please upload a valid image file (JPG or PNG).")
      return
    }

    const maxSizeMb = 10
    if (selectedFile.size > maxSizeMb * 1024 * 1024) {
      setError(`Image is too large. Please upload a file under ${maxSizeMb}MB.`)
      return
    }

    setError(null)
    setSuccess(false)
    setFile(selectedFile)
    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)
    
    // Save to localStorage
    const reader = new FileReader()
    reader.onloadend = () => {
      localStorage.setItem("sideProfileImage", reader.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null
    handleFileSelect(selectedFile)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const selectedFile = e.dataTransfer.files?.[0] ?? null
    handleFileSelect(selectedFile)
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleProcessAndRedirect = async () => {
    if (!file) {
      setError("Please select a side profile photo before continuing.")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Get both images from localStorage
      const frontImageData = localStorage.getItem("frontProfileImage")
      const sideImageData = localStorage.getItem("sideProfileImage")

      if (!frontImageData) {
        throw new Error("Front profile image not found. Please go back and upload it first.")
      }
      if (!sideImageData) {
        throw new Error("Side profile image not found.")
      }

      // Load front image into an HTMLImageElement
      setProcessingStage("Loading front photo...")
      const frontImg = await loadImage(frontImageData)

      // Load side image
      setProcessingStage("Loading side photo...")
      const sideImg = await loadImage(sideImageData)

      // Detect landmarks using MediaPipe
      setProcessingStage("Detecting facial landmarks (front)...")
      const frontLandmarks = await detectFrontFromImage(frontImg)

      if (frontLandmarks.length === 0) {
        console.warn("⚠️  Front landmark detection returned 0 landmarks – analysis results may be limited")
        // Don't block the user — still continue with side detection
      }

      setProcessingStage("Detecting facial landmarks (side)...")
      const sideResult = await detectSideFromImage(sideImg)

      if (sideResult.landmarks.length === 0) {
        console.warn("⚠️  Side landmark detection returned 0 landmarks – analysis results may be limited")
        // Don't block the user — still continue
      }

      // If the side image was mirrored during detection (facing was left),
      // mirror the stored image so the dashboard shows the correctly-oriented photo
      if (sideResult.wasMirrored && sideImageData) {
        setProcessingStage("Normalizing side image orientation...")
        try {
          const mirroredUrl = await mirrorImageDataUrl(sideImageData)
          localStorage.setItem("sideProfileImage", mirroredUrl)
          console.log("🔄 Side image mirrored to face right for display")
        } catch (mirrorErr) {
          console.warn("Failed to mirror side image:", mirrorErr)
        }
      }

      // Save landmarks to localStorage
      setProcessingStage("Saving results...")
      localStorage.setItem("frontLandmarks", JSON.stringify(frontLandmarks))
      localStorage.setItem("sideLandmarks", JSON.stringify(sideResult.landmarks))

      console.log(`Detected ${frontLandmarks.length} front landmarks and ${sideResult.landmarks.length} side landmarks`)

      setSuccess(true)

      // Redirect to analysis dashboard
      const genderQuery = initialGender ?? "male"
      const ethnicityQuery = initialEthnicity ? `&ethnicity=${initialEthnicity}` : ""
      router.push(`/analysis?gender=${genderQuery}${ethnicityQuery}`)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Something went wrong during analysis. Please try again.")
    } finally {
      setIsProcessing(false)
      setProcessingStage("")
    }
  }

  const handleBack = () => {
    const genderQuery = initialGender ?? "male"
    const ethnicityQuery = initialEthnicity ? `&ethnicity=${initialEthnicity}` : ""
    router.push(`/onboarding/photos?gender=${genderQuery}${ethnicityQuery}`)
  }

  const accentRing = isFemaleAccent
    ? "ring-pink-500/70 hover:ring-pink-400/90 border-pink-500/60"
    : "ring-sky-500/70 hover:ring-sky-400/90 border-sky-500/60"

  const accentGlow = isFemaleAccent
    ? "shadow-[0_18px_45px_rgba(236,72,153,0.6)] from-pink-500 to-rose-500"
    : "shadow-[0_18px_45px_rgba(37,99,235,0.75)] from-sky-500 to-blue-500"

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-sky-100 sm:text-3xl">
          Upload your side profile
        </h2>
        <p className="text-xs text-muted-foreground sm:text-sm">
          A clear side-view photo helps us understand your facial projection and profile balance.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-[1.1fr,0.9fr] items-start">
        {/* Upload area */}
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`group relative flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed bg-background/70 px-4 py-6 text-center transition-all duration-300 ${
            isDragging
              ? accentRing + " bg-background/80"
              : "border-border/70 hover:border-sky-500/60 hover:bg-background/80"
          }`}
        >
          <div
            className={`pointer-events-none absolute inset-0 rounded-2xl opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-80 ${
              isFemaleAccent
                ? "bg-gradient-to-br from-pink-500/15 via-rose-500/10 to-sky-500/10"
                : "bg-gradient-to-br from-sky-500/15 via-blue-500/10 to-cyan-500/10"
            }`}
          />

          <div className="relative flex flex-col items-center gap-3">
            <div
              className={`flex size-14 items-center justify-center rounded-2xl border bg-background/80 text-sky-300 shadow-lg shadow-sky-900/50 ${
                isFemaleAccent
                  ? "border-pink-500/40 bg-pink-500/5 text-pink-100"
                  : "border-sky-500/40 bg-sky-500/5 text-sky-100"
              }`}
            >
              <UploadCloud className="size-7" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">
                Drag & drop your photo here
                <span className="text-muted-foreground"> or</span>
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                className={
                  "mt-1 border-dashed text-xs font-medium tracking-wide" +
                  (isFemaleAccent
                    ? " border-pink-500/70 text-pink-100 hover:bg-pink-500/10"
                    : " border-sky-500/70 text-sky-100 hover:bg-sky-500/10")
                }
              >
                Choose photo
              </Button>
              <p className="mt-1 text-[11px] text-muted-foreground">
                JPG or PNG · Max 10MB · Clear side view, neutral expression, good lighting.
              </p>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            className="hidden"
            onChange={onInputChange}
          />
        </div>

        {/* Live preview & guidelines */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <ImageIcon className="size-4" />
              Live preview
            </div>

            <div className="flex items-center gap-4">
              <div className="relative flex size-24 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-secondary/70">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Side profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">For the best analysis:</p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Turn your head 90° to the side, keep your posture straight.</li>
                  <li>Keep your jaw and nose profile clearly visible.</li>
                  <li>Use even lighting, avoid heavy shadows or colored lights.</li>
                </ul>
                {initialEthnicity && (
                  <p className="pt-1 text-[11px] italic text-muted-foreground/90">
                    Profile will be calibrated for your selected ethnicity.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Processing indicator */}
          {isProcessing && (
            <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <Loader2 className="size-5 animate-spin text-primary" />
                <div>
                  <p className="text-xs font-medium text-foreground">Analyzing your photos...</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{processingStage}</p>
                </div>
              </div>
              <div className="mt-2 h-1 bg-secondary/50 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
              </div>
            </div>
          )}

          {success && !isProcessing && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              <CheckCircle2 className="size-4" />
              <span>Landmarks detected! Redirecting to analysis...</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={isProcessing}
          className="w-full justify-center sm:w-auto"
        >
          Back
        </Button>

        <Button
          type="button"
          size="lg"
          disabled={isProcessing}
          onClick={handleProcessAndRedirect}
          className={
            "w-full justify-center gap-2 transform-gpu bg-gradient-to-r text-primary-foreground transition-all duration-300 sm:w-auto " +
            accentGlow +
            (isProcessing
              ? " opacity-70 cursor-wait hover:translate-y-0 hover:shadow-none"
              : " hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.85)]")
          }
        >
          {isProcessing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Brain className="size-4" />
              Analyze & view results
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

/**
 * Helper to load a data URL into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = src
  })
}
