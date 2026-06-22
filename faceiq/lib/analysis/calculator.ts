// ============================================================
// Facial Analysis Calculator
// Implements aesthetic indices with proper formulas
// Based on cephalometric and anthropometric research
// ============================================================
// Landmark ID Mapping (from LandmarkPlacer.tsx):
// Front: hairline, left_pupil, right_pupil, left_medial_canthus, left_lateral_canthus,
//        left_upper_eyelid, left_lower_eyelid, left_eyelid_hood_end, left_upper_eyelid_crease,
//        right_medial_canthus, right_lateral_canthus, right_upper_eyelid, right_lower_eyelid,
//        right_eyelid_hood_end, right_upper_eyelid_crease,
//        left_brow_head, left_brow_inner_corner, left_brow_arch, left_brow_peak, left_brow_tail,
//        right_brow_head, right_brow_inner_corner, right_brow_arch, right_brow_peak, right_brow_tail,
//        left_nose_side, right_nose_side, left_nose_bridge, right_nose_bridge,
//        nasal_base, nose_bottom,
//        left_mouth_corner, right_mouth_corner, cupids_bow, inner_cupids_bow, mouth_middle, lower_lip_center,
//        left_upper_jaw_angle, right_upper_jaw_angle, left_lower_jaw_angle, right_lower_jaw_angle,
//        left_chin, right_chin, chin_bottom,
//        left_cheekbone, right_cheekbone, left_temple, right_temple
// Side: top_of_head, occiput, hairline_profile, forehead, glabella,
//       nasal_bridge_root, rhinion, supratip, nose_tip, infratip,
//       columella, subnasale, subalare,
//       upper_lip, mouth_corner, lower_lip, labiomental_fold,
//       chin_point, chin_bottom, upper_jaw_angle, lower_jaw_angle,
//       porion, tragus, intertragic_notch,
//       orbitale, corneal_apex, eyelid_end, lower_eyelid,
//       cheekbone, cervical_point, neck_point
// ============================================================

import type { LandmarkPoint, MeasurementResult, AnalysisResults, Gender, Ethnicity } from "./types"
import { FRONT_IDEALS, SIDE_IDEALS } from "./idealValues"

// ============================================================
// Helper Functions
// ============================================================

function dist(a: LandmarkPoint, b: LandmarkPoint): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function angle(p1: LandmarkPoint, vertex: LandmarkPoint, p2: LandmarkPoint): number {
  // Coordinates are uniformly scaled (no aspect distortion), angles are correct
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y }
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y }
  const dot = v1.x * v2.x + v1.y * v2.y
  const cross = v1.x * v2.y - v1.y * v2.x
  return Math.abs(Math.atan2(cross, dot)) * (180 / Math.PI)
}

/** Angle of line p1→p2 from horizontal (in degrees) - signed, positive = upward in image coords */
function angleFromHorizontal(p1: LandmarkPoint, p2: LandmarkPoint): number {
  // In image coordinates, y increases downward, so negative dy means upward
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI)
}

/** Angle of line p1→p2 from vertical (in degrees) */
function angleFromVertical(p1: LandmarkPoint, p2: LandmarkPoint): number {
  return Math.abs(Math.atan2(p2.x - p1.x, p2.y - p1.y) * (180 / Math.PI))
}

/** Absolute angle from horizontal */
function slopeAngle(p1: LandmarkPoint, p2: LandmarkPoint): number {
  return Math.abs(Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI))
}

/** Acute angle from horizontal (0-90 degrees) */
function acuteAngleFromHorizontal(p1: LandmarkPoint, p2: LandmarkPoint): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const deg = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI))
  return deg > 90 ? 180 - deg : deg
}

/** Angle between two lines: line1 = p1→p2, line2 = p3→p4 */
function angleBetweenLines(p1: LandmarkPoint, p2: LandmarkPoint, p3: LandmarkPoint, p4: LandmarkPoint, preferObtuse = false): number {
  const v1 = { x: p2.x - p1.x, y: p2.y - p1.y }
  const v2 = { x: p4.x - p3.x, y: p4.y - p3.y }
  const dot = v1.x * v2.x + v1.y * v2.y
  const cross = v1.x * v2.y - v1.y * v2.x
  const acute = Math.abs(Math.atan2(cross, dot)) * (180 / Math.PI)
  return preferObtuse ? (acute > 90 ? acute : 180 - acute) : acute
}

function distanceToLine(point: LandmarkPoint, lineStart: LandmarkPoint, lineEnd: LandmarkPoint): number {
  const A = lineEnd.y - lineStart.y
  const B = lineStart.x - lineEnd.x
  const C = lineEnd.x * lineStart.y - lineStart.x * lineEnd.y
  return Math.abs(A * point.x + B * point.y + C) / Math.sqrt(A * A + B * B)
}

/** Vertical distance from point to a horizontal line at given y-coordinate */
function verticalDistanceToHorizontalLine(point: LandmarkPoint, yLevel: number): number {
  return Math.abs(point.y - yLevel)
}

/** Signed distance to line: positive = one side, negative = other */
function signedDistanceToLine(point: LandmarkPoint, lineStart: LandmarkPoint, lineEnd: LandmarkPoint): number {
  const A = lineEnd.y - lineStart.y
  const B = lineStart.x - lineEnd.x
  const C = lineEnd.x * lineStart.y - lineStart.x * lineEnd.y
  return (A * point.x + B * point.y + C) / Math.sqrt(A * A + B * B)
}

/** Midpoint between two points */
function midpoint(a: LandmarkPoint, b: LandmarkPoint): LandmarkPoint {
  return { id: "mid", x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, label: "" }
}

/** Horizontal distance (absolute) */
function hDist(a: LandmarkPoint, b: LandmarkPoint): number {
  return Math.abs(a.x - b.x)
}

/** Vertical distance (absolute) */
function vDist(a: LandmarkPoint, b: LandmarkPoint): number {
  return Math.abs(a.y - b.y)
}

// ============================================================
// Harmony Score Calculation
// D_i = |Value_i - Ideal_i,E| / Range_i,E
// H_i = 10 × exp(-0.5 × D_i^2)
// ============================================================

// ============================================================
// SCORING CONFIGURATION — Adjust these to tune the model
// ============================================================

/** Gaussian steepness factor (higher = score drops faster as R increases) */
const SCORING_K = 2

/** Minimum score floor for any measurement */
const SCORING_FLOOR = 1.0

/** Critical flaw penalty: scores below this threshold trigger penalty */
const PENALTY_THRESHOLD = 3.5

/** Critical flaw penalty: multiplier per unit below threshold */
const PENALTY_MULTIPLIER = 0.25

/** Critical flaw penalty: maximum penalty cap */
const PENALTY_CAP = 1

// ============================================================

/**
 * Plateau Gaussian Curve Scoring
 * score = max(floor, 10 × exp(-K × R²))
 * Bước 1: Nếu IdealMin <= V <= IdealMax → 10.0
 * Bước 2: Nếu V <= RangeMin hoặc V >= RangeMax → floor
 * Bước 3: Tính tỷ lệ lệch R = D / L
 * Bước 4: score = max(floor, 10 × exp(-K × R²))
 */
function calculatePlateauGaussianScore(value: number, rangeMin: number, rangeMax: number, idealMin: number, idealMax: number): number {
  // Step 1: In plateau → perfect 10
  if (value >= idealMin && value <= idealMax) return 10.0

  // Step 2: Outside full range → floor
  if (value <= rangeMin || value >= rangeMax) return SCORING_FLOOR

  // Step 3: Calculate R = D / L
  let D: number, L: number
  if (value < idealMin) {
    D = idealMin - value
    L = idealMin - rangeMin
  } else {
    D = value - idealMax
    L = rangeMax - idealMax
  }

  if (L <= 0) return SCORING_FLOOR
  const R = D / L // 0.0 to 1.0

  // Step 4: Continuous Gaussian formula
  const score = 10 * Math.exp(-SCORING_K * R * R)

  return Math.round(Math.max(SCORING_FLOOR, score) * 10) / 10
}

function classifyDeviation(value: number, idealMin: number, idealMax: number): "low" | "ideal" | "high" {
  if (value >= idealMin && value <= idealMax) return "ideal"
  if (value < idealMin) return "low"
  return "high"
}

function createMeasurement(
  id: string, name: string, value: number, unit: "degrees" | "ratio" | "mm" | "percentage",
  category: string, description: string, rangeMin: number, rangeMax: number, idealMin: number, idealMax: number
): MeasurementResult {
  const score = calculatePlateauGaussianScore(value, rangeMin, rangeMax, idealMin, idealMax)
  const deviation = classifyDeviation(value, idealMin, idealMax)

  let interpretation = ""
  if (score >= 10.0) {
    interpretation = `Your ${name.toLowerCase()} of ${value.toFixed(1)} ${unit} falls within the ideal plateau (${idealMin.toFixed(1)}-${idealMax.toFixed(1)} ${unit}). Perfect score!`
  } else if (score >= 7.0) {
    interpretation = `Your ${name.toLowerCase()} of ${value.toFixed(1)} ${unit} is slightly outside the ideal range (${idealMin.toFixed(1)}-${idealMax.toFixed(1)} ${unit}). Minor deviation, still very good.`
  } else if (score >= 4.5) {
    interpretation = `Your ${name.toLowerCase()} of ${value.toFixed(1)} ${unit} shows moderate deviation from the ideal range (${idealMin.toFixed(1)}-${idealMax.toFixed(1)} ${unit}). Room for improvement.`
  } else if (score >= 2.5) {
    interpretation = `Your ${name.toLowerCase()} of ${value.toFixed(1)} ${unit} is significantly off from the ideal range (${idealMin.toFixed(1)}-${idealMax.toFixed(1)} ${unit}). Consider this area for enhancement.`
  } else if (score > 0) {
    interpretation = `Your ${name.toLowerCase()} of ${value.toFixed(1)} ${unit} is far from the ideal range (${idealMin.toFixed(1)}-${idealMax.toFixed(1)} ${unit}). This may indicate notable facial disharmony.`
  } else {
    interpretation = `Your ${name.toLowerCase()} of ${value.toFixed(1)} ${unit} falls completely outside the measurable range (${rangeMin.toFixed(1)}-${rangeMax.toFixed(1)} ${unit}).`
  }

  return {
    id, name, value: Math.round(value * 100) / 100,
    unit, score: Math.round(score * 10) / 10,
    idealRange: [idealMin, idealMax],
    description, category, isIdeal: score >= 10.0,
    deviation, interpretation
  }
}

// ============================================================
// FRONT PROFILE CALCULATIONS (33 Metrics)
// ============================================================

function calculateFrontMeasurements(
  lm: Record<string, LandmarkPoint>,
  gender: Gender,
  ethnicity: Ethnicity
): MeasurementResult[] {
  const results: MeasurementResult[] = []
  const genderIdeals = FRONT_IDEALS[gender]
  const ideals = genderIdeals ? genderIdeals[ethnicity] : undefined
  if (!ideals) return results

  const addMeasurement = (
    id: string, name: string, value: number, unit: "degrees" | "ratio" | "mm" | "percentage",
    category: string, description: string
  ) => {
    const ideal = ideals[id]
    if (!ideal) return
    results.push(createMeasurement(id, name, value, unit, category, description, ideal.min, ideal.max, ideal.idealMin, ideal.idealMax))
  }

  const L = (...ids: string[]) => {
    for (const id of ids) {
      if (lm[id]) return lm[id]
    }
    return null
  }

  // ---- Extract commonly used landmarks ----
  const hairline = L("hairline")
  const leftPupil = L("left_pupil")
  const rightPupil = L("right_pupil")
  const leftMedial = L("left_medial_canthus")
  const leftLateral = L("left_lateral_canthus")
  const leftUpperEyelid = L("left_upper_eyelid")
  const leftLowerEyelid = L("left_lower_eyelid")
  const leftEyelidHoodEnd = L("left_eyelid_hood_end")
  const rightMedial = L("right_medial_canthus")
  const rightLateral = L("right_lateral_canthus")
  const rightUpperEyelid = L("right_upper_eyelid")
  const rightLowerEyelid = L("right_lower_eyelid")
  const rightEyelidHoodEnd = L("right_eyelid_hood_end")
  const leftBrowHead = L("left_brow_head")
  const leftBrowInner = L("left_brow_inner_corner")
  const leftBrowArch = L("left_brow_arch")
  const leftBrowPeak = L("left_brow_peak")
  const leftBrowTail = L("left_brow_tail")
  const rightBrowHead = L("right_brow_head")
  const rightBrowInner = L("right_brow_inner_corner")
  const rightBrowArch = L("right_brow_arch")
  const rightBrowPeak = L("right_brow_peak")
  const rightBrowTail = L("right_brow_tail")
  const leftNoseSide = L("left_nose_side")
  const rightNoseSide = L("right_nose_side")
  const leftNoseBridge = L("left_nose_bridge")
  const rightNoseBridge = L("right_nose_bridge")
  const nasalBase = L("nasal_base")
  const noseBottom = L("nose_bottom")
  const leftMouthCorner = L("left_mouth_corner")
  const rightMouthCorner = L("right_mouth_corner")
  const cupidsBow = L("cupids_bow")
  const innerCupidsBow = L("inner_cupids_bow")
  const mouthMiddle = L("mouth_middle")
  const lowerLipCenter = L("lower_lip_center")
  const leftUpperJaw = L("left_upper_jaw_angle")
  const rightUpperJaw = L("right_upper_jaw_angle")
  const leftLowerJaw = L("left_lower_jaw_angle")
  const rightLowerJaw = L("right_lower_jaw_angle")
  const leftChin = L("left_chin")
  const rightChin = L("right_chin")
  const chinBottom = L("chin_bottom")
  const leftCheekbone = L("left_cheekbone")
  const rightCheekbone = L("right_cheekbone")
  const leftTemple = L("left_temple")
  const rightTemple = L("right_temple")

  // ---- 1. Lateral Canthal Tilt ----
  // Acute angle of line (medial canthus → lateral canthus) from horizontal for both eyes
  let lctSum = 0
  let lctCount = 0
  if (leftMedial && leftLateral) {
    lctSum += acuteAngleFromHorizontal(leftMedial, leftLateral)
    lctCount++
  }
  if (rightMedial && rightLateral) {
    lctSum += acuteAngleFromHorizontal(rightMedial, rightLateral)
    lctCount++
  }
  if (lctCount > 0) {
    addMeasurement("lateral_canthal_tilt", "Lateral Canthal Tilt", lctSum / lctCount, "degrees", "Eyes",
      "Average acute angle of medial-to-lateral canthus lines relative to horizontal (left and right eyes).")
  }

  // ---- 2. Nose Bridge to Nose Width Ratio ----
  // Ratio = length(34,35) / length(4,5)
  // (34,35) = nose bridge width, (4,5) = nose side width
  if (leftNoseSide && rightNoseSide && leftNoseBridge && rightNoseBridge) {
    const noseWidth = dist(leftNoseSide, rightNoseSide)        // (4,5)
    const bridgeWidth = dist(leftNoseBridge, rightNoseBridge)  // (34,35)
    if (noseWidth > 0) {
      addMeasurement("nose_bridge_to_width", "Nose Bridge to Nose Width Ratio", noseWidth / bridgeWidth, "ratio", "Nose",
        "Ratio of nose side width (4→5) to nose bridge width (34→35).")
    }
  }

  // ---- 3. Bitemporal Width ----
  if (leftTemple && rightTemple && leftCheekbone && rightCheekbone) {
    const templeWidth = dist(leftTemple, rightTemple)
    const cheekboneWidth = dist(leftCheekbone, rightCheekbone)
    if (cheekboneWidth > 0) {
      addMeasurement("bitemporal_width", "Bitemporal Width", (templeWidth / cheekboneWidth) * 100, "percentage", "Head",
        "Ratio of bitemporal width to bizygomatic width expressed as percentage.")
    }
  }

  // ---- 4. Neck Width - REMOVED ----

  // ---- 5. Ear Protrusion Angle - REMOVED ----

  // ---- 6. Cheekbone Height ----
  // Ratio of distance from Cupid's Bow to cheekbone line over distance from Cupid's Bow to pupil line
  if (cupidsBow && leftCheekbone && rightCheekbone && leftPupil && rightPupil) {
    const a = distanceToLine(cupidsBow, leftCheekbone, rightCheekbone)
    const b = distanceToLine(cupidsBow, leftPupil, rightPupil)
    if (b > 0) {
      addMeasurement("cheekbone_height", "Cheekbone Height", (a / b) * 100, "percentage", "Cheeks",
        "Percentage ratio of Cupid's Bow height to cheekbone line vs Cupid's Bow height to pupil line.")
    }
  }

  // ---- 7. Cupid's Bow Depth ----
  if (cupidsBow && innerCupidsBow) {
    const depth2 = vDist(cupidsBow, innerCupidsBow)
    addMeasurement("cupids_bow_depth", "Cupid's Bow Depth", depth2, "mm", "Mouth",
      "Vertical distance between Cupid's bow and inner Cupid's bow.")
  }

  // ---- 8. Bigonial Width ----
  if (leftUpperJaw && rightUpperJaw && leftCheekbone && rightCheekbone) {
    const jawWidth = dist(leftUpperJaw, rightUpperJaw)
    const faceWidth = dist(leftCheekbone, rightCheekbone)
    if (faceWidth > 0) {
      addMeasurement("bigonial_width", "Bigonial Width", (jawWidth / faceWidth) * 100, "percentage", "Jaw",
        "Ratio of upper jaw angle width to bizygomatic width expressed as percentage.")
    }
  }

  // ---- 9. Jaw Slope ----
  let jawSlopeSum = 0
  let jawSlopeCount = 0
  if (leftCheekbone && leftUpperJaw && leftLowerJaw && leftChin) {
    const a = angleBetweenLines(leftCheekbone, leftUpperJaw, leftLowerJaw, leftChin, true)
    jawSlopeSum += a
    jawSlopeCount++
  }
  if (rightCheekbone && rightUpperJaw && rightLowerJaw && rightChin) {
    const b = angleBetweenLines(rightCheekbone, rightUpperJaw, rightLowerJaw, rightChin, true)
    jawSlopeSum += b
    jawSlopeCount++
  }
  if (jawSlopeCount > 0) {
    addMeasurement("jaw_slope", "Jaw Slope", jawSlopeSum / jawSlopeCount, "degrees", "Jaw",
      "Average of left and right jaw angles formed by cheekbone-upper jaw and lower jaw-chin lines.")
  }

  // ---- 10. Ear Protrusion Ratio - REMOVED ----

  // ---- 11. Middle Third ----
  if (rightBrowHead && rightBrowInner && leftBrowHead && leftBrowInner && nasalBase && hairline && chinBottom) {
    const rightBrowMid = midpoint(rightBrowHead, rightBrowInner)
    const leftBrowMid = midpoint(leftBrowHead, leftBrowInner)
    const browRegionMid = midpoint(rightBrowMid, leftBrowMid)
    const a = vDist(browRegionMid, nasalBase)
    const b = vDist(hairline, chinBottom)
    if (b > 0) {
      addMeasurement("middle_third", "Middle Third", (a / b) * 100, "percentage", "Proportions",
        "Percentage of mid-face height (brow midpoint to nasal base) relative to total facial height.")
    }
  }

  // ---- 12. Eye Aspect Ratio ----
  let earSum = 0
  let earCount = 0
  if (leftMedial && leftLateral && leftUpperEyelid && leftLowerEyelid) {
    const a = hDist(leftMedial, leftLateral)
    const b = vDist(leftUpperEyelid, leftLowerEyelid)
    if (b > 0) { earSum += a / b; earCount++ }
  }
  if (rightMedial && rightLateral && rightUpperEyelid && rightLowerEyelid) {
    const c = hDist(rightMedial, rightLateral)
    const d = vDist(rightUpperEyelid, rightLowerEyelid)
    if (d > 0) { earSum += c / d; earCount++ }
  }
  if (earCount > 0) {
    addMeasurement("eye_aspect_ratio", "Eye Aspect Ratio", earSum / earCount, "ratio", "Eyes",
      "Average ratio of eye width (horizontal) to eye height (vertical). Higher values indicate wider eyes.")
  }

  // ---- 13. Mouth Corner Position ----
  // Signed distance: positive if corner is above mouth_middle line, negative if below
  if (mouthMiddle) {
    let mcpSum = 0
    let mcpCount = 0
    if (leftMouthCorner) {
      mcpSum += mouthMiddle.y - leftMouthCorner.y  // positive if leftMouthCorner is above
      mcpCount++
    }
    if (rightMouthCorner) {
      mcpSum += mouthMiddle.y - rightMouthCorner.y  // positive if rightMouthCorner is above
      mcpCount++
    }
    if (mcpCount > 0) {
      addMeasurement("mouth_corner_position", "Mouth Corner Position", mcpSum / mcpCount, "mm", "Mouth",
        "Average signed vertical offset of mouth corners from the mouth middle line. Positive = corners above middle, negative = corners below middle.")
    }
  }

  // ---- 14. Eye Separation Ratio ----
  if (leftPupil && rightPupil && leftCheekbone && rightCheekbone) {
    const pupilDist = dist(leftPupil, rightPupil)
    const faceW = dist(leftCheekbone, rightCheekbone)
    if (faceW > 0) {
      addMeasurement("eye_separation_ratio", "Eye Separation Ratio", (pupilDist / faceW) * 100, "percentage", "Eyes",
        "Percentage ratio of interpupillary distance to bizygomatic width.")
    }
  }

  // ---- 15. Eyebrow Tilt ----
  // Acute signed angle: positive=upward, negative=downward (y↓ image coords)
  // Left: mid(15,16) to mid(17,18), right: mid(26,27) to mid(28,29)
  let ebtSum = 0
  let ebtCount = 0
  if (leftBrowHead && leftBrowInner && leftBrowArch && leftBrowPeak) {
    const leftStart = midpoint(leftBrowHead, leftBrowInner)   // mid(15,16)
    const leftEnd = midpoint(leftBrowArch, leftBrowPeak)      // mid(17,18)
    // Negate dy because y↓ in image coords, so upward = negative dy = positive angle
    const signedDeg = Math.atan2(-(leftEnd.y - leftStart.y), leftEnd.x - leftStart.x) * (180 / Math.PI)
    const acuteDeg = Math.abs(signedDeg) > 90 ? (180 - Math.abs(signedDeg)) * Math.sign(signedDeg) : signedDeg
    ebtSum += acuteDeg
    ebtCount++
  }
  if (rightBrowHead && rightBrowInner && rightBrowArch && rightBrowPeak) {
    const rightStart = midpoint(rightBrowHead, rightBrowInner) // mid(26,27)
    const rightEnd = midpoint(rightBrowArch, rightBrowPeak)    // mid(28,29)
    const signedDeg = Math.atan2(-(rightEnd.y - rightStart.y), rightEnd.x - rightStart.x) * (180 / Math.PI)
    const acuteDeg = Math.abs(signedDeg) > 90 ? (180 - Math.abs(signedDeg)) * Math.sign(signedDeg) : signedDeg
    ebtSum += acuteDeg
    ebtCount++
  }
  if (ebtCount > 0) {
    addMeasurement("eyebrow_tilt", "Eyebrow Tilt", ebtSum / ebtCount, "degrees", "Brows",
      "Average acute signed angle of eyebrow tilt from horizontal. Positive = upward tilt, negative = downward tilt.")
  }

  // ---- 16. Lower Third ----
  if (chinBottom && nasalBase && hairline) {
    const a = vDist(chinBottom, nasalBase)
    const b = vDist(hairline, chinBottom)
    if (b > 0) {
      addMeasurement("lower_third", "Lower Third", (a / b) * 100, "percentage", "Proportions",
        "Percentage of lower facial third (nasal base to chin bottom) relative to total facial height.")
    }
  }

  // ---- 17. Face Width to Height Ratio ----
  // Uses horizontal width (abs x-diff) and vertical height (abs y-diff) to match on-screen visualization
  if (leftCheekbone && rightCheekbone && cupidsBow && rightBrowHead && rightBrowInner && leftBrowHead && leftBrowInner) {
    const fw = Math.abs(rightCheekbone.x - leftCheekbone.x)
    const rightBrowMidY = (rightBrowHead.y + rightBrowInner.y) / 2
    const leftBrowMidY = (leftBrowHead.y + leftBrowInner.y) / 2
    const browY = (rightBrowMidY + leftBrowMidY) / 2
    const fh = Math.abs(cupidsBow.y - browY)
    if (fh > 0) {
      addMeasurement("face_width_to_height", "Face Width to Height Ratio", fw / fh, "ratio", "Proportions",
        "Ratio of facial width (bizygomatic horizontal) to facial height (Cupid's bow to brow midpoint).")
    }
  }

  // ---- 18. Interpupillary-Mouth Width Ratio ----
  if (leftMouthCorner && rightMouthCorner && leftPupil && rightPupil) {
    const mouthWidth = dist(leftMouthCorner, rightMouthCorner)
    const pupilDist2 = dist(leftPupil, rightPupil)
    if (pupilDist2 > 0) {
      addMeasurement("interpupillary_mouth_width", "Interpupillary-Mouth Width Ratio", (mouthWidth / pupilDist2) * 100, "percentage", "Proportions",
        "Percentage ratio of mouth width to interpupillary distance.")
    }
  }

  // ---- 19. Jaw Frontal Angle ----
  // Angle at intersection of extended lines (43→45) and (44→46), smaller angle (<180°)
  if (leftLowerJaw && leftChin && rightLowerJaw && rightChin) {
    const jfa = angleBetweenLines(leftLowerJaw, leftChin, rightLowerJaw, rightChin)
    const finalJfa = jfa > 180 ? 360 - jfa : jfa
    addMeasurement("jaw_frontal_angle", "Jaw Frontal Angle", finalJfa, "degrees", "Jaw",
      "Angle formed at the intersection of extended left and right jaw-to-chin lines. Smaller angle (<180°) is used.")
  }

  // ---- 20. Intercanthal-Nasal Width Ratio ----
  if (leftNoseSide && rightNoseSide && leftMedial && rightMedial) {
    const noseW = dist(leftNoseSide, rightNoseSide)
    const medialDist = dist(leftMedial, rightMedial)
    if (medialDist > 0) {
      addMeasurement("intercanthal_nasal_width", "Intercanthal-Nasal Width Ratio", noseW / medialDist, "ratio", "Proportions",
        "Ratio of nasal width to intercanthal distance.")
    }
  }

  // ---- 21. Top Third ----
  if (hairline && rightBrowHead && rightBrowInner && leftBrowHead && leftBrowInner && chinBottom) {
    const rightBrowMid = midpoint(rightBrowHead, rightBrowInner)
    const leftBrowMid = midpoint(leftBrowHead, leftBrowInner)
    const browRegionMid = midpoint(rightBrowMid, leftBrowMid)
    const a = vDist(hairline, browRegionMid)
    const b = vDist(hairline, chinBottom)
    if (b > 0) {
      addMeasurement("top_third", "Top Third", (a / b) * 100, "percentage", "Proportions",
        "Percentage of upper facial third (hairline to brow midpoint) relative to total facial height.")
    }
  }

  // ---- 22. One Eye Apart Test ----
  // Line (10,21) = intercanthal distance (left medial to right medial canthus)
  // Lines (10,11) and (21,22) = eye widths (medial to lateral canthus for each eye)
  // ratio = (10,21) / avg((10,11), (21,22))
  if (leftMedial && rightMedial && leftLateral && rightLateral) {
    const intercanthal = dist(leftMedial, rightMedial)  // (10,21)
    const leftEyeWidth = dist(leftMedial, leftLateral)   // (10,11)
    const rightEyeWidth = dist(rightMedial, rightLateral) // (21,22)
    const avgEyeWidth = (leftEyeWidth + rightEyeWidth) / 2
    if (avgEyeWidth > 0) {
      addMeasurement("one_eye_apart", "One Eye Apart Test", intercanthal / avgEyeWidth, "ratio", "Proportions",
        "Ratio of intercanthal distance (10→21) to average eye width (medial to lateral canthus).")
    }
  }

  // ---- 23. Midface Ratio ----
  // FIXED: Use 0-1 normalized coordinates (without aspect scaling) for correct ratio
  // distance between pupils (2→3) divided by perpendicular distance from inner cupid's bow (39) to pupil line
  if (leftPupil && rightPupil && innerCupidsBow) {
    const pDist = dist(leftPupil, rightPupil)
    const distToLine = distanceToLine(innerCupidsBow, leftPupil, rightPupil)
    if (distToLine > 0) {
      addMeasurement("midface_ratio", "Midface Ratio", pDist / distToLine, "ratio", "Proportions",
        "Ratio of interpupillary distance to distance from inner Cupid's bow to pupil line.")
    }
  }

  // ---- 24. Ipsilateral Alar Angle ----
  // FIXED: Use right landmarks matching the visualization
  // Angle at nasal_base between left_eyelid_hood_end and right_eyelid_hood_end
  if (nasalBase && leftEyelidHoodEnd && rightEyelidHoodEnd) {
    const iaa = angle(leftEyelidHoodEnd, nasalBase, rightEyelidHoodEnd)
    addMeasurement("ipsilateral_alar_angle", "Ipsilateral Alar Angle", iaa, "degrees", "Nose",
      "Angle at nasal base between left and right eyelid hood ends.")
  }

  // ---- 25. Mouth Width to Nose Width Ratio ----
  if (leftMouthCorner && rightMouthCorner && leftNoseSide && rightNoseSide) {
    const mouthW = dist(leftMouthCorner, rightMouthCorner)
    const noseW2 = dist(leftNoseSide, rightNoseSide)
    if (noseW2 > 0) {
      addMeasurement("mouth_width_to_nose_width", "Mouth Width to Nose Width Ratio", mouthW / noseW2, "ratio", "Proportions",
        "Ratio of mouth width to nose width.")
    }
  }

  // ---- 26. Total Facial Width to Height Ratio ----
  if (hairline && chinBottom && leftCheekbone && rightCheekbone) {
    const totalHeight = vDist(hairline, chinBottom)
    const totalWidth = dist(leftCheekbone, rightCheekbone)
    if (totalHeight > 0) {
      addMeasurement("total_facial_width_to_height", "Total Facial Width to Height Ratio", totalWidth / totalHeight, "ratio", "Proportions",
        "Ratio of bizygomatic width (47,48) to total facial height (hairline to chin, 1→7).")
    }
  }

  // ---- 27. Chin to Philtrum Ratio ----
  if (chinBottom && lowerLipCenter && cupidsBow && nasalBase) {
    const chinToLip = vDist(chinBottom, lowerLipCenter)
    const cupidsToNasal = vDist(cupidsBow, nasalBase)
    if (cupidsToNasal > 0) {
      addMeasurement("chin_to_philtrum", "Chin to Philtrum Ratio", chinToLip / cupidsToNasal, "ratio", "Proportions",
        "Ratio of chin height (chin bottom to lower lip center) to philtrum length (Cupid's bow to nasal base).")
    }
  }

  // ---- 28. Eyebrow Low Setedness ----
  if (leftPupil && rightPupil && leftBrowInner && rightBrowInner) {
    let eyeHeightSum = 0
    let eyeHeightCount = 0
    if (leftLowerEyelid && leftUpperEyelid) {
      eyeHeightSum += vDist(leftLowerEyelid, leftUpperEyelid)
      eyeHeightCount++
    }
    if (rightLowerEyelid && rightUpperEyelid) {
      eyeHeightSum += vDist(rightLowerEyelid, rightUpperEyelid)
      eyeHeightCount++
    }
    if (eyeHeightCount > 0) {
      const avgEyeHeight = eyeHeightSum / eyeHeightCount
      const pupilMid = midpoint(leftPupil, rightPupil)
      const browInnerMid = midpoint(leftBrowInner, rightBrowInner)
      const d = dist(pupilMid, browInnerMid)
      if (avgEyeHeight > 0) {
        addMeasurement("eyebrow_low_setedness", "Eyebrow Low Setedness", d / avgEyeHeight, "ratio", "Brows",
          "Ratio of brow-to-pupil-midpoint distance to average eye height. Higher values indicate higher-set brows.")
      }
    }
  }

  // ---- 29. Brow Length to Face Width Ratio ----
  // total length of (16,19) + (27,30) divided by length of (47,48)
  if (leftCheekbone && rightCheekbone) {
    let totalBrowLen = 0
    let browCount = 0
    if (leftBrowInner && leftBrowTail) {
      totalBrowLen += dist(leftBrowInner, leftBrowTail)  // full Euclidean distance (16,19)
      browCount++
    }
    if (rightBrowInner && rightBrowTail) {
      totalBrowLen += dist(rightBrowInner, rightBrowTail) // full Euclidean distance (27,30)
      browCount++
    }
    if (browCount > 0) {
      const faceWidth2 = dist(leftCheekbone, rightCheekbone) // (47,48)
      if (faceWidth2 > 0) {
        addMeasurement("brow_length_to_face_width", "Brow Length to Face Width Ratio", totalBrowLen / faceWidth2, "ratio", "Brows",
          "Ratio of total brow span (left inner-to-tail + right inner-to-tail) divided by bizygomatic face width.")
      }
    }
  }

  // ---- 30. Nose Tip Position ----
  if (nasalBase && noseBottom) {
    const noseTipDist = dist(nasalBase, noseBottom)
    addMeasurement("nose_tip_position", "Nose Tip Position", noseTipDist, "mm", "Nose",
      "Distance from nasal base to nose bottom. Measures nose tip length.")
  }

  // ---- 31. Deviation of IAA & JFA ----
  let iaaVal = 0
  let iaaOk = false
  if (nasalBase && leftEyelidHoodEnd && rightEyelidHoodEnd) {
    iaaVal = angle(leftEyelidHoodEnd, nasalBase, rightEyelidHoodEnd)
    iaaOk = true
  }
  let jfaVal = 0
  let jfaOk = false
  if (leftLowerJaw && leftChin && rightLowerJaw && rightChin) {
    jfaVal = angleBetweenLines(leftLowerJaw, leftChin, rightLowerJaw, rightChin)
    jfaOk = true
  }
  if (iaaOk && jfaOk) {
    const deviation = jfaVal - iaaVal
    addMeasurement("deviation_iaa_jfa", "Deviation of IAA & JFA", deviation, "degrees", "Proportions",
      "Difference between Jaw Frontal Angle and Ipsilateral Alar Angle (JFA - IAA).")
  }

  // ---- 32. Lower Lip to Upper Lip Ratio ----
  if (lowerLipCenter && mouthMiddle && cupidsBow) {
    const lowerLipH = vDist(lowerLipCenter, mouthMiddle)
    const upperLipH = vDist(mouthMiddle, cupidsBow)
    if (upperLipH > 0) {
      addMeasurement("lower_lip_to_upper_lip", "Lower Lip to Upper Lip Ratio", lowerLipH / upperLipH, "ratio", "Mouth",
        "Ratio of lower lip height to upper lip height.")
    }
  }

  // ---- 33. Lower Third Proportion ----
  if (nasalBase && mouthMiddle && chinBottom) {
    const a = vDist(nasalBase, mouthMiddle)
    const b = vDist(nasalBase, chinBottom)
    if (b > 0) {
      addMeasurement("lower_third_proportion", "Lower Third Proportion", (a / b) * 100, "percentage", "Proportions",
        "Percentage of upper lip height (nasal base to mouth middle) relative to lower face height (nasal base to chin bottom).")
    }
  }

  return results
}

// ============================================================
// SIDE PROFILE CALCULATIONS (32 Metrics)
// ============================================================

function calculateSideMeasurements(
  lm: Record<string, LandmarkPoint>,
  gender: Gender,
  ethnicity: Ethnicity
): MeasurementResult[] {
  const results: MeasurementResult[] = []
  const genderIdeals = SIDE_IDEALS[gender]
  const ideals = genderIdeals ? genderIdeals[ethnicity] : undefined
  if (!ideals) return results

  const addMeasurement = (
    id: string, name: string, value: number, unit: "degrees" | "ratio" | "mm" | "percentage",
    category: string, description: string
  ) => {
    const ideal = ideals[id]
    if (!ideal) return
    results.push(createMeasurement(id, name, value, unit, category, description, ideal.min, ideal.max, ideal.idealMin, ideal.idealMax))
  }

  const L = (...ids: string[]) => {
    for (const id of ids) {
      if (lm[id]) return lm[id]
    }
    return null
  }

  // ---- Extract commonly used landmarks ----
  const topOfHead = L("top_of_head")
  const occiput = L("occiput")
  const hairline = L("hairline_profile")
  const forehead = L("forehead")
  const glabella = L("glabella")
  const nasion = L("nasal_bridge_root")
  const rhinion = L("rhinion")
  const supratip = L("supratip")
  const noseTip = L("nose_tip")
  const infratip = L("infratip")
  const columella = L("columella")
  const subnasale = L("subnasale")
  const subalare = L("subalare")
  const upperLip = L("upper_lip")
  const mouthCorner = L("mouth_corner")
  const lowerLip = L("lower_lip")
  const labiomentalFold = L("labiomental_fold")
  const chinPoint = L("chin_point")
  const chinBottom = L("chin_bottom")
  const upperJawAngle = L("upper_jaw_angle")
  const lowerJawAngle = L("lower_jaw_angle")
  const porion = L("porion")
  const tragus = L("tragus")
  const intertragicNotch = L("intertragic_notch")
  const orbitale = L("orbitale")
  const cornealApex = L("corneal_apex")
  const eyelidEnd = L("eyelid_end")
  const lowerEyelid = L("lower_eyelid")
  const cheekbone = L("cheekbone")
  const cervicalPoint = L("cervical_point")
  const neckPoint = L("neck_point")

  // ---- 1. Nasal Tip Angle ----
  if (infratip && noseTip && supratip) {
    const nta = angle(infratip, noseTip, supratip)
    addMeasurement("nasal_tip_angle", "Nasal Tip Angle", nta, "degrees", "Nose",
      "Angle at nose tip between infratip and supratip.")
  }

  // ---- 2. Nasal Width to Height Ratio ----
  if (noseTip && subalare && nasion) {
    const nw = dist(noseTip, subalare)
    const nh = distanceToLine(nasion, noseTip, subalare)
    if (nh > 0) {
      addMeasurement("nasal_width_to_height", "Nasal Width to Height Ratio", nw / nh, "ratio", "Nose",
        "Ratio of nasal width (nose tip to subalare) to nasal height (nasion perpendicular to that line).")
    }
  }

  // ---- 3. Upper Lip S-Line Position ----
  if (upperLip && columella && chinPoint) {
    const sLineDist = signedDistanceToLine(upperLip, columella, chinPoint)
    addMeasurement("upper_lip_s_line", "Upper Lip S-Line Position", sLineDist, "mm", "Lips",
      "Upper lip position relative to S-line (columella to chin point). Negative = behind line, positive = ahead.")
  }

  // ---- 3b. Upper Lip Burstone Line ----
  if (upperLip && subnasale && chinPoint) {
    const burstoneDist = signedDistanceToLine(upperLip, subnasale, chinPoint)
    addMeasurement("upper_lip_burstone", "Upper Lip Burstone Line", burstoneDist, "mm", "Lips",
      "Upper lip position relative to Burstone line (subnasale to chin point). Negative = behind line, positive = ahead.")
  }

  // ---- 4. Nasal Projection ----
  if (subalare && noseTip && nasion) {
    const w = dist(subalare, noseTip)
    const h = dist(noseTip, nasion)
    if (h > 0) {
      addMeasurement("nasal_projection", "Nasal Projection", w / h, "ratio", "Nose",
        "Ratio of nasal width (subalare to nose tip) to nasal height (nose tip to nasion).")
    }
  }

  // ---- 5. Nasofrontal Angle ----
  if (glabella && nasion && rhinion) {
    const nfa = angle(glabella, nasion, rhinion)
    addMeasurement("nasofrontal_angle", "Nasofrontal Angle", nfa, "degrees", "Nose",
      "Angle at nasion between glabella and rhinion. Ideal is ~115-135°.")
  }

  // ---- 6. Recession Relative to Frankfort Plane ----
  if (chinPoint && porion && orbitale && nasion) {
    // Line through nasion perpendicular to Frankfort plane (70→73).
    // The perpendicular direction to (fdx,fdy) is (-fdy,fdx).
    // So a second point on the perpendicular line is nasion shifted by (-fdy, fdx).
    const perpLineEnd: LandmarkPoint = {
      id: "perpEnd", x: nasion.x - (orbitale.y - porion.y), y: nasion.y + (orbitale.x - porion.x), label: ""
    }
    const recession = signedDistanceToLine(chinPoint, nasion, perpLineEnd)
    addMeasurement("recession_frankfort", "Recession (Frankfort Plane)", recession, "mm", "Profile",
      "Signed distance from chin point to line through nasion perpendicular to Frankfort plane. Negative = recessed, positive = prominent.")
  }

  // ---- 7. Holdaway H-Line ----
  if (upperLip && chinPoint && lowerLip) {
    const hLineDist = signedDistanceToLine(lowerLip, upperLip, chinPoint)
    addMeasurement("holdaway_h_line", "Holdaway H Line", hLineDist, "mm", "Profile",
      "Signed distance from lower lip to Holdaway H-line (upper lip to chin).")
  }

  // ---- 8. Mentolabial Angle ----
  if (lowerLip && labiomentalFold && chinPoint) {
    const mla = angle(lowerLip, labiomentalFold, chinPoint)
    addMeasurement("mentolabial_angle", "Mentolabial Angle", mla, "degrees", "Chin",
      "Angle between lower lip and chin at the labiomental fold. Ideal is ~100-130°.")
  }

  // ---- 9. Upper Forehead Slope ----
  if (glabella && forehead && hairline) {
    const ufs = angle(forehead, glabella, hairline)
    addMeasurement("upper_forehead_slope", "Upper Forehead Slope", ufs, "degrees", "Forehead",
      "Angle at glabella between forehead and hairline. Smaller = more sloping.")
  }

  // ---- 10. Facial Convexity (Nasion) ----
  if (nasion && subnasale && chinPoint) {
    const fcn = angle(nasion, subnasale, chinPoint)
    addMeasurement("facial_convexity_nasion", "Facial Convexity (Nasion)", fcn, "degrees", "Profile",
      "Facial convexity angle at subnasale between nasion and chin point.")
  }

  // ---- 11. Anterior Facial Depth ----
  if (tragus && subalare && orbitale) {
    const afd = angle(tragus, subalare, orbitale)
    addMeasurement("anterior_facial_depth", "Anterior Facial Depth", afd, "degrees", "Proportions",
      "Angle at subalare between tragus and orbitale.")
  }

  // ---- 12. Upper Lip E-Line Position ----
  if (upperLip && noseTip && chinPoint) {
    const eLineDist = signedDistanceToLine(upperLip, noseTip, chinPoint)
    addMeasurement("upper_lip_e_line", "Upper Lip E-Line Position", eLineDist, "mm", "Lips",
      "Upper lip position relative to Ricketts' E-line (nose tip to chin).")
  }

  // ---- 13. Submental Cervical Angle ----
  if (chinBottom && cervicalPoint && neckPoint) {
    const sca = angle(chinBottom, cervicalPoint, neckPoint)
    addMeasurement("submental_cervical_angle", "Submental Cervical Angle", sca, "degrees", "Neck",
      "Angle at cervical point between chin bottom and neck point. Ideal is ~80-100°.")
  }

  // ---- 14. Facial Depth to Height Ratio ----
  if (subnasale && tragus && nasion && labiomentalFold) {
    const depth3 = dist(subnasale, tragus)
    const height3 = dist(nasion, labiomentalFold)
    if (height3 > 0) {
      addMeasurement("facial_depth_to_height", "Facial Depth to Height Ratio", depth3 / height3, "ratio", "Proportions",
        "Ratio of facial depth (subnasale to tragus) to facial height (nasion to labiomental fold).")
    }
  }

  // ---- 15. Browridge Inclination Angle ----
  if (glabella && hairline) {
    const dx = hairline.x - glabella.x
    const dy = hairline.y - glabella.y
    const angleFromVert = Math.abs(Math.atan2(dx, -(hairline.y - glabella.y)) * (180 / Math.PI))
    addMeasurement("browridge_inclination", "Browridge Inclination Angle", angleFromVert, "degrees", "Brows",
      "Angle between vertical at glabella and the brow line to hairline.")
  }

  // ---- 16. Total Facial Convexity ----
  if (chinPoint && noseTip && glabella) {
    const tfc = angle(chinPoint, noseTip, glabella)
    addMeasurement("total_facial_convexity", "Total Facial Convexity", tfc, "degrees", "Profile",
      "Total facial convexity angle at nose tip between chin point and glabella.")
  }

  // ---- 17. Facial Convexity (Glabella) ----
  if (glabella && subnasale && chinPoint) {
    const fcg = angle(glabella, subnasale, chinPoint)
    addMeasurement("facial_convexity_glabella", "Facial Convexity (Glabella)", fcg, "degrees", "Profile",
      "Facial convexity angle at subnasale between glabella and chin point.")
  }

  // ---- 18. Orbital Vector ----
  if (orbitale && lowerEyelid) {
    // Signed horizontal distance from point 73 (orbitale) to vertical line through point 76 (lower_eyelid)
    // Positive = orbitale to the right of vertical line (ahead), Negative = orbitale to the left (behind)
    const ov = orbitale.x - lowerEyelid.x
    addMeasurement("orbital_vector", "Orbital Vector", ov, "mm", "Eyes",
      "Horizontal distance from orbitale to vertical line through lower eyelid. Negative = orbitale behind (left), positive = orbitale ahead (right).")
  }

  // ---- 19. Interior Midface Projection Angle ----
  if (eyelidEnd && subalare) {
    // Angle at vertex 61 (subalare) between ray (61→75) and horizontal leftward ray
    const aRay = Math.atan2(eyelidEnd.y - subalare.y, eyelidEnd.x - subalare.x)
    const aHoriz = Math.PI  // left-pointing horizontal ray (←)
    let diff = aRay - aHoriz
    while (diff < -Math.PI) diff += 2 * Math.PI
    while (diff > Math.PI) diff -= 2 * Math.PI
    const angleDeg = Math.abs(diff * 180 / Math.PI)
    addMeasurement("interior_midface_projection", "Interior Midface Projection Angle", angleDeg, "degrees", "Midface",
      "Angle at subalare between the ray to eyelid end and the leftward horizontal. Smaller angle (<180°).")
  }

  // ---- 20. Z-Angle ----
  if (cheekbone && rhinion && chinPoint && infratip) {
    const dx1 = rhinion.x - cheekbone.x, dy1 = rhinion.y - cheekbone.y
    const dx2 = infratip.x - chinPoint.x, dy2 = infratip.y - chinPoint.y
    const det = dx1 * dy2 - dy1 * dx2
    if (Math.abs(det) > 0.001) {
      const t = ((chinPoint.x - cheekbone.x) * dy2 - (chinPoint.y - cheekbone.y) * dx2) / det
      const ix = cheekbone.x + dx1 * t, iy = cheekbone.y + dy1 * t
      const v1x = cheekbone.x - ix, v1y = cheekbone.y - iy
      const v2x = chinPoint.x - ix, v2y = chinPoint.y - iy
      const dot = v1x * v2x + v1y * v2y
      const cross = v1x * v2y - v1y * v2x
      const zAngle = Math.abs(Math.atan2(cross, dot)) * (180 / Math.PI)
      addMeasurement("z_angle", "Z Angle", zAngle, "degrees", "Profile",
        "Angle at intersection of cheekbone-rhinion and chin point-infratip lines.")
    }
  }

  // ---- 21. Nose Tip Rotation Angle ----
  if (rhinion && cheekbone && subnasale && infratip) {
    const dx1 = cheekbone.x - rhinion.x, dy1 = cheekbone.y - rhinion.y
    const dx2 = infratip.x - subnasale.x, dy2 = infratip.y - subnasale.y
    const det = dx1 * dy2 - dy1 * dx2
    if (Math.abs(det) > 0.001) {
      const t = ((subnasale.x - rhinion.x) * dy2 - (subnasale.y - rhinion.y) * dx2) / det
      const ix = rhinion.x + t * dx1, iy = rhinion.y + t * dy1
      const v1x = rhinion.x - ix, v1y = rhinion.y - iy
      const v2x = subnasale.x - ix, v2y = subnasale.y - iy
      const dot = v1x * v2x + v1y * v2y
      const cross = v1x * v2y - v1y * v2x
      const ntr = Math.abs(Math.atan2(cross, dot)) * (180 / Math.PI)
      addMeasurement("nose_tip_rotation", "Nose Tip Rotation Angle", ntr, "degrees", "Nose",
        "Angle at intersection of rhinion-cheekbone and subnasale-infratip lines.")
    }
  }

  // ---- 22. Nasolabial Angle ----
  if (columella && subnasale && upperLip) {
    const nla = 180 - angle(columella, subnasale, upperLip)
    addMeasurement("nasolabial_angle", "Nasolabial Angle", nla, "degrees", "Nose",
      "Supplementary angle at subnasale between columella and upper lip. Ideal is ~90-110°.")
  }

  // ---- 23. Nasofacial Angle ----
  if (nasion && chinPoint && noseTip) {
    const nfa2 = angle(chinPoint, nasion, noseTip)
    addMeasurement("nasofacial_angle", "Nasofacial Angle", nfa2, "degrees", "Nose",
      "Angle at nasion between chin point and nose tip.")
  }

  // ---- 24. Nasomental Angle ----
  if (nasion && noseTip && chinPoint) {
    const nma = angle(nasion, noseTip, chinPoint)
    addMeasurement("nasomental_angle", "Nasomental Angle", nma, "degrees", "Profile",
      "Angle at nose tip between nasion and chin point.")
  }

  // ---- 25. Frankfort-Tip Angle ----
  if (columella && subnasale && cheekbone && rhinion) {
    const dx1 = subnasale.x - columella.x, dy1 = subnasale.y - columella.y  // (60→59)
    const dx2 = rhinion.x - cheekbone.x, dy2 = rhinion.y - cheekbone.y       // (77→55)
    const det = dx1 * dy2 - dy1 * dx2
    if (Math.abs(det) > 0.001) {
      const t = ((cheekbone.x - columella.x) * dy2 - (cheekbone.y - columella.y) * dx2) / det
      const ix = columella.x + dx1 * t, iy = columella.y + dy1 * t
      // Vectors from intersection TO the line endpoints
      const v1x = columella.x - ix, v1y = columella.y - iy
      const v2x = rhinion.x - ix, v2y = rhinion.y - iy
      const dot = v1x * v2x + v1y * v2y
      const cross = v1x * v2y - v1y * v2x
      const fta = Math.abs(Math.atan2(cross, dot)) * (180 / Math.PI)
      addMeasurement("frankfort_tip_angle", "Frankfort-Tip Angle", fta, "degrees", "Nose",
        "Acute angle at intersection of extended columella-subnasale and cheekbone-rhinion lines.")
    }
  }

  // ---- 26. Lower Lip S-Line Position ----
  if (lowerLip && columella && chinPoint) {
    const sLineDist2 = signedDistanceToLine(lowerLip, columella, chinPoint)
    addMeasurement("lower_lip_s_line", "Lower Lip S-Line Position", sLineDist2, "mm", "Lips",
      "Lower lip position relative to Steiner's S-line (columella to chin).")
  }

  // ---- 27. Lower Lip E-Line Position ----
  if (lowerLip && noseTip && chinPoint) {
    const eLineDist2 = signedDistanceToLine(lowerLip, noseTip, chinPoint)
    addMeasurement("lower_lip_e_line", "Lower Lip E-Line Position", eLineDist2, "mm", "Lips",
      "Lower lip position relative to Ricketts' E-line (nose tip to chin).")
  }

  // ---- 28. Lower Lip Burstone Line ----
  if (lowerLip && subnasale && chinPoint) {
    const burstoneDist = signedDistanceToLine(lowerLip, subnasale, chinPoint)
    addMeasurement("lower_lip_burstone", "Lower Lip Burstone Line", burstoneDist, "mm", "Lips",
      "Lower lip position relative to Burstone line (subnasale to chin point).")
  }

  // ---- 29. Gonial Angle ----
  if (intertragicNotch && upperJawAngle && chinBottom && lowerJawAngle) {
    const dx1 = upperJawAngle.x - intertragicNotch.x, dy1 = upperJawAngle.y - intertragicNotch.y
    const dx2 = lowerJawAngle.x - chinBottom.x, dy2 = lowerJawAngle.y - chinBottom.y
    const det = dx1 * dy2 - dy1 * dx2
    if (Math.abs(det) > 0.001) {
      const t = ((chinBottom.x - intertragicNotch.x) * dy2 - (chinBottom.y - intertragicNotch.y) * dx2) / det
      const ix = intertragicNotch.x + t * dx1, iy = intertragicNotch.y + t * dy1
      const v1x = intertragicNotch.x - ix, v1y = intertragicNotch.y - iy
      const v2x = lowerJawAngle.x - ix, v2y = lowerJawAngle.y - iy
      const dot = v1x * v2x + v1y * v2y
      const cross = v1x * v2y - v1y * v2x
      const ga = Math.abs(Math.atan2(cross, dot)) * (180 / Math.PI)
      addMeasurement("gonial_angle", "Gonial Angle", ga, "degrees", "Jaw",
        "Angle between intertragic-notch-to-upper-jaw and chin-bottom-to-lower-jaw lines. Ideal is ~115-135°.")
    }
  }

  // ---- 30. Mandibular Plane Angle ----
  if (lowerJawAngle && chinBottom) {
    const dx = chinBottom.x - lowerJawAngle.x
    const dy = chinBottom.y - lowerJawAngle.y
    const angleFromHoriz = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI))
    addMeasurement("mandibular_plane_angle", "Mandibular Plane Angle", angleFromHoriz, "degrees", "Jaw",
      "Angle between mandibular plane (lower jaw to chin bottom) and horizontal. Ideal is ~20-35°.")
  }

  // ---- 31. Ramus to Mandible Ratio ----
  // Intersection of lines (67→69) and (71→68), vertical from 66, then ratio d(71,A)/d(A,B)
  if (chinBottom && lowerJawAngle && tragus && upperJawAngle && chinPoint) {
    const dx1 = lowerJawAngle.x - chinBottom.x, dy1 = lowerJawAngle.y - chinBottom.y
    const dx2 = upperJawAngle.x - tragus.x, dy2 = upperJawAngle.y - tragus.y
    const det = dx1 * dy2 - dy1 * dx2
    if (Math.abs(det) > 0.001) {
      const t = ((tragus.x - chinBottom.x) * dy2 - (tragus.y - chinBottom.y) * dx2) / det
      const ax = chinBottom.x + dx1 * t, ay = chinBottom.y + dy1 * t
      const s2 = (chinPoint.x - chinBottom.x) / dx1
      const bx = chinBottom.x + dx1 * s2, by = chinBottom.y + dy1 * s2
      const da = Math.sqrt((ax - tragus.x) ** 2 + (ay - tragus.y) ** 2)
      const dab = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2)
      if (dab > 0) {
        addMeasurement("ramus_to_mandible", "Ramus to Mandible Ratio", da / dab, "ratio", "Jaw",
          "Ratio of ramus height to mandibular body length. Ideal is ~0.55-0.75.")
      }
    }
  }

  // ---- 32. Gonion to Mouth Line ----
  // Intersection A of (67→69) and (71→68), then perpendicular distance from A to horizontal through 63
  if (chinBottom && lowerJawAngle && tragus && upperJawAngle && mouthCorner) {
    const dx1 = lowerJawAngle.x - chinBottom.x, dy1 = lowerJawAngle.y - chinBottom.y
    const dx2 = upperJawAngle.x - tragus.x, dy2 = upperJawAngle.y - tragus.y
    const det = dx1 * dy2 - dy1 * dx2
    if (Math.abs(det) > 0.001) {
      const t = ((tragus.x - chinBottom.x) * dy2 - (tragus.y - chinBottom.y) * dx2) / det
      const ax = chinBottom.x + dx1 * t, ay = chinBottom.y + dy1 * t
      const gmd = Math.abs(ay - mouthCorner.y)
      addMeasurement("gonion_to_mouth", "Gonion to Mouth Line", gmd, "mm", "Jaw",
        "Vertical distance from gonion intersection A to mouth corner horizontal line.")
    }
  }

  return results
}

// ============================================================
// MAIN ANALYSIS FUNCTION
// ============================================================

export function calculateAnalysis(
  frontLandmarks: LandmarkPoint[],
  sideLandmarks: LandmarkPoint[],
  gender: Gender,
  ethnicity: Ethnicity,
  frontAspect = 1,
  sideAspect = 1
): AnalysisResults {
  // Scale landmarks to pixel-space equivalent using image aspect ratio
  // Canvas draws at (x * drawWidth, y * drawHeight), so x gets scaled by aspect relative to y
  // This ensures all computed values (angles, ratios) match pixel-space geometry on the image
  const SCALE = 1000
  const scaleLm = (lm: LandmarkPoint, aspectRatio: number): LandmarkPoint => ({
    ...lm,
    x: lm.x * SCALE * aspectRatio,
    y: lm.y * SCALE,
  })
  const frontLm = frontLandmarks.reduce((acc, l) => { const s = scaleLm(l, frontAspect); acc[s.id] = s; return acc }, {} as Record<string, LandmarkPoint>)
  const sideLm = sideLandmarks.reduce((acc, l) => { const s = scaleLm(l, sideAspect); acc[s.id] = s; return acc }, {} as Record<string, LandmarkPoint>)

  const frontMeasurements = calculateFrontMeasurements(frontLm, gender, ethnicity)
  const sideMeasurements = calculateSideMeasurements(sideLm, gender, ethnicity)

  const allMeasurements = [...frontMeasurements, ...sideMeasurements]

  // ============================================================
  // HIERARCHICAL WEIGHTED HARMONY SCORING
  // (Front 60%, Side 40% of overall)
  // ============================================================

  // Helper: get score of a measurement by ID
  const scoreOf = (measurements: MeasurementResult[], id: string): number => {
    const m = measurements.find(m => m.id === id)
    return m ? m.score : 0
  }

  // --- FRONT PROFILE GROUPS ---
  // Group F1: Craniofacial Framework & Global Proportions (40%)
  const F1_KEY = ["midface_ratio", "face_width_to_height", "lower_third"]
  const F1_STD = ["bitemporal_width", "bigonial_width", "jaw_slope", "middle_third", "top_third", "total_facial_width_to_height", "lower_third_proportion"]
  const G_F1 = weightedGroupScore(frontMeasurements, F1_KEY, F1_STD)

  // Group F2: Periorbital Complex (Eyes & Brows) (30%)
  const F2_KEY = ["lateral_canthal_tilt", "eye_separation_ratio"]
  const F2_STD = ["cheekbone_height", "eye_aspect_ratio", "eyebrow_tilt", "one_eye_apart", "eyebrow_low_setedness", "brow_length_to_face_width"]
  const G_F2 = weightedGroupScore(frontMeasurements, F2_KEY, F2_STD)

  // Group F3: Perioral & Nasal Complex (30%)
  const F3_KEY = ["jaw_frontal_angle", "chin_to_philtrum"]
  const F3_STD = ["nose_bridge_to_width", "cupids_bow_depth", "mouth_corner_position", "interpupillary_mouth_width", "intercanthal_nasal_width", "ipsilateral_alar_angle", "mouth_width_to_nose_width", "nose_tip_position", "deviation_iaa_jfa", "lower_lip_to_upper_lip"]
  const G_F3 = weightedGroupScore(frontMeasurements, F3_KEY, F3_STD)

  // --- SIDE PROFILE GROUPS ---
  // Group S1: Profile Convexity & Structural Depth (35%)
  const S1_KEY = ["recession_frankfort", "total_facial_convexity"]
  const S1_STD = ["facial_convexity_nasion", "anterior_facial_depth", "facial_depth_to_height", "facial_convexity_glabella", "interior_midface_projection", "z_angle"]
  const G_S1 = weightedGroupScore(sideMeasurements, S1_KEY, S1_STD)

  // Group S2: Nasal Architecture & Forehead Slope (35%)
  const S2_KEY = ["nasal_projection", "nasolabial_angle"]
  const S2_STD = ["nasal_tip_angle", "nasal_width_to_height", "nasofrontal_angle", "upper_forehead_slope", "browridge_inclination", "nose_tip_rotation", "nasofacial_angle", "nasomental_angle", "frankfort_tip_angle"]
  const G_S2 = weightedGroupScore(sideMeasurements, S2_KEY, S2_STD)

  // Group S3: Mandibulofascial & Labial Contours (30%)
  const S3_KEY = ["gonial_angle", "lower_lip_e_line"]
  const S3_STD = ["upper_lip_s_line", "upper_lip_burstone", "holdaway_h_line", "mentolabial_angle", "upper_lip_e_line", "submental_cervical_angle", "orbital_vector", "lower_lip_s_line", "lower_lip_burstone", "mandibular_plane_angle", "ramus_to_mandible", "gonion_to_mouth"]
  const G_S3 = weightedGroupScore(sideMeasurements, S3_KEY, S3_STD)

  // --- CRITICAL FLAW PENALTY (scores < 3.5) ---
  const P_front = calculatePenalty(frontMeasurements)
  const P_side = calculatePenalty(sideMeasurements)

  // --- FINAL SCORES ---
  const rawFrontScore = (G_F1 * 0.40 + G_F2 * 0.30 + G_F3 * 0.30) - P_front
  const rawSideScore = (G_S1 * 0.35 + G_S2 * 0.35 + G_S3 * 0.30) - P_side
  const rawOverallScore = rawFrontScore * 0.60 + rawSideScore * 0.40

  const frontScore = clampScore(rawFrontScore)
  const sideScore = clampScore(rawSideScore)
  const harmonyScore = clampScore(rawFrontScore) // H_front = harmony score
  const overallScore = clampScore(rawOverallScore)

  // Category scores (old format for compatibility)
  const categoryScores: Record<string, number> = {}
  allMeasurements.forEach(m => {
    if (!categoryScores[m.category]) categoryScores[m.category] = 0
    categoryScores[m.category] += m.score
  })
  Object.keys(categoryScores).forEach(cat => {
    const count = allMeasurements.filter(m => m.category === cat).length
    categoryScores[cat] = Math.round((categoryScores[cat] / count) * 10) / 10
  })

  // Top strengths (highest scores)
  const sorted = [...allMeasurements].sort((a, b) => b.score - a.score)
  const topStrengths = sorted.slice(0, 3).map(m => m.name)
  const topWeaknesses = sorted.slice(-3).reverse().map(m => m.name)

  // Store group scores for external use
  const groupScores: Record<string, number> = {
    G_F1, G_F2, G_F3,
    G_S1, G_S2, G_S3,
    P_front, P_side,
  }

  return {
    gender,
    ethnicity,
    frontMeasurements,
    sideMeasurements,
    overallScore,
    frontScore,
    sideScore,
    harmonyScore,
    categoryScores,
    topStrengths,
    topWeaknesses,
  }
}

// ============================================================
// HIERARCHICAL SCORING HELPERS
// ============================================================

/** Calculate weighted group score: key metrics have weight 2.0, standard have 1.0 */
function weightedGroupScore(measurements: MeasurementResult[], keyIds: string[], stdIds: string[]): number {
  let weightedSum = 0
  let totalWeight = 0

  for (const id of keyIds) {
    const m = measurements.find(m => m.id === id)
    if (m) {
      weightedSum += m.score * 2.0
      totalWeight += 2.0
    }
  }
  for (const id of stdIds) {
    const m = measurements.find(m => m.id === id)
    if (m) {
      weightedSum += m.score * 1.0
      totalWeight += 1.0
    }
  }

  if (totalWeight === 0) return 0
  return Math.round((weightedSum / totalWeight) * 100) / 100
}

/** Critical flaw penalty: P = Min(cap, Sum over all (threshold - S_fail) * multiplier) */
function calculatePenalty(measurements: MeasurementResult[]): number {
  let penalty = 0
  for (const m of measurements) {
    if (m.score < PENALTY_THRESHOLD) {
      penalty += (PENALTY_THRESHOLD - m.score) * PENALTY_MULTIPLIER
    }
  }
  return Math.min(PENALTY_CAP, Math.round(penalty * 100) / 100)
}

/** Clamp score to [0, 10] and round to 2 decimals */
function clampScore(score: number): number {
  return Math.round(Math.max(0, Math.min(10, score)) * 100) / 100
}
