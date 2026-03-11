"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Search, Check, X } from "lucide-react"
import { cocktails } from "@/data/cocktails"

export default function ImageDebugPage() {
  const [cocktailName, setCocktailName] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [imageTests, setImageTests] = useState<{ path: string; success: boolean }[]>([])

  const handleSearch = async () => {
    if (!cocktailName) return

    setLoading(true)
    setResults(null)
    setImageTests([])

    try {
      const response = await fetch(`/api/image-test?name=${encodeURIComponent(cocktailName)}`)
      const data = await response.json()
      setResults(data)

      // Teste alle gefundenen Bilder
      if (data.foundImages && data.foundImages.length > 0) {
        const tests = await Promise.all(
          data.foundImages.map(async (imagePath: string) => {
            // Konvertiere zu Web-Pfad für Tests
            const webPath = imagePath
              .replace(process.cwd(), "")
              .replace(/^\/home\/pi\/cocktailbot\/cocktailbot-main\/public/, "")
              .replace(/\\/g, "/")
              .replace(/^\/public/, "")

            // Teste das Bild
            const success = await testImage(webPath)
            return { path: webPath, success }
          }),
        )

        setImageTests(tests)
      }
    } catch (error) {
      console.error("Error searching for images:", error)
    } finally {
      setLoading(false)
    }
  }

  const testImage = (src: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = src
    })
  }

  const handleCocktailSelect = (name: string) => {
    setCocktailName(name)
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Bild-Debug Tool</h1>

      <div className="mb-8">
        <div className="flex gap-3 mb-4">
          <Input
            value={cocktailName}
            onChange={(e) => setCocktailName(e.target.value)}
            placeholder="Cocktail-Name eingeben..."
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Suchen
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {cocktails.map((cocktail) => (
            <Button
              key={cocktail.id}
              variant="outline"
              size="sm"
              onClick={() => handleCocktailSelect(cocktail.name)}
              className="text-xs"
            >
              {cocktail.name}
            </Button>
          ))}
        </div>
      </div>

      {results && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Suchergebnisse für "{results.cocktailName}"</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h3 className="font-semibold">Gefundene Bilder: {results.foundImages.length}</h3>

                {results.foundImages.length > 0 ? (
                  <div className="space-y-3">
                    {results.foundImages.map((path: string, index: number) => {
                      const test = imageTests.find(
                        (t) =>
                          t.path ===
                          path
                            .replace(process.cwd(), "")
                            .replace(/\\/g, "/")
                            .replace(/^\/public/, ""),
                      )

                      return (
                        <div key={index} className="border p-3 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <div className="font-mono text-sm break-all">{path}</div>
                            {test && (
                              <div className={`flex items-center ${test.success ? "text-green-500" : "text-red-500"}`}>
                                {test.success ? <Check className="h-4 w-4 mr-1" /> : <X className="h-4 w-4 mr-1" />}
                                {test.success ? "Funktioniert" : "Fehler"}
                              </div>
                            )}
                          </div>

                          {test && test.success && (
                            <div className="mt-2">
                              <img
                                src={test.path || "/placeholder.svg"}
                                alt={results.cocktailName}
                                className="h-32 object-cover rounded"
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-yellow-500">Keine Bilder gefunden</div>
                )}

                <h3 className="font-semibold mt-6">Durchsuchte Verzeichnisse:</h3>
                <div className="space-y-2">
                  {results.directories.map((dir: any, index: number) => (
                    <div
                      key={index}
                      className={`p-2 rounded ${dir.exists ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                    >
                      <div className="font-mono text-sm break-all">{dir.path}</div>
                      {dir.exists && (
                        <div className="text-xs mt-1">
                          {dir.imageCount} Bilder von {dir.fileCount} Dateien
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
