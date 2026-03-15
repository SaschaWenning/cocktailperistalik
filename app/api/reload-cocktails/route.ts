export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const SOURCE_PATH = path.join(process.cwd(), "data", "cocktails.json")

export async function POST() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })

    // Read the source cocktails.json
    const raw = await fs.readFile(SOURCE_PATH, "utf-8")
    const cocktails = JSON.parse(raw)

    console.log("[v0] Cocktails reloaded successfully, count:", cocktails.length)

    return NextResponse.json({
      success: true,
      message: "Cocktails erfolgreich neu geladen",
      count: cocktails.length,
    })
  } catch (error) {
    console.error("[v0] Error reloading cocktails:", error)
    return NextResponse.json({ success: false, error: "Failed to reload cocktails" }, { status: 500 })
  }
}
