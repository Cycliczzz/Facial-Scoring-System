// ============================================================
// Facial Analysis Calculator
// Implements all 65 aesthetic indices with proper formulas
// Based on cephalometric and anthropometric research
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

function angleFromHorizontal(p1: LandmarkPoint, p2: LandmarkPoint): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI)
}

function slopeAngle(p1: LandmarkPoint, p2: LandmarkPoint): number {
  return Math.abs(Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI))
}

function distanceToLine(point: LandmarkPoint, lineStart: LandmarkPoint, lineEnd: LandmarkPoint): number {
  const A = lineEnd.y - lineStart.y
  const B = lineStart.x - lineEnd.x
  const C = lineEnd.x * lineStart.y - lineStart.x * lineEnd.y
  return Math.abs(A * point.x + B * point.y + C) / Math.sqrt(A * A + B * B)
}

// ============================================================
// Harmony Score Calculation (from LaTeX document)
// D_i = |Value_i - Ideal_i,E| / Range_i,E
// H_i = 10 × exp(-0.5 × D_i^2)
// Score is now on a 0-10 scale (previously 0-100)
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
  const ideals = FRONT_IDEALS[gender][ethnicity]

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

  // 1. Lateral Canthal Tilt: θ(F12, F13)
  const leftMedial = L("left_medial_canthus", "left_pupil")
  const leftLateral = L("left_lateral_canthus")
  if (leftMedial && leftLateral) {
    const tilt = angleFromHorizontal(leftMedial, leftLateral)
    addMeasurement("lateral_canthal_tilt", "Lateral Canthal Tilt", Math.abs(tilt), "degrees", "Eyes",
      "Angle of upward tilt from medial to lateral canthus")
  }

  // 2. Nose Bridge to Nose Width: d(F36, F37) / d(F4, F5)
  const leftBridge = L("left_nose_bridge")
  const rightBridge = L("right_nose_bridge")
  const leftNose = L("left_nose_side")
  const rightNose = L("right_nose_side")
  if (leftBridge && rightBridge && leftNose && rightNose) {
    const bridgeWidth = dist(leftBridge, rightBridge)
    const noseWidth = dist(leftNose, rightNose)
    if (noseWidth > 0) {
      addMeasurement("nose_bridge_to_width", "Nose Bridge to Nose Width", bridgeWidth / noseWidth, "ratio", "Nose",
        "Ratio of nose bridge width to total nose width")
    }
  }

  // 3. Bitemporal Width: d(F10, F11)
  const leftTemple = L("left_temple")
  const rightTemple = L("right_temple")
  const leftCheek = L("left_cheekbone")
  const rightCheek = L("right_cheekbone")
  if (leftTemple && rightTemple && leftCheek && rightCheek) {
    const bitemp = dist(leftTemple, rightTemple)
    const bizyg = dist(leftCheek, rightCheek)
    if (bizyg > 0) {
      addMeasurement("bitemporal_width", "Bitemporal Width", bitemp / bizyg, "ratio", "Head",
        "Ratio of bitemporal width to facial width")
    }
  }

  // 4. Neck Width: d(F49, F50)
  const leftNeck = L("left_neck_point")
  const rightNeck = L("right_neck_point")
  if (leftNeck && rightNeck && leftCheek && rightCheek) {
    const neckW = dist(leftNeck, rightNeck)
    const bizyg2 = dist(leftCheek, rightCheek)
    if (bizyg2 > 0) {
      addMeasurement("neck_width", "Neck Width", neckW / bizyg2, "ratio", "Neck",
        "Ratio of neck width to facial width")
    }
  }

  // 5. Ear Protrusion Angle
  const leftEar = L("left_outer_ear")
  if (leftEar && leftCheek) {
    const earAngle = Math.abs(angleFromHorizontal(leftCheek, leftEar))
    addMeasurement("ear_protrusion_angle", "Ear Protrusion Angle", earAngle, "degrees", "Ears",
      "Angle of ear protrusion from the head")
  }

  // 6. Cheekbone Height
  const hairline = L("hairline")
  const chinBottom = L("chin_bottom")
  if (leftCheek && hairline && chinBottom) {
    const faceH = Math.abs(hairline.y - chinBottom.y)
    if (faceH > 0) {
      const cheekH = Math.abs(hairline.y - leftCheek.y)
      addMeasurement("cheekbone_height", "Cheekbone Height", cheekH / faceH, "ratio", "Cheeks",
        "Ratio of cheekbone height to facial height")
    }
  }

  // 7. Cupid's Bow Depth: Vertical distance from F40 to F41
  const cupid = L("cupids_bow")
  const innerCupid = L("inner_cupids_bow")
  if (cupid && innerCupid) {
    const depth = Math.abs(cupid.y - innerCupid.y)
    addMeasurement("cupids_bow_depth", "Cupid's Bow Depth", depth, "mm", "Mouth",
      "Depth of Cupid's bow curvature")
  }

  // 8. Bigonial Width: d(F45, F46)
  const leftLowerJaw = L("left_lower_jaw_angle")
  const rightLowerJaw = L("right_lower_jaw_angle")
  if (leftLowerJaw && rightLowerJaw && leftCheek && rightCheek) {
    const bigonial = dist(leftLowerJaw, rightLowerJaw)
    const bizyg3 = dist(leftCheek, rightCheek)
    if (bizyg3 > 0) {
      addMeasurement("bigonial_width", "Bigonial Width", bigonial / bizyg3, "ratio", "Jaw",
        "Ratio of bigonial width to bizygomatic width")
    }
  }

  // 9. Jaw Slope: θ(F45, F47)
  const leftChin = L("left_chin")
  if (leftLowerJaw && leftChin) {
    const slope = slopeAngle(leftLowerJaw, leftChin)
    addMeasurement("jaw_slope", "Jaw Slope", slope, "degrees", "Jaw",
      "Angle of jaw line relative to horizontal")
  }

  // 10. Ear Protrusion Ratio
  const rightEar = L("right_outer_ear")
  if (leftEar && rightEar && leftCheek && rightCheek) {
    const earDist = dist(leftEar, rightEar)
    const cheekDist = dist(leftCheek, rightCheek)
    if (cheekDist > 0) {
      addMeasurement("ear_protrusion_ratio", "Ear Protrusion Ratio", earDist / cheekDist, "ratio", "Ears",
        "Ratio of ear protrusion to head length")
    }
  }

  // 11. Middle Third: d(y_F14, y_F35)
  const upperEyelid = L("left_upper_eyelid")
  const noseBottom = L("nose_bottom")
  if (upperEyelid && noseBottom && hairline && chinBottom) {
    const midThird = Math.abs(upperEyelid.y - noseBottom.y)
    const faceH2 = Math.abs(hairline.y - chinBottom.y)
    if (faceH2 > 0) {
      addMeasurement("middle_third", "Middle Third", midThird / faceH2, "ratio", "Proportions",
        "Ratio of middle facial third to total facial height")
    }
  }

  // 12. Eye Aspect Ratio: d(F14, F15) / d(F12, F13)
  const lowerEyelid = L("left_lower_eyelid")
  if (upperEyelid && lowerEyelid && leftMedial && leftLateral) {
    const eyeH = Math.abs(upperEyelid.y - lowerEyelid.y)
    const eyeW = dist(leftMedial, leftLateral)
    if (eyeW > 0) {
      addMeasurement("eye_aspect_ratio", "Eye Aspect Ratio", eyeH / eyeW, "ratio", "Eyes",
        "Ratio of eye height to eye width")
    }
  }

  // 13. Mouth Corner Position
  const leftMouth = L("left_mouth_corner")
  const rightMouth = L("right_mouth_corner")
  if (leftMouth && rightMouth && hairline && chinBottom) {
    const mouthY = (leftMouth.y + rightMouth.y) / 2
    const faceH3 = Math.abs(hairline.y - chinBottom.y)
    if (faceH3 > 0) {
      const mouthPos = Math.abs(hairline.y - mouthY) / faceH3
      addMeasurement("mouth_corner_position", "Mouth Corner Position", mouthPos, "ratio", "Mouth",
        "Vertical position of mouth corners")
    }
  }

  // 14. Eye Separation Ratio: d(F12, F23) / d(F12, F13)
  const rightMedial = L("right_medial_canthus", "right_pupil")
  if (leftMedial && rightMedial && leftLateral) {
    const intercanthal = dist(leftMedial, rightMedial)
    const eyeW2 = dist(leftMedial, leftLateral)
    if (eyeW2 > 0) {
      addMeasurement("eye_separation_ratio", "Eye Separation Ratio", intercanthal / eyeW2, "ratio", "Eyes",
        "Ratio of intercanthal distance to eye width")
    }
  }

  // 15. Eyebrow Tilt: θ(F17, F21)
  const browHead = L("left_brow_head")
  const browTail = L("left_brow_tail")
  if (browHead && browTail) {
    const tilt = angleFromHorizontal(browHead, browTail)
    addMeasurement("eyebrow_tilt", "Eyebrow Tilt", Math.abs(tilt), "degrees", "Brows",
      "Angle of eyebrow tilt from medial to lateral")
  }

  // 16. Lower Third: d(y_F35, y_F7)
  if (noseBottom && chinBottom && hairline) {
    const lowThird = Math.abs(noseBottom.y - chinBottom.y)
    const faceH4 = Math.abs(hairline.y - chinBottom.y)
    if (faceH4 > 0) {
      addMeasurement("lower_third", "Lower Third", lowThird / faceH4, "ratio", "Proportions",
        "Ratio of lower facial third to total facial height")
    }
  }

  // 17. Face Width to Height Ratio: d(F51, F52) / d(y_F17, y_F42)
  const mouthMid = L("mouth_middle")
  if (leftCheek && rightCheek && browHead && mouthMid) {
    const faceW = dist(leftCheek, rightCheek)
    const faceH5 = Math.abs(browHead.y - mouthMid.y)
    if (faceH5 > 0) {
      addMeasurement("face_width_to_height", "Face Width to Height Ratio", faceW / faceH5, "ratio", "Proportions",
        "Ratio of facial width to facial height")
    }
  }

  // 18. Interpupillary-Mouth Width Ratio: d(F2, F3) / d(F38, F39)
  const leftPupil = L("left_pupil")
  const rightPupil = L("right_pupil")
  if (leftPupil && rightPupil && leftMouth && rightMouth) {
    const ipd = dist(leftPupil, rightPupil)
    const mouthW = dist(leftMouth, rightMouth)
    if (mouthW > 0) {
      addMeasurement("interpupillary_mouth_width", "Interpupillary-Mouth Width Ratio", ipd / mouthW, "ratio", "Proportions",
        "Ratio of interpupillary distance to mouth width")
    }
  }

  // 19. Jaw Frontal Angle: ∠(F45, F47, F46)
  if (leftLowerJaw && leftChin && rightLowerJaw) {
    const jfa = angle(leftLowerJaw, leftChin, rightLowerJaw)
    addMeasurement("jaw_frontal_angle", "Jaw Frontal Angle", jfa, "degrees", "Jaw",
      "Angle of jaw at gonion in frontal view")
  }

  // 20. Intercanthal-Nasal Width Ratio: d(F12, F23) / d(F4, F5)
  if (leftMedial && rightMedial && leftNose && rightNose) {
    const icd = dist(leftMedial, rightMedial)
    const nw = dist(leftNose, rightNose)
    if (nw > 0) {
      addMeasurement("intercanthal_nasal_width", "Intercanthal-Nasal Width Ratio", icd / nw, "ratio", "Nose",
        "Ratio of intercanthal distance to nasal width")
    }
  }

  // 21. Top Third: d(y_F1, y_F14)
  if (hairline && upperEyelid && chinBottom) {
    const topThird = Math.abs(hairline.y - upperEyelid.y)
    const faceH6 = Math.abs(hairline.y - chinBottom.y)
    if (faceH6 > 0) {
      addMeasurement("top_third", "Top Third", topThird / faceH6, "ratio", "Proportions",
        "Ratio of upper facial third to total facial height")
    }
  }

  // 22. One Eye Apart Test
  if (leftPupil && rightPupil && leftMedial && leftLateral) {
    const ipd2 = dist(leftPupil, rightPupil)
    const eyeW3 = dist(leftMedial, leftLateral)
    if (eyeW3 > 0) {
      addMeasurement("one_eye_apart", "One Eye Apart Test", ipd2 / eyeW3, "ratio", "Eyes",
        "Ratio of interpupillary distance to one eye width")
    }
  }

  // 23. Midface Ratio: d(F12, F23) / d(y_F12, y_F42)
  if (leftMedial && rightMedial && mouthMid) {
    const mfW = dist(leftMedial, rightMedial)
    const mfH = Math.abs(leftMedial.y - mouthMid.y)
    if (mfH > 0) {
      addMeasurement("midface_ratio", "Midface Ratio", mfW / mfH, "ratio", "Proportions",
        "Ratio of midface width to midface height")
    }
  }

  // 24. Ipsilateral Alar Angle (IAA)
  if (leftNose && noseBottom && rightNose) {
    const iaa = angle(leftNose, noseBottom, rightNose)
    addMeasurement("ipsilateral_alar_angle", "Ipsilateral Alar Angle", iaa, "degrees", "Nose",
      "Angle of alar base on one side relative to midline")
  }

  // 25. Mouth width to nose width ratio: d(F38, F39) / d(F4, F5)
  if (leftMouth && rightMouth && leftNose && rightNose) {
    const mw = dist(leftMouth, rightMouth)
    const nw2 = dist(leftNose, rightNose)
    if (nw2 > 0) {
      addMeasurement("mouth_width_to_nose_width", "Mouth Width to Nose Width Ratio", mw / nw2, "ratio", "Mouth",
        "Ratio of mouth width to nose width")
    }
  }

  // 26. Total Facial Width to Height Ratio: d(F51, F52) / d(F1, F7)
  if (leftCheek && rightCheek && hairline && chinBottom) {
    const tfw = dist(leftCheek, rightCheek)
    const tfh = Math.abs(hairline.y - chinBottom.y)
    if (tfh > 0) {
      addMeasurement("total_facial_width_to_height", "Total Facial Width to Height Ratio", tfw / tfh, "ratio", "Proportions",
        "Ratio of total facial width to total facial height")
    }
  }

  // 27. Chin to Philtrum Ratio: d(y_F42, y_F7) / d(y_F35, y_F42)
  if (mouthMid && chinBottom && noseBottom) {
    const chinH = Math.abs(mouthMid.y - chinBottom.y)
    const philH = Math.abs(noseBottom.y - mouthMid.y)
    if (philH > 0) {
      addMeasurement("chin_to_philtrum", "Chin to Philtrum Ratio", chinH / philH, "ratio", "Chin",
        "Ratio of chin height to philtrum height")
    }
  }

  // 28. Eyebrow Low Setedness: Distance from F14 to F19
  const browArch = L("left_brow_arch", "left_brow_peak")
  if (upperEyelid && browArch && hairline && chinBottom) {
    const browEyeDist = Math.abs(upperEyelid.y - browArch.y)
    const faceH7 = Math.abs(hairline.y - chinBottom.y)
    if (faceH7 > 0) {
      addMeasurement("eyebrow_low_setedness", "Eyebrow Low Setedness", browEyeDist / faceH7, "ratio", "Brows",
        "Distance from brow to eye as ratio of facial height")
    }
  }

  // 29. Brow Length to Face Width Ratio: d(F17, F21) / d(F51, F52)
  if (browHead && browTail && leftCheek && rightCheek) {
    const browL = dist(browHead, browTail)
    const faceW2 = dist(leftCheek, rightCheek)
    if (faceW2 > 0) {
      addMeasurement("brow_length_to_face_width", "Brow Length to Face Width Ratio", browL / faceW2, "ratio", "Brows",
        "Ratio of brow length to facial width")
    }
  }

  // 30. Nose Tip Position
  if (noseBottom && hairline && chinBottom) {
    const nosePos = Math.abs(hairline.y - noseBottom.y) / Math.abs(hairline.y - chinBottom.y)
    addMeasurement("nose_tip_position", "Nose Tip Position", nosePos, "ratio", "Nose",
      "Vertical position of nose tip relative to face")
  }

  // 31. Deviation of IAA & JFA
  const iaaVal = results.find(r => r.id === "ipsilateral_alar_angle")
  const jfaVal = results.find(r => r.id === "jaw_frontal_angle")
  if (iaaVal && jfaVal) {
    const deviation = Math.abs(iaaVal.value - jfaVal.value)
    addMeasurement("deviation_iaa_jfa", "Deviation of IAA & JFA", deviation, "degrees", "Nose",
      "Deviation between ipsilateral alar angle and jaw frontal angle")
  }

  // 32. Lower Lip to Upper Lip Ratio
  const lowerLipCenter = L("lower_lip_center")
  if (lowerLipCenter && mouthMid) {
    const llh = Math.abs(lowerLipCenter.y - mouthMid.y)
    const ulh = Math.abs((L("upper_lip")?.y ?? mouthMid.y) - mouthMid.y)
    if (ulh > 0) {
      addMeasurement("lower_lip_to_upper_lip", "Lower Lip to Upper Lip Ratio", llh / ulh, "ratio", "Mouth",
        "Ratio of lower lip height to upper lip height")
    }
  }

  // 33. Lower Third Proportion
  if (noseBottom && chinBottom && hairline) {
    const lt = Math.abs(noseBottom.y - chinBottom.y)
    const fh = Math.abs(hairline.y - chinBottom.y)
    if (fh > 0) {
      addMeasurement("lower_third_proportion", "Lower Third Proportion", lt / fh, "ratio", "Proportions",
        "Proportion of lower third of face")
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
  const ideals = SIDE_IDEALS[gender][ethnicity]

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

  // 1. Nasal Tip Angle: ∠(S17, S3, S20)
  const rhinion = L("rhinion")
  const noseTip = L("nose_tip")
  const columella = L("columella")
  if (rhinion && noseTip && columella) {
    const nta = angle(rhinion, noseTip, columella)
    addMeasurement("nasal_tip_angle", "Nasal Tip Angle", nta, "degrees", "Nose",
      "Angle of the nasal tip")
  }

  // 2. Nasal Width to Height Ratio
  const subnasale = L("subnasale")
  const nasalBridge = L("nasal_bridge_root")
  if (subnasale && noseTip && nasalBridge) {
    const nasalH = dist(nasalBridge, subnasale)
    const nasalProj = dist(subnasale, noseTip)
    if (nasalH > 0) {
      addMeasurement("nasal_width_to_height", "Nasal Width to Height Ratio", nasalProj / nasalH, "ratio", "Nose",
        "Ratio of nasal width to nasal height")
    }
  }

  // 3. Upper Lip S-Line Position
  const upperLip = L("upper_lip")
  const chinPoint = L("chin_point")
  if (upperLip && noseTip && chinPoint) {
    const distToS = distanceToLine(upperLip, noseTip, chinPoint)
    addMeasurement("upper_lip_s_line", "Upper Lip S-Line Position", distToS, "mm", "Lips",
      "Upper lip position relative to S-line")
  }

  // 4. Nasal Projection
  if (subnasale && noseTip && nasalBridge) {
    const proj = dist(subnasale, noseTip)
    const nasalLen = dist(nasalBridge, noseTip)
    if (nasalLen > 0) {
      addMeasurement("nasal_projection", "Nasal Projection", proj / nasalLen, "ratio", "Nose",
        "Ratio of nasal projection to nasal length")
    }
  }

  // 5. Nasofrontal Angle: ∠(S14, S16, S3)
  const glabella = L("glabella")
  if (glabella && nasalBridge && noseTip) {
    const nfa = angle(glabella, nasalBridge, noseTip)
    addMeasurement("nasofrontal_angle", "Nasofrontal Angle", nfa, "degrees", "Nose",
      "Angle between forehead and nasal bridge")
  }

  // 6. Recession relative to Frankfort plane
  const porion = L("porion")
  const orbitale = L("orbitale")
  if (porion && orbitale && subnasale) {
    const recession = distanceToLine(subnasale, porion, orbitale)
    addMeasurement("recession_frankfort", "Recession (Frankfort Plane)", recession, "mm", "Profile",
      "Recession relative to Frankfort plane")
  }

  // 7. Holdaway H Line
  if (chinPoint && upperLip && glabella) {
    const hAngle = angle(chinPoint, upperLip, glabella)
    addMeasurement("holdaway_h_line", "Holdaway H Line", hAngle, "mm", "Profile",
      "Holdaway H-line measurement")
  }

  // 8. Mentolabial Angle: ∠(S25, S26, S27)
  const lowerLipPt = L("lower_lip")
  const labiomental = L("labiomental_fold")
  if (lowerLipPt && labiomental && chinPoint) {
    const mla = angle(lowerLipPt, labiomental, chinPoint)
    addMeasurement("mentolabial_angle", "Mentolabial Angle", mla, "degrees", "Chin",
      "Angle between lower lip and chin")
  }

  // 9. Upper Forehead Slope: θ(S13, S15)
  const hairlineProfile = L("hairline_profile")
  const forehead = L("forehead")
  if (hairlineProfile && forehead) {
    const slope = slopeAngle(hairlineProfile, forehead)
    addMeasurement("upper_forehead_slope", "Upper Forehead Slope", slope, "degrees", "Forehead",
      "Slope of upper forehead")
  }

  // 10. Facial Convexity (Nasion): ∠(S14, S16, S27)
  if (glabella && nasalBridge && chinPoint) {
    const fcn = angle(glabella, nasalBridge, chinPoint)
    addMeasurement("facial_convexity_nasion", "Facial Convexity (Nasion)", fcn, "degrees", "Profile",
      "Facial convexity angle at nasion")
  }

  // 11. Anterior Facial Depth: d(S31, S27)
  const lowerJaw = L("lower_jaw_angle")
  if (lowerJaw && chinPoint && nasalBridge && chinPoint) {
    const depth = dist(lowerJaw, chinPoint)
    const chinPt = L("chin_bottom") || chinPoint
    const faceH = Math.abs(nasalBridge.y - chinPt.y)
    if (faceH > 0) {
      addMeasurement("anterior_facial_depth", "Anterior Facial Depth", depth / faceH, "ratio", "Proportions",
        "Ratio of anterior facial depth to facial height")
    }
  }

  // 12. Upper Lip E-Line Position
  if (upperLip && noseTip && chinPoint) {
    const eLineDist = distanceToLine(upperLip, noseTip, chinPoint)
    addMeasurement("upper_lip_e_line", "Upper Lip E-Line Position", eLineDist, "mm", "Lips",
      "Upper lip position relative to E-line")
  }

  // 13. Submental Cervical Angle: ∠(S28, S29, S4)
  const chinBottomSide = L("chin_bottom")
  const cervical = L("cervical_point")
  const neckPoint = L("neck_point")
  if (chinBottomSide && cervical && neckPoint) {
    const sca = angle(chinBottomSide, cervical, neckPoint)
    addMeasurement("submental_cervical_angle", "Submental Cervical Angle", sca, "degrees", "Neck",
      "Angle between submental and cervical planes")
  }

  // 14. Facial Depth to Height Ratio
  if (lowerJaw && chinPoint && nasalBridge && chinBottomSide) {
    const depth2 = dist(lowerJaw, chinPoint)
    const height2 = Math.abs(nasalBridge.y - chinBottomSide.y)
    if (height2 > 0) {
      addMeasurement("facial_depth_to_height", "Facial Depth to Height Ratio", depth2 / height2, "ratio", "Proportions",
        "Ratio of facial depth to facial height")
    }
  }

  // 15. Browridge Inclination Angle: θ(S15, S14)
  if (forehead && glabella) {
    const bia = slopeAngle(forehead, glabella)
    addMeasurement("browridge_inclination", "Browridge Inclination Angle", bia, "degrees", "Brows",
      "Inclination angle of brow ridge")
  }

  // 16. Total Facial Convexity: ∠(S14, S3, S27)
  if (glabella && noseTip && chinPoint) {
    const tfc = angle(glabella, noseTip, chinPoint)
    addMeasurement("total_facial_convexity", "Total Facial Convexity", tfc, "degrees", "Profile",
      "Total facial convexity angle")
  }

  // 17. Facial Convexity (Glabella): ∠(S1, S14, S27)
  const topHead = L("top_of_head")
  if (topHead && glabella && chinPoint) {
    const fcg = angle(topHead, glabella, chinPoint)
    addMeasurement("facial_convexity_glabella", "Facial Convexity (Glabella)", fcg, "degrees", "Profile",
      "Facial convexity angle at glabella")
  }

  // 18. Orbital Vector
  const cornealApex = L("corneal_apex")
  const cheekboneSide = L("cheekbone")
  if (cornealApex && cheekboneSide) {
    const horizontalPoint: LandmarkPoint = { id: "temp", x: cheekboneSide.x + 100, y: cheekboneSide.y, label: "" }
    const ov = distanceToLine(cornealApex, cheekboneSide, horizontalPoint)
    addMeasurement("orbital_vector", "Orbital Vector", ov, "mm", "Eyes",
      "Orbital vector measurement")
  }

  // 19. Interior Midface Projection Angle
  if (subnasale && cheekboneSide) {
    const verticalPoint: LandmarkPoint = { id: "temp", x: cheekboneSide.x, y: subnasale.y, label: "" }
    const impa = angle(subnasale, cheekboneSide, verticalPoint)
    addMeasurement("interior_midface_projection", "Interior Midface Projection Angle", impa, "degrees", "Cheeks",
      "Angle of midface projection")
  }

  // 20. Lower Lip S-Line Position
  if (lowerLipPt && noseTip && chinPoint) {
    const distToS = distanceToLine(lowerLipPt, noseTip, chinPoint)
    addMeasurement("lower_lip_s_line", "Lower Lip S-Line Position", distToS, "mm", "Lips",
      "Lower lip position relative to S-line")
  }

  // 21. Lower Lip E-Line Position
  if (lowerLipPt && noseTip && chinPoint) {
    const eLineDist = distanceToLine(lowerLipPt, noseTip, chinPoint)
    addMeasurement("lower_lip_e_line", "Lower Lip E-Line Position", eLineDist, "mm", "Lips",
      "Lower lip position relative to E-line")
  }

  // 22. Nasal Bridge Angle: θ(S16, S17)
  if (nasalBridge && rhinion) {
    const nba = slopeAngle(nasalBridge, rhinion)
    addMeasurement("nasal_bridge_angle", "Nasal Bridge Angle", nba, "degrees", "Nose",
      "Angle of nasal bridge")
  }

  // 23. Nasal Tip Rotation: ∠(S20, S3, S21)
  if (columella && noseTip && subnasale) {
    const ntr = angle(columella, noseTip, subnasale)
    addMeasurement("nasal_tip_rotation", "Nasal Tip Rotation", ntr, "degrees", "Nose",
      "Rotation angle of nasal tip")
  }

  // 24. Lower Lip to Chin Ratio
  if (lowerLipPt && labiomental && chinPoint) {
    const llChin = dist(lowerLipPt, labiomental)
    const chinH = dist(labiomental, chinPoint)
    if (chinH > 0) {
      addMeasurement("lower_lip_to_chin", "Lower Lip to Chin Ratio", llChin / chinH, "ratio", "Chin",
        "Ratio of lower lip height to chin height")
    }
  }

  // 25. Nasal Depth to Height Ratio
  if (nasalBridge && noseTip && subnasale) {
    const nasalDepth = dist(nasalBridge, noseTip)
    const nasalHeight = dist(nasalBridge, subnasale)
    if (nasalHeight > 0) {
      addMeasurement("nasal_depth_to_height", "Nasal Depth to Height Ratio", nasalDepth / nasalHeight, "ratio", "Nose",
        "Ratio of nasal depth to nasal height")
    }
  }

  // 26. Upper Lip to Lower Lip Ratio
  if (upperLip && lowerLipPt) {
    const ulPos = Math.abs(upperLip.y - (L("mouth_corner")?.y ?? upperLip.y))
    const llPos = Math.abs(lowerLipPt.y - (L("mouth_corner")?.y ?? lowerLipPt.y))
    if (llPos > 0) {
      addMeasurement("upper_lip_to_lower_lip", "Upper Lip to Lower Lip Ratio", ulPos / llPos, "ratio", "Lips",
        "Ratio of upper lip height to lower lip height")
    }
  }

  // 27. Chin Angle: ∠(S26, S27, S28)
  if (labiomental && chinPoint && chinBottomSide) {
    const ca = angle(labiomental, chinPoint, chinBottomSide)
    addMeasurement("chin_angle", "Chin Angle", ca, "degrees", "Chin",
      "Angle of chin prominence")
  }

  // 28. Nasal Dorsum Angle: ∠(S16, S17, S3)
  if (nasalBridge && rhinion && noseTip) {
    const nda = angle(nasalBridge, rhinion, noseTip)
    addMeasurement("nasal_dorsum_angle", "Nasal Dorsum Angle", nda, "degrees", "Nose",
      "Angle of nasal dorsum")
  }

  // 29. Upper Lip Angle: ∠(S22, S21, S25)
  if (upperLip && subnasale && lowerLipPt) {
    const ula = angle(upperLip, subnasale, lowerLipPt)
    addMeasurement("upper_lip_angle", "Upper Lip Angle", ula, "degrees", "Lips",
      "Angle of upper lip relative to subnasale")
  }

  // 30. Lower Lip Angle: ∠(S21, S25, S26)
  if (subnasale && lowerLipPt && labiomental) {
    const lla = angle(subnasale, lowerLipPt, labiomental)
    addMeasurement("lower_lip_angle", "Lower Lip Angle", lla, "degrees", "Lips",
      "Angle of lower lip")
  }

  // 31. Nasal Base Angle: ∠(S21, S3, S20)
  if (subnasale && noseTip && columella) {
    const nba2 = angle(subnasale, noseTip, columella)
    addMeasurement("nasal_base_angle", "Nasal Base Angle", nba2, "degrees", "Nose",
      "Angle of nasal base")
  }

  // 32. Facial Taper Angle: ∠(S31, S27, S4)
  if (lowerJaw && chinPoint && neckPoint) {
    const fta = angle(lowerJaw, chinPoint, neckPoint)
    addMeasurement("facial_taper_angle", "Facial Taper Angle", fta, "degrees", "Profile",
      "Angle of facial taper from jaw to chin")
  }

  return results
}

// ============================================================
// Main Analysis Function
// ============================================================

export function calculateAnalysis(
  frontLandmarks: LandmarkPoint[],
  sideLandmarks: LandmarkPoint[],
  gender: Gender,
  ethnicity: Ethnicity
): AnalysisResults {
  // Convert arrays to lookup maps
  const frontMap: Record<string, LandmarkPoint> = {}
  frontLandmarks.forEach(lm => { frontMap[lm.id] = lm })

  const sideMap: Record<string, LandmarkPoint> = {}
  sideLandmarks.forEach(lm => { sideMap[lm.id] = lm })

  // Calculate measurements
  const frontMeasurements = calculateFrontMeasurements(frontMap, gender, ethnicity)
  const sideMeasurements = calculateSideMeasurements(sideMap, gender, ethnicity)

  // Calculate category scores (average of measurements in each category)
  const categories = ["Eyes", "Nose", "Mouth", "Jaw", "Chin", "Brows", "Cheeks", "Ears", "Neck", "Head", "Forehead", "Lips", "Proportions", "Profile"]
  const categoryScores: Record<string, number> = {}
  
  categories.forEach(cat => {
    const catMeasurements = [...frontMeasurements, ...sideMeasurements].filter(m => m.category === cat)
    if (catMeasurements.length > 0) {
      categoryScores[cat] = Math.round(catMeasurements.reduce((sum, m) => sum + m.score, 0) / catMeasurements.length * 10) / 10
    }
  })

  // Calculate overall scores
  const allScores = [...frontMeasurements, ...sideMeasurements].map(m => m.score)
  const overallScore = allScores.length > 0
    ? Math.round(allScores.reduce((sum, s) => sum + s, 0) / allScores.length * 10) / 10
    : 0

  const frontScores = frontMeasurements.map(m => m.score)
  const frontScore = frontScores.length > 0
    ? Math.round(frontScores.reduce((sum, s) => sum + s, 0) / frontScores.length * 10) / 10
    : 0

  const sideScores = sideMeasurements.map(m => m.score)
  const sideScore = sideScores.length > 0
    ? Math.round(sideScores.reduce((sum, s) => sum + s, 0) / sideScores.length * 10) / 10
    : 0

  // Harmony score is the overall average (already on 0-10 scale)
  const harmonyScore = overallScore

  // Determine top strengths and weaknesses
  const sortedByScore = [...frontMeasurements, ...sideMeasurements].sort((a, b) => b.score - a.score)
  const topStrengths = sortedByScore.slice(0, 3).map(m => m.name)
  const topWeaknesses = sortedByScore.slice(-3).reverse().map(m => m.name)

  return {
    gender,
    ethnicity,
    overallScore,
    frontScore,
    sideScore,
    harmonyScore,
    frontMeasurements,
    sideMeasurements,
    categoryScores,
    topStrengths,
    topWeaknesses,
  }
}
