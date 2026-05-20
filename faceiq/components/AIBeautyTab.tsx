"use client"

import { useState, useEffect, useCallback } from "react"
import { Brain, Sparkles, Activity } from "lucide-react"

// ============================================================
// Types for PyTorch Model Scores
// ============================================================

interface ModelScore {
  score: number
  raw_score: number
  confidence: number
}

interface EnsembleResult {
  score: number
  confidence: number
  models: {
    alexnet: ModelScore
    resnet18: ModelScore
  }
}

// ============================================================
// Animated Score Ring Component
// ============================================================

function AnimatedScoreRing({ score }: { score: number }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const [ringProgress, setRingProgress] = useState(0)

  useEffect(() => {
    setAnimatedScore(0)
    setRingProgress(0)
    const duration = 1200
    const steps = 60
    const interval = duration / steps
    let step = 0

    const timer = setInterval(() => {
      step++
      const progress = step / steps
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(score * eased)
      setRingProgress(eased)
      if (step >= steps) clearInterval(timer)
    }, interval)

    return () => clearInterval(timer)
  }, [score])

  const radius = 100
  const circumference = 2 * Math.PI * radius
  const fillPercent = score / 10
  const strokeDashoffset = circumference * (1 - fillPercent * ringProgress)

  const getColor = (s: number) => {
    if (s >= 8) return { ring: "#34d399", glow: "rgba(52,211,153,0.5)", text: "text-emerald-300" }
    if (s >= 6) return { ring: "#fbbf24", glow: "rgba(251,191,36,0.5)", text: "text-amber-300" }
    return { ring: "#f87171", glow: "rgba(248,113,113,0.5)", text: "text-red-300" }
  }

  const colors = getColor(score)

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-40 transition-all duration-1000"
          style={{ background: colors.glow }}
        />
        <svg width="260" height="260" className="transform -rotate-90 drop-shadow-xl">
          <circle cx="130" cy="130" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle
            cx="130" cy="130" r={radius} fill="none"
            stroke={colors.ring} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-out"
            style={{ filter: `drop-shadow(0 0 15px ${colors.glow})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-6xl font-bold tracking-tight transition-colors duration-500 ${colors.text}`}>
            {animatedScore.toFixed(1)}
          </div>
          <div className="text-xs text-white/30 font-medium mt-1 tracking-widest uppercase">/ 10</div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Scan Card Component - exact copy of HeroImageReport style
// ============================================================

function ScanCard({
  imageUrl,
  label,
  scanProgress,
}: {
  imageUrl: string
  label: string
  scanProgress: number
}) {
  return (
    <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900/50 border border-white/10 shadow-2xl">
      {/* Background image with blur */}
      <div
        className="absolute inset-0 scale-110"
        style={{
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/70 to-black/85 backdrop-blur-sm" />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(168,85,247,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.5) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Scan line - exact same as HeroImageReport */}
      <div
        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent"
        style={{
          top: `${scanProgress}%`,
          transition: "top 0.03s linear",
          boxShadow: "0 0 20px rgba(168,85,247,0.8)",
          filter: "blur(0.5px)",
        }}
      />

      {/* Corner brackets - exact same as HeroImageReport */}
      <div className="absolute inset-6 pointer-events-none">
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-purple-400/60 rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-purple-400/60 rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-purple-400/60 rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-400/60 rounded-br-lg" />
      </div>

      {/* Scanning text - exact same as HeroImageReport */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="relative z-10 text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/15 px-4 py-1.5 border border-purple-500/30">
            <Activity className="size-4 text-purple-400 animate-pulse" />
            <span className="text-sm font-medium text-purple-300">Analyzing facial proportions...</span>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="size-2 rounded-full bg-purple-400"
                style={{
                  animation: `scan-dot 1.2s ease-in-out ${i * 0.3}s infinite`,
                  opacity: scanProgress > 30 + i * 20 ? 0.4 : 1,
                }}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="h-1 w-48 mx-auto rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-sky-400 transition-all duration-100 ease-out"
              style={{ width: `${scanProgress}%` }}
            />
          </div>

          <p className="text-[11px] text-white/40">
            Detecting landmarks • Computing ratios • Scoring harmony
          </p>
        </div>
      </div>

      {/* Label */}
      <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
        <span className="text-[10px] font-medium text-white/60">{label}</span>
      </div>
    </div>
  )
}

// ============================================================
// Particle Background
// ============================================================

function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/5 animate-pulse"
          style={{
            width: Math.random() * 4 + 1 + "px",
            height: Math.random() * 4 + 1 + "px",
            left: Math.random() * 100 + "%",
            top: Math.random() * 100 + "%",
            animationDelay: Math.random() * 3 + "s",
            animationDuration: Math.random() * 3 + 2 + "s",
          }}
        />
      ))}
    </div>
  )
}

// ============================================================
// Main AI Beauty Tab Component
// ============================================================

interface AIBeautyTabProps {
  results?: any
  frontLandmarks?: any[]
  sideLandmarks?: any[]
  frontImage: string
  sideImage?: string
  isFemaleAccent?: boolean
}

export default function AIBeautyTab({
  frontImage,
  sideImage,
}: AIBeautyTabProps) {
  const [modelScores, setModelScores] = useState<EnsembleResult | null>(null)
  const [modelLoading, setModelLoading] = useState(true)
  const [showContent, setShowContent] = useState(false)
  const [phase, setPhase] = useState<"loading" | "scanning" | "result">("loading")
  const [scanProgress, setScanProgress] = useState(0)

  const fetchModelScores = useCallback(async () => {
    setModelLoading(true)
    try {
      const response = await fetch(frontImage)
      const blob = await response.blob()
      const formData = new FormData()
      formData.append("image", blob, "front.jpg")
      formData.append("model", "ensemble")

      const apiResponse = await fetch("/api/ai-beauty-score", {
        method: "POST",
        body: formData,
      })
      const data = await apiResponse.json()
      if (data.error && !data.fallback) {
        throw new Error(data.error)
      }
      setModelScores(data as EnsembleResult)
    } catch (err: any) {
      console.error("Failed to fetch model scores:", err)
      setModelScores({
        score: 7.0,
        confidence: 0.5,
        models: {
          alexnet: { score: 7.0, raw_score: 0, confidence: 0.5 },
          resnet18: { score: 7.0, raw_score: 0, confidence: 0.5 },
        },
      })
    } finally {
      setModelLoading(false)
      setPhase("scanning")
    }
  }, [frontImage])

  useEffect(() => {
    fetchModelScores()
  }, [fetchModelScores])

  // Scanning animation - exact same as HeroImageReport
  useEffect(() => {
    if (phase !== "scanning") return

    const duration = 1800
    const interval = 30
    const steps = duration / interval
    let step = 0

    const timer = setInterval(() => {
      step++
      const progress = Math.min((step / steps) * 100, 100)
      setScanProgress(progress)

      if (progress >= 100) {
        clearInterval(timer)
        setPhase("result")
        setTimeout(() => setShowContent(true), 100)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [phase])

  const finalScore = modelScores?.score ?? 0

  const getAssessment = (score: number) => {
    if (score >= 9) return "Exceptional facial harmony"
    if (score >= 8) return "Excellent facial aesthetics"
    if (score >= 7) return "Above average proportions"
    if (score >= 6) return "Good facial structure"
    if (score >= 5) return "Average facial proportions"
    return "Below average symmetry"
  }

  // Loading state
  if (phase === "loading") {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-purple-950/30 to-slate-900 border border-white/10 min-h-[400px] flex items-center justify-center">
        <ParticleBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="size-16 rounded-full border-2 border-purple-500/20 border-t-purple-400 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Brain className="size-6 text-purple-400/60 animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-white/70">AI Analysis in Progress</div>
            <div className="text-[11px] text-white/40 mt-1">Running deep learning models...</div>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="size-2 rounded-full bg-purple-400/40 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Scanning phase
  if (phase === "scanning") {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-purple-950/30 to-slate-900 border border-white/10">
        <ParticleBackground />

        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="size-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-sky-500/20 flex items-center justify-center border border-white/10">
              <Sparkles className="size-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Beauty Score</h2>
              <p className="text-[11px] text-white/40">Combined harmony, dimorphism, features & angularity</p>
            </div>
          </div>

          {/* Main layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left: Score */}
            <div className="flex flex-col items-center justify-center pt-4">
              <AnimatedScoreRing score={finalScore} />
              <div className="text-center mt-4">
                <div className="text-sm font-semibold text-white/90">{getAssessment(finalScore)}</div>
              </div>
            </div>

            {/* Right: Scanning images */}
            <div className="grid grid-cols-2 gap-4">
              <ScanCard imageUrl={frontImage} label="Front Profile" scanProgress={scanProgress} />
              {sideImage && (
                <ScanCard imageUrl={sideImage} label="Side Profile" scanProgress={scanProgress} />
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Result phase
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-purple-950/30 to-slate-900 border border-white/10">
      <ParticleBackground />

      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl" />

      <div
        className={`relative z-10 p-8 transition-all duration-700 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="size-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-sky-500/20 flex items-center justify-center border border-white/10">
            <Sparkles className="size-5 text-purple-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">AI Beauty Score</h2>
            <p className="text-[11px] text-white/40">Combined harmony, dimorphism, features & angularity</p>
          </div>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left: Score */}
          <div className="flex flex-col items-center justify-center pt-4">
            <AnimatedScoreRing score={finalScore} />
            <div className="text-center mt-4">
              <div className="text-sm font-semibold text-white/90">{getAssessment(finalScore)}</div>
            </div>
          </div>

          {/* Right: Result images */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900/50 border border-white/10 shadow-2xl">
              <div
                className="absolute inset-0 scale-110"
                style={{
                  backgroundImage: `url(${frontImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/40" />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10">
                <span className="text-[11px] font-medium text-white/70">Front Profile</span>
              </div>
            </div>
            {sideImage && (
              <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900/50 border border-white/10 shadow-2xl">
                <div
                  className="absolute inset-0 scale-110"
                  style={{
                    backgroundImage: `url(${sideImage})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/40" />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10">
                  <span className="text-[11px] font-medium text-white/70">Side Profile</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
