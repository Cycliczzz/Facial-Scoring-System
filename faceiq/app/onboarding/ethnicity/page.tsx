import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"

import { authOptions } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"
import { EthnicitySelector } from "../EthnicitySelector"

interface EthnicityPageProps {
  searchParams?: Promise<{
    gender?: string
  }>
}

export default async function EthnicityPage({ searchParams }: EthnicityPageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const params = await searchParams
  const genderParam = params?.gender === "female" ? "female" : "male"

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="hero-orbit" />
        <div className="grid-overlay" />
      </div>

      <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 sm:px-6 lg:px-8">
        <Card className="onboarding-shell w-full border-border/70 bg-card/90 shadow-[0_24px_70px_rgba(15,23,42,0.9)] backdrop-blur-xl">
          <CardContent className="px-4 py-6 sm:px-8 sm:py-8">
            <EthnicitySelector initialGender={genderParam} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

