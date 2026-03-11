import { type NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

const LEVELS_FILE = path.join(process.cwd(), "data", "ingredient-levels.json")

// GET - Load ingredient levels from file
export async function GET() {
  try {
    const data = await fs.readFile(LEVELS_FILE, "utf-8")
    const levels = JSON.parse(data)

    return NextResponse.json({
      success: true,
      levels: levels.map((level: any) => ({
        ...level,
        lastUpdated: new Date(level.lastUpdated),
      })),
    })
  } catch (error) {
    console.error("Error loading ingredient levels:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load ingredient levels",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// POST - Save ingredient levels to file
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const levels = Array.isArray(body) ? body : Array.isArray(body?.levels) ? body.levels : null

    if (!levels) {
      return NextResponse.json(
        { success: false, message: "Invalid body: expected array or { levels: [] }" },
        { status: 400 },
      )
    }

    await fs.mkdir(path.dirname(LEVELS_FILE), { recursive: true })
    await fs.writeFile(LEVELS_FILE, JSON.stringify(levels, null, 2))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving ingredient levels:", error)
    return NextResponse.json({ error: "Failed to save ingredient levels" }, { status: 500 })
  }
}
