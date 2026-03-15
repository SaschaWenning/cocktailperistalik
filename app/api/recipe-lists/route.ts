export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const COCKTAILS_DIR = path.join(process.cwd(), "data")

// GET: Listet alle gespeicherten JSON-Dateien auf und gibt aktuelle Datei zurück
export async function GET() {
  try {
    await fs.mkdir(COCKTAILS_DIR, { recursive: true })
    const files = await fs.readdir(COCKTAILS_DIR)
    const jsonFiles = files.filter((f) => f.endsWith(".json") && f !== "pump-config.json" && f !== "lighting-config.json" && f !== "tab-config.json")

    // Aktuelle Cocktails laden
    const currentPath = path.join(COCKTAILS_DIR, "cocktails.json")
    let currentCocktails = []
    try {
      const raw = await fs.readFile(currentPath, "utf-8")
      currentCocktails = JSON.parse(raw)
    } catch {}

    return NextResponse.json({
      files: jsonFiles,
      currentFile: "cocktails.json",
      cocktailCount: currentCocktails.length,
    })
  } catch (error) {
    console.error("[v0] Error listing recipe files:", error)
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

    // Dateiname bereinigen und .json sicherstellen
    const safeName = filename.replace(/[^a-zA-Z0-9_\-äöüÄÖÜß ]/g, "").trim()
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
      // Datei lesen und als cocktails.json speichern (aktive Liste wechseln)
      const raw = await fs.readFile(targetPath, "utf-8")
      const cocktails = JSON.parse(raw)
      const currentPath = path.join(COCKTAILS_DIR, "cocktails.json")
      await fs.writeFile(currentPath, JSON.stringify(cocktails, null, 2), "utf-8")
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
