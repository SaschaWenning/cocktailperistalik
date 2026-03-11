"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DebugInfo {
  publicDir: string
  imagesDir: string
  cocktailsDir: string
  publicExists: boolean
  imagesExists: boolean
  cocktailsExists: boolean
  cocktailImages: string[]
  allPublicFiles: string[]
}

export default function DebugImagesPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(false)

  const loadDebugInfo = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug-images")
      const data = await response.json()
      setDebugInfo(data)
    } catch (error) {
      console.error("Fehler beim Laden der Debug-Informationen:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDebugInfo()
  }, [])

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Bild-Debug-Informationen</h1>
        <Button onClick={loadDebugInfo} disabled={loading}>
          {loading ? "Laden..." : "Aktualisieren"}
        </Button>
      </div>

      {debugInfo && (
        <div className="space-y-6">
          {/* Verzeichnis-Status */}
          <Card>
            <CardHeader>
              <CardTitle>Verzeichnis-Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Public Dir:</strong> {debugInfo.publicDir}
                  <span className={debugInfo.publicExists ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
                    {debugInfo.publicExists ? "✅ Existiert" : "❌ Nicht gefunden"}
                  </span>
                </div>
                <div>
                  <strong>Images Dir:</strong> {debugInfo.imagesDir}
                  <span className={debugInfo.imagesExists ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
                    {debugInfo.imagesExists ? "✅ Existiert" : "❌ Nicht gefunden"}
                  </span>
                </div>
                <div>
                  <strong>Cocktails Dir:</strong> {debugInfo.cocktailsDir}
                  <span className={debugInfo.cocktailsExists ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
                    {debugInfo.cocktailsExists ? "✅ Existiert" : "❌ Nicht gefunden"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cocktail-Bilder */}
          <Card>
            <CardHeader>
              <CardTitle>Gefundene Cocktail-Bilder ({debugInfo.cocktailImages.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {debugInfo.cocktailImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {debugInfo.cocktailImages.map((image) => (
                    <div key={image} className="space-y-2">
                      <img
                        src={`/images/cocktails/${image}`}
                        alt={image}
                        className="w-full h-32 object-cover rounded border"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg?height=128&width=128"
                        }}
                      />
                      <p className="text-sm font-mono break-all">{image}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Keine Cocktail-Bilder gefunden</p>
              )}
            </CardContent>
          </Card>

          {/* Alle Public-Dateien */}
          <Card>
            <CardHeader>
              <CardTitle>Alle Public-Dateien ({debugInfo.allPublicFiles.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap">{debugInfo.allPublicFiles.join("\n")}</pre>
              </div>
            </CardContent>
          </Card>

          {/* Test-Bilder */}
          <Card>
            <CardHeader>
              <CardTitle>Bild-Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {debugInfo.cocktailImages.slice(0, 6).map((image) => {
                  const testPaths = [
                    `/images/cocktails/${image}`,
                    `/${image}`,
                    `/api/image?path=${encodeURIComponent(`/images/cocktails/${image}`)}`,
                  ]

                  return (
                    <div key={image} className="space-y-2">
                      <h4 className="font-semibold text-sm">{image}</h4>
                      {testPaths.map((testPath, index) => (
                        <div key={index} className="space-y-1">
                          <p className="text-xs font-mono">{testPath}</p>
                          <img
                            src={testPath || "/placeholder.svg"}
                            alt={`Test ${index + 1}`}
                            className="w-full h-20 object-cover rounded border"
                            onError={(e) => {
                              e.currentTarget.style.border = "2px solid red"
                            }}
                            onLoad={(e) => {
                              e.currentTarget.style.border = "2px solid green"
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
