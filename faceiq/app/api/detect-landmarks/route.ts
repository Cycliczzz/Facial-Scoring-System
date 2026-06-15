import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import os from "os"
import crypto from "crypto"

// ============================================================
// API Route: 3DDFA_V2 Landmark Detection
// ============================================================
//
// POST /api/detect-landmarks
//   FormData: image (File), mode ("front" | "side")
//
// Response: JSON with detected landmarks
//   For front mode:
//     - face_box: bounding rectangle of the face
//     - hairline: {x, y} midpoint of top edge of face box
//     - mesh_points: all 38,365 dense mesh points (for reference)
//   For side mode:
//     - landmarks: dict of 31 side profile landmarks
//     - facing_direction: "left" or "right"
//     - mesh_points: all 38,365 dense mesh points
//

export async function POST(request: NextRequest) {
  let tempImagePath: string | null = null
  try {
    const formData = await request.formData()
    const image = formData.get("image") as File | null
    const mode = (formData.get("mode") as string) || "front"

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    if (mode !== "front" && mode !== "side") {
      return NextResponse.json(
        { error: "Mode must be 'front' or 'side'" },
        { status: 400 }
      )
    }

    // Save image to a temp file
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const tempDir = os.tmpdir()
    const uniqueName = `lm_detect_${crypto.randomUUID()}.jpg`
    tempImagePath = path.join(tempDir, uniqueName)
    fs.writeFileSync(tempImagePath, buffer)

    // Path to the Python detection script
    const detectorScript = path.join(
      process.cwd(),
      "lib",
      "analysis",
      "detect_landmarks_3ddfa.py"
    )

    // Call Python subprocess
    const stdout = execSync(
      `python "${detectorScript}" "${tempImagePath}" "${mode}"`,
      {
        timeout: 120000, // 2 minutes for dense mesh generation
        encoding: "utf-8",
        maxBuffer: 500 * 1024 * 1024, // 500MB for large JSON output
        cwd: process.cwd(),
      }
    )

    const result = JSON.parse(stdout.trim())

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 422 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Landmark detection API error:", error.message)

    // Try to parse stdout if available
    if (error.stdout) {
      try {
        const result = JSON.parse(error.stdout.trim())
        return NextResponse.json(result)
      } catch {
        // fallback
      }
    }

    return NextResponse.json(
      {
        error: "Detection failed",
        details: error.message,
      },
      { status: 500 }
    )
  } finally {
    // Clean up temp file
    if (tempImagePath && fs.existsSync(tempImagePath)) {
      try {
        fs.unlinkSync(tempImagePath)
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}