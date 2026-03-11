"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cocktails } from "@/data/cocktails"

interface ImageAnalysis {
  cocktailName: string
  originalPath: string
  workingPath?: string
  fileSize?: number
  dimensions?: { width: number; height: number }
  loadTime?: number
  error?: string
  status: "loading" | "success" | "failed"
}

export default function AnalyzeImagesPage() {
  const [analyses, setAnalyses] = useState<ImageAnalysis[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const analyzeImage = async (cocktail: any): Promise<ImageAnalysis> => {
    const startTime = Date.now()

    const analysis: ImageAnalysis = {
      cocktailName: cocktail.name,
      originalPath: cocktail.image || "",
      status: "loading",
    }

    if (!cocktail.image) {
      return {
        ...analysis,
        status: "failed",
        error: "Kein Bildpfad definiert",
      }
    }

    // Teste verschiedene Pfade wie in der CocktailCard
    const filename = cocktail.image.split("/").pop() || cocktail.image
    const filenameWithoutExt = filename.replace(/\.[^/.]+$/, "")
    const originalExt = filename.split(".").pop()?.toLowerCase() || ""

    const imageExtensions = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg"]
    const extensionsToTry = originalExt
      ? [originalExt, ...imageExtensions.filter((ext) => ext !== originalExt)]
      : imageExtensions

    const basePaths = ["/images/cocktails/", "/", "", "/public/images/cocktails/", "/public/"]

    const strategies: string[] = []

    for (const basePath of basePaths) {
      for (const ext of extensionsToTry) {
        strategies.push(`${basePath}${filenameWithoutExt}.${ext}`)
      }
      strategies.push(`${basePath}${filename}`)
    }

    strategies.push(
      cocktail.image,
      cocktail.image.startsWith("/") ? cocktail.image.substring(1) : cocktail.image,
      cocktail.image.startsWith("/") ? cocktail.image : `/${cocktail.image}`,
    )

    const uniqueStrategies = [...new Set(strategies)]

    console.log(`[v0] Analyzing ${cocktail.name} with ${uniqueStrategies.length} strategies`)

    for (const testPath of uniqueStrategies) {
      try {
        const img = new Image()
        img.crossOrigin = "anonymous"

        const loadPromise = new Promise<boolean>((resolve, reject) => {
          img.onload = () => {
            const loadTime = Date.now() - startTime
            analysis.workingPath = testPath
            analysis.dimensions = { width: img.naturalWidth, height: img.naturalHeight }
            analysis.loadTime = loadTime
            analysis.status = "success"
            resolve(true)
          }
          img.onerror = () => resolve(false)

          // Timeout nach 5 Sekunden
          setTimeout(() => resolve(false), 5000)
        })

        img.src = testPath
        const success = await loadPromise

        if (success) {
          console.log(`[v0] ✅ ${cocktail.name}: ${testPath}`)
          return analysis
        }
      } catch (error) {
        console.log(`[v0] ❌ ${cocktail.name} error with ${testPath}:`, error)
      }
    }

    return {
      ...analysis,
      status: "failed",
      error: "Kein funktionierender Bildpfad gefunden",
      loadTime: Date.now() - startTime,
    }
  }

  const startAnalysis = async () => {
    setIsAnalyzing(true)
    setAnalyses([])
    setCurrentIndex(0)

    const results: ImageAnalysis[] = []

    for (let i = 0; i < cocktails.length; i++) {
      setCurrentIndex(i)
      const cocktail = cocktails[i]

      console.log(`[v0] Analyzing ${i + 1}/${cocktails.length}: ${cocktail.name}`)

      const analysis = await analyzeImage(cocktail)
      results.push(analysis)
      setAnalyses([...results])

      // Kurze Pause zwischen den Analysen
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    setIsAnalyzing(false)
    console.log(
      `[v0] Analysis complete. Success: ${results.filter((r) => r.status === "success").length}/${results.length}`,
    )
  }

  const successCount = analyses.filter((a) => a.status === "success").length
  const failedCount = analyses.filter((a) => a.status === "failed").length
  const jpgCount = analyses.filter((a) => a.originalPath.toLowerCase().includes(".jpg")).length

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bild-Analyse</h1>
          <p className="text-muted-foreground">Analysiere alle Cocktail-Bilder und ihre Eigenschaften</p>
        </div>
        <Button onClick={startAnalysis} disabled={isAnalyzing} size="lg">
          {isAnalyzing ? `Analysiere... (${currentIndex + 1}/${cocktails.length})` : "Analyse starten"}
        </Button>
      </div>

      {analyses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
              <div className="text-sm text-muted-foreground">Erfolgreich geladen</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{failedCount}</div>
              <div className="text-sm text-muted-foreground">Fehlgeschlagen</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{jpgCount}</div>
              <div className="text-sm text-muted-foreground">JPG-Bilder</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {analyses.map((analysis, index) => (
          <Card
            key={index}
            className={`${
              analysis.status === "success"
                ? "border-green-500"
                : analysis.status === "failed"
                  ? "border-red-500"
                  : "border-yellow-500"
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{analysis.cocktailName}</CardTitle>
                <Badge
                  variant={
                    analysis.status === "success"
                      ? "default"
                      : analysis.status === "failed"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {analysis.status === "success" ? "✅" : analysis.status === "failed" ? "❌" : "🔄"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <div className="text-sm font-medium">Original:</div>
                <div className="text-xs text-muted-foreground break-all">{analysis.originalPath}</div>
              </div>

              {analysis.workingPath && (
                <div>
                  <div className="text-sm font-medium">Funktioniert:</div>
                  <div className="text-xs text-green-600 break-all">{analysis.workingPath}</div>
                </div>
              )}

              {analysis.dimensions && (
                <div>
                  <div className="text-sm font-medium">Größe:</div>
                  <div className="text-xs text-muted-foreground">
                    {analysis.dimensions.width} × {analysis.dimensions.height}px
                  </div>
                </div>
              )}

              {analysis.loadTime && (
                <div>
                  <div className="text-sm font-medium">Ladezeit:</div>
                  <div className="text-xs text-muted-foreground">{analysis.loadTime}ms</div>
                </div>
              )}

              {analysis.error && (
                <div>
                  <div className="text-sm font-medium text-red-600">Fehler:</div>
                  <div className="text-xs text-red-500">{analysis.error}</div>
                </div>
              )}

              {analysis.status === "success" && analysis.workingPath && (
                <div className="mt-3">
                  <img
                    src={analysis.workingPath || "/placeholder.svg"}
                    alt={analysis.cocktailName}
                    className="w-full h-24 object-cover rounded"
                    crossOrigin="anonymous"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
