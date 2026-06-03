// ============================================================
// MediaPipe Face Landmark Detection
// ============================================================

import type { LandmarkPoint } from "./analysis/types"

interface MPFaceLandmark {
  x: number
  y: number
  z: number
}

// ============================================================
// FRONT PROFILE LANDMARK DETECTION (52 landmarks)
// ============================================================

const FRONT_LANDMARK_INDICES: Record<string, {
  type: 'single' | 'midpoint' | 'extremum'
  indices: number[]
  label: string
  color: string
  extremumType?: 'minX' | 'maxX' | 'minY' | 'maxY'
}> = {
  // 1. Hairline - điểm cao nhất của đường chân tóc (thường nằm trên điểm 10 của mesh một tí)
  hairline: { type: 'single', indices: [10], label: 'Hairline', color: '#3b82f6' },
  
  // 2. Left pupil - 468
  left_pupil: { type: 'single', indices: [468], label: 'Left Pupil', color: '#ef4444' },
  
  // 3. Right pupil - 473
  right_pupil: { type: 'single', indices: [473], label: 'Right Pupil', color: '#ef4444' },
  
  // 4. Left nose side - 48
  left_nose_side: { type: 'single', indices: [48], label: 'Left Nose Side', color: '#10b981' },
  
  // 5. Right nose side - 278
  right_nose_side: { type: 'single', indices: [278], label: 'Right Nose Side', color: '#10b981' },
  
  // 6. Lower lip center - 17
  lower_lip_center: { type: 'single', indices: [17], label: 'Lower Lip Center', color: '#8b5cf6' },
  
  // 7. Chin bottom - 152
  chin_bottom: { type: 'single', indices: [152], label: 'Chin Bottom', color: '#f59e0b' },
  
  // 10. Left temple - 54
  left_temple: { type: 'single', indices: [54], label: 'Left Temple', color: '#3b82f6' },
  
  // 11. Right temple - 284
  right_temple: { type: 'single', indices: [284], label: 'Right Temple', color: '#3b82f6' },
  
  // 12. Left medial canthus - 243
  left_medial_canthus: { type: 'single', indices: [243], label: 'Left Medial Canthus', color: '#ef4444' },
  
  // 13. Left Lateral Canthus - 130
  left_lateral_canthus: { type: 'single', indices: [130], label: 'Left Lateral Canthus', color: '#ef4444' },
  
  // 14. Left Upper Eyelid - 159
  left_upper_eyelid: { type: 'single', indices: [159], label: 'Left Upper Eyelid', color: '#ef4444' },
  
  // 15. Left Lower Eyelid - 145
  left_lower_eyelid: { type: 'single', indices: [145], label: 'Left Lower Eyelid', color: '#ef4444' },
  
  // 16. Left Eyelid Hood End - 247
  left_eyelid_hood_end: { type: 'single', indices: [247], label: 'Left Eyelid Hood End', color: '#ef4444' },
  
  // 17. Left Brow Head - 107
  left_brow_head: { type: 'single', indices: [107], label: 'Left Brow Head', color: '#f97316' },
  
  // 18. Left Brow Inner Corner - 55
  left_brow_inner_corner: { type: 'single', indices: [55], label: 'Left Brow Inner Corner', color: '#f97316' },
  
  // 19. Left Brow Arch - 53
  left_brow_arch: { type: 'single', indices: [53], label: 'Left Brow Arch', color: '#f97316' },
  
  // 20. Left Brow Peak - điểm nằm chính giữa đoạn thẳng nối điểm 105 và 63
  left_brow_peak: { type: 'midpoint', indices: [105, 63], label: 'Left Brow Peak', color: '#f97316' },
  
  // 21. Left Brow Tail - 70
  left_brow_tail: { type: 'single', indices: [70], label: 'Left Brow Tail', color: '#f97316' },
  
  // 22. Left Upper Eyelid Crease - 470
  left_upper_eyelid_crease: { type: 'single', indices: [470], label: 'Left Upper Eyelid Crease', color: '#ef4444' },
  
  // 23. Right Medial Canthus - 463
  right_medial_canthus: { type: 'single', indices: [463], label: 'Right Medial Canthus', color: '#ef4444' },
  
  // 24. Right Lateral Canthus - 359
  right_lateral_canthus: { type: 'single', indices: [359], label: 'Right Lateral Canthus', color: '#ef4444' },
  
  // 25. Right Upper Eyelid - 386
  right_upper_eyelid: { type: 'single', indices: [386], label: 'Right Upper Eyelid', color: '#ef4444' },
  
  // 26. Right Lower Eyelid - 374
  right_lower_eyelid: { type: 'single', indices: [374], label: 'Right Lower Eyelid', color: '#ef4444' },
  
  // 27. Right Eyelid Hood End - 467
  right_eyelid_hood_end: { type: 'single', indices: [467], label: 'Right Eyelid Hood End', color: '#ef4444' },
  
  // 28. Right Brow Head - 336
  right_brow_head: { type: 'single', indices: [336], label: 'Right Brow Head', color: '#f97316' },
  
  // 29. Right Brow Inner Corner - 285
  right_brow_inner_corner: { type: 'single', indices: [285], label: 'Right Brow Inner Corner', color: '#f97316' },
  
  // 30. Right Brow Arch - 283
  right_brow_arch: { type: 'single', indices: [283], label: 'Right Brow Arch', color: '#f97316' },
  
  // 31. Right Brow Peak - điểm nằm chính giữa đoạn thẳng nối điểm 334 và 293
  right_brow_peak: { type: 'midpoint', indices: [334, 293], label: 'Right Brow Peak', color: '#f97316' },
  
  // 32. Right Brow Tail - 300
  right_brow_tail: { type: 'single', indices: [300], label: 'Right Brow Tail', color: '#f97316' },
  
  // 33. Right Upper Eyelid Crease - 475
  right_upper_eyelid_crease: { type: 'single', indices: [475], label: 'Right Upper Eyelid Crease', color: '#ef4444' },
  
  // 34. Nasal Base - đoạn thẳng nối điểm 97 và 326
  nasal_base: { type: 'midpoint', indices: [97, 326], label: 'Nasal Base', color: '#10b981' },
  
  // 35. Nose Bottom - 2
  nose_bottom: { type: 'single', indices: [2], label: 'Nose Bottom', color: '#10b981' },
  
  // 36. Left Nose Bridge - 196
  left_nose_bridge: { type: 'single', indices: [196], label: 'Left Nose Bridge', color: '#10b981' },
  
  // 37. Right Nose Bridge - 419
  right_nose_bridge: { type: 'single', indices: [419], label: 'Right Nose Bridge', color: '#10b981' },
  
  // 38. Left Mouth Corner - 61
  left_mouth_corner: { type: 'single', indices: [61], label: 'Left Mouth Corner', color: '#8b5cf6' },
  
  // 39. Right Mouth Corner - 291
  right_mouth_corner: { type: 'single', indices: [291], label: 'Right Mouth Corner', color: '#8b5cf6' },
  
  // 40. Cupid's Bow - the line connect 37 and 267
  cupids_bow: { type: 'midpoint', indices: [37, 267], label: "Cupid's Bow", color: '#8b5cf6' },
  
  // 41. Inner Cupid's Bow - 0
  inner_cupids_bow: { type: 'single', indices: [0], label: 'Inner Cupid Bow', color: '#8b5cf6' },
  
  // 42. Mouth Middle - điểm nằm chính giữa đoạn thẳng nối điểm 13 và 14
  mouth_middle: { type: 'midpoint', indices: [13, 14], label: 'Mouth Middle', color: '#8b5cf6' },
  
  // 43. Left Upper Jaw Angle - 138
  left_upper_jaw_angle: { type: 'single', indices: [138], label: 'Left Upper Jaw Angle', color: '#f59e0b' },
  
  // 44. Right Upper Jaw Angle - 367
  right_upper_jaw_angle: { type: 'single', indices: [367], label: 'Right Upper Jaw Angle', color: '#f59e0b' },
  
  // 45. Left Lower Jaw Angle - 136
  left_lower_jaw_angle: { type: 'single', indices: [136], label: 'Left Lower Jaw Angle', color: '#f59e0b' },
  
  // 46. Right Lower Jaw Angle - 365
  right_lower_jaw_angle: { type: 'single', indices: [365], label: 'Right Lower Jaw Angle', color: '#f59e0b' },
  
  // 47. Left Chin - 149
  left_chin: { type: 'single', indices: [149], label: 'Left Chin', color: '#f59e0b' },
  
  // 48. Right Chin - 378
  right_chin: { type: 'single', indices: [378], label: 'Right Chin', color: '#f59e0b' },
  
  // 51. Left Cheekbone - điểm nằm chính giữa đoạn thẳng nối điểm 34 và 227
  left_cheekbone: { type: 'midpoint', indices: [34, 227], label: 'Left Cheekbone', color: '#ec4899' },
  
  // 52. Right Cheekbone - điểm nằm chính giữa đoạn thẳng nối điểm 264 và 447
  right_cheekbone: { type: 'midpoint', indices: [264, 447], label: 'Right Cheekbone', color: '#ec4899' },
}

/**
 * Detect front profile landmarks using MediaPipe mesh indices.
 */
function detectFrontLandmarks(
  mpLandmarks: MPFaceLandmark[]
): LandmarkPoint[] {
  const result: LandmarkPoint[] = []
  
  for (const [id, def] of Object.entries(FRONT_LANDMARK_INDICES)) {
    if (def.type === 'single') {
      const idx = def.indices[0]
      if (idx >= 0 && idx < mpLandmarks.length) {
        result.push({
          id,
          label: def.label,
          x: mpLandmarks[idx].x,
          y: mpLandmarks[idx].y,
          color: def.color,
        })
      }
    } else if (def.type === 'midpoint') {
      const idx1 = def.indices[0]
      const idx2 = def.indices[1]
      if (idx1 >= 0 && idx1 < mpLandmarks.length && idx2 >= 0 && idx2 < mpLandmarks.length) {
        result.push({
          id,
          label: def.label,
          x: (mpLandmarks[idx1].x + mpLandmarks[idx2].x) / 2,
          y: (mpLandmarks[idx1].y + mpLandmarks[idx2].y) / 2,
          color: def.color,
        })
      }
    } else if (def.type === 'extremum') {
      const extremumType = def.extremumType || 'minX'
      let best: { x: number; y: number } | null = null
      for (const i of def.indices) {
        if (i < 0 || i >= mpLandmarks.length) continue
        const p = mpLandmarks[i]
        if (!p) continue
        if (!best) { best = { x: p.x, y: p.y }; continue }
        if (extremumType === 'minX' && p.x < best.x) best = { x: p.x, y: p.y }
        else if (extremumType === 'maxX' && p.x > best.x) best = { x: p.x, y: p.y }
        else if (extremumType === 'minY' && p.y < best.y) best = { x: p.x, y: p.y }
        else if (extremumType === 'maxY' && p.y > best.y) best = { x: p.x, y: p.y }
      }
      if (best) {
        result.push({
          id,
          label: def.label,
          x: best.x,
          y: best.y,
          color: def.color,
        })
      }
    }
  }
  
  return result
}

// ============================================================
// SIDE PROFILE LANDMARK DETECTION (31 landmarks)
// ============================================================

function detectSideLandmarks(
  mpLandmarks: MPFaceLandmark[]
): LandmarkPoint[] {
  const g = (index: number) => {
    if (!mpLandmarks || index < 0 || index >= mpLandmarks.length) return null
    return { x: mpLandmarks[index].x, y: mpLandmarks[index].y }
  }
  const m = (a: { x: number; y: number } | null, b: { x: number; y: number } | null) => {
    if (!a || !b) return null
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  }
  const l = (a: { x: number; y: number } | null, b: { x: number; y: number } | null, t: number) => {
    if (!a || !b) return null
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
  }

  const noseTip = g(1)
  const isFacingLeft = noseTip ? noseTip.x < 0.5 : true

  const noseBottom = g(2)
  const noseBridgeTop = g(6)
  const noseBridgeMid = g(168)
  const subnasale = g(94)
  const columella = g(195)
  const leftAlar = g(49)
  const rightAlar = g(279)
  const chin = g(152)
  const chinBottom = g(199)
  const forehead = g(10)
  const glabella = g(8)

  const ear = isFacingLeft ? g(234) : g(454)
  const cheek = isFacingLeft ? g(50) : g(280)
  const neck = isFacingLeft ? g(172) : g(397)
  const temple = isFacingLeft ? g(137) : g(366)
  const alar = isFacingLeft ? leftAlar : rightAlar

  const eyeIndices = isFacingLeft
    ? [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246]
    : [362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398]
  const browUpper = isFacingLeft ? [46,53,52,65,55] : [276,283,282,295,285]
  const irisIdx = isFacingLeft ? 468 : 473

  const eyeOuter = (() => {
    let best: { x: number; y: number } | null = null
    for (const i of eyeIndices) {
      const p = mpLandmarks[i]; if (!p) continue
      if (!best || p.x > best.x) best = { x: p.x, y: p.y }
    }
    return best
  })()
  const eyeBottom = (() => {
    let best: { x: number; y: number } | null = null
    for (const i of eyeIndices) {
      const p = mpLandmarks[i]; if (!p) continue
      if (!best || p.y > best.y) best = { x: p.x, y: p.y }
    }
    return best
  })()
  const iris = g(irisIdx)
  const browPeak = (() => {
    let best: { x: number; y: number } | null = null
    for (const i of browUpper) {
      const p = mpLandmarks[i]; if (!p) continue
      if (!best || p.y < best.y) best = { x: p.x, y: p.y }
    }
    return best
  })()

  const mouthCorner = isFacingLeft ? g(61) : g(291)

  const jawSide = isFacingLeft
    ? [0,1,2,3,4,5,6,7,8]
    : [16,15,14,13,12,11,10,9,8]

  // Top of Head
  const topOfHead = (() => {
    let best: { x: number; y: number } | null = null
    for (const i of [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]) {
      const p = mpLandmarks[i]; if (!p) continue
      if (!best || p.y < best.y) best = { x: p.x, y: p.y }
    }
    return best
  })()

  // Occiput
  const occiput = (() => {
    const backIndices = isFacingLeft ? [10,11,12,13,14,15,16] : [0,1,2,3,4,5,6,7]
    let best: { x: number; y: number } | null = null
    for (const i of backIndices) {
      const p = mpLandmarks[i]; if (!p) continue
      if (!best || (isFacingLeft ? p.x < best.x : p.x > best.x)) best = { x: p.x, y: p.y }
    }
    return best
  })()

  // Upper Lip
  const upperLip = (() => {
    const indices = [0,37,39,40,185,61]
    let best: { x: number; y: number } | null = null
    for (const i of indices) {
      const p = mpLandmarks[i]; if (!p) continue
      if (!best || (isFacingLeft ? p.x > best.x : p.x < best.x)) best = { x: p.x, y: p.y }
    }
    return best
  })()

  // Lower Lip
  const lowerLip = (() => {
    const indices = [17,314,405,321,375,291]
    let best: { x: number; y: number } | null = null
    for (const i of indices) {
      const p = mpLandmarks[i]; if (!p) continue
      if (!best || (isFacingLeft ? p.x > best.x : p.x < best.x)) best = { x: p.x, y: p.y }
    }
    return best
  })()

  // Lower Jaw Angle (Gonion)
  const lowerJawAngle = (() => {
    let bestScore = -Infinity
    let best: { x: number; y: number } | null = null
    for (let ci = 2; ci < jawSide.length - 2; ci++) {
      const i = jawSide[ci]; const p = mpLandmarks[i]; if (!p) continue
      const prev = mpLandmarks[jawSide[ci - 2]]; if (!prev) continue
      const next = mpLandmarks[jawSide[ci + 2]]; if (!next) continue
      const v1x = p.x - prev.x; const v1y = p.y - prev.y
      const v2x = next.x - p.x; const v2y = next.y - p.y
      const len1 = Math.sqrt(v1x*v1x + v1y*v1y); const len2 = Math.sqrt(v2x*v2x + v2y*v2y)
      if (len1 < 0.001 || len2 < 0.001) continue
      const dot = (v1x/len1)*(v2x/len2) + (v1y/len1)*(v2y/len2)
      const curvature = 1 - dot
      if (curvature > bestScore) { bestScore = curvature; best = { x: p.x, y: p.y } }
    }
    return best
  })()

  const L = (id: string, label: string, p: { x: number; y: number } | null, color?: string): LandmarkPoint | null => {
    if (!p) return null
    return { id, label, x: p.x, y: p.y, color }
  }

  const landmarks: (LandmarkPoint | null)[] = [
    L("top_of_head", "Top of Head", topOfHead, "#6b7280"),
    L("occiput", "Occiput", occiput, "#6b7280"),
    L("hairline_profile", "Hairline (Profile)", forehead ? { x: forehead.x, y: Math.max(0, forehead.y - 0.06) } : null, "#f59e0b"),
    L("forehead", "Forehead", forehead, "#f59e0b"),
    L("glabella", "Glabella", glabella, "#f59e0b"),
    L("corneal_apex", "Corneal Apex", iris, "#38bdf8"),
    L("eyelid_end", "Eyelid End", eyeOuter, "#38bdf8"),
    L("lower_eyelid", "Lower Eyelid", eyeBottom, "#38bdf8"),
    L("orbitale", "Orbitale", eyeBottom, "#38bdf8"),
    L("cheekbone", "Cheekbone", cheek, "#a78bfa"),
    L("nasal_bridge_root", "Nasal Bridge Root", noseBridgeTop, "#f97316"),
    L("rhinion", "Rhinion", noseBridgeMid, "#f97316"),
    L("supratip", "Supratip", l(noseBridgeMid, noseTip, 0.7), "#f97316"),
    L("nose_tip", "Nose Tip", noseTip, "#f97316"),
    L("infratip", "Infratip", l(noseTip, columella, 0.3), "#f97316"),
    L("columella", "Columella", columella, "#f97316"),
    L("subnasale", "Subnasale", subnasale, "#f97316"),
    L("subalare", "Subalare", alar, "#f97316"),
    L("upper_lip", "Upper Lip", upperLip, "#ec4899"),
    L("lower_lip", "Lower Lip", lowerLip, "#ec4899"),
    L("mouth_corner", "Mouth Corner", mouthCorner, "#ec4899"),
    L("labiomental_fold", "Labiomental Fold", l(lowerLip, chin, 0.35), "#8b5cf6"),
    L("chin_point", "Chin Point", chin, "#8b5cf6"),
    L("chin_bottom", "Chin Bottom", chinBottom, "#8b5cf6"),
    L("tragus", "Tragus", ear, "#6b7280"),
    L("intertragic_notch", "Intertragic Notch", ear ? { x: ear.x, y: ear.y + 0.02 } : null, "#6b7280"),
    L("porion", "Porion", ear ? { x: ear.x, y: ear.y - 0.02 } : null, "#6b7280"),
    L("upper_jaw_angle", "Upper Jaw Angle", (() => {
      if (!lowerLip || !chin) return null
      const midY = (lowerLip.y + chin.y) / 2
      let best = null; let bestDist = Infinity
      for (const i of jawSide) {
        const p = mpLandmarks[i]; if (!p) continue
        const d = Math.abs(p.y - midY)
        if (d < bestDist) { bestDist = d; best = { x: p.x, y: p.y } }
      }
      return best
    })(), "#8b5cf6"),
    L("lower_jaw_angle", "Lower Jaw Angle", lowerJawAngle, "#8b5cf6"),
    L("cervical_point", "Cervical Point", neck, "#6b7280"),
    L("neck_point", "Neck Point", neck ? { x: neck.x, y: neck.y + 0.03 } : null, "#6b7280"),
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
