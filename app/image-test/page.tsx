"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ImageTestResult {
  path: string
  exists: boolean
  error?: string
}

export default function ImageTestPage() {
  const [testResults, setTestResults] = useState<ImageTestResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Test verschiedene Bildpfade
  const testPaths = [
    "/images/cocktails/mojito.jpg",
    "/images/cocktails/sex-on-the-beach.jpg",
    "/images/cocktails/tequila-sunrise.jpg",
    "/images/cocktails/pina-colada.jpg",
    "/images/cocktails/mai-tai.jpg",
    "/citrus-cooler.png",
    "/tropical-sunset.png",
    "/placeholder.svg?height=200&width=200",
  ]

  const testImage = (path: string): Promise<ImageTestResult> => {
    return new Promise((resolve) => {
      const img = new Image()

      img.onload = () => {
        console.log(`[v0] Bild erfolgreich geladen: ${path}`)
        resolve({ path, exists: true })
      }

      img.onerror = (error) => {
        console.log(`[v0] Bild konnte nicht geladen werden: ${path}`, error)
        resolve({ path, exists: false, error: "Laden fehlgeschlagen" })
      }

      img.src = path
    })
  }

  const runTests = async () => {
    setIsLoading(true)
    console.log("[v0] Starte Bild-Tests...")

    const results = await Promise.all(testPaths.map((path) => testImage(path)))

    setTestResults(results)
    setIsLoading(false)
    console.log("[v0] Bild-Tests abgeschlossen:", results)
  }

  useEffect(() => {
    runTests()
  }, [])

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Bild-Test Tool</CardTitle>
          <p className="text-muted-foreground">
            Testet verschiedene Bildpfade um zu sehen, welche Bilder verfügbar sind
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={runTests} disabled={isLoading} className="mb-6">
            {isLoading ? "Teste..." : "Tests erneut ausführen"}
          </Button>

          <div className="grid gap-4">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.exists ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm">{result.path}</p>
                    <p className={`text-sm ${result.exists ? "text-green-600" : "text-red-600"}`}>
                      {result.exists ? "✅ Verfügbar" : "❌ Nicht verfügbar"}
                      {result.error && ` - ${result.error}`}
                    </p>
                  </div>
                  {result.exists && (
                    <img
                      src={result.path || "/placeholder.svg"}
                      alt="Test"
                      className="w-16 h-16 object-cover rounded"
                      onError={() => console.log(`[v0] Vorschau-Fehler für: ${result.path}`)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {testResults.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2">Zusammenfassung:</h3>
              <p>
                {testResults.filter((r) => r.exists).length} von {testResults.length} Bildern verfügbar
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
