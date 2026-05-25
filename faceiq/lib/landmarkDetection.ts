// ============================================================
// MediaPipe Face Landmark Detection v2
// 
// Uses GEOMETRIC EXTREMUM approach instead of fixed indices:
// - Finds min/max X, Y coordinates from MediaPipe face mesh
// - Uses contour analysis for jaw angles, cheekbones, etc.
// - Falls back to smart interpolation when points aren't directly available
//
// MediaPipe Face Mesh: 478 landmarks
// Key contour groups:
//   Face oval: indices 0-16 (clockwise from right jaw)
//   Left eye contour: 33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246
//   Right eye contour: 362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398
//   Left eyebrow: 46, 53, 52, 65, 55 (upper), 70, 63, 105, 66, 107 (lower)
//   Right eyebrow: 276, 283, 282, 295, 285 (upper), 300, 293, 334, 296, 336 (lower)
//   Lips outer: 61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185
//   Nose: 1, 2, 98, 327, 49, 279, 129, 358, 5, 4, 195, 197, 6, 168, 94, 19, 240
//   Iris: 468 (left), 473 (right)
// ============================================================

import type { LandmarkPoint } from "./analysis/types"

// ============================================================
// MediaPipe Face Mesh key indices
// ============================================================

const MP = {
  // Face oval (jaw contour) - 17 points going clockwise
  JAW: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] as const,
  
  // Left eye contour indices (16 points)
  L_EYE: [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246] as const,
  
  // Right eye contour indices (16 points)
  R_EYE: [362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398] as const,
  
  // Left eyebrow upper edge
  L_BROW_UPPER: [46,53,52,65,55] as const,
  // Left eyebrow lower edge
  L_BROW_LOWER: [70,63,105,66,107] as const,
  
  // Right eyebrow upper edge
  R_BROW_UPPER: [276,283,282,295,285] as const,
  // Right eyebrow lower edge
  R_BROW_LOWER: [300,293,334,296,336] as const,
  
  // Lips outer contour
  LIPS_OUTER: [61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185] as const,
  
  // Nose
  NOSE_TIP: 1,
  NOSE_BOTTOM: 2,
  NOSE_BRIDGE_TOP: 6,
  NOSE_BRIDGE_MID: 168,
  NOSE_LEFT_ALAR: 49,
  NOSE_RIGHT_ALAR: 279,
  NOSE_LEFT_SIDE: 129,
  NOSE_RIGHT_SIDE: 358,
  NOSE_COLUMELLA: 195,
  NOSE_SUBNASALE: 94,
  NOSE_LEFT_NOSTRIL: 19,
  NOSE_RIGHT_NOSTRIL: 240,
  
  // Iris centers
  L_IRIS: 468,
  R_IRIS: 473,
  
  // Key single points
  CHIN: 152,
  CHIN_BOTTOM: 199,
  FOREHEAD: 10,
  GLABELLA: 8,
  LEFT_EAR: 234,
  RIGHT_EAR: 454,
  LEFT_CHEEK: 50,
  RIGHT_CHEEK: 280,
  LEFT_TEMPLE: 137,
  RIGHT_TEMPLE: 366,
  LEFT_NECK: 172,
  RIGHT_NECK: 397,
  LEFT_CHIN_SIDE: 187,
  RIGHT_CHIN_SIDE: 411,
}

// ============================================================
// Types & Helpers
// ============================================================

interface MPFaceLandmark {
  x: number
  y: number
  z: number
}

function getMP(
  landmarks: MPFaceLandmark[],
  index: number
): { x: number; y: number } | null {
  if (!landmarks || index < 0 || index >= landmarks.length) return null
  return { x: landmarks[index].x, y: landmarks[index].y }
}

function midpoint(
  a: { x: number; y: number } | null,
  b: { x: number; y: number } | null
): { x: number; y: number } | null {
  if (!a || !b) return null
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function lerp(
  a: { x: number; y: number } | null,
  b: { x: number; y: number } | null,
  t: number
): { x: number; y: number } | null {
  if (!a || !b) return null
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

function dist(
  a: { x: number; y: number } | null,
  b: { x: number; y: number } | null
): number {
  if (!a || !b) return 0
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

// ============================================================
// Geometric extremum finders
// ============================================================

/** Find point with minimum X (leftmost) from a set of indices */
function minX(landmarks: MPFaceLandmark[], indices: readonly number[]): { x: number; y: number; index: number } | null {
  let best: { x: number; y: number; index: number } | null = null
  for (const i of indices) {
    const p = landmarks[i]
    if (!p) continue
    if (!best || p.x < best.x) best = { x: p.x, y: p.y, index: i }
  }
  return best
}

/** Find point with maximum X (rightmost) from a set of indices */
function maxX(landmarks: MPFaceLandmark[], indices: readonly number[]): { x: number; y: number; index: number } | null {
  let best: { x: number; y: number; index: number } | null = null
  for (const i of indices) {
    const p = landmarks[i]
    if (!p) continue
    if (!best || p.x > best.x) best = { x: p.x, y: p.y, index: i }
  }
  return best
}

/** Find point with minimum Y (topmost) from a set of indices */
function minY(landmarks: MPFaceLandmark[], indices: readonly number[]): { x: number; y: number; index: number } | null {
  let best: { x: number; y: number; index: number } | null = null
  for (const i of indices) {
    const p = landmarks[i]
    if (!p) continue
    if (!best || p.y < best.y) best = { x: p.x, y: p.y, index: i }
  }
  return best
}

/** Find point with maximum Y (bottommost) from a set of indices */
function maxY(landmarks: MPFaceLandmark[], indices: readonly number[]): { x: number; y: number; index: number } | null {
  let best: { x: number; y: number; index: number } | null = null
  for (const i of indices) {
    const p = landmarks[i]
    if (!p) continue
    if (!best || p.y > best.y) best = { x: p.x, y: p.y, index: i }
  }
  return best
}

/** Find point with maximum curvature (angle change) in a contour */
function findMaxCurvature(
  landmarks: MPFaceLandmark[],
  indices: readonly number[],
  windowSize: number = 2
): { x: number; y: number; index: number } | null {
  let bestScore = -Infinity
  let best: { x: number; y: number; index: number } | null = null
  
  for (let ci = windowSize; ci < indices.length - windowSize; ci++) {
    const i = indices[ci]
    const p = landmarks[i]
    if (!p) continue
    
    // Get points before and after
    const prev = landmarks[indices[ci - windowSize]]
    const next = landmarks[indices[ci + windowSize]]
    if (!prev || !next) continue
    
    // Vector from prev to current
    const v1x = p.x - prev.x
    const v1y = p.y - prev.y
    // Vector from current to next
    const v2x = next.x - p.x
    const v2y = next.y - p.y
    
    // Normalize
    const len1 = Math.sqrt(v1x * v1x + v1y * v1y)
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y)
    if (len1 < 0.001 || len2 < 0.001) continue
    
    const u1x = v1x / len1
    const u1y = v1y / len1
    const u2x = v2x / len2
    const u2y = v2y / len2
    
    // Dot product = cos(angle). Smaller dot = sharper angle
    const dot = u1x * u2x + u1y * u2y
    const curvature = 1 - dot // 0 = straight, 2 = 180-degree turn
    
    if (curvature > bestScore) {
      bestScore = curvature
      best = { x: p.x, y: p.y, index: i }
    }
  }
  
  return best
}

// ============================================================
// FRONT PROFILE LANDMARK DETECTION (52 landmarks)
// Uses geometric extremum approach
// ============================================================

function detectFrontLandmarks(
  mpLandmarks: MPFaceLandmark[]
): LandmarkPoint[] {
  const L = (
    id: string,
    label: string,
    p: { x: number; y: number } | null,
    color?: string
  ): LandmarkPoint | null => {
    if (!p) return null
    return { id, label, x: p.x, y: p.y, color }
  }

  const g = getMP.bind(null, mpLandmarks)
  const m = midpoint
  const l = lerp

  // ============================================================
  // 1. TRÁN & CẰM (Midline)
  // ============================================================

  // Hairline: Topmost point of face oval (jaw indices 0-16)
  // The hairline is the superior-most point on the midline
  const hairlinePt = minY(mpLandmarks, MP.JAW)
  
  // Chin Bottom (Menton): Bottommost point on jaw contour, on midline
  const chinBottomPt = maxY(mpLandmarks, MP.JAW)
  
  // Also get chin from dedicated index
  const chinIndex = g(MP.CHIN)

  // ============================================================
  // 2. MẮT (Eyes)
  // ============================================================

  // Left Pupil: Iris center
  const leftPupil = g(MP.L_IRIS)
  // Right Pupil: Iris center
  const rightPupil = g(MP.R_IRIS)

  // Left Medial Canthus: Min X of left eye contour (inner corner near nose)
  const leftMedialCanthus = minX(mpLandmarks, MP.L_EYE)
  // Left Lateral Canthus: Max X of left eye contour (outer corner)
  const leftLateralCanthus = maxX(mpLandmarks, MP.L_EYE)
  
  // Right Medial Canthus: Min X of right eye contour (inner corner near nose)
  const rightMedialCanthus = minX(mpLandmarks, MP.R_EYE)
  // Right Lateral Canthus: Max X of right eye contour (outer corner)
  const rightLateralCanthus = maxX(mpLandmarks, MP.R_EYE)

  // Left Upper Eyelid: Min Y of left eye contour (highest point)
  const leftUpperEyelid = minY(mpLandmarks, MP.L_EYE)
  // Left Lower Eyelid: Max Y of left eye contour (lowest point)
  const leftLowerEyelid = maxY(mpLandmarks, MP.L_EYE)
  
  // Right Upper Eyelid: Min Y of right eye contour
  const rightUpperEyelid = minY(mpLandmarks, MP.R_EYE)
  // Right Lower Eyelid: Max Y of right eye contour
  const rightLowerEyelid = maxY(mpLandmarks, MP.R_EYE)

  // Left Upper Eyelid Crease: Use the eyebrow lower edge points
  // The crease is between the eye and the brow - find the point on brow lower edge
  // that is closest to the eye center
  const leftCrease = (() => {
    const browLowerPoints = MP.L_BROW_LOWER.map(i => mpLandmarks[i]).filter(Boolean)
    if (browLowerPoints.length === 0) return null
    // The crease is the lowest point of the brow lower edge
    let lowest = browLowerPoints[0]
    for (const p of browLowerPoints) {
      if (p.y > lowest.y) lowest = p
    }
    return { x: lowest.x, y: lowest.y }
  })()
  
  const rightCrease = (() => {
    const browLowerPoints = MP.R_BROW_LOWER.map(i => mpLandmarks[i]).filter(Boolean)
    if (browLowerPoints.length === 0) return null
    let lowest = browLowerPoints[0]
    for (const p of browLowerPoints) {
      if (p.y > lowest.y) lowest = p
    }
    return { x: lowest.x, y: lowest.y }
  })()

  // Left Eyelid Hood End: The point where the upper eyelid fold ends laterally
  // This is between lateral canthus and brow tail
  const leftHoodEnd = (() => {
    const lc = leftLateralCanthus
    const bt = g(MP.L_BROW_UPPER[MP.L_BROW_UPPER.length - 1]) // brow tail
    if (!lc || !bt) return null
    // Hood end is approximately 1/3 from lateral canthus to brow tail
    return l(lc, bt, 0.35)
  })()
  
  const rightHoodEnd = (() => {
    const lc = rightLateralCanthus
    const bt = g(MP.R_BROW_UPPER[MP.R_BROW_UPPER.length - 1])
    if (!lc || !bt) return null
    return l(lc, bt, 0.35)
  })()

  // ============================================================
  // 3. LÔNG MÀY (Eyebrows)
  // ============================================================

  // Left Brow Head: Leftmost point of left brow upper edge (medial)
  const leftBrowHead = minX(mpLandmarks, MP.L_BROW_UPPER)
  // Left Brow Tail: Rightmost point of left brow upper edge (lateral)
  const leftBrowTail = maxX(mpLandmarks, MP.L_BROW_UPPER)
  // Left Brow Peak: Topmost (min Y) of left brow upper edge
  const leftBrowPeak = minY(mpLandmarks, MP.L_BROW_UPPER)
  
  // Right Brow Head: Leftmost point of right brow upper edge (medial)
  const rightBrowHead = minX(mpLandmarks, MP.R_BROW_UPPER)
  // Right Brow Tail: Rightmost point of right brow upper edge (lateral)
  const rightBrowTail = maxX(mpLandmarks, MP.R_BROW_UPPER)
  // Right Brow Peak: Topmost (min Y) of right brow upper edge
  const rightBrowPeak = minY(mpLandmarks, MP.R_BROW_UPPER)

  // Left Brow Inner Corner: Bottommost (max Y) of left brow lower edge, medial part
  const leftBrowInnerCorner = (() => {
    // Use the first 3 points of lower brow (medial side)
    const medialIndices = MP.L_BROW_LOWER.slice(0, 3)
    return maxY(mpLandmarks, medialIndices)
  })()
  
  const rightBrowInnerCorner = (() => {
    const medialIndices = MP.R_BROW_LOWER.slice(0, 3)
    return maxY(mpLandmarks, medialIndices)
  })()

  // Left Brow Arch: Point on lower brow edge, vertically aligned with brow peak
  const leftBrowArch = (() => {
    if (!leftBrowPeak) return null
    // Find the point on lower brow edge closest to the X of brow peak
    let best = null
    let bestDist = Infinity
    for (const i of MP.L_BROW_LOWER) {
      const p = mpLandmarks[i]
      if (!p) continue
      const d = Math.abs(p.x - leftBrowPeak.x)
      if (d < bestDist) { bestDist = d; best = { x: p.x, y: p.y } }
    }
    return best
  })()
  
  const rightBrowArch = (() => {
    if (!rightBrowPeak) return null
    let best = null
    let bestDist = Infinity
    for (const i of MP.R_BROW_LOWER) {
      const p = mpLandmarks[i]
      if (!p) continue
      const d = Math.abs(p.x - rightBrowPeak.x)
      if (d < bestDist) { bestDist = d; best = { x: p.x, y: p.y } }
    }
    return best
  })()

  // ============================================================
  // 4. MŨI (Nose)
  // ============================================================

  const noseTip = g(MP.NOSE_TIP)
  const noseBottom = g(MP.NOSE_BOTTOM)
  const noseBridgeTop = g(MP.NOSE_BRIDGE_TOP)
  const noseBridgeMid = g(MP.NOSE_BRIDGE_MID)
  const leftAlar = g(MP.NOSE_LEFT_ALAR)
  const rightAlar = g(MP.NOSE_RIGHT_ALAR)
  const leftNoseSide = g(MP.NOSE_LEFT_SIDE)
  const rightNoseSide = g(MP.NOSE_RIGHT_SIDE)
  const columella = g(MP.NOSE_COLUMELLA)
  const subnasale = g(MP.NOSE_SUBNASALE)

  // Left/Right Nose Side: Use the alar wing points (lateral-most of nose)
  // These are already the extremum points of the nose wings

  // Nasal Base: Midpoint between left and right alar bases
  const nasalBase = m(leftAlar, rightAlar)

  // Left/Right Nose Bridge: Points on the bridge, at the level of medial canthus
  const leftNoseBridge = (() => {
    if (!leftMedialCanthus || !leftNoseSide) return null
    // Bridge is between medial canthus and nose side, at ~40% from bridge top
    return l(noseBridgeTop, leftNoseSide, 0.4)
  })()
  
  const rightNoseBridge = (() => {
    if (!rightMedialCanthus || !rightNoseSide) return null
    return l(noseBridgeTop, rightNoseSide, 0.4)
  })()

  // ============================================================
  // 5. MIỆNG (Mouth)
  // ============================================================

  // Left Mouth Corner: Leftmost point of lips outer contour
  const leftMouthCorner = minX(mpLandmarks, MP.LIPS_OUTER)
  // Right Mouth Corner: Rightmost point of lips outer contour
  const rightMouthCorner = maxX(mpLandmarks, MP.LIPS_OUTER)

  // Cupid's Bow: Topmost point of upper lip (the two peaks)
  // Find the two highest points on the upper lip contour
  const cupidsBow = (() => {
    // Upper lip is the top half of lips outer: indices 0, 37, 39, 40, 185, 61
    const upperLipIndices = [0, 37, 39, 40, 185, 61] as const
    // Find the highest (min Y) point - this is one cupid's bow peak
    const peak = minY(mpLandmarks, upperLipIndices)
    return peak
  })()

  // Inner Cupid's Bow: The dip between the two peaks
  const innerCupidsBow = (() => {
    // The lowest point on the upper lip contour between the two peaks
    const upperLipIndices = [0, 37, 39, 40, 185, 61] as const
    // Find the lowest (max Y) point on upper lip - this is the inner dip
    const dip = maxY(mpLandmarks, upperLipIndices)
    return dip
  })()

  // Mouth Middle (Stomion): Midpoint between mouth corners
  const mouthMiddle = m(
    leftMouthCorner ? { x: leftMouthCorner.x, y: leftMouthCorner.y } : null,
    rightMouthCorner ? { x: rightMouthCorner.x, y: rightMouthCorner.y } : null
  )

  // Lower Lip Center: Bottommost point of lower lip
  const lowerLipCenter = (() => {
    // Lower lip is the bottom half: indices 17, 314, 405, 321, 375, 291
    const lowerLipIndices = [17, 314, 405, 321, 375, 291] as const
    const bottom = maxY(mpLandmarks, lowerLipIndices)
    return bottom
  })()

  // ============================================================
  // 6. ĐƯỜNG VIỀN KHUÔN MẶT (Facial Contour)
  // ============================================================

  // Left Temple: The concave point on the left side of the face
  // Between brow tail and ear, find the point with minimum X (innermost)
  const leftTemplePt = (() => {
    // Temple region is around jaw indices 2-5 on the left side
    const templeRegion = [2, 3, 4, 5] as const
    // The temple is the innermost point (min X) in this region
    return minX(mpLandmarks, templeRegion)
  })()

  const rightTemplePt = (() => {
    const templeRegion = [13, 14, 15, 16] as const
    return minX(mpLandmarks, templeRegion)
  })()

  // Left Cheekbone (Zygion): The most lateral point on the left cheek
  const leftCheekbone = (() => {
    // Cheekbone region: between eye level and mouth level, on the side
    // Use the face contour points around the cheek area
    const cheekRegion = [50, 123, 126, 129, 130] as const
    // Find the point with maximum X (most lateral)
    return maxX(mpLandmarks, cheekRegion)
  })()

  const rightCheekbone = (() => {
    const cheekRegion = [280, 353, 356, 358, 359] as const
    return maxX(mpLandmarks, cheekRegion)
  })()

  // Left Outer Ear: Most lateral point of left ear
  const leftOuterEar = (() => {
    const ear = g(MP.LEFT_EAR)
    if (!ear) return null
    // The ear is on the left side, so min X
    return { x: ear.x, y: ear.y }
  })()

  const rightOuterEar = (() => {
    const ear = g(MP.RIGHT_EAR)
    if (!ear) return null
    return { x: ear.x, y: ear.y }
  })()

  // Left Upper Jaw Angle: Point on jaw contour at the level of mouth corner
  const leftUpperJawAngle = (() => {
    const mc = leftMouthCorner
    if (!mc) return null
    // Find the point on left jaw contour closest to mouth corner Y level
    const jawLeft = [4, 5, 6, 7] as const
    let best = null
    let bestDist = Infinity
    for (const i of jawLeft) {
      const p = mpLandmarks[i]
      if (!p) continue
      const d = Math.abs(p.y - mc.y)
      if (d < bestDist) { bestDist = d; best = { x: p.x, y: p.y } }
    }
    return best
  })()

  const rightUpperJawAngle = (() => {
    const mc = rightMouthCorner
    if (!mc) return null
    const jawRight = [14, 15, 16] as const
    let best = null
    let bestDist = Infinity
    for (const i of jawRight) {
      const p = mpLandmarks[i]
      if (!p) continue
      const d = Math.abs(p.y - mc.y)
      if (d < bestDist) { bestDist = d; best = { x: p.x, y: p.y } }
    }
    return best
  })()

  // Left Lower Jaw Angle (Gonion): Point of maximum curvature on jaw contour
  const leftLowerJawAngle = (() => {
    // Use the left side of jaw contour (indices 3-8)
    const leftJaw = [3, 4, 5, 6, 7, 8] as const
    return findMaxCurvature(mpLandmarks, leftJaw)
  })()

  const rightLowerJawAngle = (() => {
    const rightJaw = [12, 13, 14, 15, 16] as const
    return findMaxCurvature(mpLandmarks, rightJaw)
  })()

  // Left/Right Chin: Points on chin contour between chin bottom and jaw angle
  const leftChinPt = (() => {
    const chin = g(MP.LEFT_CHIN_SIDE)
    if (!chin) return null
    return { x: chin.x, y: chin.y }
  })()

  const rightChinPt = (() => {
    const chin = g(MP.RIGHT_CHIN_SIDE)
    if (!chin) return null
    return { x: chin.x, y: chin.y }
  })()

  // Left/Right Neck Point: Where jaw contour transitions to neck
  const leftNeckPt = (() => {
    const neck = g(MP.LEFT_NECK)
    if (!neck) return null
    return { x: neck.x, y: neck.y }
  })()

  const rightNeckPt = (() => {
    const neck = g(MP.RIGHT_NECK)
    if (!neck) return null
    return { x: neck.x, y: neck.y }
  })()

  // ============================================================
  // Build landmark list
  // ============================================================

  const landmarks: (LandmarkPoint | null)[] = [
    // 1. Trán & Cằm
    L("hairline", "Hairline", hairlinePt, "#f59e0b"),
    L("chin_bottom", "Chin Bottom", chinBottomPt, "#8b5cf6"),
    
    // 2. Mắt
    L("left_pupil", "Left Pupil", leftPupil, "#a78bfa"),
    L("right_pupil", "Right Pupil", rightPupil, "#a78bfa"),
    L("left_medial_canthus", "Left Medial Canthus", leftMedialCanthus, "#38bdf8"),
    L("left_lateral_canthus", "Left Lateral Canthus", leftLateralCanthus, "#38bdf8"),
    L("right_medial_canthus", "Right Medial Canthus", rightMedialCanthus, "#38bdf8"),
    L("right_lateral_canthus", "Right Lateral Canthus", rightLateralCanthus, "#38bdf8"),
    L("left_upper_eyelid", "Left Upper Eyelid", leftUpperEyelid, "#38bdf8"),
    L("left_lower_eyelid", "Left Lower Eyelid", leftLowerEyelid, "#38bdf8"),
    L("right_upper_eyelid", "Right Upper Eyelid", rightUpperEyelid, "#38bdf8"),
    L("right_lower_eyelid", "Right Lower Eyelid", rightLowerEyelid, "#38bdf8"),
    L("left_upper_eyelid_crease", "Left Upper Eyelid Crease", leftCrease, "#38bdf8"),
    L("right_upper_eyelid_crease", "Right Upper Eyelid Crease", rightCrease, "#38bdf8"),
    L("left_eyelid_hood_end", "Left Eyelid Hood End", leftHoodEnd, "#38bdf8"),
    L("right_eyelid_hood_end", "Right Eyelid Hood End", rightHoodEnd, "#38bdf8"),
    
    // 3. Lông mày
    L("left_brow_head", "Left Brow Head", leftBrowHead, "#f59e0b"),
    L("left_brow_inner_corner", "Left Brow Inner Corner", leftBrowInnerCorner, "#f59e0b"),
    L("left_brow_arch", "Left Brow Arch", leftBrowArch, "#f59e0b"),
    L("left_brow_peak", "Left Brow Peak", leftBrowPeak, "#f59e0b"),
    L("left_brow_tail", "Left Brow Tail", leftBrowTail, "#f59e0b"),
    L("right_brow_head", "Right Brow Head", rightBrowHead, "#f59e0b"),
    L("right_brow_inner_corner", "Right Brow Inner Corner", rightBrowInnerCorner, "#f59e0b"),
    L("right_brow_arch", "Right Brow Arch", rightBrowArch, "#f59e0b"),
    L("right_brow_peak", "Right Brow Peak", rightBrowPeak, "#f59e0b"),
    L("right_brow_tail", "Right Brow Tail", rightBrowTail, "#f59e0b"),
    
    // 4. Mũi
    L("left_nose_side", "Left Nose Side", leftNoseSide, "#f97316"),
    L("right_nose_side", "Right Nose Side", rightNoseSide, "#f97316"),
    L("nasal_base", "Nasal Base", nasalBase, "#f97316"),
    L("nose_bottom", "Nose Bottom", noseBottom, "#f97316"),
    L("left_nose_bridge", "Left Nose Bridge", leftNoseBridge, "#f97316"),
    L("right_nose_bridge", "Right Nose Bridge", rightNoseBridge, "#f97316"),
    
    // 5. Miệng
    L("left_mouth_corner", "Left Mouth Corner", leftMouthCorner, "#ec4899"),
    L("right_mouth_corner", "Right Mouth Corner", rightMouthCorner, "#ec4899"),
    L("cupids_bow", "Cupid's Bow", cupidsBow, "#ec4899"),
    L("inner_cupids_bow", "Inner Cupid's Bow", innerCupidsBow, "#ec4899"),
    L("mouth_middle", "Mouth Middle", mouthMiddle, "#ec4899"),
    L("lower_lip_center", "Lower Lip Center", lowerLipCenter, "#ec4899"),
    
    // 6. Đường viền khuôn mặt
    L("left_temple", "Left Temple", leftTemplePt, "#a78bfa"),
    L("right_temple", "Right Temple", rightTemplePt, "#a78bfa"),
    L("left_cheekbone", "Left Cheekbone", leftCheekbone, "#a78bfa"),
    L("right_cheekbone", "Right Cheekbone", rightCheekbone, "#a78bfa"),
    L("left_outer_ear", "Left Outer Ear", leftOuterEar, "#6b7280"),
    L("right_outer_ear", "Right Outer Ear", rightOuterEar, "#6b7280"),
    L("left_upper_jaw_angle", "Left Upper Jaw Angle", leftUpperJawAngle, "#8b5cf6"),
    L("right_upper_jaw_angle", "Right Upper Jaw Angle", rightUpperJawAngle, "#8b5cf6"),
    L("left_lower_jaw_angle", "Left Lower Jaw Angle", leftLowerJawAngle, "#8b5cf6"),
    L("right_lower_jaw_angle", "Right Lower Jaw Angle", rightLowerJawAngle, "#8b5cf6"),
    L("left_chin", "Left Chin", leftChinPt, "#8b5cf6"),
    L("right_chin", "Right Chin", rightChinPt, "#8b5cf6"),
    L("left_neck_point", "Left Neck Point", leftNeckPt, "#6b7280"),
    L("right_neck_point", "Right Neck Point", rightNeckPt, "#6b7280"),
  ]

  return landmarks.filter((lm): lm is LandmarkPoint => lm !== null)
}

// ============================================================
// SIDE PROFILE LANDMARK DETECTION (31 landmarks)
// Uses geometric extremum approach for side profile
// ============================================================

function detectSideLandmarks(
  mpLandmarks: MPFaceLandmark[]
): LandmarkPoint[] {
  const L = (
    id: string,
    label: string,
    p: { x: number; y: number } | null,
    color?: string
  ): LandmarkPoint | null => {
    if (!p) return null
    return { id, label, x: p.x, y: p.y, color }
  }

  const g = getMP.bind(null, mpLandmarks)
  const m = midpoint
  const l = lerp

  // Determine facing direction
  const noseTip = g(MP.NOSE_TIP)
  const isFacingLeft = noseTip ? noseTip.x < 0.5 : true

  // ============================================================
  // Get all landmarks (use appropriate side based on facing)
  // ============================================================

  const noseBottom = g(MP.NOSE_BOTTOM)
  const noseBridgeTop = g(MP.NOSE_BRIDGE_TOP)
  const noseBridgeMid = g(MP.NOSE_BRIDGE_MID)
  const subnasale = g(MP.NOSE_SUBNASALE)
  const columella = g(MP.NOSE_COLUMELLA)
  const leftAlar = g(MP.NOSE_LEFT_ALAR)
  const rightAlar = g(MP.NOSE_RIGHT_ALAR)
  const chin = g(MP.CHIN)
  const chinBottom = g(MP.CHIN_BOTTOM)
  const forehead = g(MP.FOREHEAD)
  const glabella = g(MP.GLABELLA)

  // Use appropriate side based on facing direction
  const ear = isFacingLeft ? g(MP.LEFT_EAR) : g(MP.RIGHT_EAR)
  const cheek = isFacingLeft ? g(MP.LEFT_CHEEK) : g(MP.RIGHT_CHEEK)
  const neck = isFacingLeft ? g(MP.LEFT_NECK) : g(MP.RIGHT_NECK)
  const temple = isFacingLeft ? g(MP.LEFT_TEMPLE) : g(MP.RIGHT_TEMPLE)
  const alar = isFacingLeft ? leftAlar : rightAlar

  // Eye (use the eye on the visible side)
  const eyeIndices = isFacingLeft ? MP.L_EYE : MP.R_EYE
  const browUpper = isFacingLeft ? MP.L_BROW_UPPER : MP.R_BROW_UPPER
  const browLower = isFacingLeft ? MP.L_BROW_LOWER : MP.R_BROW_LOWER
  const irisIdx = isFacingLeft ? MP.L_IRIS : MP.R_IRIS

  const eyeOuter = maxX(mpLandmarks, eyeIndices)
  const eyeInner = minX(mpLandmarks, eyeIndices)
  const eyeTop = minY(mpLandmarks, eyeIndices)
  const eyeBottom = maxY(mpLandmarks, eyeIndices)
  const iris = g(irisIdx)
  const browHead = minX(mpLandmarks, browUpper)
  const browTail = maxX(mpLandmarks, browUpper)
  const browPeak = minY(mpLandmarks, browUpper)

  // Mouth (use the side facing the camera)
  const mouthCorner = isFacingLeft ? g(MP.LIPS_OUTER[0]) : g(MP.LIPS_OUTER[10])
  const mouthTop = g(MP.LIPS_OUTER[15]) // index 0 in lips outer
  const mouthBottom = g(MP.LIPS_OUTER[5]) // index 17 in lips outer

  // Jaw contour for the visible side
  const jawSide = isFacingLeft
    ? [0, 1, 2, 3, 4, 5, 6, 7, 8] as const
    : [16, 15, 14, 13, 12, 11, 10, 9, 8] as const

  // ============================================================
  // 1. ĐỈNH & LƯNG HỘP SỌ
  // ============================================================

  // Top of Head (Vertex): Highest point of the head contour
  const topOfHead = minY(mpLandmarks, MP.JAW)

  // Occiput: Most posterior point of the skull
  const occiput = (() => {
    // The occiput is behind the ear - find the point with min X (if facing left)
    // or max X (if facing right) on the back of the head
    const backIndices = isFacingLeft
      ? [10, 11, 12, 13, 14, 15, 16] as const
      : [0, 1, 2, 3, 4, 5, 6, 7] as const
    if (isFacingLeft) return minX(mpLandmarks, backIndices)
    else return maxX(mpLandmarks, backIndices)
  })()

  // ============================================================
  // 2. TRÁN & MẮT
  // ============================================================

  // Hairline (Profile): Hairline at the forehead
  const hairlineProfile = forehead
    ? { x: forehead.x, y: Math.max(0, forehead.y - 0.06) }
    : null

  // Forehead: The convex curve of the forehead
  const foreheadPt = forehead
    ? { x: forehead.x, y: forehead.y }
    : null

  // Glabella: Most anterior point of the forehead (between brows)
  const glabellaPt = glabella
    ? { x: glabella.x, y: glabella.y }
    : null

  // Corneal Apex: Most anterior point of the eye surface
  const cornealApex = iris
    ? { x: iris.x, y: iris.y }
    : null

  // Eyelid End: Most posterior point of the eye (outer canthus)
  const eyelidEnd = eyeOuter
    ? { x: eyeOuter.x, y: eyeOuter.y }
    : null

  // Lower Eyelid: Lowest point of the lower eyelid
  const lowerEyelid = eyeBottom
    ? { x: eyeBottom.x, y: eyeBottom.y }
    : null

  // Orbitale: Lowest point of the orbital rim
  const orbitale = eyeBottom
    ? { x: eyeBottom.x, y: eyeBottom.y }
    : null

  // Cheekbone: Most projected point of the zygomatic contour
  const cheekbone = cheek
    ? { x: cheek.x, y: cheek.y }
    : null

  // ============================================================
  // 3. MŨI (Nose)
  // ============================================================

  // Nasal Bridge Root (Nasion): Deepest point at the root of the nose
  const nasalBridgeRoot = noseBridgeTop
    ? { x: noseBridgeTop.x, y: noseBridgeTop.y }
    : null

  // Rhinion: The bump/curve point on the nasal bone
  const rhinion = noseBridgeMid
    ? { x: noseBridgeMid.x, y: noseBridgeMid.y }
    : null

  // Supratip: The convex point just above the nose tip
  const supratip = l(noseBridgeMid, noseTip, 0.7)

  // Nose Tip (Pronasale): Most anterior point of the nose
  const noseTipPt = noseTip
    ? { x: noseTip.x, y: noseTip.y }
    : null

  // Infratip: The concave point just below the nose tip
  const infratip = l(noseTip, columella, 0.3)

  // Columella: The lower edge of the nasal septum
  const columellaPt = columella
    ? { x: columella.x, y: columella.y }
    : null

  // Subnasale: Deepest angle where nose base meets the upper lip
  const subnasalePt = subnasale
    ? { x: subnasale.x, y: subnasale.y }
    : null

  // Subalare: Lowest point of the alar base attachment
  const subalare = alar
    ? { x: alar.x, y: alar.y }
    : null

  // ============================================================
  // 4. MIỆNG & CẰM
  // ============================================================

  // Upper Lip: Most anterior point of the upper lip
  const upperLip = (() => {
    // Find the point with max X (most anterior) on the upper lip area
    const upperLipIndices = [0, 37, 39, 40, 185, 61] as const
    if (isFacingLeft) return maxX(mpLandmarks, upperLipIndices)
    else return minX(mpLandmarks, upperLipIndices)
  })()

  // Lower Lip: Most anterior point of the lower lip
  const lowerLip = (() => {
    const lowerLipIndices = [17, 314, 405, 321, 375, 291] as const
    if (isFacingLeft) return maxX(mpLandmarks, lowerLipIndices)
    else return minX(mpLandmarks, lowerLipIndices)
  })()

  // Mouth Corner: Deepest point of the mouth corner
  const mouthCornerPt = mouthCorner
    ? { x: mouthCorner.x, y: mouthCorner.y }
    : null

  // Labiomental Fold: Deepest groove between lower lip and chin
  const labiomentalFold = (() => {
    if (!lowerLip || !chin) return null
    // The fold is approximately 1/3 from lower lip to chin
    return l(lowerLip, chin, 0.35)
  })()

  // Chin Point (Pogonion): Most anterior point of the chin
  const chinPoint = chin
    ? { x: chin.x, y: chin.y }
    : null

  // Chin Bottom (Menton): Lowest point of the chin
  const chinBottomPt = chinBottom
    ? { x: chinBottom.x, y: chinBottom.y }
    : null

  // ============================================================
  // 5. TAI & HÀM CỔ
  // ============================================================

  // Tragus: Most projected point of the ear cartilage
  const tragus = ear
    ? { x: ear.x, y: ear.y }
    : null

  // Intertragic Notch: U/V shaped notch below the tragus
  const intertragicNotch = ear
    ? { x: ear.x, y: ear.y + 0.02 }
    : null

  // Porion: Highest point of the external ear canal
  const porion = ear
    ? { x: ear.x, y: ear.y - 0.02 }
    : null

  // Upper Jaw Angle: Point on the jaw contour at the level between lower lip and chin
  const upperJawAngle = (() => {
    if (!lowerLip || !chinPoint) return null
    const midY = (lowerLip.y + chinPoint.y) / 2
    // Find the point on jaw contour closest to this Y level
    let best = null
    let bestDist = Infinity
    for (const i of jawSide) {
      const p = mpLandmarks[i]
      if (!p) continue
      const d = Math.abs(p.y - midY)
      if (d < bestDist) { bestDist = d; best = { x: p.x, y: p.y } }
    }
    return best
  })()

  // Lower Jaw Angle (Gonion): Point of maximum curvature on the lower jaw
  const lowerJawAngle = findMaxCurvature(mpLandmarks, jawSide)

  // Cervical Point: Deepest angle dividing submental area and neck
  const cervicalPoint = neck
    ? { x: neck.x, y: neck.y }
    : null

  // Neck Point: On the anterior neck contour, below cervical point
  const neckPoint = neck
    ? { x: neck.x, y: neck.y + 0.03 }
    : null

  // ============================================================
  // Build side landmark list
  // ============================================================

  const landmarks: (LandmarkPoint | null)[] = [
    // 1. Đỉnh & Lưng hộp sọ
    L("top_of_head", "Top of Head", topOfHead, "#6b7280"),
    L("occiput", "Occiput", occiput, "#6b7280"),

    // 2. Trán & Mắt
    L("hairline_profile", "Hairline (Profile)", hairlineProfile, "#f59e0b"),
    L("forehead", "Forehead", foreheadPt, "#f59e0b"),
    L("glabella", "Glabella", glabellaPt, "#f59e0b"),
    L("corneal_apex", "Corneal Apex", cornealApex, "#38bdf8"),
    L("eyelid_end", "Eyelid End", eyelidEnd, "#38bdf8"),
    L("lower_eyelid", "Lower Eyelid", lowerEyelid, "#38bdf8"),
    L("orbitale", "Orbitale", orbitale, "#38bdf8"),
    L("cheekbone", "Cheekbone", cheekbone, "#a78bfa"),

    // 3. Mũi
    L("nasal_bridge_root", "Nasal Bridge Root", nasalBridgeRoot, "#f97316"),
    L("rhinion", "Rhinion", rhinion, "#f97316"),
    L("supratip", "Supratip", supratip, "#f97316"),
    L("nose_tip", "Nose Tip", noseTipPt, "#f97316"),
    L("infratip", "Infratip", infratip, "#f97316"),
    L("columella", "Columella", columellaPt, "#f97316"),
    L("subnasale", "Subnasale", subnasalePt, "#f97316"),
    L("subalare", "Subalare", subalare, "#f97316"),

    // 4. Miệng & Cằm
    L("upper_lip", "Upper Lip", upperLip, "#ec4899"),
    L("lower_lip", "Lower Lip", lowerLip, "#ec4899"),
    L("mouth_corner", "Mouth Corner", mouthCornerPt, "#ec4899"),
    L("labiomental_fold", "Labiomental Fold", labiomentalFold, "#8b5cf6"),
    L("chin_point", "Chin Point", chinPoint, "#8b5cf6"),
    L("chin_bottom", "Chin Bottom", chinBottomPt, "#8b5cf6"),

    // 5. Tai & Hàm cổ
    L("tragus", "Tragus", tragus, "#6b7280"),
    L("intertragic_notch", "Intertragic Notch", intertragicNotch, "#6b7280"),
    L("porion", "Porion", porion, "#6b7280"),
    L("upper_jaw_angle", "Upper Jaw Angle", upperJawAngle, "#8b5cf6"),
    L("lower_jaw_angle", "Lower Jaw Angle", lowerJawAngle, "#8b5cf6"),
    L("cervical_point", "Cervical Point", cervicalPoint, "#6b7280"),
    L("neck_point", "Neck Point", neckPoint, "#6b7280"),
  ]

  return landmarks.filter((lm): lm is LandmarkPoint => lm !== null)
}

// ============================================================
// MediaPipe Face Landmarker initialization
// ============================================================

let faceLandmarker: any = null

async function getFaceLandmarker(): Promise<any> {
  if (faceLandmarker) return faceLandmarker

  const { FaceLandmarker, FilesetResolver } = await import(
    "@mediapipe/tasks-vision"
  )

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  )

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
      delegate: "GPU",
    },
    outputFaceBlendshapes: false,
    runningMode: "IMAGE",
    numFaces: 1,
  })

  return faceLandmarker
}

// ============================================================
// Main detection functions (exported)
// ============================================================

export async function detectFrontFromImage(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<LandmarkPoint[]> {
  try {
    const landmarker = await getFaceLandmarker()
    const result = landmarker.detect(imageElement)

    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
      console.warn("No face detected in front image")
      return []
    }

    const mpLandmarks = result.faceLandmarks[0]
    return detectFrontLandmarks(mpLandmarks)
  } catch (error) {
    console.error("Front landmark detection error:", error)
    return []
  }
}

export async function detectSideFromImage(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<LandmarkPoint[]> {
  try {
    const landmarker = await getFaceLandmarker()
    const result = landmarker.detect(imageElement)

    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
      console.warn("No face detected in side image")
      return []
    }

    const mpLandmarks = result.faceLandmarks[0]
    return detectSideLandmarks(mpLandmarks)
  } catch (error) {
    console.error("Side landmark detection error:", error)
    return []
  }
}
