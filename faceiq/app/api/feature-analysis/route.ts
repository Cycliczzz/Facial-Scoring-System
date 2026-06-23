import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import os from "os";
import crypto from "crypto";

const execAsync = promisify(exec);

const PROJECT_ROOT = path.resolve(process.cwd(), "..");
const PYTHON_SCRIPT = path.join(
  PROJECT_ROOT,
  "faceiq",
  "lib",
  "analysis",
  "feature_scorer.py"
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Missing imageBase64" },
        { status: 400 }
      );
    }

    // Write base64 to temp file
    const tempDir = os.tmpdir();
    const tempFileName = `feature_analysis_${crypto.randomUUID()}.jpg`;
    const tempFilePath = path.join(tempDir, tempFileName);

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    await fs.writeFile(tempFilePath, buffer);

    try {
      const pythonCmd = process.platform === "win32" ? "python" : "python3";
      const escapedScript = PYTHON_SCRIPT.replace(/"/g, '\\"');
      const escapedPath = tempFilePath.replace(/"/g, '\\"');
      const command = `${pythonCmd} "${escapedScript}" "${escapedPath}"`;

      console.log("[feature-analysis] Executing:", command);

      const { stdout, stderr } = await execAsync(command, {
        timeout: 120000,
        maxBuffer: 1024 * 1024,
        env: {
          ...process.env,
          PYTHONPATH: `${PROJECT_ROOT}/3DDFA_V2:${PROJECT_ROOT}`,
          PYTHONUNBUFFERED: "1",
        },
      });

      if (stderr) {
        console.warn("[feature-analysis] stderr:", stderr);
      }

      const result = JSON.parse(stdout.trim());
      return NextResponse.json(result);
    } finally {
      try {
        await fs.unlink(tempFilePath);
      } catch {
        // ignore cleanup errors
      }
    }
  } catch (error: any) {
    console.error("[feature-analysis] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}