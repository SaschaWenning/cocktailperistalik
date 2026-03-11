import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

const HIDDEN_COCKTAILS_PATH = path.join(process.cwd(), "data", "hidden-cocktails.json")

function loadHiddenCocktails(): string[] {
  try {
    if (fs.existsSync(HIDDEN_COCKTAILS_PATH)) {
      const data = fs.readFileSync(HIDDEN_COCKTAILS_PATH, "utf8")
      return JSON.parse(data)
    }
    return []
  } catch (error) {
    console.error("Fehler beim Laden der versteckten Cocktails:", error)
    return []
  }
}

function saveHiddenCocktails(hiddenCocktails: string[]): void {
  try {
    // Stelle sicher, dass das Verzeichnis existiert
    fs.mkdirSync(path.dirname(HIDDEN_COCKTAILS_PATH), { recursive: true })

    // Speichere die versteckten Cocktails in der JSON-Datei
    fs.writeFileSync(HIDDEN_COCKTAILS_PATH, JSON.stringify(hiddenCocktails, null, 2), "utf8")
    console.log("Versteckte Cocktails erfolgreich gespeichert:", hiddenCocktails.length)
  } catch (error) {
    console.error("Fehler beim Speichern der versteckten Cocktails:", error)
    throw error
  }
}

export async function GET() {
  const hiddenCocktails = loadHiddenCocktails()
  return NextResponse.json({ success: true, hiddenCocktails })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const list = Array.isArray(body) ? body : (body?.hiddenCocktails ?? [])
    if (!Array.isArray(list)) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 })
    }

    saveHiddenCocktails(list)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Fehler beim Speichern der versteckten Cocktails:", error)
    return NextResponse.json({ success: false, error: "Failed to save hidden cocktails" }, { status: 500 })
  }
}
