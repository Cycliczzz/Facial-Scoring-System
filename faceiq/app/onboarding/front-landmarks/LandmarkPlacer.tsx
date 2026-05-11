"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Info, RotateCcw, ArrowRight, ArrowLeft, ZoomIn, ZoomOut, Maximize2, Minus, Plus, MousePointer2, Crosshair, Grid3x3, Lightbulb, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LandmarkPlacerProps {
  profileType: "front" | "side"
  initialGender?: "male" | "female"
  initialEthnicity?: string
}

interface Landmark {
  id: string; x: number; y: number; label: string; group?: string; color?: string
}

interface LandmarkDef {
  id: string; label: string; group: string; color: string; instruction: string; tip: string; num: number
}

const FRONT_DEFS: LandmarkDef[] = [
  { id: "hairline", label: "Hairline", group: "head", color: "#3b82f6", num: 1, instruction: "Click at the center point of your hairline, where the forehead meets the hair.", tip: "Place at the highest visible point of your forehead where hair begins." },
  { id: "left_pupil", label: "Left Pupil", group: "eyes", color: "#ef4444", num: 2, instruction: "Click at the center of your left eye's pupil (the black dot).", tip: "Zoom in for precision. Place exactly at the center of the dark pupil." },
  { id: "right_pupil", label: "Right Pupil", group: "eyes", color: "#ef4444", num: 3, instruction: "Click at the center of your right eye's pupil.", tip: "Same as left pupil - place exactly at the center." },
  { id: "left_medial_canthus", label: "Left Medial Canthus", group: "eyes", color: "#ef4444", num: 4, instruction: "Click at the inner corner of your left eye, near the nose.", tip: "The small pinkish corner closest to your nose bridge." },
  { id: "left_lateral_canthus", label: "Left Lateral Canthus", group: "eyes", color: "#ef4444", num: 5, instruction: "Click at the outer corner of your left eye.", tip: "Where the upper and lower eyelids join at the outer corner." },
  { id: "left_upper_eyelid", label: "Left Upper Eyelid", group: "eyes", color: "#ef4444", num: 6, instruction: "Click at the highest point of your left upper eyelid crease.", tip: "Peak of eyelid crease directly above the pupil." },
  { id: "left_lower_eyelid", label: "Left Lower Eyelid", group: "eyes", color: "#ef4444", num: 7, instruction: "Click at the lowest point of your left lower eyelid.", tip: "Bottom edge of lower eyelid aligned with pupil center." },
  { id: "left_eyelid_hood_end", label: "Left Eyelid Hood End", group: "eyes", color: "#ef4444", num: 8, instruction: "Click at the outer end of your left upper eyelid crease.", tip: "Where the eyelid crease ends toward the outer corner." },
  { id: "left_upper_eyelid_crease", label: "Left Upper Eyelid Crease", group: "eyes", color: "#ef4444", num: 9, instruction: "Click at the inner end of your left upper eyelid crease.", tip: "Where the eyelid crease begins near the inner corner." },
  { id: "right_medial_canthus", label: "Right Medial Canthus", group: "eyes", color: "#ef4444", num: 10, instruction: "Click at the inner corner of your right eye, near the nose.", tip: "Mirror of left side - inner corner closest to nose bridge." },
  { id: "right_lateral_canthus", label: "Right Lateral Canthus", group: "eyes", color: "#ef4444", num: 11, instruction: "Click at the outer corner of your right eye.", tip: "Mirror of left side - outer corner where eyelids join." },
  { id: "right_upper_eyelid", label: "Right Upper Eyelid", group: "eyes", color: "#ef4444", num: 12, instruction: "Click at the highest point of your right upper eyelid crease.", tip: "Mirror of left side - peak above right pupil." },
  { id: "right_lower_eyelid", label: "Right Lower Eyelid", group: "eyes", color: "#ef4444", num: 13, instruction: "Click at the lowest point of your right lower eyelid.", tip: "Mirror of left side - bottom edge aligned with pupil." },
  { id: "right_eyelid_hood_end", label: "Right Eyelid Hood End", group: "eyes", color: "#ef4444", num: 14, instruction: "Click at the outer end of your right upper eyelid crease.", tip: "Mirror of left side - where crease ends outward." },
  { id: "right_upper_eyelid_crease", label: "Right Upper Eyelid Crease", group: "eyes", color: "#ef4444", num: 15, instruction: "Click at the inner end of your right upper eyelid crease.", tip: "Mirror of left side - where crease begins near nose." },
  { id: "left_brow_head", label: "Left Brow Head", group: "brows", color: "#f97316", num: 16, instruction: "Click at the innermost point of your left eyebrow.", tip: "Where your eyebrow begins near the bridge of your nose." },
  { id: "left_brow_inner_corner", label: "Left Brow Inner Corner", group: "brows", color: "#f97316", num: 17, instruction: "Click at the lower edge of your left eyebrow near the inner corner.", tip: "Bottom edge of eyebrow near where it starts above your nose." },
  { id: "left_brow_arch", label: "Left Brow Arch", group: "brows", color: "#f97316", num: 18, instruction: "Click at the highest point (arch) of your left eyebrow.", tip: "The peak of your eyebrow arch, usually above the outer edge of your iris." },
  { id: "left_brow_peak", label: "Left Brow Peak", group: "brows", color: "#f97316", num: 19, instruction: "Click at the highest point of your left eyebrow arch.", tip: "Alternative reference for the brow peak - very top of the arch." },
  { id: "left_brow_tail", label: "Left Brow Tail", group: "brows", color: "#f97316", num: 20, instruction: "Click at the outermost end of your left eyebrow.", tip: "Where your eyebrow tapers off toward your temple." },
  { id: "right_brow_head", label: "Right Brow Head", group: "brows", color: "#f97316", num: 21, instruction: "Click at the innermost point of your right eyebrow.", tip: "Mirror of left side - where eyebrow begins near nose." },
  { id: "right_brow_inner_corner", label: "Right Brow Inner Corner", group: "brows", color: "#f97316", num: 22, instruction: "Click at the lower edge of your right eyebrow near the inner corner.", tip: "Mirror of left side - bottom edge near nose." },
  { id: "right_brow_arch", label: "Right Brow Arch", group: "brows", color: "#f97316", num: 23, instruction: "Click at the highest point (arch) of your right eyebrow.", tip: "Mirror of left side - peak of eyebrow arch." },
  { id: "right_brow_peak", label: "Right Brow Peak", group: "brows", color: "#f97316", num: 24, instruction: "Click at the highest point of your right eyebrow arch.", tip: "Mirror of left side - very top of the arch." },
  { id: "right_brow_tail", label: "Right Brow Tail", group: "brows", color: "#f97316", num: 25, instruction: "Click at the outermost end of your right eyebrow.", tip: "Mirror of left side - where eyebrow tapers toward temple." },
  { id: "left_nose_side", label: "Left Nose Side", group: "nose", color: "#10b981", num: 26, instruction: "Click at the left outer edge of your nose (ala).", tip: "The widest point of your nostril on the left side." },
  { id: "right_nose_side", label: "Right Nose Side", group: "nose", color: "#10b981", num: 27, instruction: "Click at the right outer edge of your nose (ala).", tip: "Mirror of left side - widest point of nostril on the right." },
  { id: "left_nose_bridge", label: "Left Nose Bridge", group: "nose", color: "#10b981", num: 28, instruction: "Click at the left side of your nose bridge, at the narrowest point.", tip: "Where your nose bridge is narrowest, halfway between your eyes." },
  { id: "right_nose_bridge", label: "Right Nose Bridge", group: "nose", color: "#10b981", num: 29, instruction: "Click at the right side of your nose bridge, at the narrowest point.", tip: "Mirror of left side - narrowest point of nose bridge." },
  { id: "nasal_base", label: "Nasal Base", group: "nose", color: "#10b981", num: 30, instruction: "Click at the center of your nose base, just below the nostrils.", tip: "Bottom center of nose where columella meets upper lip." },
  { id: "nose_bottom", label: "Nose Bottom", group: "nose", color: "#10b981", num: 31, instruction: "Click at the lowest visible point of your nose tip.", tip: "The bottom-most point of your nose tip." },
  { id: "left_mouth_corner", label: "Left Mouth Corner", group: "mouth", color: "#8b5cf6", num: 32, instruction: "Click at the left corner of your mouth (commissure).", tip: "Where your upper and lower lips meet on the left side." },
  { id: "right_mouth_corner", label: "Right Mouth Corner", group: "mouth", color: "#8b5cf6", num: 33, instruction: "Click at the right corner of your mouth.", tip: "Mirror of left side - where lips meet on the right." },
  { id: "cupids_bow", label: "Cupid's Bow", group: "mouth", color: "#8b5cf6", num: 34, instruction: "Click at the highest point of your upper lip's Cupid's bow (left peak).", tip: "The M-shaped curve of your upper lip - place at the left peak." },
  { id: "inner_cupids_bow", label: "Inner Cupid's Bow", group: "mouth", color: "#8b5cf6", num: 35, instruction: "Click at the center dip of your upper lip's Cupid's bow.", tip: "The small depression in the center of your upper lip." },
  { id: "mouth_middle", label: "Mouth Middle", group: "mouth", color: "#8b5cf6", num: 36, instruction: "Click at the center point where your upper and lower lips meet.", tip: "Exactly at the midline where your lips close together." },
  { id: "lower_lip_center", label: "Lower Lip Center", group: "mouth", color: "#8b5cf6", num: 37, instruction: "Click at the lowest point of your lower lip's center.", tip: "The bottom edge of your lower lip at the midline." },
  { id: "left_upper_jaw_angle", label: "Left Upper Jaw Angle", group: "jaw", color: "#f59e0b", num: 38, instruction: "Click at the upper left angle of your jaw, near the ear lobe.", tip: "Where your jawbone meets the base of your skull, below your ear." },
  { id: "right_upper_jaw_angle", label: "Right Upper Jaw Angle", group: "jaw", color: "#f59e0b", num: 39, instruction: "Click at the upper right angle of your jaw, near the ear lobe.", tip: "Mirror of left side - where jaw meets skull below ear." },
  { id: "left_lower_jaw_angle", label: "Left Lower Jaw Angle", group: "jaw", color: "#f59e0b", num: 40, instruction: "Click at the lower left angle of your jaw (gonion).", tip: "The corner of your jawbone, the widest point of your lower jaw." },
  { id: "right_lower_jaw_angle", label: "Right Lower Jaw Angle", group: "jaw", color: "#f59e0b", num: 41, instruction: "Click at the lower right angle of your jaw (gonion).", tip: "Mirror of left side - corner of jawbone on the right." },
  { id: "left_chin", label: "Left Chin", group: "chin", color: "#f59e0b", num: 42, instruction: "Click at the left side of your chin, where the jaw meets the chin.", tip: "Where your jawline transitions to your chin on the left." },
  { id: "right_chin", label: "Right Chin", group: "chin", color: "#f59e0b", num: 43, instruction: "Click at the right side of your chin, where the jaw meets the chin.", tip: "Mirror of left side - where jawline transitions to chin." },
  { id: "chin_bottom", label: "Chin Bottom", group: "chin", color: "#f59e0b", num: 44, instruction: "Click at the lowest point of your chin (menton).", tip: "The bottom-most point of your chin." },
  { id: "left_cheekbone", label: "Left Cheekbone", group: "cheeks", color: "#ec4899", num: 45, instruction: "Click at the most prominent point of your left cheekbone.", tip: "Highest point of cheekbone below the outer corner of your eye." },
  { id: "right_cheekbone", label: "Right Cheekbone", group: "cheeks", color: "#ec4899", num: 46, instruction: "Click at the most prominent point of your right cheekbone.", tip: "Mirror of left side - highest point below outer eye corner." },
  { id: "left_temple", label: "Left Temple", group: "head", color: "#3b82f6", num: 47, instruction: "Click at the hollow of your left temple, between eye and ear.", tip: "The slightly hollow area on the side of your forehead." },
  { id: "right_temple", label: "Right Temple", group: "head", color: "#3b82f6", num: 48, instruction: "Click at the hollow of your right temple.", tip: "Mirror of left side - hollow area between eye and ear." },
  { id: "left_outer_ear", label: "Left Outer Ear", group: "ears", color: "#ec4899", num: 49, instruction: "Click at the outermost point of your left ear (helix rim).", tip: "The farthest point of your ear from your head." },
  { id: "right_outer_ear", label: "Right Outer Ear", group: "ears", color: "#ec4899", num: 50, instruction: "Click at the outermost point of your right ear.", tip: "Mirror of left side - farthest point of ear from head." },
  { id: "left_neck_point", label: "Left Neck Point", group: "neck", color: "#6b7280", num: 51, instruction: "Click at the left side of your neck, where neck meets jawline.", tip: "Junction where neck meets underside of jaw on the left." },
  { id: "right_neck_point", label: "Right Neck Point", group: "neck", color: "#6b7280", num: 52, instruction: "Click at the right side of your neck, where neck meets jawline.", tip: "Mirror of left side - where neck meets jaw on the right." },
]

const SIDE_DEFS: LandmarkDef[] = [
  { id: "top_of_head", label: "Top of Head", group: "head", color: "#3b82f6", num: 1, instruction: "Click at the highest point of your head (vertex).", tip: "The top-most point of your skull." },
  { id: "occiput", label: "Occiput", group: "head", color: "#3b82f6", num: 2, instruction: "Click at the most prominent point at the back of your head.", tip: "The farthest point at the back of your skull." },
  { id: "hairline_profile", label: "Hairline (Profile)", group: "head", color: "#3b82f6", num: 3, instruction: "Click where your forehead meets your hairline (side view).", tip: "Highest point of forehead where hair begins." },
  { id: "forehead", label: "Forehead", group: "head", color: "#3b82f6", num: 4, instruction: "Click at the most prominent point of your forehead (side view).", tip: "The most forward-projecting point of your forehead." },
  { id: "glabella", label: "Glabella", group: "head", color: "#3b82f6", num: 5, instruction: "Click at the smooth area between your eyebrows, above the nose bridge.", tip: "The flattened area between eyebrows, above the nose root." },
  { id: "nasal_bridge_root", label: "Nasal Bridge Root", group: "nose", color: "#10b981", num: 6, instruction: "Click where your nose bridge meets your forehead (nasion).", tip: "The depression at the top of your nose where it meets the forehead." },
  { id: "rhinion", label: "Rhinion", group: "nose", color: "#10b981", num: 7, instruction: "Click at the midpoint of your nasal bridge.", tip: "Halfway down your nose bridge, where bone meets cartilage." },
  { id: "supratip", label: "Supratip", group: "nose", color: "#10b981", num: 8, instruction: "Click at the point just above your nasal tip.", tip: "The slight depression just above the tip of your nose." },
  { id: "nose_tip", label: "Nose Tip", group: "nose", color: "#10b981", num: 9, instruction: "Click at the most forward-projecting point of your nose tip.", tip: "The very tip of your nose - most prominent from side view." },
  { id: "infratip", label: "Infratip", group: "nose", color: "#10b981", num: 10, instruction: "Click at the point just below your nasal tip.", tip: "The small area below the tip of your nose, above nostrils." },
  { id: "columella", label: "Columella", group: "nose", color: "#10b981", num: 11, instruction: "Click at the lowest point of the tissue between your nostrils.", tip: "The strip of tissue separating your nostrils." },
  { id: "subnasale", label: "Subnasale", group: "nose", color: "#10b981", num: 12, instruction: "Click where your nose base meets your upper lip.", tip: "Junction where bottom of nose meets top of upper lip." },
  { id: "subalare", label: "Subalare", group: "nose", color: "#10b981", num: 13, instruction: "Click at the lowest point of your nostril (alar base).", tip: "Bottom edge of nostril where it meets the upper lip." },
  { id: "upper_lip", label: "Upper Lip", group: "mouth", color: "#8b5cf6", num: 14, instruction: "Click at the most forward-projecting point of your upper lip.", tip: "Most prominent point of upper lip from side view." },
  { id: "mouth_corner", label: "Mouth Corner", group: "mouth", color: "#8b5cf6", num: 15, instruction: "Click at the corner of your mouth where lips meet.", tip: "From side view, where your lips meet at the corner." },
  { id: "lower_lip", label: "Lower Lip", group: "mouth", color: "#8b5cf6", num: 16, instruction: "Click at the most forward-projecting point of your lower lip.", tip: "Most prominent point of lower lip from side view." },
  { id: "labiomental_fold", label: "Labiomental Fold", group: "chin", color: "#f59e0b", num: 17, instruction: "Click at the deepest point of the fold between lower lip and chin.", tip: "The horizontal crease between your lower lip and chin." },
  { id: "chin_point", label: "Chin Point", group: "chin", color: "#f59e0b", num: 18, instruction: "Click at the most forward-projecting point of your chin (pogonion).", tip: "Most prominent point of your chin from side view." },
  { id: "chin_bottom", label: "Chin Bottom", group: "chin", color: "#f59e0b", num: 19, instruction: "Click at the lowest point of your chin (menton) from side view.", tip: "Bottom-most point of chin where it meets the neck." },
  { id: "upper_jaw_angle", label: "Upper Jaw Angle", group: "jaw", color: "#f59e0b", num: 20, instruction: "Click at the upper angle of your jaw near the ear (side view).", tip: "Where your jawbone connects near your ear." },
  { id: "lower_jaw_angle", label: "Lower Jaw Angle", group: "jaw", color: "#f59e0b", num: 21, instruction: "Click at the angle of your jaw (gonion) from side view.", tip: "The corner of your jawbone at the back of your jaw." },
  { id: "porion", label: "Porion", group: "ears", color: "#ec4899", num: 22, instruction: "Click at the highest point of your ear canal opening (tragus area).", tip: "The small bump (tragus) in front of your ear canal." },
  { id: "tragus", label: "Tragus", group: "ears", color: "#ec4899", num: 23, instruction: "Click at the small cartilaginous bump in front of your ear canal.", tip: "The small pointed cartilage covering your ear canal opening." },
  { id: "intertragic_notch", label: "Intertragic Notch", group: "ears", color: "#ec4899", num: 24, instruction: "Click at the notch between the tragus and antitragus of your ear.", tip: "The small indentation at the bottom of your ear canal opening." },
  { id: "orbitale", label: "Orbitale", group: "eyes", color: "#ef4444", num: 25, instruction: "Click at the lowest point of your eye socket (orbital rim) from side view.", tip: "The bottom edge of your eye socket, below your eye." },
  { id: "corneal_apex", label: "Corneal Apex", group: "eyes", color: "#ef4444", num: 26, instruction: "Click at the most forward-projecting point of your cornea (side view).", tip: "Most prominent point of your eyeball from the side." },
  { id: "eyelid_end", label: "Eyelid End", group: "eyes", color: "#ef4444", num: 27, instruction: "Click at the outer end of your eyelid where upper and lower lids meet.", tip: "From side view, where eyelids meet at the outer corner." },
  { id: "lower_eyelid", label: "Lower Eyelid", group: "eyes", color: "#ef4444", num: 28, instruction: "Click at the lowest point of your lower eyelid from side view.", tip: "The bottom edge of your lower eyelid." },
  { id: "cheekbone", label: "Cheekbone", group: "cheeks", color: "#ec4899", num: 29, instruction: "Click at the most prominent point of your cheekbone from side view.", tip: "Highest point of cheekbone visible below your eye." },
  { id: "cervical_point", label: "Cervical Point", group: "neck", color: "#6b7280", num: 30, instruction: "Click at the deepest point of your neck curve at the back.", tip: "Deepest part of the curve where neck meets upper back." },
  { id: "neck_point", label: "Neck Point", group: "neck", color: "#6b7280", num: 31, instruction: "Click where your neck meets your chin (from side view).", tip: "Junction where underside of chin meets neck." },
]

export function LandmarkPlacer({ profileType, initialGender = "male", initialEthnicity }: LandmarkPlacerProps) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [frontLm, setFrontLm] = useState<Landmark[]>([])
  const [sideLm, setSideLm] = useState<Landmark[]>([])
  const [idx, setIdx] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })
  const [showGrid, setShowGrid] = useState(false)
  const [showCross, setShowCross] = useState(false)
  const [lmSize, setLmSize] = useState(2)
  const [showTip, setShowTip] = useState(false)

  const isFem = initialGender === "female"
  const defs = profileType === "front" ? FRONT_DEFS : SIDE_DEFS
  const curDef = defs[idx]
  const curLm = profileType === "front" ? frontLm : sideLm
  const setCurLm = profileType === "front" ? setFrontLm : setSideLm

  const [frontImg, setFrontImg] = useState("")
  const [sideImg, setSideImg] = useState("")

  useEffect(() => {
    setFrontImg(localStorage.getItem("frontProfileImage") || "/hero-samples/sample-1.jpg")
    setSideImg(localStorage.getItem("sideProfileImage") || "/hero-samples/sample-3.jpg")
    const sf = localStorage.getItem("frontLandmarks")
    const ss = localStorage.getItem("sideLandmarks")
    if (sf) setFrontLm(JSON.parse(sf))
    if (ss) setSideLm(JSON.parse(ss))
  }, [])

  const imgUrl = profileType === "front" ? frontImg : sideImg
  const existIdx = curLm.findIndex(l => l.id === curDef?.id)
  const placed = existIdx !== -1

  useEffect(() => {
    const c = canvasRef.current, ct = containerRef.current
    if (!c || !ct) return
    const img = new Image()
    img.src = imgUrl
    img.onload = () => { c.width = ct.clientWidth; c.height = ct.clientHeight; setImgLoaded(true) }
  }, [imgUrl])

  useEffect(() => { if (imgLoaded) draw() }, [curLm, idx, imgLoaded, zoom, pan, showGrid, showCross, lmSize])

  function draw() {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext("2d"); if (!ctx) return
    const img = new Image()
    img.src = imgUrl
    img.onload = () => {
      ctx.clearRect(0, 0, c.width, c.height)
      const ar = img.width / img.height, car = c.width / c.height
      let dw, dh, dx, dy
      if (ar > car) { dw = c.width; dh = dw / ar; dx = 0; dy = (c.height - dh) / 2 }
      else { dh = c.height; dw = dh * ar; dx = (c.width - dw) / 2; dy = 0 }
      ctx.save()
      const zx = c.width / 2, zy = c.height / 2
      ctx.translate(zx + pan.x, zy + pan.y); ctx.scale(zoom, zoom); ctx.translate(-zx, -zy)
      ctx.drawImage(img, dx, dy, dw, dh)
      if (showGrid) {
        ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1
        for (let x = dx; x < dx + dw; x += 50) { ctx.beginPath(); ctx.moveTo(x, dy); ctx.lineTo(x, dy + dh); ctx.stroke() }
        for (let y = dy; y < dy + dh; y += 50) { ctx.beginPath(); ctx.moveTo(dx, y); ctx.lineTo(dx + dw, y); ctx.stroke() }
      }
      if (showCross) {
        ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(dx, c.height / 2); ctx.lineTo(dx + dw, c.height / 2); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(c.width / 2, dy); ctx.lineTo(c.width / 2, dy + dh); ctx.stroke()
      }
      curLm.forEach((lm, i) => {
        const col = lm.color || (isFem ? "#ec4899" : "#38bdf8")
        // Denormalize from 0-1 ratio to pixel coordinates relative to displayed image
        const px = lm.x * dw + dx
        const py = lm.y * dh + dy
        ctx.shadowBlur = 8; ctx.shadowColor = col
        ctx.beginPath(); ctx.arc(px, py, lmSize, 0, 2 * Math.PI); ctx.fillStyle = col; ctx.fill()
        ctx.beginPath(); ctx.arc(px, py, lmSize * 0.5, 0, 2 * Math.PI); ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill()
        ctx.shadowBlur = 0
        ctx.font = "bold 10px sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
        ctx.fillText((i + 1).toString(), px, py - 15)
      })
      ctx.restore()
    }
  }

  function getDrawOffsets() {
    const c = canvasRef.current; if (!c) return { dx: 0, dy: 0, dw: 0, dh: 0 }
    const img = new Image(); img.src = imgUrl
    const ar = img.width / img.height, car = c.width / c.height
    if (ar > car) return { dx: 0, dy: (c.height - c.width / ar) / 2, dw: c.width, dh: c.width / ar }
    return { dx: (c.width - c.height * ar) / 2, dy: 0, dw: c.height * ar, dh: c.height }
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = canvasRef.current; if (!c) return
    const r = c.getBoundingClientRect()
    const cx = e.clientX - r.left, cy = e.clientY - r.top
    const { dx, dy, dw, dh } = getDrawOffsets()
    const zx = c.width / 2, zy = c.height / 2
    // Convert to image-relative coordinates (pixels relative to the displayed image)
    const x = ((cx - pan.x - zx) / zoom + zx - dx)
    const y = ((cy - pan.y - zy) / zoom + zy - dy)
    // Normalize to 0-1 range relative to displayed image dimensions
    const nx = dw > 0 ? x / dw : 0
    const ny = dh > 0 ? y / dh : 0
    if (placed) { const upd = [...curLm]; upd[existIdx] = { ...upd[existIdx], x: nx, y: ny }; setCurLm(upd) }
    else { setCurLm([...curLm, { id: curDef.id, x: nx, y: ny, label: curDef.label, group: curDef.group, color: curDef.color }]) }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = canvasRef.current; if (!c) return
    const r = c.getBoundingClientRect()
    setLastPos({ x: e.clientX - r.left, y: e.clientY - r.top })
    if (zoom > 1) setPanning(true)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = canvasRef.current; if (!c) return
    const r = c.getBoundingClientRect()
    const mx = e.clientX - r.left, my = e.clientY - r.top
    if (panning) { setPan(p => ({ x: p.x + mx - lastPos.x, y: p.y + my - lastPos.y })); setLastPos({ x: mx, y: my }) }
  }

  function handleMouseUp() { setPanning(false) }

  function next() {
    if (idx < defs.length - 1) { setIdx(idx + 1); setZoom(1); setPan({ x: 0, y: 0 }) }
    else if (profileType === "front") {
      localStorage.setItem("frontLandmarks", JSON.stringify(frontLm))
      router.push(`/onboarding/side-landmarks?gender=${initialGender ?? "male"}${initialEthnicity ? `&ethnicity=${initialEthnicity}` : ""}`)
    } else {
      localStorage.setItem("frontLandmarks", JSON.stringify(frontLm))
      localStorage.setItem("sideLandmarks", JSON.stringify(sideLm))
      router.push(`/analysis?gender=${initialGender ?? "male"}${initialEthnicity ? `&ethnicity=${initialEthnicity}` : ""}`)
    }
  }

  function prev() {
    if (idx > 0) { setIdx(idx - 1); setZoom(1); setPan({ x: 0, y: 0 }) }
    else if (profileType === "side") {
      localStorage.setItem("frontLandmarks", JSON.stringify(frontLm))
      router.push(`/onboarding/front-landmarks?gender=${initialGender ?? "male"}${initialEthnicity ? `&ethnicity=${initialEthnicity}` : ""}`)
    }
  }

  function handleReset() {
    setCurLm(curLm.filter(l => l.id !== curDef?.id))
  }

  function handleSkip() {
    setCurLm(curLm.filter(l => l.id !== curDef?.id))
    next()
  }

  const accentRing = isFem ? "ring-pink-500/70 hover:ring-pink-400/90 border-pink-500/60" : "ring-sky-500/70 hover:ring-sky-400/90 border-sky-500/60"
  const accentGlow = isFem ? "shadow-[0_18px_45px_rgba(236,72,153,0.6)] from-pink-500 to-rose-500" : "shadow-[0_18px_45px_rgba(37,99,235,0.75)] from-sky-500 to-blue-500"
  const accentBg = isFem ? "bg-pink-500/10 border-pink-500/30" : "bg-sky-500/10 border-sky-500/30"
  const accentText = isFem ? "text-pink-100" : "text-sky-100"
  const accentBtn = isFem ? "bg-pink-500/20 hover:bg-pink-500/30 text-pink-100 border-pink-500/40" : "bg-sky-500/20 hover:bg-sky-500/30 text-sky-100 border-sky-500/40"

  const total = defs.length
  const completed = curLm.length
  const progress = Math.round((completed / total) * 100)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {profileType === "front" ? "Front Profile" : "Side Profile"} Landmarks
          </h2>
          <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${accentBg} ${accentText}`}>
            {curDef?.num} of {total}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <div className="w-20 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-300 ${isFem ? "bg-pink-500" : "bg-sky-500"}`} style={{ width: `${progress}%` }} />
            </div>
            <span>{completed}/{total}</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-0 overflow-hidden">
        {/* Canvas area */}
        <div className="relative min-h-[400px] lg:min-h-0" ref={containerRef}>
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair"
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />

          {/* Zoom controls overlay */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="h-7 w-7 p-0" title="Zoom out">
              <ZoomOut className="size-3" />
            </Button>
            <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(5, z + 0.25))} className="h-7 w-7 p-0" title="Zoom in">
              <ZoomIn className="size-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} className="h-7 w-7 p-0" title="Reset view">
              <Maximize2 className="size-3" />
            </Button>
          </div>

          {/* Tool controls overlay */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setShowGrid(!showGrid)} className={`h-7 w-7 p-0 ${showGrid ? accentBg : ""}`} title="Toggle grid">
              <Grid3x3 className="size-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCross(!showCross)} className={`h-7 w-7 p-0 ${showCross ? accentBg : ""}`} title="Toggle crosshair">
              <Crosshair className="size-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLmSize(s => Math.min(5, s + 0.5))} className="h-7 w-7 p-0" title="Increase marker size">
              <Plus className="size-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLmSize(s => Math.max(1, s - 0.5))} className="h-7 w-7 p-0" title="Decrease marker size">
              <Minus className="size-3" />
            </Button>
          </div>

          {/* Instruction overlay */}
          {!placed && (
            <div className="absolute top-3 left-3 right-3">
              <div className={`rounded-lg border ${accentBg} backdrop-blur-sm px-3 py-2`}>
                <div className="flex items-start gap-2">
                  <MapPin className={`size-4 mt-0.5 ${accentText}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{curDef?.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{curDef?.instruction}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="border-t lg:border-t-0 lg:border-l border-border/50 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Current landmark card */}
            <div className={`rounded-xl border p-3 ${accentBg}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${accentBg} ${accentText}`}>
                    {curDef?.num}
                  </div>
                  <h3 className="font-bold text-sm text-foreground">{curDef?.label}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setShowTip(!showTip)} className={`h-6 w-6 p-0 ${showTip ? accentBg : ""}`} title="Show tip">
                    <Lightbulb className="size-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowCross(!showCross)} className={`h-6 w-6 p-0 ${showCross ? accentBg : ""}`} title="Show crosshair">
                    <Crosshair className="size-3" />
                  </Button>
                </div>
              </div>

              <div className="bg-card/40 rounded-lg p-2.5 border border-border/30">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {placed
                    ? `✅ ${curDef?.label} placed. Click again to adjust, or use Next to continue.`
                    : curDef?.instruction}
                </p>
              </div>

              {showTip && curDef?.tip && (
                <div className="mt-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                  <div className="flex items-start gap-1.5">
                    <Lightbulb className="size-3.5 text-amber-300 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-100/90">{curDef.tip}</p>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={prev} disabled={idx === 0 && profileType === "front"} className="flex-1 gap-1 h-8 text-xs">
                  <ArrowLeft className="size-3" />
                  {idx > 0 ? "Previous" : "Back"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset} disabled={!placed} className="h-8 w-8 p-0" title="Reset this landmark">
                  <RotateCcw className="size-3" />
                </Button>
                <Button size="sm" onClick={next} className={`flex-1 gap-1 h-8 text-xs ${accentGlow}`}>
                  {idx < defs.length - 1 ? "Next" : profileType === "front" ? "Side Profile →" : "Complete"}
                  <ArrowRight className="size-3" />
                </Button>
              </div>
            </div>

            {/* Progress list */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-3">
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">All Landmarks</h3>
              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                {defs.map((d, i) => {
                  const isPlaced = curLm.some(l => l.id === d.id)
                  const isCurrent = i === idx
                  return (
                    <button
                      key={d.id}
                      onClick={() => { setIdx(i); setZoom(1); setPan({ x: 0, y: 0 }) }}
                      className={`w-full flex items-center gap-2 rounded-md p-1.5 transition-all text-left ${
                        isCurrent ? accentBg : isPlaced ? "bg-secondary/20 border border-border/30" : "hover:bg-secondary/10"
                      }`}
                    >
                      <div className={`flex size-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                        isPlaced ? "bg-emerald-500/20 text-emerald-100" : isCurrent ? `${accentBg} ${accentText}` : "bg-secondary/60 text-muted-foreground"
                      }`}>
                        {isPlaced ? <CheckCircle2 className="size-3" /> : d.num}
                      </div>
                      <span className={`text-xs truncate ${isCurrent || isPlaced ? "text-foreground" : "text-muted-foreground"}`}>
                        {d.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
