"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"


import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { ArrowRight, Check, LineChart, Shield, Sparkles } from "lucide-react"

const features = [
  {
    title: "Adaptive harmony scoring",
    description:
      "Our engine benchmarks your proportions against reference datasets by age and sex, then weights every ratio by clinical relevance.",
    icon: LineChart,
  },
  {
    title: "Pixel-accurate measurements",
    description:
      "Standardized photo alignment and landmarking give you consistent, repeatable measurements across sessions.",
    icon: Shield,
  },
  {
    title: "Explainable insights",
    description:
      "See how each region of your face contributes to your overall harmony, with clear language and visuals.",
    icon: Sparkles,
  },
]

const steps = [
  {
    title: "Upload your photos",
    description:
      "Add a front and side profile. We normalize them to a standard reference plane for accurate comparison.",
  },
  {
    title: "Place key landmarks",
    description:
      "Follow the guided overlay to mark anatomical points. Every step includes visual hints so you know exactly where to click.",
  },
  {
    title: "Review your report",
    description:
      "Get your harmony scores, measurements, and a focused summary of strengths and possible improvements.",
  },
]

const planItems = [
  {
    label: "Posture & tongue training",
    impact: "+0.4 projected score",
    timeline: "Daily practice • 3–6 months",
  },
  {
    label: "Skin health routine",
    impact: "+0.3 projected score",
    timeline: "Simple AM/PM stack • 2–4 months",
  },
  {
    label: "Grooming & styling",
    impact: "+0.3 projected score",
    timeline: "Hair, brows, and framing • Immediate",
  },
]

const pricing = [
  {
    name: "Free",
    price: "$0",
    badge: "Start here",
    description: "Core insights for casual users and first-time analyses.",
    features: [
      "Side profile overview",
      "10 key facial ratios",
      "Sample strengths & concerns",
      "Face assistant with daily limit",
    ],
    highlight: false,
  },
  {
    name: "Basic",
    price: "$24.99 / month",
    badge: "Most popular",
    description: "Full report, non‑surgical plan, and progress tracking.",
    features: [
      "Full harmony & angularity scores",
      "70+ detailed ratios",
      "Complete strengths & weaknesses",
      "Non‑surgical improvement roadmap",
      "Progress tracking over time",
    ],
    highlight: true,
  },
  {
    name: "Pro",
    price: "$49.99 / month",
    badge: "For professionals",
    description: "Advanced analytics and comparison tools for power users.",
    features: [
      "Everything in Basic",
      "Potential score projection",
      "Side‑by‑side analysis comparison",
      "Extended simulation options",
      "Higher analysis & assistant limits",
    ],
    highlight: false,
  },
]

export default function Home() {
  const [activeSection, setActiveSection] = useState<string>("hero")
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const sectionIds = ["hero", "technology", "how-it-works", "pricing"]
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[]

    if (!sections.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top)

        if (visible.length > 0) {
          const id = visible[0].target.id
          setActiveSection(id)
        }
      },
      {
        threshold: 0.35,
        rootMargin: "-72px 0px -40% 0px",
      },
    )

    sections.forEach((section) => observer.observe(section))

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const onScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    onScroll()
    window.addEventListener("scroll", onScroll)

    return () => {
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  const scrollToSection = (sectionId: string) => {

    if (typeof window === "undefined") return

    const element = document.getElementById(sectionId)
    if (!element) return

    const headerOffset = 80
    const elementPosition = element.getBoundingClientRect().top + window.scrollY
    const offsetPosition = elementPosition - headerOffset

        window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    })

    // trigger a subtle highlight animation on the target section
    element.classList.remove("section-focus")
    // force reflow so the animation can restart
    void element.offsetWidth
    element.classList.add("section-focus")

    window.setTimeout(() => {
      element.classList.remove("section-focus")
    }, 900)
  }

  return (

    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="hero-orbit" />
        <div className="grid-overlay" />
      </div>
            {/* Top navigation */}
      <header
        className={`
          sticky top-0 z-20 border-b bg-background/80 backdrop-blur-xl header-shell
          ${isScrolled ? "header-shell-scrolled" : "border-border/60"}
        `}
      >

        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div className="flex flex-col leading-tight">
                            <span className="text-sm font-semibold tracking-tight">LooksmaxxAI</span>

              <span className="text-[11px] text-muted-foreground">Facial harmony analytics</span>
            </div>
          </div>

                              <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <button
              type="button"
              className={`nav-link ${activeSection === "technology" ? "nav-link-active" : ""}`}
              onClick={() => scrollToSection("technology")}
            >
              Technology
            </button>
            <button
              type="button"
              className={`nav-link ${activeSection === "how-it-works" ? "nav-link-active" : ""}`}
              onClick={() => scrollToSection("how-it-works")}
            >
              How it works
            </button>
            <button
              type="button"
              className={`nav-link ${activeSection === "pricing" ? "nav-link-active" : ""}`}
              onClick={() => scrollToSection("pricing")}
            >
              Pricing
            </button>
          </nav>



          <div className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link href="/login">Log in</Link>
            </Button>

                        <Button
              asChild
              size="sm"
              className="gap-1 transform-gpu bg-gradient-to-r from-sky-500 to-blue-500 text-primary-foreground shadow-[0_14px_38px_rgba(37,99,235,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(37,99,235,0.8)]"
            >
              <Link href="/login">
                Get started
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>

          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
                {/* Hero section */}
        <section
          id="hero"
          className="section-shell section-enter section-delay-1 grid items-center gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
        >

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/5 px-3 py-1 text-xs text-sky-200/80">
              <span className="inline-flex items-center gap-1 font-medium text-sky-300">
                <Sparkles className="size-3" />
                New
              </span>
              <span>Personalized facial harmony analysis</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Understand your facial proportions with clinical‑style clarity.
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
                Upload two photos, trace a few landmarks, and receive a structured report that breaks down your facial
                harmony, symmetry, and profile balance in plain language.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
                            <Button
                asChild
                size="lg"
                className="gap-2 transform-gpu bg-gradient-to-r from-sky-500 to-blue-500 text-primary-foreground shadow-[0_18px_45px_rgba(37,99,235,0.65)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(37,99,235,0.85)]"
              >
                <Link href="/login">
                  Start free analysis
                  <ArrowRight className="size-4" />
                </Link>
              </Button>

              <button className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                View example report
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground sm:text-sm">
              <div className="flex items-center gap-1.5">
                <Check className="size-3 text-sky-400" />
                No in‑app photos stored by default
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="size-3 text-sky-400" />
                Built for educational & cosmetic planning
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-sky-500/15 via-transparent to-blue-500/25" />
                        <Card className="border-border/60 bg-card/80 shadow-[0_24px_60px_rgba(15,23,42,0.7)] backdrop-blur-xl card-raise hero-card">

              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Harmony overview</span>
                  <span className="text-xs font-normal text-muted-foreground">Sample report</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  A snapshot of the kind of high‑level summary you&apos;ll see after your analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-4 pt-2 text-sm">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Overall score</div>
                    <div className="mt-1 text-2xl font-semibold">7.4</div>
                    <div className="text-xs text-emerald-400">Top 12% • Excellent balance</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Front profile</div>
                    <div className="mt-1 text-xl font-semibold">7.8</div>
                    <div className="text-xs text-emerald-400">Strong mid‑face harmony</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Side profile</div>
                    <div className="mt-1 text-xl font-semibold">7.0</div>
                    <div className="text-xs text-amber-400">Room for profile refinement</div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-sky-500/20 bg-sky-950/40 p-3">
                    <div className="text-xs font-medium text-muted-foreground">Key strengths</div>
                    <ul className="mt-2 space-y-1 text-xs">
                      <li className="flex items-center gap-1.5">
                        <Check className="size-3 text-sky-400" />
                        Balanced facial thirds
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="size-3 text-sky-400" />
                        Favorable eye spacing
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-lg border border-sky-500/20 bg-sky-950/40 p-3">
                    <div className="text-xs font-medium text-muted-foreground">Focus areas</div>
                    <ul className="mt-2 space-y-1 text-xs">
                      <li className="flex items-center gap-1.5">
                        <Check className="size-3 text-amber-400" />
                        Mild jaw angle asymmetry
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="size-3 text-amber-400" />
                        Slight nasal projection imbalance
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
                Example values are illustrative only and not a medical diagnosis.
              </CardFooter>
            </Card>
          </div>
        </section>

                        {/* Technology section */}
        <section
          id="technology"
          className="section-shell section-enter section-delay-2 space-y-6"
          aria-labelledby="technology-heading"
        >


          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">
              Technology
            </p>
            <h2
              id="technology-heading"
              className="text-balance text-xl font-semibold tracking-tight sm:text-2xl"
            >
              A measurement engine built for facial proportions.
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Every ratio is computed from precise landmarks and scored against reference distributions, so you see how
              your proportions compare without needing to know any anatomy jargon.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="h-full border-border/60 bg-card/80 backdrop-blur-sm card-raise"
              >
                <CardHeader className="pb-3">
                  <div className="mb-3 inline-flex size-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-400">
                    <feature.icon className="size-4" />
                  </div>
                  <CardTitle className="text-sm font-semibold">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

                        {/* How it works */}
        <section
          id="how-it-works"
          className="section-shell section-enter section-delay-3 space-y-6"
          aria-labelledby="how-heading"
        >


          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">
              How it works
            </p>
            <h2
              id="how-heading"
              className="text-balance text-xl font-semibold tracking-tight sm:text-2xl"
            >
              From two photos to a structured harmony report.
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              The full workflow usually takes under ten minutes. You stay in control of which photos you upload and what
              you do with the results.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <Card
                key={step.title}
                className="relative h-full border-border/60 bg-card/80 backdrop-blur-sm card-raise"
              >
                <div className="absolute inset-x-6 top-4 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-medium">Step {index + 1}</span>
                </div>
                <CardHeader className="pt-8">
                  <CardTitle className="text-sm font-semibold">
                    {step.title}
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    {step.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

                {/* Personalized plan */}
        <section
          className="section-shell section-enter section-delay-3 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
          aria-labelledby="plan-heading"
        >

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">
              Personalized roadmap
            </p>
            <h2
              id="plan-heading"
              className="text-balance text-xl font-semibold tracking-tight sm:text-2xl"
            >
              Turn measurements into an actionable improvement plan.
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Instead of a vague score, you get a sequence of realistic, time‑bound steps tailored to your current
              proportions and priorities.
            </p>

            <ol className="mt-4 space-y-3 text-sm">
              {planItems.map((item, index) => (
                <li
                  key={item.label}
                  className="flex items-start gap-3 rounded-lg border border-border/70 bg-card/80 p-3"
                >
                  <div className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-sky-500/15 text-xs font-semibold text-sky-300">
                    {index + 1}
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.timeline}</div>
                    <div className="text-xs text-emerald-400">{item.impact}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <Card className="border-border/70 bg-gradient-to-br from-sky-500/15 via-card to-blue-500/20 backdrop-blur-sm card-raise">
            <CardHeader>
              <CardTitle className="text-base">What your plan focuses on</CardTitle>
              <CardDescription className="text-xs">
                Each plan is generated from your own measurements and split across non‑surgical, lifestyle, and optional
                professional interventions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-background/60 p-3">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-emerald-400">
                    Non‑surgical
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Posture, soft‑tissue support, and skin‑level changes you can start immediately.
                  </p>
                </div>
                <span className="text-[11px] font-medium text-emerald-400">~60% of plan</span>
              </div>
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-background/60 p-3">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-sky-400">
                    Lifestyle
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Habits that support long‑term structural and aesthetic improvements.
                  </p>
                </div>
                <span className="text-[11px] font-medium text-sky-400">~30% of plan</span>
              </div>
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-background/60 p-3">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-amber-400">
                    Professional
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Optional consultations and procedures you can discuss with qualified clinicians.
                  </p>
                </div>
                <span className="text-[11px] font-medium text-amber-400">~10% of plan</span>
              </div>
            </CardContent>
            <CardFooter className="text-[11px] text-muted-foreground">
              Plans are educational only and don&apos;t replace professional medical advice.
            </CardFooter>
          </Card>
        </section>

                        {/* Pricing */}
        <section
          id="pricing"
          className="section-shell section-enter section-delay-4 space-y-6"
          aria-labelledby="pricing-heading"
        >


          <div className="space-y-2 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">
              Pricing
            </p>
            <h2
              id="pricing-heading"
              className="text-balance text-xl font-semibold tracking-tight sm:text-2xl"
            >
              Choose the plan that matches how deep you want to go.
            </h2>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
              Start for free, then upgrade only if you need advanced analysis, projections, or comparison tools.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {pricing.map((tier) => (
              <Card
                key={tier.name}
                className={
                  tier.highlight
                    ? "relative border-sky-500/60 bg-card/90 shadow-[0_22px_60px_rgba(37,99,235,0.6)] backdrop-blur-xl card-raise"
                    : "relative border-border/60 bg-card/80 backdrop-blur-sm card-raise"
                }
              >
                {tier.badge && (
                  <div className="absolute right-4 top-4 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium text-sky-300">
                    {tier.badge}
                  </div>
                )}
                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-baseline justify-between text-base">
                    <span>{tier.name}</span>
                                        <span className="mt-2 text-sm font-semibold">{tier.price}</span>

                  </CardTitle>

                  <CardDescription className="text-xs leading-relaxed">
                    {tier.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 pb-4 text-xs">
                  <ul className="space-y-1.5">
                    {tier.features.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-3 text-sky-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                                    <Button
                    asChild
                    variant={tier.highlight ? "default" : "outline"}
                    className={
                      tier.highlight
                        ? "w-full justify-center bg-gradient-to-r from-sky-500 to-blue-500 text-primary-foreground shadow-[0_14px_38px_rgba(37,99,235,0.6)] hover:shadow-[0_20px_55px_rgba(37,99,235,0.8)]"
                        : "w-full justify-center"
                    }
                  >
                    <Link href="/login">
                      {tier.highlight ? "Get started" : "Try for free"}
                    </Link>
                  </Button>

                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

                {/* Final CTA */}
        <section className="section-enter section-delay-4 rounded-2xl border border-sky-500/40 bg-gradient-to-br from-sky-500/15 via-background to-blue-500/20 px-6 py-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.7)] sm:px-10 cta-shell">

          <h2 className="text-balance text-xl font-semibold tracking-tight sm:text-2xl">
            Ready to see your facial harmony from a new angle?
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            Run a free analysis in minutes and explore how small, thoughtful changes could bring your features into
            better balance.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                        <Button
              asChild
              size="lg"
              className="gap-2 transform-gpu bg-gradient-to-r from-sky-500 to-blue-500 text-primary-foreground shadow-[0_18px_45px_rgba(37,99,235,0.65)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(37,99,235,0.85)]"
            >
              <Link href="/login">
                Begin free assessment
                <ArrowRight className="size-4" />
              </Link>
            </Button>

            <span className="text-xs text-muted-foreground">
              No subscription required to try the core experience.
            </span>
          </div>
        </section>
      </main>
    </div>
  )
}