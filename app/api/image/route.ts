import { type NextRequest, NextResponse } from "next/server"
import { readFile, access } from "fs/promises"
import { constants } from "fs"
import path from "path"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imagePath = searchParams.get("path")

    if (!imagePath) {
      return NextResponse.json({ error: "Bildpfad ist erforderlich" }, { status: 400 })
    }

    console.log("[v0] Image API: Loading image from path:", imagePath)

    let fullPath: string

    // Prüfe verschiedene mögliche Pfade
    if (imagePath.startsWith("/")) {
      // Absoluter Pfad
      fullPath = imagePath
    } else {
      // Relativer Pfad - versuche verschiedene Basis-Pfade
      const possiblePaths = [
        path.join(process.cwd(), "public", imagePath),
        path.join(process.cwd(), imagePath),
        imagePath,
      ]

      fullPath = ""
      for (const testPath of possiblePaths) {
        try {
          await access(testPath, constants.F_OK)
          fullPath = testPath
          break
        } catch {
          // Datei existiert nicht an diesem Pfad
        }
      }

      if (!fullPath) {
        console.log("[v0] Image API: Image not found at any path:", possiblePaths)
        return NextResponse.json({ error: "Bild nicht gefunden" }, { status: 404 })
      }
    }

    // Prüfe ob Datei existiert
    try {
      await access(fullPath, constants.F_OK)
    } catch {
      console.log("[v0] Image API: Image file does not exist:", fullPath)
      return NextResponse.json({ error: "Bilddatei existiert nicht" }, { status: 404 })
    }

    // Lese Bilddatei
    const imageBuffer = await readFile(fullPath)

    // Bestimme Content-Type basierend auf Dateiendung
    const ext = path.extname(fullPath).toLowerCase()
    let contentType = "image/jpeg" // Default

    switch (ext) {
      case ".png":
        contentType = "image/png"
        break
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg"
        break
      case ".gif":
        contentType = "image/gif"
        break
      case ".webp":
        contentType = "image/webp"
        break
      case ".svg":
        contentType = "image/svg+xml"
        break
      case ".bmp":
        contentType = "image/bmp"
        break
    }

    console.log(
      "[v0] Image API: Successfully loaded image:",
      fullPath,
      "Type:",
      contentType,
      "Size:",
      imageBuffer.length,
    )

    // Gebe Bilddatei zurück
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600", // 1 Stunde Cache
      },
    })
  } catch (error) {
    console.error("[v0] Image API Error:", error)
    return NextResponse.json({ error: "Fehler beim Laden des Bildes" }, { status: 500 })
  }
}
