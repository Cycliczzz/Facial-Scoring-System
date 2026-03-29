import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"

import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { Card, CardContent } from "@/components/ui/card"
import { PhotoUploader } from "./PhotoUploader"

interface PhotosPageProps {
  searchParams?: {
    gender?: string
    ethnicity?: string
  }
}

export default async function PhotosPage({ searchParams }: PhotosPageProps) {
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

      <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 sm:px-6 lg:px-8">
        <Card className="onboarding-shell w-full border-border/70 bg-card/90 shadow-[0_24px_70px_rgba(15,23,42,0.9)] backdrop-blur-xl">
          <CardContent className="px-4 py-6 sm:px-8 sm:py-8">
            <PhotoUploader initialGender={genderParam} initialEthnicity={ethnicityParam} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
