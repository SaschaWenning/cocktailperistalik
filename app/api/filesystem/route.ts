import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

interface FileItem {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
  size: number
  modified: string
  isImage: boolean
}

interface FileBrowserData {
  currentPath: string
  parentPath: string | null
  items: FileItem[]
}

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"]

function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return IMAGE_EXTENSIONS.includes(ext)
}

function isPathSafe(requestedPath: string): boolean {
  // Verhindere Directory Traversal Angriffe
  const normalizedPath = path.normalize(requestedPath)
  return !normalizedPath.includes("..")
}

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestedPath = searchParams.get("path") || "/"

    if (!isPathSafe(requestedPath)) {
      return NextResponse.json({ error: "Ungültiger Pfad" }, { status: 400 })
    }

    // Überprüfe ob der Pfad existiert
    if (!fs.existsSync(requestedPath)) {
      return NextResponse.json({ error: "Pfad nicht gefunden" }, { status: 404 })
    }

    const stats = fs.statSync(requestedPath)

    if (!stats.isDirectory()) {
      return NextResponse.json({ error: "Pfad ist kein Verzeichnis" }, { status: 400 })
    }

    // Lese Verzeichnisinhalt
    const items = fs.readdirSync(requestedPath)
    const fileItems: FileItem[] = []

    for (const item of items) {
      try {
        const itemPath = path.join(requestedPath, item)
        const itemStats = fs.statSync(itemPath)

        fileItems.push({
          name: item,
          path: itemPath,
          isDirectory: itemStats.isDirectory(),
          isFile: itemStats.isFile(),
          size: itemStats.size,
          modified: itemStats.mtime.toISOString(),
          isImage: itemStats.isFile() && isImageFile(item),
        })
      } catch (error) {
        // Überspringe Dateien, die nicht gelesen werden können
        console.warn(`Kann Datei nicht lesen: ${item}`, error)
      }
    }

    // Sortiere: Verzeichnisse zuerst, dann Dateien
    fileItems.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })

    const parentPath = requestedPath === "/" ? null : path.dirname(requestedPath)

    const response: FileBrowserData = {
      currentPath: requestedPath,
      parentPath,
      items: fileItems,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Filesystem API Error:", error)
    return NextResponse.json({ error: "Fehler beim Lesen des Verzeichnisses" }, { status: 500 })
  }
}
