export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

// Auf dem Raspberry Pi liegt das Projekt in /home/pi/cocktailbot/cocktailbot-main/
// process.cwd() könnte /home/pi/cocktailbot/ sein, daher expliziter Pfad
const COCKTAILS_DIR = process.env.COCKTAILS_DATA_DIR || path.join(process.cwd(), "data")
const ACTIVE_LIST_PATH = path.join(COCKTAILS_DIR, "active-list.json")

async function getActiveListName(): Promise<string | null> {
  try {
    const raw = await fs.readFile(ACTIVE_LIST_PATH, "utf-8")
    const data = JSON.parse(raw)
    return data.name || null
  } catch {
    return null
  }
}

async function saveActiveListName(name: string): Promise<void> {
  await fs.writeFile(ACTIVE_LIST_PATH, JSON.stringify({ name }), "utf-8")
}

// GET: Listet alle gespeicherten JSON-Dateien auf und gibt aktuelle Datei zurück
export async function GET() {
  try {
    await fs.mkdir(COCKTAILS_DIR, { recursive: true })
    const files = await fs.readdir(COCKTAILS_DIR)
    // Alle Konfigurationsdateien und die aktuelle cocktails.json ausschließen
    const excludedFiles = [
      "pump-config.json",
      "lighting-config.json",
      "tab-config.json",
      "active-list.json",
      "hidden-cocktails.json",
      "ingredient-levels.json",
      "cocktails.json", // Die aktive Liste nicht als separate Option anzeigen
    ]
    const jsonFiles = files.filter((f) => f.endsWith(".json") && !excludedFiles.includes(f))

    const currentPath = path.join(COCKTAILS_DIR, "cocktails.json")
    let currentCocktails = []
    try {
      const raw = await fs.readFile(currentPath, "utf-8")
      currentCocktails = JSON.parse(raw)
    } catch {}

    const activeListName = await getActiveListName()

    return NextResponse.json({
      files: jsonFiles,
      currentFile: "cocktails.json",
      cocktailCount: currentCocktails.length,
      activeListName,
    })
  } catch (error) {
    console.error("Error listing recipe files:", error)
    return NextResponse.json({ error: "Fehler beim Laden der Dateiliste" }, { status: 500 })
  }
}

// POST: Speichert aktuelle Cocktails unter neuem Namen ODER lädt eine andere Datei
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, filename } = body

    if (!filename) {
      return NextResponse.json({ error: "Kein Dateiname angegeben" }, { status: 400 })
    }

    // Dateiname bereinigen und .json sicherstellen (Punkt erlaubt für .json)
    const safeName = filename.replace(/[^a-zA-Z0-9_\-äöüÄÖÜß .]/g, "").trim()
    if (!safeName) {
      return NextResponse.json({ error: "Ungültiger Dateiname" }, { status: 400 })
    }
    const fullName = safeName.endsWith(".json") ? safeName : `${safeName}.json`
    const targetPath = path.join(COCKTAILS_DIR, fullName)

    if (action === "save") {
      // Aktuelle cocktails.json lesen und unter neuem Namen speichern
      const currentPath = path.join(COCKTAILS_DIR, "cocktails.json")
      const raw = await fs.readFile(currentPath, "utf-8")
      await fs.writeFile(targetPath, raw, "utf-8")
      return NextResponse.json({ success: true, message: `Gespeichert als ${fullName}` })
    }

    if (action === "load") {
      // Prüfe zuerst ob die Datei existiert
      try {
        await fs.access(targetPath)
      } catch {
        return NextResponse.json({ error: `Datei "${fullName}" existiert nicht` }, { status: 404 })
      }
      
      // Datei lesen und als cocktails.json speichern (aktive Liste wechseln)
      const raw = await fs.readFile(targetPath, "utf-8")
      const cocktails = JSON.parse(raw)
      const currentPath = path.join(COCKTAILS_DIR, "cocktails.json")
      await fs.writeFile(currentPath, JSON.stringify(cocktails, null, 2), "utf-8")
      // Namen ohne .json Endung persistieren
      const displayName = fullName.replace(/\.json$/, "")
      await saveActiveListName(displayName)
      return NextResponse.json({ success: true, message: `${fullName} geladen (${cocktails.length} Rezepte)` })
    }

    if (action === "delete") {
      if (fullName === "cocktails.json") {
        return NextResponse.json({ error: "Die aktive Liste kann nicht gelöscht werden" }, { status: 400 })
      }
      await fs.unlink(targetPath)
      return NextResponse.json({ success: true, message: `${fullName} gelöscht` })
    }

    return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 })
  } catch (error: any) {
    console.error("[v0] Error managing recipe file:", error)
    if (error.code === "ENOENT") {
      return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 })
    }
    return NextResponse.json({ error: "Fehler beim Verarbeiten der Anfrage" }, { status: 500 })
  }
}
