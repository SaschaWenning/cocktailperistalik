import { type NextRequest, NextResponse } from "next/server"
import type { LightingConfig } from "@/lib/lighting-config-types"
import { loadLightingConfig, saveLightingConfig } from "@/lib/lighting-config"
import { execFile } from "child_process"
import path from "path"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function runLed(...args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = path.join(process.cwd(), "scripts", "led_client.py")
    execFile("python3", [script, ...args], (err) => (err ? reject(err) : resolve()))
  })
}

export async function GET() {
  try {
    const config = await loadLightingConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error("[v0] Error reading lighting config:", error)
    return NextResponse.json({ error: "Failed to load config" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const config: LightingConfig = await request.json()

    console.log("[v0] Saving lighting config:", JSON.stringify(config))

    await saveLightingConfig(config)

    console.log("[v0] Config saved successfully")

    try {
      if (config.idleMode.scheme === "static" && config.idleMode.colors.length > 0) {
        const color = config.idleMode.colors[0]
        const rgb = await hexToRgb(color)
        if (rgb) {
          await runLed("COLOR", String(rgb.r), String(rgb.g), String(rgb.b))
        }
      } else if (config.idleMode.scheme === "rainbow") {
        await runLed("RAINBOW", "30")
      } else if (config.idleMode.scheme === "pulse" && config.idleMode.colors.length > 0) {
        const color = config.idleMode.colors[0]
        const rgb = await hexToRgb(color)
        if (rgb) {
          await runLed("PULSE", String(rgb.r), String(rgb.g), String(rgb.b))
        }
      } else if (config.idleMode.scheme === "blink" && config.idleMode.colors.length > 0) {
        const color = config.idleMode.colors[0]
        const rgb = await hexToRgb(color)
        if (rgb) {
          await runLed("BLINK", String(rgb.r), String(rgb.g), String(rgb.b), "300")
        }
      } else if (config.idleMode.scheme === "off") {
        await runLed("OFF")
      } else {
        await runLed("IDLE")
      }
      console.log("[v0] Idle mode applied successfully after save")
    } catch (ledError) {
      console.error("[v0] Error applying LED config:", ledError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving lighting config:", error)
    return NextResponse.json(
      {
        error: "Failed to save config",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

async function hexToRgb(hex: string): Promise<{ r: number; g: number; b: number } | null> {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null
}
