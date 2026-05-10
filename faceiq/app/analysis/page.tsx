import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { AnalysisDashboard } from "./AnalysisDashboard"

interface AnalysisPageProps {
  searchParams?: Promise<{
    gender?: string
    ethnicity?: string
  }>
}

export default async function AnalysisPage({ searchParams }: AnalysisPageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const params = await searchParams
  const genderParam = params?.gender === "female" ? "female" : "male"
  const ethnicityParam = params?.ethnicity || "asian"

  return (
    <AnalysisDashboard initialGender={genderParam as "male" | "female"} initialEthnicity={ethnicityParam} />
  )
}
