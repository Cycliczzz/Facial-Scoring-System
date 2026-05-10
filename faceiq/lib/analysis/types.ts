// ============================================================
// Types for Facial Analysis Results
// ============================================================

export type Gender = "male" | "female"
export type Ethnicity = "asian" | "caucasian" | "black" | "hispanic" | "middle_eastern" | "south_asian" | "mixed"

export interface LandmarkPoint {
  id: string
  x: number
  y: number
  label: string
  group?: string
  color?: string
}

export interface MeasurementResult {
  id: string
  name: string
  value: number
  unit: "degrees" | "ratio" | "mm" | "percentage"
  score: number // 0-10
  idealRange: [number, number]
  description: string
  category: string
  isIdeal: boolean
  deviation: "low" | "ideal" | "high"
  interpretation: string
}

export interface AnalysisResults {
  gender: Gender
  ethnicity: Ethnicity
  frontMeasurements: MeasurementResult[]
  sideMeasurements: MeasurementResult[]
  overallScore: number
  frontScore: number
  sideScore: number
  harmonyScore: number
  categoryScores: Record<string, number>
  topStrengths: string[]
  topWeaknesses: string[]
}

export interface MeasurementVisualization {
  measurementId: string
  lines: { x1: number; y1: number; x2: number; y2: number; color: string; label?: string }[]
  arcs?: { cx: number; cy: number; r: number; startAngle: number; endAngle: number; color: string; label?: string }[]
  annotations?: { x: number; y: number; text: string; color: string }[]
}
