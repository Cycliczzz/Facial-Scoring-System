import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"

import { authOptions } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"
import { LandmarkPlacer } from "./LandmarkPlacer"

interface FrontLandmarksPageProps {
  searchParams?: Promise<{
    gender?: string
    ethnicity?: string
  }>
}

export default async function FrontLandmarksPage({ searchParams }: FrontLandmarksPageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const params = await searchParams
  const genderParam = params?.gender === "female" ? "female" : "male"
  const ethnicityParam = params?.ethnicity

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="hero-orbit" />
        <div className="grid-overlay" />
      </div>

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <Card className="onboarding-shell w-full border-border/70 bg-card/90 shadow-[0_24px_70px_rgba(15,23,42,0.9)] backdrop-blur-xl">
          <CardContent className="p-0">
            <LandmarkPlacer
              profileType="front"
              initialGender={genderParam}
              initialEthnicity={ethnicityParam}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
