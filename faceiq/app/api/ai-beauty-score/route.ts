import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import os from "os"
import crypto from "crypto"

// ============================================================
// API Route: AI Beauty Score using PyTorch models
// Calls the Python ai_model_scorer.py script
// ============================================================

export async function POST(request: NextRequest) {
  let tempImagePath: string | null = null
  try {
    const formData = await request.formData()
    const image = formData.get("image") as File | null
    const modelName = (formData.get("model") as string) || "ensemble"

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    // Save image to a temp file to avoid ENAMETOOLONG on Windows
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const tempDir = os.tmpdir()
    const uniqueName = `ai_score_${crypto.randomUUID()}.jpg`
    tempImagePath = path.join(tempDir, uniqueName)
    fs.writeFileSync(tempImagePath, buffer)

    // Path to the Python scorer script
    const scorerScript = path.join(process.cwd(), "lib", "analysis", "ai_model_scorer.py")

    // Call Python subprocess with file path instead of base64
    const stdout = execSync(
      `python "${scorerScript}" "${tempImagePath}" "${modelName}"`,
      {
        timeout: 60000,
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024,
        cwd: process.cwd(),
      }
    )

    const result = JSON.parse(stdout.trim())
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("AI beauty score API error:", error.message)

    // Return fallback score
    return NextResponse.json(
      {
        error: "Model scoring failed",
        details: error.message,
        fallback: true,
        score: 7.0,
        confidence: 0.5,
        models: {
          alexnet: { score: 7.0, confidence: 0.5 },
          resnet18: { score: 7.0, confidence: 0.5 },
        },
      },
      { status: 200 }
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
