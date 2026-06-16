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
function angleBetweenLines(p1: LandmarkPoint, p2: LandmarkPoint, p3: LandmarkPoint, p4: LandmarkPoint): number {
  const v1 = { x: p2.x - p1.x, y: p2.y - p1.y }
  const v2 = { x: p4.x - p3.x, y: p4.y - p3.y }
  const dot = v1.x * v2.x + v1.y * v2.y
  const cross = v1.x * v2.y - v1.y * v2.x
  return Math.abs(Math.atan2(cross, dot)) * (180 / Math.PI)
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

function calculateHarmonyScore(value: number, idealMin: number, idealMax: number, ideal: number): number {
  const range = (idealMax - idealMin) / 2
  if (range === 0) return 10
  const deviation = Math.abs(value - ideal) / range
  const score = 10 * Math.exp(-0.5 * deviation * deviation)
  return Math.round(score * 10) / 10
}

function classifyDeviation(value: number, idealMin: number, idealMax: number, ideal: number): "low" | "ideal" | "high" {
  const range = (idealMax - idealMin) / 2
  if (range === 0) return "ideal"
  const deviation = Math.abs(value - ideal) / range
  if (deviation <= 1.0) return "ideal"
  if (value < ideal) return "low"
  return "high"
}

function createMeasurement(
  id: string, name: string, value: number, unit: "degrees" | "ratio" | "mm" | "percentage",
  category: string, description: string, idealMin: number, idealMax: number, ideal: number
): MeasurementResult {
  const score = calculateHarmonyScore(value, idealMin, idealMax, ideal)
  const deviation = classifyDeviation(value, idealMin, idealMax, ideal)
  const range = (idealMax - idealMin) / 2
  const devValue = range > 0 ? Math.abs(value - ideal) / range : 0

  let interpretation = ""
  if (devValue <= 1.0) {
    interpretation = `Your ${name.toLowerCase()} of ${value.toFixed(1)} ${unit} is within the ideal range (${idealMin}-${idealMax} ${unit}). This indicates good facial harmony.`
  } else if (devValue <= 2.0) {
    interpretation = `Your ${name.toLowerCase()} of ${value.toFixed(1)} ${unit} is slightly outside the ideal range (${idealMin}-${idealMax} ${unit}). This is acceptable but could be improved.`
  } else {
    interpretation = `Your ${name.toLowerCase()} of ${value.toFixed(1)} ${unit} is significantly outside the ideal range (${idealMin}-${idealMax} ${unit}). This may indicate facial disharmony.`
  }

  return {
    id, name, value: Math.round(value * 100) / 100,
    unit, score: Math.round(score * 10) / 10,
    idealRange: [idealMin, idealMax],
    description, category, isIdeal: devValue <= 1.0,
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
    results.push(createMeasurement(id, name, value, unit, category, description, ideal.min, ideal.max, ideal.ideal))
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
      addMeasurement("nose_bridge_to_width", "Nose Bridge to Nose Width Ratio", bridgeWidth / noseWidth, "ratio", "Nose",
        "Ratio of nose bridge width (34→35) to nose side width (4→5).")
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
    const a = angleBetweenLines(leftCheekbone, leftUpperJaw, leftLowerJaw, leftChin)
    jawSlopeSum += a
    jawSlopeCount++
  }
  if (rightCheekbone && rightUpperJaw && rightLowerJaw && rightChin) {
    const b = angleBetweenLines(rightCheekbone, rightUpperJaw, rightLowerJaw, rightChin)
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
      addMeasurement("interpupillary_mouth_width", "Interpupillary-Mouth Width Ratio", mouthWidth / pupilDist2, "ratio", "Proportions",
        "Ratio of mouth width to interpupillary distance.")
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
    if (totalWidth > 0) {
      addMeasurement("total_facial_width_to_height", "Total Facial Width to Height Ratio", totalHeight / totalWidth, "ratio", "Proportions",
        "Ratio of total facial height (hairline to chin) to bizygomatic width.")
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
  // avg length of (16,19) and (27,30) divided by length of (47,48)
  if (leftCheekbone && rightCheekbone) {
    let browLenSum = 0
    let browLenCount = 0
    if (leftBrowInner && leftBrowTail) {
      browLenSum += dist(leftBrowInner, leftBrowTail)  // full Euclidean distance (16,19)
      browLenCount++
    }
    if (rightBrowInner && rightBrowTail) {
      browLenSum += dist(rightBrowInner, rightBrowTail) // full Euclidean distance (27,30)
      browLenCount++
    }
    if (browLenCount > 0) {
      const avgBrowLen = browLenSum / browLenCount
      const faceWidth2 = dist(leftCheekbone, rightCheekbone) // (47,48)
      if (faceWidth2 > 0) {
        addMeasurement("brow_length_to_face_width", "Brow Length to Face Width Ratio", avgBrowLen / faceWidth2, "ratio", "Brows",
          "Ratio of average brow length (inner corner to tail) divided by bizygomatic face width.")
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
    results.push(createMeasurement(id, name, value, unit, category, description, ideal.min, ideal.max, ideal.ideal))
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
  if (rhinion && noseTip && subnasale) {
    const nta = angle(rhinion, noseTip, subnasale)
    addMeasurement("nasal_tip_angle", "Nasal Tip Angle", nta, "degrees", "Nose",
      "Angle at the nasal tip between rhinion and subnasale. Ideal is ~70-80°.")
  }

  // ---- 2. Nasal Width to Height Ratio ----
  if (subalare && subnasale && nasion) {
    const nw = dist(subalare, subnasale)
    const nh = dist(nasion, subnasale)
    if (nh > 0) {
      addMeasurement("nasal_width_to_height", "Nasal Width to Height Ratio", nw / nh, "ratio", "Nose",
        "Ratio of nasal width to nasal height from side view.")
    }
  }

  // ---- 3. Upper Lip S-Line Position ----
  if (upperLip && columella && chinPoint) {
    const sLineDist = signedDistanceToLine(upperLip, columella, chinPoint)
    addMeasurement("upper_lip_s_line", "Upper Lip S-Line Position", sLineDist, "mm", "Lips",
      "Upper lip position relative to Steiner's S-line (columella to chin). Negative = behind line, positive = ahead.")
  }

  // ---- 4. Nasal Projection ----
  if (noseTip && subnasale) {
    const proj = Math.abs(noseTip.x - subnasale.x)
    addMeasurement("nasal_projection", "Nasal Projection", proj, "mm", "Nose",
      "Horizontal projection of nose tip from the facial plane.")
  }

  // ---- 5. Nasofrontal Angle ----
  if (glabella && nasion && rhinion) {
    const nfa = angle(glabella, nasion, rhinion)
    addMeasurement("nasofrontal_angle", "Nasofrontal Angle", nfa, "degrees", "Nose",
      "Angle between glabella and rhinion at nasal bridge root. Ideal is ~115-135°.")
  }

  // ---- 6. Recession Relative to Frankfort Plane ----
  if (chinPoint && porion && orbitale) {
    const recession = signedDistanceToLine(chinPoint, porion, orbitale)
    addMeasurement("recession_frankfort", "Recession (Frankfort Plane)", recession, "mm", "Profile",
      "Chin position relative to Frankfort plane. Negative = recessed, positive = prominent.")
  }

  // ---- 7. Holdaway H-Line ----
  if (chinPoint && upperLip && lowerLip) {
    const hLineDist = distanceToLine(lowerLip, chinPoint, upperLip)
    addMeasurement("holdaway_h_line", "Holdaway H Line", hLineDist, "mm", "Profile",
      "Distance from lower lip to Holdaway H-line (chin to upper lip).")
  }

  // ---- 8. Mentolabial Angle ----
  if (lowerLip && labiomentalFold && chinPoint) {
    const mla = angle(lowerLip, labiomentalFold, chinPoint)
    addMeasurement("mentolabial_angle", "Mentolabial Angle", mla, "degrees", "Chin",
      "Angle between lower lip and chin at the labiomental fold. Ideal is ~100-130°.")
  }

  // ---- 9. Upper Forehead Slope ----
  if (hairline && forehead) {
    const slope = angleFromVertical(hairline, forehead)
    addMeasurement("upper_forehead_slope", "Upper Forehead Slope", slope, "degrees", "Forehead",
      "Angle of upper forehead relative to vertical. Steeper slopes indicate a more sloping forehead.")
  }

  // ---- 10. Facial Convexity (Nasion) ----
  if (glabella && subnasale && chinPoint) {
    const fcn = angle(glabella, subnasale, chinPoint)
    addMeasurement("facial_convexity_nasion", "Facial Convexity (Nasion)", fcn, "degrees", "Profile",
      "Facial convexity angle at subnasale between glabella and chin.")
  }

  // ---- 11. Anterior Facial Depth ----
  if (glabella && chinPoint) {
    const depth = dist(glabella, chinPoint)
    addMeasurement("anterior_facial_depth", "Anterior Facial Depth", depth, "mm", "Proportions",
      "Distance from glabella to chin point.")
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
  if (glabella && chinPoint && hairline && cervicalPoint) {
    const depth2 = dist(glabella, chinPoint)
    const height2 = dist(hairline, cervicalPoint)
    if (height2 > 0) {
      addMeasurement("facial_depth_to_height", "Facial Depth to Height Ratio", depth2 / height2, "ratio", "Proportions",
        "Ratio of facial depth (glabella to chin) to facial height (hairline to cervical point).")
    }
  }

  // ---- 15. Browridge Inclination Angle ----
  if (glabella && forehead) {
    const bia = slopeAngle(glabella, forehead)
    addMeasurement("browridge_inclination", "Browridge Inclination Angle", bia, "degrees", "Brows",
      "Angle of brow ridge inclination from horizontal.")
  }

  // ---- 16. Total Facial Convexity ----
  if (forehead && subnasale && chinPoint) {
    const tfc = angle(forehead, subnasale, chinPoint)
    addMeasurement("total_facial_convexity", "Total Facial Convexity", tfc, "degrees", "Profile",
      "Total facial convexity angle at subnasale between forehead and chin.")
  }

  // ---- 17. Facial Convexity (Glabella) ----
  if (glabella && upperLip && chinPoint) {
    const fcg = angle(glabella, upperLip, chinPoint)
    addMeasurement("facial_convexity_glabella", "Facial Convexity (Glabella)", fcg, "degrees", "Profile",
      "Facial convexity angle at upper lip between glabella and chin.")
  }

  // ---- 18. Orbital Vector ----
  if (cornealApex && cheekbone) {
    const ov = cornealApex.x - cheekbone.x
    addMeasurement("orbital_vector", "Orbital Vector", ov, "mm", "Eyes",
      "Horizontal projection of corneal apex relative to cheekbone.")
  }

  // ---- 19. Inferior Midface Projection Angle ----
  if (orbitale && subnasale && chinPoint) {
    const impa = angle(orbitale, subnasale, chinPoint)
    addMeasurement("interior_midface_projection", "Inferior Midface Projection Angle", impa, "degrees", "Midface",
      "Inferior midface projection angle at subnasale between orbitale and chin.")
  }

  // ---- 20. Z-Angle ----
  if (porion && orbitale && chinPoint && upperLip) {
    const zAngle = angleBetweenLines(porion, orbitale, chinPoint, upperLip)
    addMeasurement("z_angle", "Z Angle", zAngle, "degrees", "Profile",
      "Angle between Frankfort plane and chin-upper lip line.")
  }

  // ---- 21. Nose Tip Rotation Angle ----
  if (columella && noseTip) {
    const ntra = Math.abs(angleFromHorizontal(columella, noseTip))
    addMeasurement("nose_tip_rotation", "Nose Tip Rotation Angle", ntra, "degrees", "Nose",
      "Angle of columella axis from horizontal.")
  }

  // ---- 22. Nasolabial Angle ----
  if (columella && subnasale && upperLip) {
    const nla = angle(columella, subnasale, upperLip)
    addMeasurement("nasolabial_angle", "Nasolabial Angle", nla, "degrees", "Nose",
      "Angle between nose base and upper lip at subnasale. Ideal is ~90-110°.")
  }

  // ---- 23. Nasofacial Angle ----
  if (nasion && noseTip && glabella && chinPoint) {
    const nfa2 = angleBetweenLines(nasion, noseTip, glabella, chinPoint)
    addMeasurement("nasofacial_angle", "Nasofacial Angle", nfa2, "degrees", "Nose",
      "Angle between nasal dorsum and facial plane. Ideal is ~30-40°.")
  }

  // ---- 24. Nasomental Angle ----
  if (nasion && noseTip && chinPoint) {
    const nma = angle(nasion, noseTip, chinPoint)
    addMeasurement("nasomental_angle", "Nasomental Angle", nma, "degrees", "Profile",
      "Angle at nose tip between nasion and chin. Ideal is ~120-135°.")
  }

  // ---- 25. Frankfort-Tip Angle ----
  if (porion && orbitale && noseTip) {
    const fta = angleBetweenLines(porion, orbitale, orbitale, noseTip)
    addMeasurement("frankfort_tip_angle", "Frankfort-Tip Angle", fta, "degrees", "Nose",
      "Angle between Frankfort plane and orbitale-nose tip line. Ideal is ~105-125°.")
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
  if (tragus && lowerJawAngle && chinPoint) {
    const ga = angleBetweenLines(tragus, lowerJawAngle, lowerJawAngle, chinPoint)
    addMeasurement("gonial_angle", "Gonial Angle", ga, "degrees", "Jaw",
      "Angle between ramus (tragus to jaw angle) and mandible (jaw angle to chin). Ideal is ~115-135°.")
  }

  // ---- 30. Mandibular Plane Angle ----
  if (lowerJawAngle && chinPoint && porion && orbitale) {
    const mpa = angleBetweenLines(lowerJawAngle, chinPoint, porion, orbitale)
    addMeasurement("mandibular_plane_angle", "Mandibular Plane Angle", mpa, "degrees", "Jaw",
      "Angle between mandibular plane and Frankfort plane. Ideal is ~20-35°.")
  }

  // ---- 31. Ramus to Mandible Ratio ----
  if (tragus && lowerJawAngle && chinPoint) {
    const ramusH = dist(tragus, lowerJawAngle)
    const mandibleL = dist(lowerJawAngle, chinPoint)
    if (mandibleL > 0) {
      addMeasurement("ramus_to_mandible", "Ramus to Mandible Ratio", ramusH / mandibleL, "ratio", "Jaw",
        "Ratio of ramus height to mandibular body length. Ideal is ~0.55-0.75.")
    }
  }

  // ---- 32. Gonion to Mouth Line ----
  if (lowerJawAngle && mouthCorner) {
    const gmd = dist(lowerJawAngle, mouthCorner)
    addMeasurement("gonion_to_mouth", "Gonion to Mouth Line", gmd, "mm", "Jaw",
      "Distance from lower jaw angle (gonion) to mouth corner.")
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

  // Calculate scores
  const allMeasurements = [...frontMeasurements, ...sideMeasurements]
  const frontScore = frontMeasurements.length > 0
    ? Math.round((frontMeasurements.reduce((s, m) => s + m.score, 0) / frontMeasurements.length) * 10) / 10
    : 0
  const sideScore = sideMeasurements.length > 0
    ? Math.round((sideMeasurements.reduce((s, m) => s + m.score, 0) / sideMeasurements.length) * 10) / 10
    : 0
  const overallScore = allMeasurements.length > 0
    ? Math.round((allMeasurements.reduce((s, m) => s + m.score, 0) / allMeasurements.length) * 10) / 10
    : 0

  // Harmony score = weighted average of front and side
  const harmonyScore = Math.round(((frontScore + sideScore) / 2) * 10) / 10

  // Category scores
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