import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"

import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { Card, CardContent } from "@/components/ui/card"
import { LandmarkMarker } from "./LandmarkMarker"

interface LandmarksPageProps {
  searchParams?: {
    gender?: string
    ethnicity?: string
  }
}

export default async function LandmarksPage({ searchParams }: LandmarksPageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const genderParam = searchParams?.gender === "female" ? "female" : "male"
  const ethnicityParam = searchParams?.ethnicity

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="hero-orbit" />
        <div className="grid-overlay" />
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
        <Card className="onboarding-shell w-full border-border/70 bg-card/90 shadow-[0_24px_70px_rgba(15,23,42,0.9)] backdrop-blur-xl">
          <CardContent className="px-3 py-4 sm:px-6 sm:py-6">
            <LandmarkMarker initialGender={genderParam} initialEthnicity={ethnicityParam} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
