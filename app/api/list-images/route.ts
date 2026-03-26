import { NextResponse } from "next/server"
import { readdir } from "fs/promises"
import { join } from "path"

export async function GET() {
  try {
    console.log("[v0] Starte Bildverzeichnis-Scan...")

    const directories = [
      "public",
      "public/images",
      "public/images/cocktails",
      "cocktailbot-main/public",
      "cocktailbot-main/public/images",
      "cocktailbot-main/public/images/cocktails",
    ]

    const results: Record<string, string[]> = {}

    for (const dir of directories) {
      try {
        const fullPath = join(process.cwd(), dir)
        console.log(`[v0] Scanne Verzeichnis: ${fullPath}`)

        const files = await readdir(fullPath)
        const imageFiles = files.filter((file) => /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(file))

        results[dir] = imageFiles
        console.log(`[v0] Gefunden in ${dir}:`, imageFiles)
      } catch (error) {
        console.log(`[v0] Verzeichnis ${dir} nicht gefunden:`, error)
        results[dir] = []
      }
    }

    return NextResponse.json({
      success: true,
      directories: results,
      totalImages: Object.values(results).flat().length,
    })
  } catch (error) {
    console.error("[v0] Fehler beim Scannen der Bildverzeichnisse:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Fehler beim Scannen der Verzeichnisse",
      },
      { status: 500 },
    )
  }
}
