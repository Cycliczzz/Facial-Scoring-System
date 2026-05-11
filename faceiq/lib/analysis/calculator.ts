// ============================================================
// Facial Analysis Calculator
// Implements all 65 aesthetic indices with proper formulas
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
//        left_cheekbone, right_cheekbone, left_temple, right_temple,
//        left_outer_ear, right_outer_ear, left_neck_point, right_neck_point
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
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y }
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y }
  const dot = v1.x * v2.x + v1.y * v2.y
  const cross = v1.x * v2.y - v1.y * v2.x
  return Math.abs(Math.atan2(cross, dot)) * (180 / Math.PI)
}

/** Angle of line p1→p2 from horizontal (in degrees) */
function angleFromHorizontal(p1: LandmarkPoint, p2: LandmarkPoint): number {
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
  const rightMedial = L("right_medial_canthus")
  const rightLateral = L("right_lateral_canthus")
  const rightUpperEyelid = L("right_upper_eyelid")
  const rightLowerEyelid = L("right_lower_eyelid")
  const leftBrowHead = L("left_brow_head")
  const leftBrowTail = L("left_brow_tail")
  const leftBrowArch = L("left_brow_arch", "left_brow_peak")
  const rightBrowHead = L("right_brow_head")
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
  const leftOuterEar = L("left_outer_ear")
  const rightOuterEar = L("right_outer_ear")
  const leftNeck = L("left_neck_point")
  const rightNeck = L("right_neck_point")

  // ---- 1. Lateral Canthal Tilt ----
  // Angle between medial→lateral canthus and horizontal
  // Formula: atan2(y_LC - y_MC, x_LC - x_MC), average both eyes
  let lctSum = 0
  let lctCount = 0
  if (leftMedial && leftLateral) {
    lctSum += Math.abs(angleFromHorizontal(leftMedial, leftLateral))
    lctCount++
  }
  if (rightMedial && rightLateral) {
    lctSum += Math.abs(angleFromHorizontal(rightMedial, rightLateral))
    lctCount++
  }
  if (lctCount > 0) {
    addMeasurement("lateral_canthal_tilt", "Lateral Canthal Tilt", lctSum / lctCount, "degrees", "Eyes",
      "Angle of upward tilt from medial to lateral canthus. Positive values indicate upward tilt (almond-shaped eyes).")
  }

  // ---- 2. Nose Bridge to Nose Width Ratio ----
  // Formula: D(Left Nose Bridge, Right Nose Bridge) / D(Left Nose Side, Right Nose Side)
  if (leftNoseBridge && rightNoseBridge && leftNoseSide && rightNoseSide) {
    const bridgeWidth = dist(leftNoseBridge, rightNoseBridge)
    const noseWidth = dist(leftNoseSide, rightNoseSide)
    if (noseWidth > 0) {
      addMeasurement("nose_bridge_to_width", "Nose Bridge to Nose Width", bridgeWidth / noseWidth, "ratio", "Nose",
        "Ratio of nose bridge width to total nose width. Lower values indicate a narrower bridge relative to nose width.")
    }
  }

  // ---- 3. Bitemporal Width ----
  // Formula: D(Left Temple, Right Temple) — absolute distance
  if (leftTemple && rightTemple) {
    const bitemp = dist(leftTemple, rightTemple)
    addMeasurement("bitemporal_width", "Bitemporal Width", bitemp, "mm", "Head",
      "Distance between left and right temples. Measures upper face width.")
  }

  // ---- 4. Neck Width ----
  // Formula: D(Left Neck Point, Right Neck Point) — absolute distance
  if (leftNeck && rightNeck) {
    const neckW = dist(leftNeck, rightNeck)
    addMeasurement("neck_width", "Neck Width", neckW, "mm", "Neck",
      "Distance between left and right neck points. Measures neck width.")
  }

  // ---- 5. Ear Protrusion Angle ----
  // Angle between (Temple→Ear) and vertical (0,1)
  // Average both ears
  let epaSum = 0
  let epaCount = 0
  if (leftTemple && leftOuterEar) {
    epaSum += angleFromVertical(leftTemple, leftOuterEar)
    epaCount++
  }
  if (rightTemple && rightOuterEar) {
    epaSum += angleFromVertical(rightTemple, rightOuterEar)
    epaCount++
  }
  if (epaCount > 0) {
    addMeasurement("ear_protrusion_angle", "Ear Protrusion Angle", epaSum / epaCount, "degrees", "Ears",
      "Angle of ear protrusion from the head relative to vertical. Measures how much the ears stick out.")
  }

  // ---- 6. Cheekbone Height ----
  // Formula: |y_Cheekbone - y_NasalBase| — vertical distance, average both sides
  let chSum = 0
  let chCount = 0
  if (leftCheekbone && nasalBase) {
    chSum += Math.abs(leftCheekbone.y - nasalBase.y)
    chCount++
  }
  if (rightCheekbone && nasalBase) {
    chSum += Math.abs(rightCheekbone.y - nasalBase.y)
    chCount++
  }
  if (chCount > 0) {
    addMeasurement("cheekbone_height", "Cheekbone Height", chSum / chCount, "mm", "Cheeks",
      "Vertical distance from cheekbone to nasal base. Higher values indicate higher cheekbones.")
  }

  // ---- 7. Cupid's Bow Depth ----
  // Formula: |y_CupidBow - y_MouthMiddle|
  if (cupidsBow && mouthMiddle) {
    const depth = Math.abs(cupidsBow.y - mouthMiddle.y)
    addMeasurement("cupids_bow_depth", "Cupid's Bow Depth", depth, "mm", "Mouth",
      "Depth of Cupid's bow curvature from mouth center. Measures the prominence of the upper lip's M-shape.")
  }

  // ---- 8. Bigonial Width ----
  // Formula: D(Left Lower Jaw Angle, Right Lower Jaw Angle) — absolute distance
  if (leftLowerJaw && rightLowerJaw) {
    const bigonial = dist(leftLowerJaw, rightLowerJaw)
    addMeasurement("bigonial_width", "Bigonial Width", bigonial, "mm", "Jaw",
      "Distance between left and right lower jaw angles. Measures lower jaw width.")
  }

  // ---- 9. Jaw Slope ----
  // Formula: atan2(y_Chin - y_Jaw, x_Chin - x_Jaw) from horizontal, average both sides
  let jsSum = 0
  let jsCount = 0
  if (leftLowerJaw && leftChin) {
    jsSum += slopeAngle(leftLowerJaw, leftChin)
    jsCount++
  }
  if (rightLowerJaw && rightChin) {
    jsSum += slopeAngle(rightLowerJaw, rightChin)
    jsCount++
  }
  if (jsCount > 0) {
    addMeasurement("jaw_slope", "Jaw Slope", jsSum / jsCount, "degrees", "Jaw",
      "Angle of jaw line relative to horizontal. Steeper angles indicate a more V-shaped jaw.")
  }

  // ---- 10. Ear Protrusion Ratio ----
  // Formula: (Temple→Ear Distance) / Bitemporal Width
  // Average both sides
  let epDistSum = 0
  let epDistCount = 0
  if (leftTemple && leftOuterEar) {
    epDistSum += dist(leftTemple, leftOuterEar)
    epDistCount++
  }
  if (rightTemple && rightOuterEar) {
    epDistSum += dist(rightTemple, rightOuterEar)
    epDistCount++
  }
  if (epDistCount > 0 && leftTemple && rightTemple) {
    const avgEarProtrusion = epDistSum / epDistCount
    const bitempW = dist(leftTemple, rightTemple)
    if (bitempW > 0) {
      addMeasurement("ear_protrusion_ratio", "Ear Protrusion Ratio", avgEarProtrusion / bitempW, "ratio", "Ears",
        "Ratio of ear protrusion distance to bitemporal width. Higher values indicate more prominent ears.")
    }
  }

  // ---- 11. Middle Third ----
  // Formula: |y_Hairline - y_NasalBase| — absolute distance
  if (hairline && nasalBase) {
    const midThird = Math.abs(hairline.y - nasalBase.y)
    addMeasurement("middle_third", "Middle Third", midThird, "mm", "Proportions",
      "Vertical distance from hairline to nasal base. Represents the middle third of the face.")
  }

  // ---- 12. Eye Aspect Ratio ----
  // Formula: Eye Width / Eye Height = D(Medial Canthus, Lateral Canthus) / D(Upper Eyelid, Lower Eyelid)
  // Average both eyes
  let earSum = 0
  let earCount = 0
  if (leftMedial && leftLateral && leftUpperEyelid && leftLowerEyelid) {
    const w = dist(leftMedial, leftLateral)
    const h = dist(leftUpperEyelid, leftLowerEyelid)
    if (h > 0) { earSum += w / h; earCount++ }
  }
  if (rightMedial && rightLateral && rightUpperEyelid && rightLowerEyelid) {
    const w = dist(rightMedial, rightLateral)
    const h = dist(rightUpperEyelid, rightLowerEyelid)
    if (h > 0) { earSum += w / h; earCount++ }
  }
  if (earCount > 0) {
    addMeasurement("eye_aspect_ratio", "Eye Aspect Ratio", earSum / earCount, "ratio", "Eyes",
      "Ratio of eye width to eye height. Higher values indicate wider, more horizontally-oriented eyes.")
  }

  // ---- 13. Mouth Corner Position ----
  // Formula: y_MouthCorner - y_MouthMiddle, average both sides
  let mcpSum = 0
  let mcpCount = 0
  if (leftMouthCorner && mouthMiddle) {
    mcpSum += leftMouthCorner.y - mouthMiddle.y
    mcpCount++
  }
  if (rightMouthCorner && mouthMiddle) {
    mcpSum += rightMouthCorner.y - mouthMiddle.y
    mcpCount++
  }
  if (mcpCount > 0) {
    addMeasurement("mouth_corner_position", "Mouth Corner Position", mcpSum / mcpCount, "mm", "Mouth",
      "Vertical offset of mouth corners from mouth center. Negative values indicate corners below center.")
  }

  // ---- 14. Eye Separation Ratio ----
  // Formula: D(Left Medial Canthus, Right Medial Canthus) / Eye Width
  if (leftMedial && rightMedial && leftLateral) {
    const intercanthal = dist(leftMedial, rightMedial)
    const eyeWidth = dist(leftMedial, leftLateral)
    if (eyeWidth > 0) {
      addMeasurement("eye_separation_ratio", "Eye Separation Ratio", intercanthal / eyeWidth, "ratio", "Eyes",
        "Ratio of intercanthal distance to eye width. Ideal is ~1.0 (one eye apart).")
    }
  }

  // ---- 15. Eyebrow Tilt ----
  // Formula: atan2(y_Tail - y_Head, x_Tail - x_Head) from horizontal
  // Average both sides
  let ebtSum = 0
  let ebtCount = 0
  if (leftBrowHead && leftBrowTail) {
    ebtSum += angleFromHorizontal(leftBrowHead, leftBrowTail)
    ebtCount++
  }
  if (rightBrowHead && rightBrowTail) {
    ebtSum += angleFromHorizontal(rightBrowHead, rightBrowTail)
    ebtCount++
  }
  if (ebtCount > 0) {
    addMeasurement("eyebrow_tilt", "Eyebrow Tilt", ebtSum / ebtCount, "degrees", "Brows",
      "Angle of eyebrow tilt from horizontal. Positive values indicate upward tilt (tail higher than head).")
  }

  // ---- 16. Lower Third ----
  // Formula: |y_NasalBase - y_ChinBottom| — absolute distance
  if (nasalBase && chinBottom) {
    const lowerThird = Math.abs(nasalBase.y - chinBottom.y)
    addMeasurement("lower_third", "Lower Third", lowerThird, "mm", "Proportions",
      "Vertical distance from nasal base to chin bottom. Represents the lower third of the face.")
  }

  // ---- 17. Face Width to Height Ratio ----
  // Formula: D(Left Cheekbone, Right Cheekbone) / D(Hairline, ChinBottom)
  if (leftCheekbone && rightCheekbone && hairline && chinBottom) {
    const fw = dist(leftCheekbone, rightCheekbone)
    const fh = dist(hairline, chinBottom)
    if (fh > 0) {
      addMeasurement("face_width_to_height", "Face Width to Height Ratio", fw / fh, "ratio", "Proportions",
        "Ratio of facial width (bizygomatic) to facial height (hairline to chin).")
    }
  }

  // ---- 18. Interpupillary-Mouth Width Ratio ----
  // Formula: D(Pupils) / D(Mouth Corners)
  if (leftPupil && rightPupil && leftMouthCorner && rightMouthCorner) {
    const ipd = dist(leftPupil, rightPupil)
    const mw = dist(leftMouthCorner, rightMouthCorner)
    if (mw > 0) {
      addMeasurement("interpupillary_mouth_width", "Interpupillary-Mouth Width Ratio", ipd / mw, "ratio", "Proportions",
        "Ratio of interpupillary distance to mouth width.")
    }
  }

  // ---- 19. Jaw Frontal Angle ----
  // Angle formed: Left Jaw Angle → Chin → Right Jaw Angle
  if (leftLowerJaw && rightLowerJaw && chinBottom) {
    const jfa = angle(leftLowerJaw, chinBottom, rightLowerJaw)
    addMeasurement("jaw_frontal_angle", "Jaw Frontal Angle", jfa, "degrees", "Jaw",
      "Angle formed at chin between left and right jaw angles. Wider angles indicate a broader jaw.")
  }

  // ---- 20. Intercanthal-Nasal Width Ratio ----
  // Formula: D(Medial Canthi) / D(Nose Sides)
  if (leftMedial && rightMedial && leftNoseSide && rightNoseSide) {
    const icw = dist(leftMedial, rightMedial)
    const nw = dist(leftNoseSide, rightNoseSide)
    if (nw > 0) {
      addMeasurement("intercanthal_nasal_width", "Intercanthal-Nasal Width Ratio", icw / nw, "ratio", "Proportions",
        "Ratio of intercanthal distance to nasal width.")
    }
  }

  // ---- 21. Top Third ----
  // Formula: |y_Hairline - y_Brows| where brows = midpoint of brow heads
  if (hairline && leftBrowHead && rightBrowHead) {
    const browMid = midpoint(leftBrowHead, rightBrowHead)
    const topThird = Math.abs(hairline.y - browMid.y)
    addMeasurement("top_third", "Top Third", topThird, "mm", "Proportions",
      "Vertical distance from hairline to brow midpoint. Represents the upper third of the face.")
  }

  // ---- 22. One Eye Apart Test ----
  // Formula: Intercanthal Width / Eye Width
  if (leftMedial && rightMedial && leftLateral) {
    const icw = dist(leftMedial, rightMedial)
    const ew = dist(leftMedial, leftLateral)
    if (ew > 0) {
      addMeasurement("one_eye_apart", "One Eye Apart Test", icw / ew, "ratio", "Proportions",
        "Ratio of intercanthal distance to eye width. Ideal is ~1.0 (one eye width between eyes).")
    }
  }

  // ---- 23. Midface Ratio ----
  // Formula: (Hairline→NasalBase) / (NasalBase→ChinBottom)
  if (hairline && nasalBase && chinBottom) {
    const upper = Math.abs(hairline.y - nasalBase.y)
    const lower = Math.abs(nasalBase.y - chinBottom.y)
    if (lower > 0) {
      addMeasurement("midface_ratio", "Midface Ratio", upper / lower, "ratio", "Proportions",
        "Ratio of upper face height (hairline to nasal base) to lower face height (nasal base to chin).")
    }
  }

  // ---- 24. Ipsilateral Alar Angle ----
  // Angle between (Nose Side → Mouth Corner) and vertical, compute left and right separately
  let iaaSum = 0
  let iaaCount = 0
  if (leftNoseSide && leftMouthCorner) {
    iaaSum += angleFromVertical(leftNoseSide, leftMouthCorner)
    iaaCount++
  }
  if (rightNoseSide && rightMouthCorner) {
    iaaSum += angleFromVertical(rightNoseSide, rightMouthCorner)
    iaaCount++
  }
  if (iaaCount > 0) {
    addMeasurement("ipsilateral_alar_angle", "Ipsilateral Alar Angle", iaaSum / iaaCount, "degrees", "Nose",
      "Angle between nose side to mouth corner line and vertical. Measures the slope of the nasolabial fold area.")
  }

  // ---- 25. Mouth Width to Nose Width Ratio ----
  // Formula: D(Mouth Corners) / D(Nose Sides)
  if (leftMouthCorner && rightMouthCorner && leftNoseSide && rightNoseSide) {
    const mw2 = dist(leftMouthCorner, rightMouthCorner)
    const nw2 = dist(leftNoseSide, rightNoseSide)
    if (nw2 > 0) {
      addMeasurement("mouth_width_to_nose_width", "Mouth Width to Nose Width Ratio", mw2 / nw2, "ratio", "Proportions",
        "Ratio of mouth width to nose width.")
    }
  }

  // ---- 26. Total Facial Width to Height Ratio ----
  // Formula: D(Left Outer Ear, Right Outer Ear) / D(Hairline, ChinBottom)
  if (leftOuterEar && rightOuterEar && hairline && chinBottom) {
    const earSpan = dist(leftOuterEar, rightOuterEar)
    const fh2 = dist(hairline, chinBottom)
    if (fh2 > 0) {
      addMeasurement("total_facial_width_to_height", "Total Facial Width to Height Ratio", earSpan / fh2, "ratio", "Proportions",
        "Ratio of total facial width (ear-to-ear span) to facial height.")
    }
  }

  // ---- 27. Chin to Philtrum Ratio ----
  // Formula: D(LowerLipCenter, ChinBottom) / D(Subnasale, CupidBow)
  if (lowerLipCenter && chinBottom && nasalBase && cupidsBow) {
    const chinH = dist(lowerLipCenter, chinBottom)
    const philtrum = dist(nasalBase, cupidsBow)
    if (philtrum > 0) {
      addMeasurement("chin_to_philtrum", "Chin to Philtrum Ratio", chinH / philtrum, "ratio", "Proportions",
        "Ratio of chin height (lower lip to chin bottom) to philtrum length (nasal base to Cupid's bow).")
    }
  }

  // ---- 28. Eyebrow Low Setedness ----
  // Formula: |y_Brows - y_Eyes| — absolute distance
  if (leftBrowArch && leftUpperEyelid) {
    const blDist = Math.abs(leftBrowArch.y - leftUpperEyelid.y)
    addMeasurement("eyebrow_low_setedness", "Eyebrow Low Setedness", blDist, "mm", "Brows",
      "Vertical distance from brow arch to upper eyelid. Smaller values indicate lower-set brows.")
  }

  // ---- 29. Brow Length to Face Width Ratio ----
  // Formula: D(BrowHead, BrowTail) / FaceWidth
  if (leftBrowHead && leftBrowTail && leftCheekbone && rightCheekbone) {
    const browLen = dist(leftBrowHead, leftBrowTail)
    const faceW = dist(leftCheekbone, rightCheekbone)
    if (faceW > 0) {
      addMeasurement("brow_length_to_face_width", "Brow Length to Face Width Ratio", browLen / faceW, "ratio", "Brows",
        "Ratio of eyebrow length to facial width.")
    }
  }

  // ---- 30. Nose Tip Position ----
  // Formula: x_NoseTip - x_FacePlane (horizontal protrusion)
  // Face plane approximated by midpoint of cheekbones
  if (noseBottom && leftCheekbone && rightCheekbone) {
    const facePlaneX = (leftCheekbone.x + rightCheekbone.x) / 2
    const protrusion = noseBottom.x - facePlaneX
    addMeasurement("nose_tip_position", "Nose Tip Position", protrusion, "mm", "Nose",
      "Horizontal protrusion of nose tip from the facial plane. Positive values indicate a more projected nose.")
  }

  // ---- 31. Deviation of IAA & JFA ----
  // Formula: |IAA - JFA|
  // IAA = ipsilateral alar angle, JFA = jaw frontal angle
  let iaaVal = 0
  let iaaCount2 = 0
  if (leftNoseSide && leftMouthCorner) {
    iaaVal += angleFromVertical(leftNoseSide, leftMouthCorner)
    iaaCount2++
  }
  if (rightNoseSide && rightMouthCorner) {
    iaaVal += angleFromVertical(rightNoseSide, rightMouthCorner)
    iaaCount2++
  }
  const avgIAA = iaaCount2 > 0 ? iaaVal / iaaCount2 : 0
  if (leftLowerJaw && rightLowerJaw && chinBottom) {
    const jfaVal = angle(leftLowerJaw, chinBottom, rightLowerJaw)
    const deviation = Math.abs(avgIAA - jfaVal)
    addMeasurement("deviation_iaa_jfa", "Deviation of IAA & JFA", deviation, "degrees", "Proportions",
      "Absolute difference between Ipsilateral Alar Angle and Jaw Frontal Angle. Lower values indicate better facial symmetry.")
  }

  // ---- 32. Lower Lip to Upper Lip Ratio ----
  // Formula: LowerLipThickness / UpperLipThickness (vertical thicknesses)
  if (lowerLipCenter && mouthMiddle && cupidsBow) {
    const upperLipThick = Math.abs(cupidsBow.y - mouthMiddle.y)
    const lowerLipThick = Math.abs(mouthMiddle.y - lowerLipCenter.y)
    if (upperLipThick > 0) {
      addMeasurement("lower_lip_to_upper_lip", "Lower Lip to Upper Lip Ratio", lowerLipThick / upperLipThick, "ratio", "Mouth",
        "Ratio of lower lip thickness to upper lip thickness.")
    }
  }

  // ---- 33. Lower Third Proportion ----
  // Formula: (Subnasale→UpperLip) / (Subnasale→ChinBottom)
  if (nasalBase && mouthMiddle && chinBottom) {
    const upperLipH = Math.abs(nasalBase.y - mouthMiddle.y)
    const lowerFaceH = Math.abs(nasalBase.y - chinBottom.y)
    if (lowerFaceH > 0) {
      addMeasurement("lower_third_proportion", "Lower Third Proportion", upperLipH / lowerFaceH, "ratio", "Proportions",
        "Proportion of upper lip height to lower face height. Classical proportion is ~1/3.")
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
  // Angle at nose tip between rhinion and subnasale
  // Formula: ∠(rhinion, nose_tip, subnasale)
  if (rhinion && noseTip && subnasale) {
    const nta = angle(rhinion, noseTip, subnasale)
    addMeasurement("nasal_tip_angle", "Nasal Tip Angle", nta, "degrees", "Nose",
      "Angle at the nasal tip between rhinion and subnasale. Ideal is ~70-80°.")
  }

  // ---- 2. Nasal Width to Height Ratio ----
  // Formula: D(Subalare, Subnasale) / D(NasalBridgeRoot, Subnasale)
  if (subalare && subnasale && nasion) {
    const nw = dist(subalare, subnasale)
    const nh = dist(nasion, subnasale)
    if (nh > 0) {
      addMeasurement("nasal_width_to_height", "Nasal Width to Height Ratio", nw / nh, "ratio", "Nose",
        "Ratio of nasal width to nasal height from side view.")
    }
  }

  // ---- 3. Upper Lip S-Line Position ----
  // Distance from upper lip to Steiner's S-line (columella to chin point)
  // Formula: signed distance from upper_lip to line(columella, chin_point)
  if (upperLip && columella && chinPoint) {
    const sLineDist = signedDistanceToLine(upperLip, columella, chinPoint)
    addMeasurement("upper_lip_s_line", "Upper Lip S-Line Position", sLineDist, "mm", "Lips",
      "Upper lip position relative to Steiner's S-line (columella to chin). Negative = behind line, positive = ahead.")
  }

  // ---- 4. Nasal Projection ----
  // Formula: |x_NoseTip - x_FacePlane| (horizontal distance)
  // Face plane approximated by vertical line through subnasale
  if (noseTip && subnasale) {
    const proj = Math.abs(noseTip.x - subnasale.x)
    addMeasurement("nasal_projection", "Nasal Projection", proj, "mm", "Nose",
      "Horizontal projection of nose tip from the facial plane. Measures how far the nose protrudes.")
  }

  // ---- 5. Nasofrontal Angle ----
  // Angle at nasal bridge root between glabella and rhinion
  // Formula: ∠(glabella, nasal_bridge_root, rhinion)
  if (glabella && nasion && rhinion) {
    const nfa = angle(glabella, nasion, rhinion)
    addMeasurement("nasofrontal_angle", "Nasofrontal Angle", nfa, "degrees", "Nose",
      "Angle between glabella and rhinion at nasal bridge root. Ideal is ~115-135°.")
  }

  // ---- 6. Recession Relative to Frankfort Plane ----
  // Chin setback from perpendicular to Frankfort plane (porion→orbitale)
  // Formula: signed distance from chin_point to line(porion, orbitale)
  if (chinPoint && porion && orbitale) {
    const recession = signedDistanceToLine(chinPoint, porion, orbitale)
    addMeasurement("recession_frankfort", "Recession (Frankfort Plane)", recession, "mm", "Profile",
      "Chin position relative to Frankfort plane. Negative = recessed, positive = prominent.")
  }

  // ---- 7. Holdaway H-Line ----
  // Line from soft tissue chin to upper lip, measure lower lip protrusion
  // Formula: distance from lower_lip to line(chin_point, upper_lip)
  if (chinPoint && upperLip && lowerLip) {
    const hLineDist = distanceToLine(lowerLip, chinPoint, upperLip)
    addMeasurement("holdaway_h_line", "Holdaway H Line", hLineDist, "mm", "Profile",
      "Distance from lower lip to Holdaway H-line (chin to upper lip).")
  }

  // ---- 8. Mentolabial Angle ----
  // Angle at labiomental fold between lower lip and chin
  // Formula: ∠(lower_lip, labiomental_fold, chin_point)
  if (lowerLip && labiomentalFold && chinPoint) {
    const mla = angle(lowerLip, labiomentalFold, chinPoint)
    addMeasurement("mentolabial_angle", "Mentolabial Angle", mla, "degrees", "Chin",
      "Angle between lower lip and chin at the labiomental fold. Ideal is ~100-130°.")
  }

  // ---- 9. Upper Forehead Slope ----
  // Angle between hairline→forehead and vertical reference
  // Formula: angleFromVertical(hairline, forehead)
  if (hairline && forehead) {
    const slope = angleFromVertical(hairline, forehead)
    addMeasurement("upper_forehead_slope", "Upper Forehead Slope", slope, "degrees", "Forehead",
      "Angle of upper forehead relative to vertical. Steeper slopes indicate a more sloping forehead.")
  }

  // ---- 10. Facial Convexity (Nasion) ----
  // Angle at subnasale between glabella and chin
  // Formula: ∠(glabella, subnasale, chin_point)
  if (glabella && subnasale && chinPoint) {
    const fcn = angle(glabella, subnasale, chinPoint)
    addMeasurement("facial_convexity_nasion", "Facial Convexity (Nasion)", fcn, "degrees", "Profile",
      "Facial convexity angle at subnasale between glabella and chin. Lower values indicate a more convex profile.")
  }

  // ---- 11. Anterior Facial Depth ----
  // Formula: D(Glabella, ChinPoint) — absolute distance
  if (glabella && chinPoint) {
    const depth = dist(glabella, chinPoint)
    addMeasurement("anterior_facial_depth", "Anterior Facial Depth", depth, "mm", "Proportions",
      "Distance from glabella to chin point. Measures anterior facial depth.")
  }

  // ---- 12. Upper Lip E-Line Position ----
  // Distance from upper lip to Ricketts' E-line (nose tip to chin point)
  // Formula: signed distance from upper_lip to line(nose_tip, chin_point)
  if (upperLip && noseTip && chinPoint) {
    const eLineDist = signedDistanceToLine(upperLip, noseTip, chinPoint)
    addMeasurement("upper_lip_e_line", "Upper Lip E-Line Position", eLineDist, "mm", "Lips",
      "Upper lip position relative to Ricketts' E-line (nose tip to chin). Negative = behind line, positive = ahead.")
  }

  // ---- 13. Submental Cervical Angle ----
  // Angle at cervical point between chin bottom and neck point
  // Formula: ∠(chin_bottom, cervical_point, neck_point)
  if (chinBottom && cervicalPoint && neckPoint) {
    const sca = angle(chinBottom, cervicalPoint, neckPoint)
    addMeasurement("submental_cervical_angle", "Submental Cervical Angle", sca, "degrees", "Neck",
      "Angle at cervical point between chin bottom and neck point. Ideal is ~80-100°.")
  }

  // ---- 14. Facial Depth to Height Ratio ----
  // Formula: D(Glabella, Chin) / D(Hairline, CervicalPoint)
  if (glabella && chinPoint && hairline && cervicalPoint) {
    const depth2 = dist(glabella, chinPoint)
    const height2 = dist(hairline, cervicalPoint)
    if (height2 > 0) {
      addMeasurement("facial_depth_to_height", "Facial Depth to Height Ratio", depth2 / height2, "ratio", "Proportions",
        "Ratio of facial depth (glabella to chin) to facial height (hairline to cervical point).")
    }
  }

  // ---- 15. Browridge Inclination Angle ----
  // Angle between glabella→forehead line and horizontal
  // Formula: angleFromHorizontal(glabella, forehead)
  if (glabella && forehead) {
    const bia = slopeAngle(glabella, forehead)
    addMeasurement("browridge_inclination", "Browridge Inclination Angle", bia, "degrees", "Brows",
      "Angle of brow ridge inclination from horizontal. Measures the prominence of the brow ridge.")
  }

  // ---- 16. Total Facial Convexity ----
  // Angle at subnasale between forehead and chin
  // Formula: ∠(forehead, subnasale, chin_point)
  if (forehead && subnasale && chinPoint) {
    const tfc = angle(forehead, subnasale, chinPoint)
    addMeasurement("total_facial_convexity", "Total Facial Convexity", tfc, "degrees", "Profile",
      "Total facial convexity angle at subnasale between forehead and chin. Lower values indicate a more convex profile.")
  }

  // ---- 17. Facial Convexity (Glabella) ----
  // Angle at upper lip between glabella and chin
  // Formula: ∠(glabella, upper_lip, chin_point)
  if (glabella && upperLip && chinPoint) {
    const fcg = angle(glabella, upperLip, chinPoint)
    addMeasurement("facial_convexity_glabella", "Facial Convexity (Glabella)", fcg, "degrees", "Profile",
      "Facial convexity angle at upper lip between glabella and chin.")
  }

  // ---- 18. Orbital Vector ----
  // Formula: x_CornealApex - x_Cheekbone (horizontal difference)
  if (cornealApex && cheekbone) {
    const ov = cornealApex.x - cheekbone.x
    addMeasurement("orbital_vector", "Orbital Vector", ov, "mm", "Eyes",
      "Horizontal projection of corneal apex relative to cheekbone. Positive = cornea ahead of cheekbone (positive vector).")
  }

  // ---- 19. Inferior Midface Projection Angle ----
  // Angle at subnasale between orbitale and chin
  // Formula: ∠(orbitale, subnasale, chin_point)
  if (orbitale && subnasale && chinPoint) {
    const impa = angle(orbitale, subnasale, chinPoint)
    addMeasurement("interior_midface_projection", "Inferior Midface Projection Angle", impa, "degrees", "Midface",
      "Inferior midface projection angle at subnasale between orbitale and chin.")
  }

  // ---- 20. Z-Angle ----
  // Angle between Frankfort plane (porion→orbitale) and chin→upper lip line
  // Formula: angleBetweenLines(porion, orbitale, chin_point, upper_lip)
  if (porion && orbitale && chinPoint && upperLip) {
    const zAngle = angleBetweenLines(porion, orbitale, chinPoint, upperLip)
    addMeasurement("z_angle", "Z Angle", zAngle, "degrees", "Profile",
      "Angle between Frankfort plane and chin-upper lip line. Measures soft tissue profile convexity.")
  }

  // ---- 21. Nose Tip Rotation Angle ----
  // Angle of columella axis from horizontal
  // Formula: angleFromHorizontal(columella, nose_tip)
  if (columella && noseTip) {
    const ntra = Math.abs(angleFromHorizontal(columella, noseTip))
    addMeasurement("nose_tip_rotation", "Nose Tip Rotation Angle", ntra, "degrees", "Nose",
      "Angle of columella axis from horizontal. Measures the upward rotation of the nasal tip.")
  }

  // ---- 22. Nasolabial Angle ----
  // Angle at subnasale between columella and upper lip
  // Formula: ∠(columella, subnasale, upper_lip)
  if (columella && subnasale && upperLip) {
    const nla = angle(columella, subnasale, upperLip)
    addMeasurement("nasolabial_angle", "Nasolabial Angle", nla, "degrees", "Nose",
      "Angle between nose base and upper lip at subnasale. Ideal is ~90-110°.")
  }

  // ---- 23. Nasofacial Angle ----
  // Angle between nasal dorsum (nasion→nose_tip) and facial plane (glabella→chin)
  // Formula: angleBetweenLines(nasion, nose_tip, glabella, chin_point)
  if (nasion && noseTip && glabella && chinPoint) {
    const nfa2 = angleBetweenLines(nasion, noseTip, glabella, chinPoint)
    addMeasurement("nasofacial_angle", "Nasofacial Angle", nfa2, "degrees", "Nose",
      "Angle between nasal dorsum and facial plane. Ideal is ~30-40°.")
  }

  // ---- 24. Nasomental Angle ----
  // Angle at nose tip between nasion and chin
  // Formula: ∠(nasion, nose_tip, chin_point)
  if (nasion && noseTip && chinPoint) {
    const nma = angle(nasion, noseTip, chinPoint)
    addMeasurement("nasomental_angle", "Nasomental Angle", nma, "degrees", "Profile",
      "Angle at nose tip between nasion and chin. Ideal is ~120-135°.")
  }

  // ---- 25. Frankfort-Tip Angle ----
  // Angle between Frankfort plane (porion→orbitale) and orbitale→nose_tip line
  // Formula: angleBetweenLines(porion, orbitale, orbitale, nose_tip)
  if (porion && orbitale && noseTip) {
    const fta = angleBetweenLines(porion, orbitale, orbitale, noseTip)
    addMeasurement("frankfort_tip_angle", "Frankfort-Tip Angle", fta, "degrees", "Nose",
      "Angle between Frankfort plane and orbitale-nose tip line. Ideal is ~105-125°.")
  }

  // ---- 26. Lower Lip S-Line Position ----
  // Distance from lower lip to Steiner's S-line (columella to chin point)
  // Formula: signed distance from lower_lip to line(columella, chin_point)
  if (lowerLip && columella && chinPoint) {
    const sLineDist2 = signedDistanceToLine(lowerLip, columella, chinPoint)
    addMeasurement("lower_lip_s_line", "Lower Lip S-Line Position", sLineDist2, "mm", "Lips",
      "Lower lip position relative to Steiner's S-line (columella to chin).")
  }

  // ---- 27. Lower Lip E-Line Position ----
  // Distance from lower lip to Ricketts' E-line (nose tip to chin point)
  // Formula: signed distance from lower_lip to line(nose_tip, chin_point)
  if (lowerLip && noseTip && chinPoint) {
    const eLineDist2 = signedDistanceToLine(lowerLip, noseTip, chinPoint)
    addMeasurement("lower_lip_e_line", "Lower Lip E-Line Position", eLineDist2, "mm", "Lips",
      "Lower lip position relative to Ricketts' E-line (nose tip to chin).")
  }

  // ---- 28. Lower Lip Burstone Line ----
  // Distance from lower lip to subnasale→chin line
  // Formula: signed distance from lower_lip to line(subnasale, chin_point)
  if (lowerLip && subnasale && chinPoint) {
    const burstoneDist = signedDistanceToLine(lowerLip, subnasale, chinPoint)
    addMeasurement("lower_lip_burstone", "Lower Lip Burstone Line", burstoneDist, "mm", "Lips",
      "Lower lip position relative to Burstone line (subnasale to chin point).")
  }

  // ---- 29. Gonial Angle ----
  // Angle between ramus (tragus→lower_jaw_angle) and mandible (lower_jaw_angle→chin_point)
  // Formula: angleBetweenLines(tragus, lower_jaw_angle, lower_jaw_angle, chin_point)
  if (tragus && lowerJawAngle && chinPoint) {
    const ga = angleBetweenLines(tragus, lowerJawAngle, lowerJawAngle, chinPoint)
    addMeasurement("gonial_angle", "Gonial Angle", ga, "degrees", "Jaw",
      "Angle between ramus (tragus to jaw angle) and mandible (jaw angle to chin). Ideal is ~115-135°.")
  }

  // ---- 30. Mandibular Plane Angle ----
  // Angle between mandibular plane (lower_jaw_angle→chin_point) and Frankfort plane (porion→orbitale)
  // Formula: angleBetweenLines(lower_jaw_angle, chin_point, porion, orbitale)
  if (lowerJawAngle && chinPoint && porion && orbitale) {
    const mpa = angleBetweenLines(lowerJawAngle, chinPoint, porion, orbitale)
    addMeasurement("mandibular_plane_angle", "Mandibular Plane Angle", mpa, "degrees", "Jaw",
      "Angle between mandibular plane and Frankfort plane. Ideal is ~20-35°.")
  }

  // ---- 31. Ramus to Mandible Ratio ----
  // Formula: D(Tragus, LowerJawAngle) / D(LowerJawAngle, ChinPoint)
  if (tragus && lowerJawAngle && chinPoint) {
    const ramusH = dist(tragus, lowerJawAngle)
    const mandibleL = dist(lowerJawAngle, chinPoint)
    if (mandibleL > 0) {
      addMeasurement("ramus_to_mandible", "Ramus to Mandible Ratio", ramusH / mandibleL, "ratio", "Jaw",
        "Ratio of ramus height (tragus to jaw angle) to mandibular body length (jaw angle to chin). Ideal is ~0.55-0.75.")
    }
  }

  // ---- 32. Gonion to Mouth Line ----
  // Formula: D(LowerJawAngle, MouthCorner) — absolute distance
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
  ethnicity: Ethnicity
): AnalysisResults {
  // Scale landmarks from 0-1 ratio to pixel coordinates (1000px reference)
  // This ensures distance-based measurements ("mm") produce meaningful values
  const SCALE = 1000
  const scaleLm = (lm: LandmarkPoint): LandmarkPoint => ({
    ...lm,
    x: lm.x * SCALE,
    y: lm.y * SCALE,
  })
  const frontLm = frontLandmarks.reduce((acc, l) => { const s = scaleLm(l); acc[s.id] = s; return acc }, {} as Record<string, LandmarkPoint>)
  const sideLm = sideLandmarks.reduce((acc, l) => { const s = scaleLm(l); acc[s.id] = s; return acc }, {} as Record<string, LandmarkPoint>)

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
