import { type NextRequest, NextResponse } from "next/server"
import { existsSync } from "fs"
import { join } from "path"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imagePath = searchParams.get("path")

  if (!imagePath) {
    return NextResponse.json({ error: "No path provided" }, { status: 400 })
  }

  // Teste verschiedene Pfade
  const testPaths = [
    // 1. Public-Verzeichnis (Next.js Standard)
    join(process.cwd(), "public", imagePath.replace(/^\//, "")),

    // 2. Absoluter Pfad
    imagePath,

    // 3. Relativer Pfad vom Projektroot
    join(process.cwd(), imagePath.replace(/^\//, "")),

    // 4. Cocktailbot-spezifische Pfade
    join(process.cwd(), "cocktailbot-main", "public", imagePath.replace(/^\//, "")),
    join(process.cwd(), "..", "public", imagePath.replace(/^\//, "")),
  ]

  const results = testPaths.map((testPath) => ({
    path: testPath,
    exists: existsSync(testPath),
  }))

  return NextResponse.json({
    originalPath: imagePath,
    testResults: results,
    workingPaths: results.filter((r) => r.exists),
  })
}
