"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cocktails } from "@/data/cocktails"

export default function DebugMaiTaiPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [testResults, setTestResults] = useState<{ path: string; success: boolean; error?: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const maiTai = cocktails.find((c) => c.id === "mai-tai")

  const addLog = (message: string) => {
    console.log(message)
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testImagePath = async (path: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = "anonymous"

      const timeout = setTimeout(() => {
        resolve({ success: false, error: "Timeout (5s)" })
      }, 5000)

      img.onload = () => {
        clearTimeout(timeout)
        resolve({ success: true })
      }

      img.onerror = (error) => {
        clearTimeout(timeout)
        resolve({ success: false, error: error.toString() })
      }

      img.src = path
    })
  }

  const testAllPaths = async () => {
    if (!maiTai) return

    setIsLoading(true)
    setLogs([])
    setTestResults([])

    addLog(`🔍 Testing Mai Tai image: ${maiTai.image}`)

    // Extrahiere den Dateinamen
    const filename = maiTai.image.split("/").pop() || maiTai.image
    const filenameWithoutExt = filename.replace(/\.[^/.]+$/, "")
    const originalExt = filename.split(".").pop()?.toLowerCase() || ""

    addLog(`📁 Filename: ${filename}, Without ext: ${filenameWithoutExt}, Ext: ${originalExt}`)

    const imageExtensions = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg"]
    const extensionsToTry = originalExt
      ? [originalExt, ...imageExtensions.filter((ext) => ext !== originalExt)]
      : imageExtensions

    const basePaths = ["/images/cocktails/", "/", "", "/public/images/cocktails/", "/public/"]

    const strategies: string[] = []

    // Generiere alle Kombinationen
    for (const basePath of basePaths) {
      for (const ext of extensionsToTry) {
        strategies.push(`${basePath}${filenameWithoutExt}.${ext}`)
      }
      strategies.push(`${basePath}${filename}`)
    }

    // Zusätzliche Strategien
    strategies.push(
      maiTai.image,
      maiTai.image.startsWith("/") ? maiTai.image.substring(1) : maiTai.image,
      maiTai.image.startsWith("/") ? maiTai.image : `/${maiTai.image}`,
    )

    const uniqueStrategies = [...new Set(strategies)]
    addLog(`🎯 Testing ${uniqueStrategies.length} unique strategies`)

    const results: { path: string; success: boolean; error?: string }[] = []

    for (let i = 0; i < uniqueStrategies.length; i++) {
      const testPath = uniqueStrategies[i]
      addLog(`${i + 1}/${uniqueStrategies.length} Testing: ${testPath}`)

      const result = await testImagePath(testPath)
      results.push({ path: testPath, ...result })

      if (result.success) {
        addLog(`✅ SUCCESS: ${testPath}`)
      } else {
        addLog(`❌ FAILED: ${testPath} (${result.error})`)
      }
    }

    setTestResults(results)
    setIsLoading(false)

    const successCount = results.filter((r) => r.success).length
    addLog(`🏁 Finished: ${successCount}/${results.length} paths successful`)
  }

  const clearLogs = () => {
    setLogs([])
    setTestResults([])
  }

  if (!maiTai) {
    return <div className="p-8">Mai Tai cocktail not found!</div>
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mai Tai Bild Debug Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={testAllPaths} disabled={isLoading}>
              {isLoading ? "Testing..." : "Test All Image Paths"}
            </Button>
            <Button variant="outline" onClick={clearLogs}>
              Clear Logs
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mai Tai Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mai Tai Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>ID:</strong> {maiTai.id}
                  </p>
                  <p>
                    <strong>Name:</strong> {maiTai.name}
                  </p>
                  <p>
                    <strong>Image Path:</strong> {maiTai.image}
                  </p>
                  <p>
                    <strong>Alcoholic:</strong> {maiTai.alcoholic ? "Yes" : "No"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Current Image Test */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Image</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <img
                    src={maiTai.image || "/placeholder.svg"}
                    alt="Mai Tai - Direct Path"
                    className="w-full h-48 object-cover rounded"
                    onLoad={() => addLog("✅ Direct image load successful")}
                    onError={() => addLog("❌ Direct image load failed")}
                  />
                  <p className="text-sm text-gray-600">Direct path: {maiTai.image}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded text-sm ${
                        result.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{result.success ? "✅" : "❌"}</span>
                        <span className="font-mono">{result.path}</span>
                      </div>
                      {result.error && <div className="text-xs mt-1 opacity-75">{result.error}</div>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Debug Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-gray-500">No logs yet. Click 'Test All Image Paths' to start.</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
