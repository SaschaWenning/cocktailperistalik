import { type NextRequest, NextResponse } from "next/server"
import { readFileSync, writeFileSync, readdirSync } from "fs"
import { join } from "path"

export async function POST(request: NextRequest) {
  try {
    // Lade die aktuelle cocktails.ts Datei
    const cocktailsPath = join(process.cwd(), "data", "cocktails.ts")
    const cocktailsContent = readFileSync(cocktailsPath, "utf-8")

    // Finde alle verfügbaren Bilder im images/cocktails Verzeichnis
    const imagesDir = join(process.cwd(), "public", "images", "cocktails")
    const availableImages = readdirSync(imagesDir).filter((file) => file.match(/\.(jpg|jpeg|png|gif|webp)$/i))

    console.log("Verfügbare Bilder:", availableImages)

    // Extrahiere die Cocktail-Daten aus der Datei
    const cocktailsMatch = cocktailsContent.match(/export const cocktails: Cocktail\[\] = (\[[\s\S]*?\]);/)
    if (!cocktailsMatch) {
      return NextResponse.json({ error: "Cocktails array not found" }, { status: 400 })
    }

    // Parse die Cocktails (vereinfacht)
    const cocktailsArrayString = cocktailsMatch[1]
    const cocktails = eval(cocktailsArrayString) // Vorsicht: nur für Entwicklung!

    // Korrigiere die Bildpfade
    const correctedCocktails = cocktails.map((cocktail: any) => {
      if (cocktail.image) {
        const filename = cocktail.image.split("/").pop()

        // Prüfe ob das Bild existiert
        if (availableImages.includes(filename)) {
          const correctedPath = `/images/cocktails/${filename}`
          console.log(`Korrigiere ${cocktail.name}: ${cocktail.image} → ${correctedPath}`)
          return {
            ...cocktail,
            image: correctedPath,
          }
        } else {
          console.log(`⚠️ Bild nicht gefunden für ${cocktail.name}: ${filename}`)
        }
      }
      return cocktail
    })

    // Erstelle den neuen Dateiinhalt
    const newContent = cocktailsContent.replace(
      /export const cocktails: Cocktail\[\] = \[[\s\S]*?\];/,
      `export const cocktails: Cocktail[] = ${JSON.stringify(correctedCocktails, null, 2)};`,
    )

    // Schreibe die korrigierte Datei
    writeFileSync(cocktailsPath, newContent, "utf-8")

    return NextResponse.json({
      success: true,
      correctedCount: correctedCocktails.filter((c: any) => c.image?.startsWith("/images/cocktails/")).length,
      availableImages,
      correctedCocktails: correctedCocktails.map((c: any) => ({ name: c.name, image: c.image })),
    })
  } catch (error) {
    console.error("Fehler beim Korrigieren der Bildpfade:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
