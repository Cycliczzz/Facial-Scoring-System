"use client"

import { useState } from "react"
import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"

export type Gender = "male" | "female"

export function GenderSelector() {
  const [selected, setSelected] = useState<Gender | null>(null)

  const isSelected = (value: Gender) => selected === value

  const handleContinue = () => {
    if (!selected) return
    // TODO: Implement redirect or API call to persist gender selection
    console.log("Selected gender:", selected)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-sky-100 sm:text-3xl">
          Select your gender
        </h2>
        <p className="text-xs text-muted-foreground sm:text-sm">
          This helps us provide more accurate analysis
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Male */}
        <button
          type="button"
          onClick={() => setSelected("male")}
          className={`gender-card group flex h-auto flex-col items-stretch gap-2 rounded-2xl border border-border/70 bg-background/60 px-4 py-4 text-left transition-all ${
            isSelected("male")
              ? "gender-card-selected border-sky-500/80 bg-sky-500/10 shadow-[0_18px_45px_rgba(56,189,248,0.6)]"
              : "hover:border-sky-500/70 hover:bg-sky-500/10"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-sky-400">
              Male
            </span>
            {isSelected("male") && (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">
                <Check className="size-3" />
              </span>
            )}
          </div>
          <span className="mt-1 text-sm font-semibold">Male harmony profile</span>
          <span className="mt-1 text-xs text-muted-foreground">
            Optimize for stronger jawlines, upper third structure, and masculine balance cues.
          </span>
        </button>

        {/* Female */}
        <button
          type="button"
          onClick={() => setSelected("female")}
          className={`gender-card group flex h-auto flex-col items-stretch gap-2 rounded-2xl border border-border/70 bg-background/60 px-4 py-4 text-left transition-all ${
            isSelected("female")
              ? "gender-card-selected border-pink-500/80 bg-pink-500/10 shadow-[0_18px_45px_rgba(236,72,153,0.6)]"
              : "hover:border-pink-500/70 hover:bg-pink-500/10"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-pink-300">
              Female
            </span>
            {isSelected("female") && (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-pink-500/20 text-pink-100">
                <Check className="size-3" />
              </span>
            )}
          </div>
          <span className="mt-1 text-sm font-semibold">Female harmony profile</span>
          <span className="mt-1 text-xs text-muted-foreground">
            Focus on mid‑face balance, soft tissue harmony, and feminine proportion targets.
          </span>
        </button>
      </div>

      <Button
        type="button"
        size="lg"
        disabled={!selected}
        onClick={handleContinue}
        className={
          "w-full justify-center gap-2 transform-gpu bg-gradient-to-r from-sky-500 to-blue-500 text-primary-foreground shadow-[0_18px_45px_rgba(37,99,235,0.65)] transition-all duration-300 " +
          (selected
            ? "hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(37,99,235,0.85)]"
            : "opacity-60 cursor-not-allowed hover:translate-y-0 hover:shadow-none")
        }
      >
        Continue
      </Button>
    </div>
  )
}
