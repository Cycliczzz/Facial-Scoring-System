"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"

export type Ethnicity =
  | "east_asian"
  | "south_asian"
  | "black_african"
  | "hispanic"
  | "middle_eastern"
  | "native_american"
  | "pacific_islander"
  | "white_caucasian"

const ethnicityOptions: { id: Ethnicity; label: string; description: string }[] = [
  {
    id: "east_asian",
    label: "East Asian",
    description: "Chinese, Japanese, Korean, Mongolian, and related backgrounds.",
  },
  {
    id: "south_asian",
    label: "South Asian",
    description: "Indian, Pakistani, Bangladeshi, Sri Lankan, Nepali and similar.",
  },
  {
    id: "black_african",
    label: "Black / African",
    description: "African, Afro‑Caribbean, or African diaspora heritage.",
  },
  {
    id: "hispanic",
    label: "Hispanic",
    description: "Latino / Latina backgrounds from Central or South America.",
  },
  {
    id: "middle_eastern",
    label: "Middle Eastern",
    description: "Arab, Persian, Turkish, North African and nearby regions.",
  },
  {
    id: "native_american",
    label: "Native American",
    description: "Indigenous peoples of the Americas.",
  },
  {
    id: "pacific_islander",
    label: "Pacific Islander",
    description: "Polynesian, Micronesian, Melanesian and related islands.",
  },
  {
    id: "white_caucasian",
    label: "White / Caucasian",
    description: "European, North American, or similar Caucasian ancestry.",
  },
]

export function EthnicitySelector() {
  const [selected, setSelected] = useState<Ethnicity | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialGender = searchParams.get("gender") === "female" ? "female" : "male"
  const isFemaleAccent = initialGender === "female"

  const isSelected = (id: Ethnicity) => selected === id

  const handleContinue = () => {
    if (!selected) return
    // TODO: Persist ethnicity selection then navigate to next onboarding step
    console.log("Selected ethnicity:", selected)
  }

  const handleBack = () => {
    router.push("/onboarding")
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-sky-100 sm:text-3xl">
          Select your ethnicity
        </h2>
        <p className="text-xs text-muted-foreground sm:text-sm">
          You should select the closest one if you have more than one ethnicity
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ethnicityOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelected(opt.id)}
            className={`gender-card group flex h-auto flex-col items-stretch gap-2 rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-left text-xs sm:text-sm transition-all ${
              isSelected(opt.id)
                ? isFemaleAccent
                  ? "gender-card-selected gender-card-pink border-pink-500/80 bg-pink-500/10 shadow-[0_18px_45px_rgba(236,72,153,0.6)]"
                  : "gender-card-selected border-sky-500/80 bg-sky-500/10 shadow-[0_18px_45px_rgba(56,189,248,0.6)]"
                : isFemaleAccent
                  ? "gender-card-pink hover:border-pink-500/70 hover:bg-pink-500/10"
                  : "hover:border-sky-500/70 hover:bg-sky-500/10"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-foreground">{opt.label}</span>
              {isSelected(opt.id) && (
                <span
                  className={
                    "inline-flex size-5 items-center justify-center rounded-full " +
                    (isFemaleAccent ? "bg-pink-500/20 text-pink-100" : "bg-sky-500/20 text-sky-300")
                  }
                >
                  <Check className="size-3" />
                </span>
              )}
            </div>
            <span className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
              {opt.description}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          disabled={!selected}
          onClick={handleContinue}
          className={
            "w-full justify-center gap-2 transform-gpu bg-gradient-to-r from-sky-500 to-blue-500 text-primary-foreground shadow-[0_18px_45px_rgba(37,99,235,0.65)] transition-all duration-300 sm:w-auto " +
            (selected
              ? "hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(37,99,235,0.85)]"
              : "opacity-60 cursor-not-allowed hover:translate-y-0 hover:shadow-none")
          }
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
