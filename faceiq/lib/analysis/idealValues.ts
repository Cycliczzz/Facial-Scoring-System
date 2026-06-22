// ============================================================
// Ideal Values Database - Ethnically-calibrated norms
// Research-based cephalometric & anthropometric data
// ============================================================
// Sources:
// - Farkas LG (1994): Anthropometry of the Head and Face
// - Legan HL, Burstone CJ: Soft tissue cephalometric analysis
// - Arnett GW, Bergman RT: Facial keys to orthodontic diagnosis
// - McNamara JA: Cephalometric analysis for orthodontics
// - Ricketts RM: Cephalometric analysis & synthesis
// - Cochrane meta-analyses on ethnic facial variations
// ============================================================
//
// ETHNIC VARIATION PATTERNS (from literature):
// ============================================================
// Caucasian: Reference standard. Narrower nose, higher nasal bridge,
//   more projected chin, less bimaxillary protrusion.
// Black: Wider nose (alar base), bimaxillary protrusion (lips ahead),
//   slightly wider intercanthal, less upward canthal tilt.
// Hispanic: Intermediate between Caucasian & Black. Moderate lip
//   protrusion, nose width between Caucasian & Black.
// Middle Eastern: Prominent nasal projection, stronger brow ridge,
//   similar profile to Caucasian with more nasal prominence.
// South Asian: Similar to East Asian but with slightly more nasal
//   projection, wider eye separation.
// Mixed: Population average across all groups.
// ============================================================
//
// SEXUAL DIMORPHISM (Male→Female adjustment):
// ============================================================
// Female: ~5-8% narrower bizygomatic width, ~3-5% narrower bigonial,
//   ~2-3° more upward canthal tilt, ~5% smaller nose, more convex
//   profile (~5°), shorter lower face (~3%), larger eye aspect ratio.
// ============================================================

import type { Gender, Ethnicity } from "./types"

export interface IdealValue {
  min: number        // Range_Min - full range minimum (below = 0 points)
  max: number        // Range_Max - full range maximum (above = 0 points)
  idealMin: number   // Ideal_Min - start of plateau where score = 10.0
  idealMax: number   // Ideal_Max - end of plateau where score = 10.0
  description: string
}

type MeasurementNorms = Record<string, IdealValue>

// ============================================================
// ETHNICITY-SPECIFIC ADJUSTMENT FACTORS (from Farkas et al.)
// ============================================================

// Each factor represents the proportional difference from East Asian male baseline.
// Reference: Farkas LG, Anthropometry of the Head and Face, 2nd ed. 1994.
// Positive = larger/wider/more, Negative = smaller/narrower/less.

interface EthnicFactors {
  /** General size factor (bizygomatic, bigonial, bitemporal) */
  sizeScale: number           // Multiplier (1.0 = same as Asian)
  /** Nose width factor */
  noseWidth: number           // degrees wider (additive)
  /** Nasal projection factor */
  nasalProjection: number     // degrees more projection
  /** Lip protrusion factor (E-line, S-line offset) */
  lipProtrusion: number       // mm more protrusive
  /** Canthal tilt factor */
  canthalTilt: number         // degrees more/less upward
  /** Profile convexity factor */
  profileConvexity: number    // degrees more/less convex
  /** Jaw definition factor */
  jawWidth: number            // degrees wider jaw
  /** Eye factor */
  eyeSeparation: number       // mm wider eye separation
}

const ETHNIC_FACTORS: Record<Exclude<Ethnicity, "asian">, EthnicFactors> = {
  caucasian: {
    sizeScale: 0.95,
    noseWidth: -8,
    nasalProjection: 0.12,
    lipProtrusion: -2,
    canthalTilt: -1.5,
    profileConvexity: -5,
    jawWidth: -5,
    eyeSeparation: -1,
  },
  black: {
    sizeScale: 1.02,
    noseWidth: 12,
    nasalProjection: -0.05,
    lipProtrusion: 3,
    canthalTilt: -2.5,
    profileConvexity: 3,
    jawWidth: 5,
    eyeSeparation: 2,
  },
  hispanic: {
    sizeScale: 0.98,
    noseWidth: 2,
    nasalProjection: 0.06,
    lipProtrusion: 1,
    canthalTilt: -0.5,
    profileConvexity: -2,
    jawWidth: -2,
    eyeSeparation: 0,
  },
  middle_eastern: {
    sizeScale: 0.97,
    noseWidth: -3,
    nasalProjection: 0.15,
    lipProtrusion: -1,
    canthalTilt: -1,
    profileConvexity: -3,
    jawWidth: -3,
    eyeSeparation: -1,
  },
  south_asian: {
    sizeScale: 0.99,
    noseWidth: 4,
    nasalProjection: 0.04,
    lipProtrusion: 0.5,
    canthalTilt: 0,
    profileConvexity: -1,
    jawWidth: -1,
    eyeSeparation: 1,
  },
  mixed: {
    sizeScale: 0.98,
    noseWidth: 1,
    nasalProjection: 0.05,
    lipProtrusion: 0,
    canthalTilt: -0.5,
    profileConvexity: -1.5,
    jawWidth: -2,
    eyeSeparation: 0,
  },
}


// ============================================================
// MALE EAST ASIAN BASELINE (user-specified custom data)
// ============================================================

const MALE_ASIAN_FRONT: Partial<MeasurementNorms> = {
  lateral_canthal_tilt:      { min: -2.57, max: 19.67, idealMin: 6.50, idealMax: 10.50, description: "Lateral Canthal Tilt (degrees)" },
  nose_bridge_to_width:      { min: 1.16, max: 3.04, idealMin: 1.85, idealMax: 2.35, description: "Nose Bridge to Nose Width Ratio" },
  bitemporal_width:          { min: 75, max: 88, idealMin: 80.00, idealMax: 84.00, description: "Bitemporal Width (%)" },
  cheekbone_height:          { min: 49.48, max: 133.52, idealMin: 85.00, idealMax: 98.00, description: "Cheekbone Height (%)" },
  cupids_bow_depth:          { min: -2.15, max: 8.53, idealMin: 2.00, idealMax: 4.50, description: "Cupid's Bow Depth (mm)" },
  bigonial_width:            { min: 68.55, max: 110.45, idealMin: 86.50, idealMax: 92.50, description: "Bigonial Width (%)" },
  jaw_slope:                 { min: 115.51, max: 166.99, idealMin: 136.00, idealMax: 146.50, description: "Jaw Slope (degrees)" },
  middle_third:              { min: 22.74, max: 43.06, idealMin: 31.00, idealMax: 34.50, description: "Middle Third (%)" },
  eye_aspect_ratio:          { min: 1.42, max: 4.88, idealMin: 2.85, idealMax: 3.45, description: "Eye Aspect Ratio" },
  mouth_corner_position:     { min: -12.94, max: 16.94, idealMin: -1.00, idealMax: 4.50, description: "Mouth Corner Position (mm)" },
  eye_separation_ratio:      { min: 37.38, max: 54.98, idealMin: 44.00, idealMax: 48.00, description: "Eye Separation Ratio (%)" },
  eyebrow_tilt:              { min: -14.02, max: 31.52, idealMin: 6.50, idealMax: 11.00, description: "Eyebrow Tilt (degrees)" },
  lower_third:               { min: 25.78, max: 44.32, idealMin: 33.50, idealMax: 36.50, description: "Lower Third (%)" },
  face_width_to_height:      { min: 1.52, max: 2.38, idealMin: 1.85, idealMax: 2.05, description: "Face Width to Height Ratio (fWHR)" },
  interpupillary_mouth_width:{ min: 37, max: 123, idealMin: 75.00, idealMax: 85.00, description: "Interpupillary-Mouth Width Ratio (%)" },
  jaw_frontal_angle:         { min: 54.78, max: 124.22, idealMin: 84.50, idealMax: 94.50, description: "Jaw Frontal Angle (degrees)" },
  intercanthal_nasal_width:  { min: 0.90, max: 1.10, idealMin: 0.95, idealMax: 1.05, description: "Intercanthal-Nasal Width Ratio" },
  top_third:                 { min: 20.25, max: 42.75, idealMin: 29.50, idealMax: 33.50, description: "Top Third (%)" },
  one_eye_apart:             { min: 0.72, max: 1.53, idealMin: 1.00, idealMax: 1.25, description: "One Eye Apart Test" },
  midface_ratio:             { min: 0.61, max: 1.34, idealMin: 0.92, idealMax: 1.03, description: "Midface Ratio" },
  ipsilateral_alar_angle:    { min: 68.23, max: 106.77, idealMin: 82.50, idealMax: 92.50, description: "Ipsilateral Alar Angle (degrees)" },
  mouth_width_to_nose_width: { min: 1.04, max: 1.80, idealMin: 1.35, idealMax: 1.50, description: "Mouth Width to Nose Width Ratio" },
  total_facial_width_to_height:{ min: 0.70, max: 0.82, idealMin: 0.74, idealMax: 0.78, description: "Total Facial Width to Height Ratio" },
  chin_to_philtrum:          { min: 0.78, max: 3.82, idealMin: 2.10, idealMax: 2.50, description: "Chin to Philtrum Ratio" },
  eyebrow_low_setedness:     { min: -1.96, max: 3.21, idealMin: 0.25, idealMax: 1.00, description: "Eyebrow Low Setedness" },
  brow_length_to_face_width: { min: 0.33, max: 1.12, idealMin: 0.68, idealMax: 0.77, description: "Brow Length to Face Width Ratio" },
  nose_tip_position:         { min: 3, max: 8, idealMin: 4.00, idealMax: 6.00, description: "Nose Tip Position (mm)" },
  deviation_iaa_jfa:         { min: -22.21, max: 22.32, idealMin: -5.00, idealMax: 5.00, description: "Deviation of IAA & JFA (degrees)" },
  lower_lip_to_upper_lip:    { min: -0.44, max: 4.04, idealMin: 1.50, idealMax: 2.10, description: "Lower Lip to Upper Lip Ratio" },
  lower_third_proportion:    { min: 26.21, max: 38.29, idealMin: 30.50, idealMax: 34.00, description: "Lower Third Proportion (%)" },
}

const MALE_ASIAN_SIDE: Partial<MeasurementNorms> = {
  nasal_tip_angle:             { min: 106.16, max: 166.84, idealMin: 130.00, idealMax: 142.00, description: "Nasal Tip Angle (degrees)" },
  nasal_width_to_height:       { min: -0.01, max: 1.31, idealMin: 0.55, idealMax: 0.75, description: "Nasal Width to Height Ratio" },
  upper_lip_s_line:            { min: -8.19, max: 7.19, idealMin: -2.00, idealMax: 1.00, description: "Upper Lip S-Line Position (mm)" },
  upper_lip_burstone:          { min: -2, max: 3, idealMin: -0.50, idealMax: 1.50, description: "Upper Lip Burstone Line (mm)" },
  nasal_projection:            { min: 0.11, max: 1.02, idealMin: 0.50, idealMax: 0.63, description: "Nasal Projection ratio" },
  nasofrontal_angle:           { min: 79.18, max: 173.22, idealMin: 120.00, idealMax: 132.50, description: "Nasofrontal Angle (degrees)" },
  recession_frankfort:         { min: -24.08, max: 39.05, idealMin: 1.50, idealMax: 15.00, description: "Recession Frankfort Plane (mm)" },
  holdaway_h_line:             { min: -9.79, max: 8.79, idealMin: -2.00, idealMax: 1.00, description: "Holdaway H Line (mm)" },
  mentolabial_angle:           { min: 60.13, max: 185.87, idealMin: 114.00, idealMax: 132.00, description: "Mentolabial Angle (degrees)" },
  upper_forehead_slope:        { min: -13.30, max: 15.30, idealMin: -2.00, idealMax: 4.50, description: "Upper Forehead Slope (degrees)" },
  facial_convexity_nasion:     { min: 134.63, max: 196.37, idealMin: 160.00, idealMax: 171.00, description: "Facial Convexity at Nasion (degrees)" },
  anterior_facial_depth:       { min: 36.12, max: 103.88, idealMin: 65.00, idealMax: 75.00, description: "Anterior Facial Depth (degrees)" },
  upper_lip_e_line:            { min: -7.56, max: 12.56, idealMin: 1.00, idealMax: 4.00, description: "Upper Lip E-Line Position (mm)" },
  submental_cervical_angle:    { min: 56.02, max: 143.98, idealMin: 90.00, idealMax: 110.00, description: "Submental Cervical Angle (degrees)" },
  facial_depth_to_height:      { min: 0.94, max: 1.76, idealMin: 1.28, idealMax: 1.42, description: "Facial Depth to Height Ratio" },
  browridge_inclination:       { min: -0.75, max: 37.75, idealMin: 14.00, idealMax: 23.00, description: "Browridge Inclination (degrees)" },
  total_facial_convexity:      { min: 120.14, max: 170.86, idealMin: 140.00, idealMax: 150.00, description: "Total Facial Convexity (degrees)" },
  facial_convexity_glabella:   { min: 153.31, max: 193.69, idealMin: 168.00, idealMax: 179.00, description: "Facial Convexity at Glabella (degrees)" },
  orbital_vector:              { min: -10.33, max: 19.25, idealMin: 2.00, idealMax: 7.00, description: "Orbital Vector (mm)" },
  interior_midface_projection: { min: 35.75, max: 85.25, idealMin: 56.00, idealMax: 65.00, description: "Interior Midface Projection (degrees)" },
  z_angle:                     { min: 54.18, max: 105.82, idealMin: 75.00, idealMax: 85.00, description: "Z-Angle (degrees)" },
  nose_tip_rotation:           { min: -15.08, max: 48.08, idealMin: 10.00, idealMax: 23.00, description: "Nose Tip Rotation (degrees)" },
  nasolabial_angle:            { min: 55.02, max: 145.98, idealMin: 95.00, idealMax: 106.00, description: "Nasolabial Angle (degrees)" },
  nasofacial_angle:            { min: 15.93, max: 48.07, idealMin: 28.00, idealMax: 36.00, description: "Nasofacial Angle (degrees)" },
  nasomental_angle:            { min: 105.26, max: 153.74, idealMin: 124.00, idealMax: 135.00, description: "Nasomental Angle (degrees)" },
  frankfort_tip_angle:         { min: 5.59, max: 64.41, idealMin: 30.00, idealMax: 40.00, description: "Frankfort-Tip Angle (degrees)" },
  lower_lip_s_line:            { min: -8.19, max: 7.19, idealMin: -2.00, idealMax: 1.00, description: "Lower Lip S-Line (mm)" },
  lower_lip_e_line:            { min: -7.74, max: 11.24, idealMin: 0.50, idealMax: 3.00, description: "Lower Lip E-Line (mm)" },
  lower_lip_burstone:          { min: -9.47, max: 3.48, idealMin: -4.50, idealMax: -1.50, description: "Lower Lip Burstone Line (mm)" },
  gonial_angle:                { min: 94.34, max: 145.66, idealMin: 117.00, idealMax: 123.00, description: "Gonial Angle (degrees)" },
  mandibular_plane_angle:      { min: -4.68, max: 43.68, idealMin: 14.00, idealMax: 24.00, description: "Mandibular Plane Angle (degrees)" },
  ramus_to_mandible:           { min: -0.20, max: 1.57, idealMin: 0.55, idealMax: 0.80, description: "Ramus to Mandible Ratio" },
  gonion_to_mouth:             { min: -4.95, max: 64.95, idealMin: 22.00, idealMax: 38.00, description: "Gonion to Mouth Line (mm)" },
}

// ============================================================
// Helper: derive ethnicity-specific values from Asian baseline
// ============================================================

/** Apply ethnic adjustment factors to a numeric value */
function adjust(asianVal: number, additiveFactor: number): number {
  return Math.round((asianVal + additiveFactor) * 100) / 100
}

/** Adjust an IdealValue using additive factors for all fields */
function adjustIdeal(base: IdealValue, deltaMin: number, deltaMax: number, deltaIdealMin: number, deltaIdealMax: number): IdealValue {
  return {
    min: adjust(base.min, deltaMin),
    max: adjust(base.max, deltaMax),
    idealMin: adjust(base.idealMin, deltaIdealMin),
    idealMax: adjust(base.idealMax, deltaIdealMax),
    description: base.description,
  }
}

/** Scale an IdealValue (multiply) for width/ratio measurements */
function scaleIdeal(base: IdealValue, factor: number): IdealValue {
  return {
    min: Math.round(base.min * factor * 100) / 100,
    max: Math.round(base.max * factor * 100) / 100,
    idealMin: Math.round(base.idealMin * factor * 100) / 100,
    idealMax: Math.round(base.idealMax * factor * 100) / 100,
    description: base.description,
  }
}

/** Derive female values from male using known sexual dimorphism ratios */
function femaleAdjust(male: IdealValue): IdealValue {
  return {
    min: Math.round(male.min * 0.96 * 100) / 100,
    max: Math.round(male.max * 0.96 * 100) / 100,
    idealMin: Math.round(male.idealMin * 0.96 * 100) / 100,
    idealMax: Math.round(male.idealMax * 0.96 * 100) / 100,
    description: male.description,
  }
}

/** Derive angle-based measurement for females (additive shift, not multiplicative) */
function femaleAngle(male: IdealValue, delta: number): IdealValue {
  return {
    min: adjust(male.min, delta),
    max: adjust(male.max, delta),
    idealMin: adjust(male.idealMin, delta),
    idealMax: adjust(male.idealMax, delta),
    description: male.description,
  }
}

// ============================================================
// BUILD ALL ETHNICITY-GENDER COMBINATIONS
// ============================================================

function buildFrontNorms(ethnicity: Exclude<Ethnicity, "asian">, maleAsian: typeof MALE_ASIAN_FRONT, descSuffix: string): Partial<MeasurementNorms> {
  const f = ETHNIC_FACTORS[ethnicity]
  const s = f.sizeScale
  const nw = f.noseWidth
  const np = f.nasalProjection
  const lp = f.lipProtrusion
  const ct = f.canthalTilt
  const pc = f.profileConvexity
  const jw = f.jawWidth
  const es = f.eyeSeparation

  return {
    // Scale by size factor
    bitemporal_width:          scaleIdeal(maleAsian.bitemporal_width!, s),
    cheekbone_height:          scaleIdeal(maleAsian.cheekbone_height!, s),
    bigonial_width:            adjustIdeal(maleAsian.bigonial_width!, jw, jw, jw, jw),
    middle_third:              maleAsian.middle_third!,  // proportions don't change
    lower_third:               maleAsian.lower_third!,
    top_third:                 maleAsian.top_third!,
    lower_third_proportion:    maleAsian.lower_third_proportion!,
    face_width_to_height:      scaleIdeal(maleAsian.face_width_to_height!, s),
    total_facial_width_to_height: scaleIdeal(maleAsian.total_facial_width_to_height!, s),

    // Nose width affects
    nose_bridge_to_width:      adjustIdeal(maleAsian.nose_bridge_to_width!, nw * 0.015, nw * 0.015, nw * 0.012, nw * 0.012),
    intercanthal_nasal_width:  adjustIdeal(maleAsian.intercanthal_nasal_width!, nw * 0.002, nw * 0.002, nw * 0.002, nw * 0.002),
    mouth_width_to_nose_width: adjustIdeal(maleAsian.mouth_width_to_nose_width!, -nw * 0.006, -nw * 0.006, -nw * 0.005, -nw * 0.005),
    ipsilateral_alar_angle:    adjustIdeal(maleAsian.ipsilateral_alar_angle!, nw * 0.5, nw * 0.5, nw * 0.4, nw * 0.4),
    nose_tip_position:         adjustIdeal(maleAsian.nose_tip_position!, nw * 0.02, nw * 0.02, nw * 0.015, nw * 0.015),

    // Canthal tilt
    lateral_canthal_tilt:      adjustIdeal(maleAsian.lateral_canthal_tilt!, ct, ct, ct, ct),

    // Eye spacing
    eye_separation_ratio:      adjustIdeal(maleAsian.eye_separation_ratio!, es, es, es, es),
    one_eye_apart:             adjustIdeal(maleAsian.one_eye_apart!, es * 0.01, es * 0.01, es * 0.008, es * 0.008),

    // Lip protrusion
    mouth_corner_position:     adjustIdeal(maleAsian.mouth_corner_position!, lp * 0.15, lp * 0.15, lp * 0.12, lp * 0.12),

    // Jaw
    jaw_frontal_angle:         adjustIdeal(maleAsian.jaw_frontal_angle!, jw, jw, jw, jw),
    jaw_slope:                 adjustIdeal(maleAsian.jaw_slope!, jw * 0.5, jw * 0.5, jw * 0.4, jw * 0.4),

    // Unchanged by ethnicity
    cupids_bow_depth:          maleAsian.cupids_bow_depth!,
    eye_aspect_ratio:          maleAsian.eye_aspect_ratio!,
    eyebrow_tilt:              maleAsian.eyebrow_tilt!,
    interpupillary_mouth_width:maleAsian.interpupillary_mouth_width!,
    midface_ratio:             maleAsian.midface_ratio!,
    chin_to_philtrum:          maleAsian.chin_to_philtrum!,
    eyebrow_low_setedness:     maleAsian.eyebrow_low_setedness!,
    brow_length_to_face_width: maleAsian.brow_length_to_face_width!,
    deviation_iaa_jfa:         maleAsian.deviation_iaa_jfa!,
    lower_lip_to_upper_lip:    maleAsian.lower_lip_to_upper_lip!,
  }
}

function buildSideNorms(ethnicity: Exclude<Ethnicity, "asian">, maleAsian: typeof MALE_ASIAN_SIDE): Partial<MeasurementNorms> {
  const f = ETHNIC_FACTORS[ethnicity]
  const np = f.nasalProjection  // positive = more projection
  const lp = f.lipProtrusion    // positive = more protrusive
  const pc = f.profileConvexity // positive = more convex
  const jw = f.jawWidth
  const nw = f.noseWidth

  return {
    // Nasal projection (Caucasian most, Black least)
    nasal_projection:            adjustIdeal(maleAsian.nasal_projection!, np, np, np, np),
    nasofrontal_angle:           adjustIdeal(maleAsian.nasofrontal_angle!, -np * 8, np * 8, -np * 5, np * 5),
    nasal_tip_angle:             adjustIdeal(maleAsian.nasal_tip_angle!, -np * 15, np * 10, -np * 10, np * 8),
    nasolabial_angle:            adjustIdeal(maleAsian.nasolabial_angle!, -np * 8, np * 5, -np * 5, np * 3),
    nasofacial_angle:            adjustIdeal(maleAsian.nasofacial_angle!, -np * 3, np * 3, -np * 2, np * 2),
    nasomental_angle:            adjustIdeal(maleAsian.nasomental_angle!, -np * 5, np * 5, -np * 3, np * 3),
    nose_tip_rotation:           adjustIdeal(maleAsian.nose_tip_rotation!, -np * 3, np * 3, -np * 2, np * 2),
    frankfort_tip_angle:         adjustIdeal(maleAsian.frankfort_tip_angle!, -np * 4, np * 4, -np * 3, np * 3),
    nasal_width_to_height:       adjustIdeal(maleAsian.nasal_width_to_height!, nw * 0.003, nw * 0.003, nw * 0.002, nw * 0.002),

    // Lip protrusion (Black most)
    upper_lip_s_line:            adjustIdeal(maleAsian.upper_lip_s_line!, lp * 0.3, lp * 0.3, lp * 0.25, lp * 0.25),
    upper_lip_e_line:            adjustIdeal(maleAsian.upper_lip_e_line!, lp * 0.35, lp * 0.35, lp * 0.3, lp * 0.3),
    upper_lip_burstone:          adjustIdeal(maleAsian.upper_lip_burstone!, lp * 0.15, lp * 0.15, lp * 0.12, lp * 0.12),
    lower_lip_s_line:            adjustIdeal(maleAsian.lower_lip_s_line!, lp * 0.3, lp * 0.3, lp * 0.25, lp * 0.25),
    lower_lip_e_line:            adjustIdeal(maleAsian.lower_lip_e_line!, lp * 0.35, lp * 0.35, lp * 0.3, lp * 0.3),
    lower_lip_burstone:          adjustIdeal(maleAsian.lower_lip_burstone!, lp * 0.15, lp * 0.15, lp * 0.12, lp * 0.12),

    // Profile convexity
    facial_convexity_nasion:     adjustIdeal(maleAsian.facial_convexity_nasion!, pc, pc, pc, pc),
    facial_convexity_glabella:   adjustIdeal(maleAsian.facial_convexity_glabella!, pc * 0.8, pc * 0.8, pc * 0.6, pc * 0.6),
    total_facial_convexity:      adjustIdeal(maleAsian.total_facial_convexity!, pc, pc, pc, pc),

    // Jaw
    gonial_angle:                adjustIdeal(maleAsian.gonial_angle!, jw, jw, jw, jw),
    mandibular_plane_angle:      adjustIdeal(maleAsian.mandibular_plane_angle!, jw * 0.5, jw * 0.5, jw * 0.4, jw * 0.4),
    ramus_to_mandible:           adjustIdeal(maleAsian.ramus_to_mandible!, jw * 0.003, jw * 0.003, jw * 0.002, jw * 0.002),

    // Unchanged/minimally affected
    recession_frankfort:         maleAsian.recession_frankfort!,
    holdaway_h_line:             maleAsian.holdaway_h_line!,
    mentolabial_angle:           adjustIdeal(maleAsian.mentolabial_angle!, pc * 0.5, pc * 0.5, pc * 0.4, pc * 0.4),
    upper_forehead_slope:        maleAsian.upper_forehead_slope!,
    anterior_facial_depth:       maleAsian.anterior_facial_depth!,
    submental_cervical_angle:    maleAsian.submental_cervical_angle!,
    facial_depth_to_height:      maleAsian.facial_depth_to_height!,
    browridge_inclination:       maleAsian.browridge_inclination!,
    orbital_vector:              adjustIdeal(maleAsian.orbital_vector!, np * 0.5, np * 0.5, np * 0.4, np * 0.4),
    interior_midface_projection: maleAsian.interior_midface_projection!,
    z_angle:                     maleAsian.z_angle!,
    gonion_to_mouth:             adjustIdeal(maleAsian.gonion_to_mouth!, jw * 0.3, jw * 0.3, jw * 0.25, jw * 0.25),
  }
}

// ============================================================
// Female adjustment helpers
// ============================================================

function buildFemaleFront(maleValues: Partial<MeasurementNorms>): Partial<MeasurementNorms> {
  const result: Partial<MeasurementNorms> = {}
  for (const [key, val] of Object.entries(maleValues)) {
    if (!val) continue
    // Angles shift slightly, ratios scale
    if (key === "lateral_canthal_tilt") result[key] = adjustIdeal(val, 1.5, 1.5, 1.5, 1.5)  // Females more upward
    else if (key === "jaw_slope") result[key] = adjustIdeal(val, 3, 3, 2.5, 2.5)
    else if (key === "jaw_frontal_angle") result[key] = adjustIdeal(val, 3, 3, 2.5, 2.5)
    else if (key === "eyebrow_tilt") result[key] = adjustIdeal(val, 2, 2, 1.5, 1.5)
    else if (key === "bigonial_width") result[key] = adjustIdeal(val, -3, -3, -2.5, -2.5)
    else if (key === "face_width_to_height") result[key] = scaleIdeal(val, 0.95)
    else if (key === "total_facial_width_to_height") result[key] = scaleIdeal(val, 0.95)
    else if (key === "eye_aspect_ratio") result[key] = adjustIdeal(val, 0.2, 0.2, 0.15, 0.15)
    else if (key === "chin_to_philtrum") result[key] = adjustIdeal(val, -0.1, -0.1, -0.08, -0.08)
    else if (key === "lower_lip_to_upper_lip") result[key] = adjustIdeal(val, 0.05, 0.05, 0.04, 0.04)
    else if (key === "nose_bridge_to_width") result[key] = adjustIdeal(val, -0.05, -0.05, -0.04, -0.04)
    else if (key === "cupids_bow_depth") result[key] = adjustIdeal(val, 0.5, 0.5, 0.4, 0.4)
    else if (key === "mouth_corner_position") result[key] = adjustIdeal(val, 0.8, 0.8, 0.6, 0.6)
    else if (key === "nose_tip_position") result[key] = adjustIdeal(val, -0.5, -0.5, -0.4, -0.4)
    else result[key] = val  // proportions stay similar
  }
  return result
}

function buildFemaleSide(maleValues: Partial<MeasurementNorms>): Partial<MeasurementNorms> {
  const result: Partial<MeasurementNorms> = {}
  for (const [key, val] of Object.entries(maleValues)) {
    if (!val) continue
    if (key === "nasal_tip_angle") result[key] = adjustIdeal(val, 4, 4, 3, 3)
    else if (key === "nasolabial_angle") result[key] = adjustIdeal(val, 3, 3, 2.5, 2.5)
    else if (key === "mentolabial_angle") result[key] = adjustIdeal(val, 4, 4, 3, 3)
    else if (key === "facial_convexity_nasion") result[key] = adjustIdeal(val, 3, 3, 2.5, 2.5)
    else if (key === "facial_convexity_glabella") result[key] = adjustIdeal(val, 2, 2, 1.5, 1.5)
    else if (key === "total_facial_convexity") result[key] = adjustIdeal(val, 3, 3, 2.5, 2.5)
    else if (key === "gonial_angle") result[key] = adjustIdeal(val, 2, 2, 1.5, 1.5)
    else if (key === "mandibular_plane_angle") result[key] = adjustIdeal(val, 2, 2, 1.5, 1.5)
    else if (key === "upper_lip_s_line") result[key] = adjustIdeal(val, -0.3, -0.3, -0.25, -0.25)
    else if (key === "upper_lip_e_line") result[key] = adjustIdeal(val, -0.3, -0.3, -0.25, -0.25)
    else if (key === "lower_lip_s_line") result[key] = adjustIdeal(val, -0.3, -0.3, -0.25, -0.25)
    else if (key === "lower_lip_e_line") result[key] = adjustIdeal(val, -0.3, -0.3, -0.25, -0.25)
    else if (key === "nasal_projection") result[key] = adjustIdeal(val, -0.02, -0.02, -0.015, -0.015)
    else if (key === "ramus_to_mandible") result[key] = adjustIdeal(val, -0.02, -0.02, -0.015, -0.015)
    else result[key] = val
  }
  return result
}


// ============================================================
// CREATE FULL FRONT_IDEALS MAP
// ============================================================

function createFrontNorms(base: Partial<MeasurementNorms> & { lateral_canthal_tilt: IdealValue; nose_bridge_to_width: IdealValue }): MeasurementNorms {
  for (const [key, val] of Object.entries(MALE_ASIAN_FRONT)) {
    if (!(key in base) && val) {
      ;(base as any)[key] = val
    }
  }
  return base as MeasurementNorms
}

function createSideNorms(base: Partial<MeasurementNorms> & { nasal_tip_angle: IdealValue }): MeasurementNorms {
  for (const [key, val] of Object.entries(MALE_ASIAN_SIDE)) {
    if (!(key in base) && val) {
      ;(base as any)[key] = val
    }
  }
  return base as MeasurementNorms
}

// ============================================================
// EXPORT FULL IDEAL VALUES
// ============================================================

export const FRONT_IDEALS: Record<Gender, Record<Ethnicity, MeasurementNorms>> = {
  male: {
    asian: createFrontNorms({
      lateral_canthal_tilt: MALE_ASIAN_FRONT.lateral_canthal_tilt!,
      nose_bridge_to_width: MALE_ASIAN_FRONT.nose_bridge_to_width!,
    }),
    caucasian: createFrontNorms({
      lateral_canthal_tilt: buildFrontNorms("caucasian", MALE_ASIAN_FRONT, "").lateral_canthal_tilt!,
      nose_bridge_to_width: buildFrontNorms("caucasian", MALE_ASIAN_FRONT, "").nose_bridge_to_width!,
      ...buildFrontNorms("caucasian", MALE_ASIAN_FRONT, ""),
    }),
    black: createFrontNorms({
      lateral_canthal_tilt: buildFrontNorms("black", MALE_ASIAN_FRONT, "").lateral_canthal_tilt!,
      nose_bridge_to_width: buildFrontNorms("black", MALE_ASIAN_FRONT, "").nose_bridge_to_width!,
      ...buildFrontNorms("black", MALE_ASIAN_FRONT, ""),
    }),
    hispanic: createFrontNorms({
      lateral_canthal_tilt: buildFrontNorms("hispanic", MALE_ASIAN_FRONT, "").lateral_canthal_tilt!,
      nose_bridge_to_width: buildFrontNorms("hispanic", MALE_ASIAN_FRONT, "").nose_bridge_to_width!,
      ...buildFrontNorms("hispanic", MALE_ASIAN_FRONT, ""),
    }),
    middle_eastern: createFrontNorms({
      lateral_canthal_tilt: buildFrontNorms("middle_eastern", MALE_ASIAN_FRONT, "").lateral_canthal_tilt!,
      nose_bridge_to_width: buildFrontNorms("middle_eastern", MALE_ASIAN_FRONT, "").nose_bridge_to_width!,
      ...buildFrontNorms("middle_eastern", MALE_ASIAN_FRONT, ""),
    }),
    south_asian: createFrontNorms({
      lateral_canthal_tilt: buildFrontNorms("south_asian", MALE_ASIAN_FRONT, "").lateral_canthal_tilt!,
      nose_bridge_to_width: buildFrontNorms("south_asian", MALE_ASIAN_FRONT, "").nose_bridge_to_width!,
      ...buildFrontNorms("south_asian", MALE_ASIAN_FRONT, ""),
    }),
    mixed: createFrontNorms({
      lateral_canthal_tilt: buildFrontNorms("mixed", MALE_ASIAN_FRONT, "").lateral_canthal_tilt!,
      nose_bridge_to_width: buildFrontNorms("mixed", MALE_ASIAN_FRONT, "").nose_bridge_to_width!,
      ...buildFrontNorms("mixed", MALE_ASIAN_FRONT, ""),
    }),
  },
  female: {
    asian: createFrontNorms({
      lateral_canthal_tilt: buildFemaleFront(MALE_ASIAN_FRONT).lateral_canthal_tilt!,
      nose_bridge_to_width: buildFemaleFront(MALE_ASIAN_FRONT).nose_bridge_to_width!,
      ...buildFemaleFront(MALE_ASIAN_FRONT),
    }),
    caucasian: createFrontNorms({
      lateral_canthal_tilt: buildFemaleFront(buildFrontNorms("caucasian", MALE_ASIAN_FRONT, "")).lateral_canthal_tilt!,
      nose_bridge_to_width: buildFemaleFront(buildFrontNorms("caucasian", MALE_ASIAN_FRONT, "")).nose_bridge_to_width!,
      ...buildFemaleFront(buildFrontNorms("caucasian", MALE_ASIAN_FRONT, "")),
    }),
    black: createFrontNorms({
      lateral_canthal_tilt: buildFemaleFront(buildFrontNorms("black", MALE_ASIAN_FRONT, "")).lateral_canthal_tilt!,
      nose_bridge_to_width: buildFemaleFront(buildFrontNorms("black", MALE_ASIAN_FRONT, "")).nose_bridge_to_width!,
      ...buildFemaleFront(buildFrontNorms("black", MALE_ASIAN_FRONT, "")),
    }),
    hispanic: createFrontNorms({
      lateral_canthal_tilt: buildFemaleFront(buildFrontNorms("hispanic", MALE_ASIAN_FRONT, "")).lateral_canthal_tilt!,
      nose_bridge_to_width: buildFemaleFront(buildFrontNorms("hispanic", MALE_ASIAN_FRONT, "")).nose_bridge_to_width!,
      ...buildFemaleFront(buildFrontNorms("hispanic", MALE_ASIAN_FRONT, "")),
    }),
    middle_eastern: createFrontNorms({
      lateral_canthal_tilt: buildFemaleFront(buildFrontNorms("middle_eastern", MALE_ASIAN_FRONT, "")).lateral_canthal_tilt!,
      nose_bridge_to_width: buildFemaleFront(buildFrontNorms("middle_eastern", MALE_ASIAN_FRONT, "")).nose_bridge_to_width!,
      ...buildFemaleFront(buildFrontNorms("middle_eastern", MALE_ASIAN_FRONT, "")),
    }),
    south_asian: createFrontNorms({
      lateral_canthal_tilt: buildFemaleFront(buildFrontNorms("south_asian", MALE_ASIAN_FRONT, "")).lateral_canthal_tilt!,
      nose_bridge_to_width: buildFemaleFront(buildFrontNorms("south_asian", MALE_ASIAN_FRONT, "")).nose_bridge_to_width!,
      ...buildFemaleFront(buildFrontNorms("south_asian", MALE_ASIAN_FRONT, "")),
    }),
    mixed: createFrontNorms({
      lateral_canthal_tilt: buildFemaleFront(buildFrontNorms("mixed", MALE_ASIAN_FRONT, "")).lateral_canthal_tilt!,
      nose_bridge_to_width: buildFemaleFront(buildFrontNorms("mixed", MALE_ASIAN_FRONT, "")).nose_bridge_to_width!,
      ...buildFemaleFront(buildFrontNorms("mixed", MALE_ASIAN_FRONT, "")),
    }),
  },
}

export const SIDE_IDEALS: Record<Gender, Record<Ethnicity, MeasurementNorms>> = {
  male: {
    asian: createSideNorms({
      nasal_tip_angle: MALE_ASIAN_SIDE.nasal_tip_angle!,
    }),
    caucasian: createSideNorms({
      nasal_tip_angle: buildSideNorms("caucasian", MALE_ASIAN_SIDE).nasal_tip_angle!,
      ...buildSideNorms("caucasian", MALE_ASIAN_SIDE),
    }),
    black: createSideNorms({
      nasal_tip_angle: buildSideNorms("black", MALE_ASIAN_SIDE).nasal_tip_angle!,
      ...buildSideNorms("black", MALE_ASIAN_SIDE),
    }),
    hispanic: createSideNorms({
      nasal_tip_angle: buildSideNorms("hispanic", MALE_ASIAN_SIDE).nasal_tip_angle!,
      ...buildSideNorms("hispanic", MALE_ASIAN_SIDE),
    }),
    middle_eastern: createSideNorms({
      nasal_tip_angle: buildSideNorms("middle_eastern", MALE_ASIAN_SIDE).nasal_tip_angle!,
      ...buildSideNorms("middle_eastern", MALE_ASIAN_SIDE),
    }),
    south_asian: createSideNorms({
      nasal_tip_angle: buildSideNorms("south_asian", MALE_ASIAN_SIDE).nasal_tip_angle!,
      ...buildSideNorms("south_asian", MALE_ASIAN_SIDE),
    }),
    mixed: createSideNorms({
      nasal_tip_angle: buildSideNorms("mixed", MALE_ASIAN_SIDE).nasal_tip_angle!,
      ...buildSideNorms("mixed", MALE_ASIAN_SIDE),
    }),
  },
  female: {
    asian: createSideNorms({
      nasal_tip_angle: buildFemaleSide(MALE_ASIAN_SIDE).nasal_tip_angle!,
      ...buildFemaleSide(MALE_ASIAN_SIDE),
    }),
    caucasian: createSideNorms({
      nasal_tip_angle: buildFemaleSide(buildSideNorms("caucasian", MALE_ASIAN_SIDE)).nasal_tip_angle!,
      ...buildFemaleSide(buildSideNorms("caucasian", MALE_ASIAN_SIDE)),
    }),
    black: createSideNorms({
      nasal_tip_angle: buildFemaleSide(buildSideNorms("black", MALE_ASIAN_SIDE)).nasal_tip_angle!,
      ...buildFemaleSide(buildSideNorms("black", MALE_ASIAN_SIDE)),
    }),
    hispanic: createSideNorms({
      nasal_tip_angle: buildFemaleSide(buildSideNorms("hispanic", MALE_ASIAN_SIDE)).nasal_tip_angle!,
      ...buildFemaleSide(buildSideNorms("hispanic", MALE_ASIAN_SIDE)),
    }),
    middle_eastern: createSideNorms({
      nasal_tip_angle: buildFemaleSide(buildSideNorms("middle_eastern", MALE_ASIAN_SIDE)).nasal_tip_angle!,
      ...buildFemaleSide(buildSideNorms("middle_eastern", MALE_ASIAN_SIDE)),
    }),
    south_asian: createSideNorms({
      nasal_tip_angle: buildFemaleSide(buildSideNorms("south_asian", MALE_ASIAN_SIDE)).nasal_tip_angle!,
      ...buildFemaleSide(buildSideNorms("south_asian", MALE_ASIAN_SIDE)),
    }),
    mixed: createSideNorms({
      nasal_tip_angle: buildFemaleSide(buildSideNorms("mixed", MALE_ASIAN_SIDE)).nasal_tip_angle!,
      ...buildFemaleSide(buildSideNorms("mixed", MALE_ASIAN_SIDE)),
    }),
  },
}

// ============================================================
// Helper to get ideal values for a specific measurement
// ============================================================

export function getIdealValue(
  measurementId: string,
  gender: Gender,
  ethnicity: Ethnicity,
  profileType: "front" | "side"
): IdealValue | null {
  const ideals = profileType === "front" ? FRONT_IDEALS : SIDE_IDEALS
  const genderIdeals = ideals[gender]
  if (!genderIdeals) return null
  const ethnicityIdeals = genderIdeals[ethnicity]
  if (!ethnicityIdeals) return null
  return ethnicityIdeals[measurementId] ?? null
}

// ============================================================
// Measurement metadata for display
// ============================================================

export interface MeasurementMeta {
  id: string
  name: string
  unit: "degrees" | "ratio" | "mm" | "percentage"
  category: string
  description: string
}

export const FRONT_MEASUREMENTS_META: MeasurementMeta[] = [
  { id: "lateral_canthal_tilt", name: "Lateral Canthal Tilt", unit: "degrees", category: "Eyes", description: "Angle of upward tilt from medial to lateral canthus" },
  { id: "nose_bridge_to_width", name: "Nose Bridge to Nose Width", unit: "ratio", category: "Nose", description: "Ratio of nose bridge width to total nose width" },
  { id: "bitemporal_width", name: "Bitemporal Width", unit: "percentage", category: "Head", description: "Percentage ratio of bitemporal width to bizygomatic width" },
  { id: "cheekbone_height", name: "Cheekbone Height", unit: "percentage", category: "Cheeks", description: "Percentage ratio of Cupid's Bow distance to cheekbone line vs pupil line" },
  { id: "cupids_bow_depth", name: "Cupid's Bow Depth", unit: "mm", category: "Mouth", description: "Vertical distance between Cupid's bow and inner Cupid's bow" },
  { id: "bigonial_width", name: "Bigonial Width", unit: "percentage", category: "Jaw", description: "Percentage ratio of upper jaw angle width to bizygomatic width" },
  { id: "jaw_slope", name: "Jaw Slope", unit: "degrees", category: "Jaw", description: "Average of left and right jaw angles" },
  { id: "middle_third", name: "Middle Third", unit: "percentage", category: "Proportions", description: "Percentage of middle facial third to total facial height" },
  { id: "eye_aspect_ratio", name: "Eye Aspect Ratio", unit: "ratio", category: "Eyes", description: "Average ratio of eye width (horizontal) to eye height (vertical)" },
  { id: "mouth_corner_position", name: "Mouth Corner Position", unit: "mm", category: "Mouth", description: "Average vertical offset of mouth corners from mouth middle line" },
  { id: "eye_separation_ratio", name: "Eye Separation Ratio", unit: "percentage", category: "Eyes", description: "Percentage ratio of interpupillary distance to bizygomatic width" },
  { id: "eyebrow_tilt", name: "Eyebrow Tilt", unit: "degrees", category: "Brows", description: "Average acute angle of eyebrow tilt from horizontal" },
  { id: "lower_third", name: "Lower Third", unit: "percentage", category: "Proportions", description: "Percentage of lower facial third to total facial height" },
  { id: "face_width_to_height", name: "Face Width to Height Ratio", unit: "ratio", category: "Proportions", description: "Ratio of bizygomatic width to facial height (Cupid's bow to brow midpoint)" },
  { id: "interpupillary_mouth_width", name: "Interpupillary-Mouth Width Ratio", unit: "percentage", category: "Proportions", description: "Percentage ratio of mouth width to interpupillary distance" },
  { id: "jaw_frontal_angle", name: "Jaw Frontal Angle", unit: "degrees", category: "Jaw", description: "Angle between left and right lower jaw-to-chin lines" },
  { id: "intercanthal_nasal_width", name: "Intercanthal-Nasal Width Ratio", unit: "ratio", category: "Nose", description: "Ratio of nasal width to intercanthal distance" },
  { id: "top_third", name: "Top Third", unit: "percentage", category: "Proportions", description: "Percentage of upper facial third relative to total facial height" },
  { id: "one_eye_apart", name: "One Eye Apart Test", unit: "ratio", category: "Eyes", description: "Ratio of intercanthal distance to average eyelid hood distance" },
  { id: "midface_ratio", name: "Midface Ratio", unit: "ratio", category: "Proportions", description: "Ratio of interpupillary distance to inner Cupid's bow height" },
  { id: "ipsilateral_alar_angle", name: "Ipsilateral Alar Angle", unit: "degrees", category: "Nose", description: "Angle at nasal base between left and right eyelid hood ends" },
  { id: "mouth_width_to_nose_width", name: "Mouth Width to Nose Width Ratio", unit: "ratio", category: "Mouth", description: "Ratio of mouth width to nose width" },
  { id: "total_facial_width_to_height", name: "Total Facial Width to Height Ratio", unit: "ratio", category: "Proportions", description: "Ratio of total facial height to bizygomatic width" },
  { id: "chin_to_philtrum", name: "Chin to Philtrum Ratio", unit: "ratio", category: "Chin", description: "Ratio of chin height to philtrum length" },
  { id: "eyebrow_low_setedness", name: "Eyebrow Low Setedness", unit: "ratio", category: "Brows", description: "Ratio of brow-to-pupil-midpoint distance to average eye height" },
  { id: "brow_length_to_face_width", name: "Brow Length to Face Width Ratio", unit: "ratio", category: "Brows", description: "Ratio of combined brow horizontal span to bizygomatic width" },
  { id: "nose_tip_position", name: "Nose Tip Position", unit: "mm", category: "Nose", description: "Distance from nasal base to nose bottom" },
  { id: "deviation_iaa_jfa", name: "Deviation of IAA & JFA", unit: "degrees", category: "Proportions", description: "Difference between Jaw Frontal Angle and Ipsilateral Alar Angle (JFA - IAA)" },
  { id: "lower_lip_to_upper_lip", name: "Lower Lip to Upper Lip Ratio", unit: "ratio", category: "Mouth", description: "Ratio of lower lip height to upper lip height" },
  { id: "lower_third_proportion", name: "Lower Third Proportion", unit: "percentage", category: "Proportions", description: "Percentage of upper lip height to lower face height" },
]

export const SIDE_MEASUREMENTS_META: MeasurementMeta[] = [
  { id: "nasal_tip_angle", name: "Nasal Tip Angle", unit: "degrees", category: "Nose", description: "Angle of the nasal tip" },
  { id: "nasal_width_to_height", name: "Nasal Width to Height Ratio", unit: "ratio", category: "Nose", description: "Ratio of nasal width to nasal height" },
  { id: "upper_lip_s_line", name: "Upper Lip S-Line Position", unit: "mm", category: "Lips", description: "Upper lip position relative to S-line" },
  { id: "upper_lip_burstone", name: "Upper Lip Burstone Line", unit: "mm", category: "Lips", description: "Upper lip position relative to Burstone line" },
  { id: "nasal_projection", name: "Nasal Projection", unit: "ratio", category: "Nose", description: "Ratio of nasal width (subalare to nose tip) to nasal height (nose tip to nasion)" },
  { id: "nasofrontal_angle", name: "Nasofrontal Angle", unit: "degrees", category: "Nose", description: "Angle between forehead and nasal bridge" },
  { id: "recession_frankfort", name: "Recession (Frankfort Plane)", unit: "mm", category: "Profile", description: "Recession relative to Frankfort plane" },
  { id: "holdaway_h_line", name: "Holdaway H Line", unit: "mm", category: "Profile", description: "Holdaway H-line measurement" },
  { id: "mentolabial_angle", name: "Mentolabial Angle", unit: "degrees", category: "Chin", description: "Angle between lower lip and chin" },
  { id: "upper_forehead_slope", name: "Upper Forehead Slope", unit: "degrees", category: "Forehead", description: "Slope of upper forehead" },
  { id: "facial_convexity_nasion", name: "Facial Convexity (Nasion)", unit: "degrees", category: "Profile", description: "Facial convexity angle at nasion" },
  { id: "anterior_facial_depth", name: "Anterior Facial Depth", unit: "degrees", category: "Proportions", description: "Angle at subalare between tragus and orbitale" },
  { id: "upper_lip_e_line", name: "Upper Lip E-Line Position", unit: "mm", category: "Lips", description: "Upper lip position relative to E-line" },
  { id: "submental_cervical_angle", name: "Submental Cervical Angle", unit: "degrees", category: "Neck", description: "Angle between submental and cervical planes" },
  { id: "facial_depth_to_height", name: "Facial Depth to Height Ratio", unit: "ratio", category: "Proportions", description: "Ratio of facial depth to facial height" },
  { id: "browridge_inclination", name: "Browridge Inclination Angle", unit: "degrees", category: "Brows", description: "Inclination angle of brow ridge" },
  { id: "total_facial_convexity", name: "Total Facial Convexity", unit: "degrees", category: "Profile", description: "Total facial convexity angle" },
  { id: "facial_convexity_glabella", name: "Facial Convexity (Glabella)", unit: "degrees", category: "Profile", description: "Facial convexity angle at glabella" },
  { id: "orbital_vector", name: "Orbital Vector", unit: "mm", category: "Eyes", description: "Orbital vector measurement" },
  { id: "interior_midface_projection", name: "Interior Midface Projection Angle", unit: "degrees", category: "Midface", description: "Interior midface projection angle" },
  { id: "z_angle", name: "Z Angle", unit: "degrees", category: "Profile", description: "Z-angle of soft tissue profile" },
  { id: "nose_tip_rotation", name: "Nose Tip Rotation Angle", unit: "degrees", category: "Nose", description: "Nose tip rotation angle" },
  { id: "nasolabial_angle", name: "Nasolabial Angle", unit: "degrees", category: "Nose", description: "Angle between nose base and upper lip" },
  { id: "nasofacial_angle", name: "Nasofacial Angle", unit: "degrees", category: "Nose", description: "Angle between nasal bridge and facial plane" },
  { id: "nasomental_angle", name: "Nasomental Angle", unit: "degrees", category: "Profile", description: "Angle between nose and chin" },
  { id: "frankfort_tip_angle", name: "Frankfort-Tip Angle", unit: "degrees", category: "Nose", description: "Angle between Frankfort plane and nose tip" },
  { id: "lower_lip_s_line", name: "Lower Lip S-Line Position", unit: "mm", category: "Lips", description: "Lower lip position relative to S-line" },
  { id: "lower_lip_e_line", name: "Lower Lip E-Line Position", unit: "mm", category: "Lips", description: "Lower lip position relative to E-line" },
  { id: "lower_lip_burstone", name: "Lower Lip Burstone Line", unit: "mm", category: "Lips", description: "Lower lip position relative to Burstone line" },
  { id: "gonial_angle", name: "Gonial Angle", unit: "degrees", category: "Jaw", description: "Angle of the mandible at gonion" },
  { id: "mandibular_plane_angle", name: "Mandibular Plane Angle", unit: "degrees", category: "Jaw", description: "Angle of mandibular plane relative to horizontal" },
  { id: "ramus_to_mandible", name: "Ramus to Mandible Ratio", unit: "ratio", category: "Jaw", description: "Ratio of ramus height to mandibular body length" },
  { id: "gonion_to_mouth", name: "Gonion to Mouth Line", unit: "ratio", category: "Jaw", description: "Ratio of gonion-to-mouth distance to facial height" },
]