import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), "public")
    const imagesDir = path.join(publicDir, "images")
    const cocktailsDir = path.join(imagesDir, "cocktails")

    const result = {
      publicDir,
      imagesDir,
      cocktailsDir,
      publicExists: fs.existsSync(publicDir),
      imagesExists: fs.existsSync(imagesDir),
      cocktailsExists: fs.existsSync(cocktailsDir),
      cocktailImages: [] as string[],
      allPublicFiles: [] as string[],
    }

    // Liste alle Dateien im public Verzeichnis
    if (fs.existsSync(publicDir)) {
      result.allPublicFiles = fs.readdirSync(publicDir, { recursive: true }) as string[]
    }

    // Liste alle Cocktail-Bilder
    if (fs.existsSync(cocktailsDir)) {
      result.cocktailImages = fs.readdirSync(cocktailsDir).filter((file) => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
