"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Activity, Sparkles, Award, Brain, ArrowRight,
  TrendingUp, TrendingDown, CheckCircle2, ScanLine
} from "lucide-react"
import { calculateAnalysis } from "@/lib/analysis/calculator"
import type { AnalysisResults, LandmarkPoint, Ethnicity, Gender } from "@/lib/analysis/types"

// ============================================================
// Score Ring Component
// ============================================================

function ScoreRing({ score, label, size = 90, delay = 0 }: { score: number; label: string; size?: number; delay?: number }) {
  const [active, setActive] = useState(false)
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 10) * circumference

  useEffect(() => {
    const t = setTimeout(() => setActive(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const getColor = (s: number) => {
    if (s >= 8) return { ring: "#34d399", glow: "rgba(52,211,153,0.6)", text: "#34d399" }
    if (s >= 6) return { ring: "#fbbf24", glow: "rgba(251,191,36,0.6)", text: "#fbbf24" }
    return { ring: "#f87171", glow: "rgba(248,113,113,0.6)", text: "#f87171" }
  }
  const colors = getColor(score)
  const center = size / 2

  return (
    <div className="relative flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size + 20, height: size + 20 }}>
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-30 transition-all duration-1000"
          style={{ background: colors.glow }}
        />
        <svg width={size + 20} height={size + 20} className="absolute inset-0 -rotate-90">
          <circle
            cx={center + 10} cy={center + 10} r={radius}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
          />
          <circle
            cx={center + 10} cy={center + 10} r={radius}
            fill="none" stroke={colors.ring} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={active ? offset : circumference}
            style={{
              transition: "stroke-dashoffset 1.8s cubic-bezier(0.16, 1, 0.3, 1)",
              filter: active ? `drop-shadow(0 0 12px ${colors.glow})` : "none",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-bold tracking-tight transition-all duration-1000"
            style={{
              color: colors.text,
              opacity: active ? 1 : 0,
              transform: active ? "scale(1)" : "scale(0.5)",
            }}
          >
            {score.toFixed(1)}
          </span>
          <span className="text-[9px] text-white/30 font-medium">/10</span>
        </div>
      </div>
      <span className="text-[11px] text-white/50 font-medium tracking-wider uppercase">{label}</span>
    </div>
  )
}

// ============================================================
// Loading DNA Helix Animation
// ============================================================

function DNAHelix() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="relative">
        <div className="size-24 rounded-full border-2 border-sky-400/20 border-t-sky-400 animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-purple-400/15 border-b-purple-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.2s" }} />
        <div className="absolute inset-4 rounded-full border border-emerald-400/10 border-r-emerald-400/80 animate-spin" style={{ animationDuration: "0.9s" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Brain className="size-6 text-sky-400/80 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Scanning Overlay
// ============================================================

function ScanningOverlay({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md rounded-3xl">
      {/* Scan line */}
      <div
        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent"
        style={{
          top: `${progress}%`,
          transition: "top 0.05s linear",
          boxShadow: "0 0 30px rgba(56,189,248,0.9)",
          filter: "blur(0.5px)",
        }}
      />

      {/* Corner brackets */}
      <div className="absolute inset-6 pointer-events-none">
        <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-sky-400/60 rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-sky-400/60 rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-sky-400/60 rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-sky-400/60 rounded-br-lg" />
      </div>

      <div className="relative z-10 text-center space-y-4">
        <DNAHelix />
        <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/15 px-5 py-2 border border-sky-500/30">
          <Activity className="size-4 text-sky-400 animate-pulse" />
          <span className="text-sm font-medium text-sky-300">Analyzing facial proportions...</span>
        </div>

        <div className="h-1.5 w-56 mx-auto rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 via-purple-500 to-emerald-400 transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-[11px] text-white/30">
          Detecting landmarks • Computing ratios • Scoring harmony
        </p>
      </div>
    </div>
  )
}

// ============================================================
// Score Card Component
// ============================================================

function ResultCard({
  results, frontImageUrl, sideImageUrl, gender, ethnicity, uiEthnicity
}: {
  results: AnalysisResults
  frontImageUrl: string
  sideImageUrl: string
  gender: Gender
  ethnicity: Ethnicity
  uiEthnicity: string
}) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 400)
    return () => clearTimeout(t)
  }, [])

  const getScoreColor = (s: number) => {
    if (s >= 8) return "text-emerald-400"
    if (s >= 6) return "text-amber-400"
    return "text-red-400"
  }

  const getScoreBg = (s: number) => {
    if (s >= 8) return "from-emerald-500/20 to-green-500/10 border-emerald-500/30"
    if (s >= 6) return "from-amber-500/20 to-yellow-500/10 border-amber-500/30"
    return "from-red-500/20 to-rose-500/10 border-red-500/30"
  }

  const handleClick = () => {
    const gq = gender || "male"
    const eq = uiEthnicity || "east_asian"
    router.push(`/analysis?gender=${gq}&ethnicity=${eq}`)
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative w-full max-w-3xl mx-auto cursor-pointer transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-12 scale-95"
      } ${hovered ? "scale-[1.02]" : "scale-100"}`}
    >
      {/* Glow ring */}
      <div className={`absolute -inset-1 rounded-3xl bg-gradient-to-r ${getScoreBg(results.overallScore)} opacity-60 blur-xl transition-opacity duration-500 ${hovered ? "opacity-100" : "opacity-40"}`} />

      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-800 border border-white/10 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Award className="size-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white tracking-tight">Facial Harmony Score Card</h2>
              </div>
              <p className="text-[11px] text-white/40">
                {gender === "female" ? "Female" : "Male"} • {ethnicity.charAt(0).toUpperCase() + ethnicity.slice(1).replace("_", " ")}
              </p>
            </div>
          </div>

          {/* 3 Score rings */}
          <div className="flex items-center justify-center gap-6 py-2">
            <ScoreRing score={results.frontScore} label="Front" size={100} delay={200} />
            <div className="w-px h-20 bg-white/10" />
            <ScoreRing score={results.overallScore} label="Overall" size={110} delay={600} />
            <div className="w-px h-20 bg-white/10" />
            <ScoreRing score={results.sideScore} label="Side" size={100} delay={400} />
          </div>

          {/* Metrics count */}
          <div className="flex items-center justify-center gap-4 mt-3">
            <span className="text-[10px] text-white/30">
              {results.frontMeasurements.length} front metrics
            </span>
            <span className="text-[10px] text-white/20">•</span>
            <span className="text-[10px] text-white/30">
              {results.sideMeasurements.length} side metrics
            </span>
          </div>
        </div>

        {/* Images */}
        <div className="grid grid-cols-2 gap-3 p-6 pt-4">
          <div className="space-y-2">
            <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider text-center">Front</div>
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-800/50 border border-white/10 group/image">
              <img
                src={frontImageUrl}
                alt="Front"
                className="h-full w-full object-cover transition-transform duration-700 group-hover/image:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
                
                <span className="text-[9px] text-white/70"></span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider text-center">Side</div>
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-800/50 border border-white/10 group/image">
              <img
                src={sideImageUrl}
                alt="Side"
                className="h-full w-full object-cover transition-transform duration-700 group-hover/image:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
                
                <span className="text-[9px] text-white/70"></span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="relative px-6 pb-6">
          <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] group/cta transition-all duration-300 hover:bg-white/[0.08] hover:border-sky-500/30">
            <span className="text-sm font-medium text-white/80 group-hover/cta:text-white transition-colors">
              Tap to view full analysis dashboard
            </span>
            <ArrowRight className="size-4 text-sky-400 group-hover/cta:translate-x-1 transition-transform" />
          </div>

          {/* Particle dots */}
          <div className="absolute inset-x-6 bottom-6 flex justify-center pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="absolute size-1 rounded-full bg-white/20"
                style={{
                  top: -4 + Math.sin(i * 0.8) * 8 + "px",
                  left: 40 + i * 45 + Math.cos(i * 1.3) * 20 + "px",
                  animationDelay: i * 0.15 + "s",
                  animationDuration: (2 + Math.random() * 2) + "s",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Main Page Component
// ============================================================

export default function ResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<"scanning" | "result">("scanning")
  const [scanProgress, setScanProgress] = useState(0)
  const [results, setResults] = useState<AnalysisResults | null>(null)
  const [frontImage, setFrontImage] = useState("")
  const [sideImage, setSideImage] = useState("")

  // Map UI ethnicity values to analysis system ethnicity values (same as dashboard)
  const UI_ETHNICITY_MAP: Record<string, Ethnicity> = {
    east_asian: "asian",
    white_caucasian: "caucasian",
    black_african: "black",
    hispanic: "hispanic",
    middle_eastern: "middle_eastern",
    south_asian: "south_asian",
    native_american: "mixed",
    pacific_islander: "mixed",
  }

  const genderParam = ((searchParams?.get("gender")) === "female" ? "female" : "male") as Gender
  const uiEthnicity = searchParams?.get("ethnicity") || "east_asian"
  const ethnicityParam: Ethnicity = UI_ETHNICITY_MAP[uiEthnicity] || "asian"

  // Calculate results
  useEffect(() => {
    try {
      const frontImg = localStorage.getItem("frontProfileImage") || ""
      const sideImg = localStorage.getItem("sideProfileImage") || ""
      const frontLmRaw = localStorage.getItem("frontLandmarks")
      const sideLmRaw = localStorage.getItem("sideLandmarks")

      setFrontImage(frontImg)
      setSideImage(sideImg)

      if (frontLmRaw && sideLmRaw) {
        const frontLm: LandmarkPoint[] = JSON.parse(frontLmRaw)
        const sideLm: LandmarkPoint[] = JSON.parse(sideLmRaw)

        // Load aspect ratios
        const loadAspect = (src: string): Promise<number> => {
          return new Promise((resolve) => {
            if (!src) { resolve(1); return }
            const img = new Image()
            img.onload = () => resolve(img.width / img.height)
            img.onerror = () => resolve(1)
            img.src = src
          })
        }

        Promise.all([loadAspect(frontImg), loadAspect(sideImg)]).then(([fa, sa]) => {
          const analysis = calculateAnalysis(frontLm, sideLm, genderParam, ethnicityParam, fa, sa)
          setResults(analysis)
        })
      }
    } catch (e) {
      console.error("Failed to calculate results:", e)
      // Fallback: redirect to dashboard anyway
      router.push(`/analysis?gender=${genderParam}&ethnicity=${ethnicityParam}`)
    }
  }, [genderParam, ethnicityParam, router])

  // Scanning animation - run once, independent of results
  // When results arrive later, the second effect handles the transition
  useEffect(() => {
    if (phase !== "scanning") return

    const duration = 2800
    const interval = 28
    const steps = duration / interval
    let step = 0

    const timer = setInterval(() => {
      step++
      const progress = Math.min((step / steps) * 100, 100)
      setScanProgress(progress)

      if (progress >= 100) {
        clearInterval(timer)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [phase])

  // Transition to result when scanning ended AND results arrived
  useEffect(() => {
    if (phase === "scanning" && scanProgress >= 100 && results !== null) {
      setTimeout(() => setPhase("result"), 300)
    }
  }, [scanProgress, results, phase])

  // Redirect to dashboard if no data
  useEffect(() => {
    if (!localStorage.getItem("frontProfileImage") && !localStorage.getItem("sideProfileImage")) {
      router.push("/analysis")
    }
  }, [router])

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="hero-orbit" />
        <div className="grid-overlay" />
      </div>

      {/* Scanning phase */}
      {phase === "scanning" && (
        <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
          <div className="relative w-full rounded-3xl bg-card/60 border border-border/50 overflow-hidden shadow-[0_24px_70px_rgba(15,23,42,0.9)] backdrop-blur-xl" style={{ minHeight: "550px" }}>
            {/* Image preview background */}
            <div className="absolute inset-0 opacity-20">
              {frontImage && (
                <div className="absolute inset-0 grid grid-cols-2">
                  <div
                    className="h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${frontImage})` }}
                  />
                  <div
                    className="h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${sideImage})` }}
                  />
                </div>
              )}
            </div>
            <ScanningOverlay progress={scanProgress} />
          </div>
        </main>
      )}

      {/* Result phase */}
      {phase === "result" && results && results.frontMeasurements.length + results.sideMeasurements.length > 0 && (
        <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-12">
          <ResultCard
            results={results}
            frontImageUrl={frontImage}
            sideImageUrl={sideImage}
            gender={genderParam}
            ethnicity={ethnicityParam}
            uiEthnicity={uiEthnicity}
          />
        </main>
      )}

      {/* Fallback: no measurements computed */}
      {phase === "result" && results && results.frontMeasurements.length + results.sideMeasurements.length === 0 && (
        <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
          <div className="text-center space-y-4 bg-card/60 border border-border/50 rounded-3xl p-12 backdrop-blur-xl shadow-2xl">
            <DNAHelix />
            <div className="space-y-1">
              <p className="text-sm text-white/70 font-medium">No measurements computed</p>
              <p className="text-[11px] text-white/30">
                Front landmarks: {results.frontMeasurements.length} | Side landmarks: {results.sideMeasurements.length}
              </p>
              <p className="text-[11px] text-white/30">
                Gender: {results.gender} | Ethnicity: {results.ethnicity}
              </p>
            </div>
            <button
              onClick={() => router.push(`/analysis?gender=${genderParam}&ethnicity=${ethnicityParam}`)}
              className="mt-4 px-6 py-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 transition-all text-xs font-medium"
            >
              Go to Dashboard →
            </button>
          </div>
        </main>
      )}

      {/* Fallback if no results yet (still loading) */}
      {phase === "result" && !results && (
        <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
          <div className="text-center space-y-4">
            <DNAHelix />
            <p className="text-sm text-white/50">Computing your scores...</p>
          </div>
        </main>
      )}
    </div>
  )
}