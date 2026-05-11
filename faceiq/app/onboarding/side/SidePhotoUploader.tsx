"use client"

import React, { useState, useRef, DragEvent, ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { ImageIcon, UploadCloud, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"

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
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a side profile photo before continuing.")
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      // TODO: Replace this with real upload logic to your backend or storage service
      await new Promise((resolve) => setTimeout(resolve, 1500))

      console.log("Uploaded side profile:", {
        name: file.name,
        size: file.size,
        type: file.type,
        gender: initialGender,
        ethnicity: initialEthnicity,
      })

      setSuccess(true)
      
      // Redirect to front landmarks page
      const genderQuery = initialGender ?? "male"
      const ethnicityQuery = initialEthnicity ? `&ethnicity=${initialEthnicity}` : ""
      router.push(`/onboarding/front-landmarks?gender=${genderQuery}${ethnicityQuery}`)
    } catch (err) {
      console.error(err)
      setError("Something went wrong while uploading. Please try again.")
    } finally {
      setIsUploading(false)
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

          {success && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              <CheckCircle2 className="size-4" />
              <span>Your side profile photo is saved.</span>
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
          className="w-full justify-center sm:w-auto"
        >
          Back
        </Button>

        <Button
          type="button"
          size="lg"
          disabled={isUploading}
          onClick={handleUpload}
          className={
            "w-full justify-center gap-2 transform-gpu bg-gradient-to-r text-primary-foreground transition-all duration-300 sm:w-auto " +
            accentGlow +
            (isUploading
              ? " opacity-70 cursor-wait hover:translate-y-0 hover:shadow-none"
              : " hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.85)]")
          }
        >
          {isUploading ? "Uploading..." : "Save & continue"}
        </Button>
      </div>
    </div>
  )
}
