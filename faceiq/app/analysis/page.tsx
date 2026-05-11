import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { AnalysisDashboard } from "./AnalysisDashboard"
import type { Ethnicity } from "@/lib/analysis/types"

// Map UI ethnicity values to analysis system ethnicity values
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
  const uiEthnicity = params?.ethnicity || "east_asian"
  const ethnicityParam: Ethnicity = UI_ETHNICITY_MAP[uiEthnicity] || "asian"

  return (
    <AnalysisDashboard initialGender={genderParam as "male" | "female"} initialEthnicity={ethnicityParam} />
  )
}
