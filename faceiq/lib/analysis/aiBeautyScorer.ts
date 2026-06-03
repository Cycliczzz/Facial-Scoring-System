// ============================================================
// AI Beauty Scorer - Facial Feature Analysis Engine
// Sử dụng logic từ FaceHeauty: symmetry (40%) + ratio (30%) + brightness (30%)
// Scale lên thang điểm 10
// ============================================================

import type { AnalysisResults, MeasurementResult, LandmarkPoint } from "./types"

// ============================================================
// Types
// ============================================================

export interface AIBeautyResult {
  /** Overall AI beauty score (0-10) */
  overallScore: number
  /** Top strengths */
  strengths: AIInsight[]
  /** Top weaknesses */
  weaknesses: AIInsight[]
  /** All facial feature scores */
  featureScores: FeatureScore[]
  /** Overall assessment text */
  assessment: string
  /** Symmetry score (từ faceheauty) */
  symmetryScore: number
  /** Proportion score */
  proportionScore: number
  /** Harmony score */
  harmonyScore: number
  /** Front score */
  frontScore: number
  /** Side score */
  sideScore: number
  /** Whether side profile data is available */
  hasSideData: boolean
  /** Heatmap data for visualization */
  heatmapData?: {
    symmetry: number
    ratio: number
    brightness: number
  }
}

export interface AIInsight {
  name: string
  score: number
  category: string
  explanation: string
  suggestion?: string
}

export interface FeatureScore {
  id: string
  name: string
  score: number
  category: string
  description: string
  details: string
  measurements: { name: string; value: number; score: number; unit: string }[]
}

// ============================================================
// 10 Facial Features Definition
// ============================================================

interface FacialFeature {
  id: string
  name: string
  category: string
  description: string
  frontMeasurements: string[]
  sideMeasurements: string[]
  weight: number
}

const FACIAL_FEATURES: FacialFeature[] = [
  {
    id: "face_shape",
    name: "Face Shape",
    category: "Proportions",
    description: "Overall facial contour and harmony of facial thirds",
    frontMeasurements: [
      "face_width_to_height", "total_facial_width_to_height", "midface_ratio",
      "top_third", "middle_third", "lower_third", "lower_third_proportion",
      "bitemporal_width", "bigonial_width"
    ],
    sideMeasurements: [
      "facial_depth_to_height", "anterior_facial_depth",
      "total_facial_convexity", "facial_convexity_nasion"
    ],
    weight: 0.15,
  },
  {
    id: "eyes",
    name: "Eyes",
    category: "Eyes",
    description: "Eye shape, tilt, spacing, and overall eye aesthetics",
    frontMeasurements: [
      "lateral_canthal_tilt", "eye_aspect_ratio", "eye_separation_ratio",
      "one_eye_apart", "interpupillary_mouth_width"
    ],
    sideMeasurements: ["orbital_vector"],
    weight: 0.15,
  },
  {
    id: "eyebrows",
    name: "Eyebrows",
    category: "Brows",
    description: "Eyebrow arch, tilt, positioning, and proportion",
    frontMeasurements: [
      "eyebrow_tilt", "eyebrow_low_setedness", "brow_length_to_face_width"
    ],
    sideMeasurements: ["browridge_inclination"],
    weight: 0.08,
  },
  {
    id: "nose",
    name: "Nose",
    category: "Nose",
    description: "Nasal shape, width, bridge, and overall nose aesthetics",
    frontMeasurements: [
      "nose_bridge_to_width", "ipsilateral_alar_angle",
      "intercanthal_nasal_width", "nose_tip_position"
    ],
    sideMeasurements: [
      "nasal_tip_angle", "nasofrontal_angle", "nasal_projection",
      "nasal_width_to_height", "nasal_bridge_angle", "nasal_tip_rotation",
      "nasal_dorsum_angle", "nasal_base_angle"
    ],
    weight: 0.15,
  },
  {
    id: "lips",
    name: "Lips & Mouth",
    category: "Mouth",
    description: "Lip fullness, mouth width, Cupid's bow, and lip proportions",
    frontMeasurements: [
      "cupids_bow_depth", "mouth_corner_position", "mouth_width_to_nose_width",
      "lower_lip_to_upper_lip", "chin_to_philtrum"
    ],
    sideMeasurements: [
      "upper_lip_s_line", "upper_lip_e_line", "lower_lip_s_line",
      "lower_lip_e_line", "upper_lip_angle", "lower_lip_angle",
      "upper_lip_to_lower_lip"
    ],
    weight: 0.10,
  },
  {
    id: "jaw",
    name: "Jaw & Chin",
    category: "Jaw",
    description: "Jawline definition, chin projection, and lower face structure",
    frontMeasurements: [
      "jaw_slope", "jaw_frontal_angle", "bigonial_width"
    ],
    sideMeasurements: [
      "mentolabial_angle", "recession_frankfort",
      "holdaway_h_line", "chin_angle", "lower_lip_to_chin",
      "facial_taper_angle"
    ],
    weight: 0.15,
  },
  {
    id: "cheekbones",
    name: "Cheekbones",
    category: "Cheeks",
    description: "Cheekbone prominence, height, and midface structure",
    frontMeasurements: ["cheekbone_height"],
    sideMeasurements: ["interior_midface_projection"],
    weight: 0.08,
  },
  {
    id: "forehead",
    name: "Forehead",
    category: "Forehead",
    description: "Forehead slope, brow ridge, and upper face harmony",
    frontMeasurements: [],
    sideMeasurements: [
      "upper_forehead_slope", "browridge_inclination", "nasofrontal_angle"
    ],
    weight: 0.06,
  },
  {
    id: "skin_neck",
    name: "Skin & Neck",
    category: "Neck",
    description: "Neck width, submental angle, and overall neck aesthetics",
    frontMeasurements: ["neck_width"],
    sideMeasurements: ["submental_cervical_angle"],
    weight: 0.04,
  },
  {
    id: "ears",
    name: "Ears",
    category: "Ears",
    description: "Ear protrusion, positioning, and proportion",
    frontMeasurements: ["ear_protrusion_angle", "ear_protrusion_ratio"],
    sideMeasurements: [],
    weight: 0.04,
  },
]

// ============================================================
// FaceHeauty Logic: Tính điểm từ landmarks
// ============================================================

interface FaceHeautyScores {
  symmetryScore: number    // 0-10
  ratioScore: number       // 0-10
  brightnessScore: number  // 0-10
  overallScore: number     // 0-10
}

function calculateFaceHeautyScore(
  frontLandmarks: LandmarkPoint[],
  sideLandmarks: LandmarkPoint[]
): FaceHeautyScores {
  // --- 1. SYMMETRY SCORE (40%) ---
  // So sánh độ đối xứng giữa các điểm landmark trái-phải
  const symmetryPairs = [
    ["left_pupil", "right_pupil"],
    ["left_medial_canthus", "right_medial_canthus"],
    ["left_lateral_canthus", "right_lateral_canthus"],
    ["left_upper_eyelid", "right_upper_eyelid"],
    ["left_lower_eyelid", "right_lower_eyelid"],
    ["left_brow_head", "right_brow_head"],
    ["left_brow_arch", "right_brow_arch"],
    ["left_brow_peak", "right_brow_peak"],
    ["left_brow_tail", "right_brow_tail"],
    ["left_nose_side", "right_nose_side"],
    ["left_nose_bridge", "right_nose_bridge"],
    ["left_mouth_corner", "right_mouth_corner"],
    ["left_upper_jaw_angle", "right_upper_jaw_angle"],
    ["left_lower_jaw_angle", "right_lower_jaw_angle"],
    ["left_chin", "right_chin"],
    ["left_cheekbone", "right_cheekbone"],
    ["left_temple", "right_temple"],
  ]

  const lmMap = new Map<string, LandmarkPoint>()
  for (const lm of [...frontLandmarks, ...sideLandmarks]) {
    lmMap.set(lm.id, lm)
  }

  let symmetrySum = 0
  let symmetryCount = 0

  for (const [leftId, rightId] of symmetryPairs) {
    const left = lmMap.get(leftId)
    const right = lmMap.get(rightId)
    if (left && right) {
      // Tính độ đối xứng: khoảng cách từ đường trung tâm (x=0.5)
      const leftDist = Math.abs(left.x - 0.5)
      const rightDist = Math.abs(right.x - 0.5)
      // Đối xứng hoàn hảo khi leftDist ≈ rightDist
      const diff = Math.abs(leftDist - rightDist)
      const pairScore = Math.max(0, 1 - diff * 3) // 0-1
      symmetrySum += pairScore
      symmetryCount++
    }
  }

  // Tính symmetry score (0-10)
  const symmetryScore = symmetryCount > 0
    ? Math.round((symmetrySum / symmetryCount) * 10 * 10) / 10
    : 5.0

  // --- 2. RATIO SCORE (30%) ---
  // Tỷ lệ vàng: face height / face width ≈ 1.4
  const leftCheek = lmMap.get("left_cheekbone")
  const rightCheek = lmMap.get("right_cheekbone")
  const hairline = lmMap.get("hairline")
  const chinBottom = lmMap.get("chin_bottom")

  let ratioScore = 5.0
  if (leftCheek && rightCheek && hairline && chinBottom) {
    const faceWidth = Math.abs(rightCheek.x - leftCheek.x)
    const faceHeight = Math.abs(chinBottom.y - hairline.y)
    if (faceWidth > 0) {
      const ratio = faceHeight / faceWidth
      const idealRatio = 1.4
      const ratioDiff = Math.abs(ratio - idealRatio) / idealRatio
      ratioScore = Math.round(Math.max(0, 1 - ratioDiff) * 10 * 10) / 10
    }
  }

  // --- 3. BRIGHTNESS SCORE (30%) ---
  // Dựa trên sự phân bố đều của các landmark (không có ảnh thật để tính brightness)
  // Thay vào đó, dùng độ "cân bằng" của các landmark trên khuôn mặt
  let brightnessScore = 5.0
  const allLms = [...frontLandmarks, ...sideLandmarks]
  if (allLms.length > 0) {
    // Tính độ phân tán của landmarks (càng đều càng tốt)
    const xValues = allLms.map(lm => lm.x)
    const yValues = allLms.map(lm => lm.y)
    const meanX = xValues.reduce((a, b) => a + b, 0) / xValues.length
    const meanY = yValues.reduce((a, b) => a + b, 0) / yValues.length
    
    // Variance càng thấp = landmarks càng tập trung = càng tốt
    const varianceX = xValues.reduce((sum, x) => sum + (x - meanX) ** 2, 0) / xValues.length
    const varianceY = yValues.reduce((sum, y) => sum + (y - meanY) ** 2, 0) / yValues.length
    
    // Normalize: variance lý tưởng cho khuôn mặt
    const idealVariance = 0.06 // ~ variance của sample landmarks
    const varianceScore = 1 - Math.min(
      Math.abs(Math.sqrt(varianceX + varianceY) - Math.sqrt(idealVariance * 2)) / Math.sqrt(idealVariance * 2),
      1
    )
    brightnessScore = Math.round(varianceScore * 10 * 10) / 10
  }

  // --- OVERALL SCORE ---
  const overallScore = Math.round(
    (symmetryScore * 0.4 + ratioScore * 0.3 + brightnessScore * 0.3) * 10
  ) / 10

  return {
    symmetryScore,
    ratioScore,
    brightnessScore,
    overallScore,
  }
}

// ============================================================
// Main AI Beauty Score Calculator
// ============================================================

export function calculateAIBeautyScore(
  results: AnalysisResults,
  frontLandmarks: LandmarkPoint[],
  sideLandmarks: LandmarkPoint[]
): AIBeautyResult {
  const hasSideData = results.sideMeasurements.length > 0

  // 1. Tính điểm từ FaceHeauty logic
  const faceHeauty = calculateFaceHeautyScore(frontLandmarks, sideLandmarks)

  // 2. Compute score for each of the 10 facial features
  const featureScores = computeFeatureScores(results, hasSideData)

  // 3. Blend FaceHeauty score với feature scores
  const measurementAvg = featureScores.length > 0
    ? featureScores.reduce((s, f) => s + f.score, 0) / featureScores.length
    : 5.0

  // Weight: 60% từ FaceHeauty (dựa trên landmarks thực tế), 40% từ measurements
  const overallScore = Math.round(
    (faceHeauty.overallScore * 0.6 + measurementAvg * 0.4) * 10
  ) / 10

  // 4. Identify strengths and weaknesses
  const { strengths, weaknesses } = identifyStrengthsWeaknesses(featureScores)

  // 5. Compute harmony, symmetry, proportion scores
  const harmonyScore = computeHarmonyScore(results, faceHeauty)
  const symmetryScore = faceHeauty.symmetryScore
  const proportionScore = faceHeauty.ratioScore

  // 6. Generate assessment
  const assessment = generateAssessment(overallScore, strengths, weaknesses)

  return {
    overallScore,
    strengths,
    weaknesses,
    featureScores,
    assessment,
    symmetryScore,
    proportionScore,
    harmonyScore,
    hasSideData,
    frontScore: results.frontScore,
    sideScore: results.sideScore,
    heatmapData: {
      symmetry: faceHeauty.symmetryScore,
      ratio: faceHeauty.ratioScore,
      brightness: faceHeauty.brightnessScore,
    },
  }
}

// ============================================================
// Feature Score Computation
// ============================================================

function computeFeatureScores(
  results: AnalysisResults,
  hasSideData: boolean
): FeatureScore[] {
  return FACIAL_FEATURES.map(feature => {
    const measurements: { name: string; value: number; score: number; unit: string }[] = []

    for (const mid of feature.frontMeasurements) {
      const m = results.frontMeasurements.find(fm => fm.id === mid)
      if (m) {
        measurements.push({
          name: m.name,
          value: m.value,
          score: m.score,
          unit: m.unit,
        })
      }
    }

    for (const mid of feature.sideMeasurements) {
      const m = results.sideMeasurements.find(sm => sm.id === mid)
      if (m) {
        measurements.push({
          name: m.name,
          value: m.value,
          score: m.score,
          unit: m.unit,
        })
      }
    }

    let score: number
    if (measurements.length === 0) {
      score = 5.0
    } else {
      let weightedSum = 0
      let totalWeight = 0
      for (const m of measurements) {
        const impactWeight = 1 + Math.abs(m.score - 5) / 10
        weightedSum += m.score * impactWeight
        totalWeight += impactWeight
      }
      score = Math.round((weightedSum / totalWeight) * 10) / 10
    }

    const details = generateFeatureDetails(feature.name, score, measurements.length)

    return {
      id: feature.id,
      name: feature.name,
      score,
      category: feature.category,
      description: feature.description,
      details,
      measurements,
    }
  })
}

function generateFeatureDetails(name: string, score: number, measurementCount: number): string {
  if (measurementCount === 0) {
    return `No measurement data available for ${name.toLowerCase()}.`
  }
  if (score >= 8.5) return `Exceptional ${name.toLowerCase()}! Near-ideal proportions.`
  if (score >= 7.5) return `Excellent ${name.toLowerCase()} with strong proportions.`
  if (score >= 6.5) return `Good ${name.toLowerCase()} with above-average proportions.`
  if (score >= 5.5) return `Average ${name.toLowerCase()} with room for improvement.`
  if (score >= 4.5) return `Below-average ${name.toLowerCase()} that could benefit from improvement.`
  return `Your ${name.toLowerCase()} shows significant deviation from ideal proportions.`
}

// ============================================================
// Strengths & Weaknesses Identification
// ============================================================

function identifyStrengthsWeaknesses(
  featureScores: FeatureScore[]
): { strengths: AIInsight[]; weaknesses: AIInsight[] } {
  const sorted = [...featureScores].sort((a, b) => b.score - a.score)

  const strengths: AIInsight[] = []
  const weaknesses: AIInsight[] = []

  for (const f of sorted) {
    if (f.measurements.length > 0 && strengths.length < 3) {
      strengths.push({
        name: f.name,
        score: f.score,
        category: f.category,
        explanation: generateStrengthExplanation(f),
        suggestion: undefined,
      })
    }
  }

  const sortedAsc = [...featureScores].sort((a, b) => a.score - b.score)
  for (const f of sortedAsc) {
    if (f.measurements.length > 0 && weaknesses.length < 3) {
      weaknesses.push({
        name: f.name,
        score: f.score,
        category: f.category,
        explanation: generateWeaknessExplanation(f),
        suggestion: generateSuggestion(f),
      })
    }
  }

  return { strengths, weaknesses }
}

function generateStrengthExplanation(feature: FeatureScore): string {
  const topMeasurements = [...feature.measurements]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)

  if (topMeasurements.length === 0) {
    return `Your ${feature.name.toLowerCase()} shows excellent overall proportions.`
  }

  const details = topMeasurements
    .map(m => `${m.name} (${m.score.toFixed(1)}/10)`)
    .join(" and ")

  return `Your ${feature.name.toLowerCase()} is a standout feature! Key measurements like ${details} are near-perfect, enhancing overall facial aesthetics.`
}

function generateWeaknessExplanation(feature: FeatureScore): string {
  const bottomMeasurements = [...feature.measurements]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)

  if (bottomMeasurements.length === 0) {
    return `Your ${feature.name.toLowerCase()} could benefit from improvement.`
  }

  const details = bottomMeasurements
    .map(m => `${m.name} (${m.score.toFixed(1)}/10)`)
    .join(" and ")

  return `Your ${feature.name.toLowerCase()} has room for improvement. Measurements like ${details} deviate from ideal proportions.`
}

function generateSuggestion(feature: FeatureScore): string {
  const suggestions: Record<string, string> = {
    "face_shape": "Hairstyle choices and facial exercises can help enhance overall face shape proportions.",
    "eyes": "Strategic eye makeup techniques can enhance eye shape and create the illusion of ideal proportions.",
    "eyebrows": "Professional eyebrow shaping can help achieve the ideal brow arch and positioning.",
    "nose": "Contouring techniques can help create the illusion of ideal nasal proportions.",
    "lips": "Lip care routines and subtle enhancement techniques can improve lip proportions.",
    "jaw": "Jawline exercises and proper posture can help enhance jaw definition.",
    "cheekbones": "Strategic highlighting and contouring can enhance cheekbone prominence.",
    "forehead": "Hairstyle choices including bangs can help balance forehead proportions.",
    "skin_neck": "Skincare routines and posture exercises can improve neck aesthetics.",
    "ears": "Hairstyle choices can help balance ear visibility and proportions.",
  }
  return suggestions[feature.id] || "Consult with a facial aesthetics specialist for personalized recommendations."
}

// ============================================================
// Harmony Score
// ============================================================

function computeHarmonyScore(
  results: AnalysisResults,
  faceHeauty: FaceHeautyScores
): number {
  const frontAvg = results.frontMeasurements.reduce((s, m) => s + m.score, 0) / 
    Math.max(1, results.frontMeasurements.length)
  const sideAvg = results.sideMeasurements.reduce((s, m) => s + m.score, 0) / 
    Math.max(1, results.sideMeasurements.length)
  
  // Blend: 40% front, 30% side, 30% faceheauty
  return Math.round((frontAvg * 0.4 + sideAvg * 0.3 + faceHeauty.overallScore * 0.3) * 10) / 10
}

// ============================================================
// Assessment Generation
// ============================================================

function generateAssessment(
  rawScore: number,
  strengths: AIInsight[],
  weaknesses: AIInsight[]
): string {
  if (rawScore >= 8.5) {
    return "Exceptional facial harmony! Your features are remarkably well-balanced with near-ideal proportions. The overall composition creates a highly aesthetic appearance."
  } else if (rawScore >= 7.5) {
    return "Very good facial aesthetics! Your features demonstrate strong harmony and proportion. Minor refinements could elevate your score further."
  } else if (rawScore >= 6.5) {
    return "Good facial proportions with noticeable strengths. Your best features provide a solid foundation, and targeted improvements could enhance overall harmony."
  } else if (rawScore >= 5.5) {
    return "Average facial harmony with room for improvement. Focus on enhancing your stronger features while addressing the areas identified for improvement."
  } else {
    return "Your facial features show potential for enhancement. Consider the recommendations provided to improve overall facial harmony and proportion."
  }
}
