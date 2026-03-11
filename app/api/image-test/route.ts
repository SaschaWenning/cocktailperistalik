import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cocktailName = searchParams.get("name")

    if (!cocktailName) {
      return NextResponse.json({ error: "Cocktail name is required" }, { status: 400 })
    }

    // Verzeichnisse, die wir durchsuchen werden
    const directories = [
      path.join(process.cwd(), "public", "images", "cocktails"),
      path.join(process.cwd(), "public"),
      path.join(process.cwd()),
      "/home/pi/cocktailbot/cocktailbot-main/public/images/cocktails",
      "/home/pi/cocktailbot/cocktailbot-main/public",
    ]

    const results = {
      cocktailName,
      directories: [] as any[],
      foundImages: [] as string[],
    }

    // Durchsuche jedes Verzeichnis
    for (const dir of directories) {
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir)
          const images = files.filter((file) => {
            const ext = path.extname(file).toLowerCase()
            return [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)
          })

          results.directories.push({
            path: dir,
            exists: true,
            fileCount: files.length,
            imageCount: images.length,
            images,
          })

          // Suche nach Bildern, die den Cocktailnamen enthalten könnten
          const matchingImages = images.filter(
            (img) =>
              img.toLowerCase().includes(cocktailName.toLowerCase()) ||
              cocktailName.toLowerCase().includes(img.split(".")[0].toLowerCase()),
          )

          if (matchingImages.length > 0) {
            matchingImages.forEach((img) => {
              results.foundImages.push(path.join(dir, img))
            })
          }
        } else {
          results.directories.push({
            path: dir,
            exists: false,
          })
        }
      } catch (error) {
        results.directories.push({
          path: dir,
          exists: false,
          error: (error as Error).message,
        })
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Image test API error:", error)
    return NextResponse.json({ error: "Error testing images" }, { status: 500 })
  }
}
