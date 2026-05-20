import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import fs from "fs"
import path from "path"

// ============================================================
// API Route: AI Beauty Score using PyTorch models
// Calls the Python ai_model_scorer.py script
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get("image") as File | null
    const modelName = (formData.get("model") as string) || "ensemble"

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString("base64")

    // Path to the Python scorer script
    const scorerScript = path.join(process.cwd(), "lib", "analysis", "ai_model_scorer.py")

    // Call Python subprocess
    const stdout = execSync(
      `python "${scorerScript}" "${base64Image}" "${modelName}"`,
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
  }
}
