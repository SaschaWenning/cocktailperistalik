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

    const possiblePaths: string[] = []

    // Echte absolute Dateisystempfade
    if (
      imagePath.startsWith("/home/") ||
      imagePath.startsWith("/var/") ||
      imagePath.startsWith("/opt/") ||
      imagePath.startsWith("/media/")
    ) {
      possiblePaths.push(imagePath)
    }

    // Absolute Projektpfade, die /public/ enthalten
    if (imagePath.includes("/public/")) {
      possiblePaths.push(imagePath)
    }

    // Webpfade wie /images/cocktails/foo.jpg
    if (imagePath.startsWith("/")) {
      const relativePath = imagePath.replace(/^\/+/, "")
      possiblePaths.push(
        path.join(process.cwd(), "public", relativePath),
        path.join(process.cwd(), "cocktailbot-main", "public", relativePath),
      )
    } else {
      possiblePaths.push(
        path.join(process.cwd(), "public", imagePath),
        path.join(process.cwd(), "cocktailbot-main", "public", imagePath),
        path.join(process.cwd(), imagePath),
        imagePath,
      )
    }

    const uniquePaths = [...new Set(possiblePaths)]

    let fullPath = ""

    for (const testPath of uniquePaths) {
      try {
        await access(testPath, constants.F_OK)
        fullPath = testPath
        break
      } catch {
        // nächster Kandidat
      }
    }

    if (!fullPath) {
      return NextResponse.json(
        { error: "Bild nicht gefunden", tried: uniquePaths },
        { status: 404 },
      )
    }

    const imageBuffer = await readFile(fullPath)

    const ext = path.extname(fullPath).toLowerCase()
    let contentType = "image/jpeg"

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

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Image API Error:", error)
    return NextResponse.json({ error: "Fehler beim Laden des Bildes" }, { status: 500 })
  }
}
