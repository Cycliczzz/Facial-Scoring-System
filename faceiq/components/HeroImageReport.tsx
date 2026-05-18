"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import { Check, X, AlertTriangle, Activity, Eye, Gauge, Target, Sparkles, ChevronRight } from "lucide-react"
import { sampleAnalyses, type SampleAnalysis } from "@/lib/sampleAnalysisData"

interface HeroImageReportProps {
  currentImageIndex: number
  onClose: () => void
  isClosing: boolean
}

// ─── Animated counter ───────────────────────────────────────────────
function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [displayed, setDisplayed] = useState(0)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    const start = performance.now()
    const from = 0

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(from + (value - from) * eased)

      if (progress < 1) {
        ref.current = requestAnimationFrame(tick)
      }
    }

    ref.current = requestAnimationFrame(tick)
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current)
    }
  }, [value, duration])

  return <span>{displayed.toFixed(1)}</span>
}

// ─── Score ring ─────────────────────────────────────────────────────
function ScoreRing({ score, size = 80, strokeWidth = 5 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const [offset, setOffset] = useState(circumference)

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circumference - (score / 10) * circumference)
    }, 300)
    return () => clearTimeout(timer)
  }, [score, circumference])

  const color =
    score >= 8 ? "#22c55e" : score >= 7 ? "#38bdf8" : score >= 6 ? "#fbbf24" : "#f87171"

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <span className="text-lg font-bold tabular-nums" style={{ color }}>
        <AnimatedNumber value={score} />
      </span>
    </div>
  )
}

// ─── Mini bar ───────────────────────────────────────────────────────
function MiniBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setWidth((value / max) * 100), 400)
    return () => clearTimeout(timer)
  }, [value, max])

  const color =
    value >= 8 ? "#22c55e" : value >= 7 ? "#38bdf8" : value >= 6 ? "#fbbf24" : "#f87171"

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums" style={{ color }}>
          {value.toFixed(1)}
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${width}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>
    </div>
  )
}

// ─── Measurement row ────────────────────────────────────────────────
function MeasurementRow({
  label,
  value,
  ideal,
  status,
  index,
}: {
  label: string
  value: string
  ideal: string
  status: "good" | "warning" | "attention"
  index: number
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 600 + index * 120)
    return () => clearTimeout(timer)
  }, [index])

  const statusIcon =
    status === "good" ? (
      <Check className="size-3 text-emerald-400" />
    ) : status === "warning" ? (
      <AlertTriangle className="size-3 text-amber-400" />
    ) : (
      <X className="size-3 text-red-400" />
    )

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[11px] transition-all duration-500 ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
      }`}
      style={{
        backgroundColor:
          status === "good"
            ? "rgba(34,197,94,0.06)"
            : status === "warning"
              ? "rgba(251,191,36,0.06)"
              : "rgba(248,113,113,0.06)",
      }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {statusIcon}
        <span className="text-muted-foreground truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-medium tabular-nums">{value}</span>
        <span className="text-[10px] text-muted-foreground/60">ideal: {ideal}</span>
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────
export default function HeroImageReport({ currentImageIndex, onClose, isClosing }: HeroImageReportProps) {
  const [analysis, setAnalysis] = useState<SampleAnalysis | null>(null)
  const [phase, setPhase] = useState<"scanning" | "results">("scanning")
  const [scanProgress, setScanProgress] = useState(0)
  const [showContent, setShowContent] = useState(false)

  // Get analysis for current image
  useEffect(() => {
    const idx = currentImageIndex % sampleAnalyses.length
    setAnalysis(sampleAnalyses[idx])
    setPhase("scanning")
    setScanProgress(0)
    setShowContent(false)
  }, [currentImageIndex])

  // Scanning animation
  useEffect(() => {
    if (phase !== "scanning" || !analysis) return

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
        setPhase("results")
        setTimeout(() => setShowContent(true), 100)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [phase, analysis])

  if (!analysis) return null

  return (
    <div
      className={`absolute inset-0 z-10 ${
        isClosing ? "hero-report-closing" : "hero-report-open"
      }`}
    >
      {/* Scanning overlay */}
      {phase === "scanning" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md rounded-3xl z-20">
          {/* Scan line animation */}
          <div
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_20px_rgba(56,189,248,0.8)]"
            style={{
              top: `${scanProgress}%`,
              transition: "top 0.03s linear",
              filter: "blur(0.5px)",
            }}
          />

          {/* Corner brackets */}
          <div className="absolute inset-6 pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-sky-400/60 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-sky-400/60 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-sky-400/60 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-sky-400/60 rounded-br-lg" />
          </div>

          {/* Scanning text */}
          <div className="relative z-10 text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/15 px-4 py-1.5 border border-sky-500/30">
              <Activity className="size-4 text-sky-400 animate-pulse" />
              <span className="text-sm font-medium text-sky-300">Analyzing facial proportions...</span>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="size-2 rounded-full bg-sky-400"
                  style={{
                    animation: `scan-dot 1.2s ease-in-out ${i * 0.3}s infinite`,
                    opacity: scanProgress > 30 + i * 20 ? 0.4 : 1,
                  }}
                />
              ))}
            </div>

            <div className="h-1 w-48 mx-auto rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-400 transition-all duration-100 ease-out"
                style={{ width: `${scanProgress}%` }}
              />
            </div>

            <p className="text-[11px] text-muted-foreground/60">
              Detecting landmarks • Computing ratios • Scoring harmony
            </p>
          </div>
        </div>
      )}

      {/* Results overlay */}
      {phase === "results" && (
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          {/* Background image with blur */}
          <div className="absolute inset-0">
            <Image
              src={analysis.image}
              alt=""
              fill
              className="object-cover scale-110"
              sizes="(min-width: 1024px) 420px, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/70 to-black/85 backdrop-blur-sm" />
          </div>

          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(56,189,248,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.5) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-30 flex size-7 items-center justify-center rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white transition-all duration-200 border border-white/10"
          >
            <X className="size-3.5" />
          </button>

          {/* Content */}
          <div
            className={`relative z-10 h-full overflow-y-auto custom-scrollbar p-4 space-y-3 transition-all duration-700 ${
              showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3 text-sky-400" />
                  <h3 className="text-sm font-semibold text-white">Facial Harmony Report</h3>
                </div>
                <p className="text-[10px] text-muted-foreground/70">
                  {analysis.overallPercentile} • {analysis.overallLabel}
                </p>
              </div>
              <ScoreRing score={analysis.overallScore} size={56} strokeWidth={4} />
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Eye className="size-3" />
                  <span>Front Profile</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-sky-300 tabular-nums">
                    <AnimatedNumber value={analysis.frontProfile} />
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">/10</span>
                </div>
                <p className="text-[10px] text-emerald-400/80">{analysis.frontLabel}</p>
              </div>
              <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Target className="size-3" />
                  <span>Side Profile</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-amber-300 tabular-nums">
                    <AnimatedNumber value={analysis.sideProfile} />
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">/10</span>
                </div>
                <p className="text-[10px] text-amber-400/80">{analysis.sideLabel}</p>
              </div>
            </div>

            {/* Detail bars */}
            <div className="space-y-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1.5">
                <Gauge className="size-3" />
                <span>Detailed Metrics</span>
              </div>
              <MiniBar label="Symmetry" value={analysis.symmetry} />
              <MiniBar label="Proportions" value={analysis.proportions} />
              <MiniBar label="Jaw Angle" value={analysis.jawAngle} />
              <MiniBar label="Nasal Projection" value={analysis.nasalProjection} />
              <MiniBar label="Eye Spacing" value={analysis.eyeSpacing} />
              <MiniBar label="Midface Harmony" value={analysis.midfaceHarmony} />
            </div>

            {/* Strengths & Focus */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15 p-2.5">
                <p className="text-[10px] font-medium text-emerald-400 mb-1.5">Strengths</p>
                <ul className="space-y-1">
                  {analysis.strengths.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 text-[10px] text-white/70"
                      style={{
                        animation: `fade-slide-up 0.4s ease-out ${0.8 + i * 0.1}s both`,
                      }}
                    >
                      <Check className="size-2.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg bg-amber-500/[0.06] border border-amber-500/15 p-2.5">
                <p className="text-[10px] font-medium text-amber-400 mb-1.5">Focus Areas</p>
                <ul className="space-y-1">
                  {analysis.focusAreas.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 text-[10px] text-white/70"
                      style={{
                        animation: `fade-slide-up 0.4s ease-out ${1.0 + i * 0.1}s both`,
                      }}
                    >
                      <ChevronRight className="size-2.5 text-amber-400 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Measurements */}
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1.5">
                <Activity className="size-3" />
                <span>Key Measurements</span>
              </div>
              <div className="space-y-0.5">
                {analysis.measurements.map((m, i) => (
                  <MeasurementRow key={m.label} {...m} index={i} />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pb-1">
              <p className="text-[9px] text-muted-foreground/40">
                Sample analysis • Values are simulated for demonstration
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
