"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { Cocktail } from "@/types/cocktail"
import { saveRecipe } from "@/lib/cocktail-machine"
import { Loader2, ImageIcon, FolderOpen, TestTube } from "lucide-react"
import FileBrowser from "./file-browser"

interface ImageEditorProps {
  isOpen: boolean
  onClose: () => void
  cocktail: Cocktail | null
  onSave: (updatedCocktail: Cocktail) => void
}

export default function ImageEditor({ isOpen, onClose, cocktail, onSave }: ImageEditorProps) {
  const [imageUrl, setImageUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [showFileBrowser, setShowFileBrowser] = useState(false)
  const [previewSrc, setPreviewSrc] = useState("")
  const [testResults, setTestResults] = useState<any>(null)

  useEffect(() => {
    if (cocktail && isOpen) {
      setImageUrl(cocktail.image || "")
      updatePreview(cocktail.image || "")
    }
  }, [cocktail, isOpen])

  const updatePreview = async (url: string) => {
    if (!url || !cocktail) {
      setPreviewSrc(`/placeholder.svg?height=128&width=128&query=${encodeURIComponent(cocktail?.name || "")}`)
      return
    }

    // Teste den Pfad mit der API
    try {
      const response = await fetch(`/api/test-image?path=${encodeURIComponent(url)}`)
      const results = await response.json()
      setTestResults(results)

      if (results.workingPaths.length > 0) {
        // Verwende den ersten funktionierenden Pfad
        const workingPath = results.workingPaths[0].path
        // Konvertiere zu Web-Pfad
        const webPath = workingPath
          .replace(process.cwd(), "")
          .replace(/\\/g, "/")
          .replace(/^\/public/, "")
        setPreviewSrc(webPath)
      } else {
        setPreviewSrc(`/placeholder.svg?height=128&width=128&query=${encodeURIComponent(cocktail.name)}`)
      }
    } catch (error) {
      console.error("Fehler beim Testen des Bildpfads:", error)
      setPreviewSrc(`/placeholder.svg?height=128&width=128&query=${encodeURIComponent(cocktail.name)}`)
    }
  }

  if (!cocktail) return null

  const handleSelectImageFromBrowser = (imagePath: string) => {
    setImageUrl(imagePath)
    setShowFileBrowser(false)
    updatePreview(imagePath)
  }

  const handleSave = async () => {
    if (!cocktail) return

    setSaving(true)
    try {
      const updatedCocktail: Cocktail = {
        ...cocktail,
        image: imageUrl || "",
      }

      await saveRecipe(updatedCocktail)
      onSave(updatedCocktail)
      onClose()
    } catch (error) {
      console.error("Fehler beim Speichern des Bildes:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-black border-[hsl(var(--cocktail-card-border))] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bild ändern - {cocktail.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-4">
            {/* Vorschau */}
            <div className="flex justify-center">
              <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-[hsl(var(--cocktail-card-border))]">
                <img src={previewSrc || "/placeholder.svg"} alt="Vorschau" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Eingabefeld */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-white">
                <ImageIcon className="h-4 w-4" />
                Bild-Pfad
              </Label>
              <div className="flex gap-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value)
                    updatePreview(e.target.value)
                  }}
                  className="bg-white border-[hsl(var(--cocktail-card-border))] text-black flex-1"
                  placeholder="/images/cocktails/mein-bild.jpg"
                />
                <Button
                  type="button"
                  onClick={() => setShowFileBrowser(true)}
                  className="bg-[hsl(var(--cocktail-primary))] text-black hover:bg-[hsl(var(--cocktail-primary-hover))]"
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  onClick={() => updatePreview(imageUrl)}
                  className="bg-blue-600 text-white hover:bg-blue-500"
                >
                  <TestTube className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Test-Ergebnisse */}
            {testResults && (
              <div className="text-xs bg-gray-800 p-3 rounded font-mono max-h-40 overflow-y-auto">
                <div className="text-green-400 mb-2">
                  Funktioniert: {testResults.workingPaths.length} von {testResults.testResults.length}
                </div>
                {testResults.testResults.map((result: any, index: number) => (
                  <div key={index} className={result.exists ? "text-green-400" : "text-red-400"}>
                    {result.exists ? "✅" : "❌"} {result.path}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-[hsl(var(--cocktail-card-bg))] text-white border-[hsl(var(--cocktail-card-border))] hover:bg-[hsl(var(--cocktail-card-border))]"
            >
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#00ff00] text-black hover:bg-[#00cc00]">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Speichern...
                </>
              ) : (
                "Speichern"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FileBrowser
        isOpen={showFileBrowser}
        onClose={() => setShowFileBrowser(false)}
        onSelectImage={handleSelectImageFromBrowser}
      />
    </>
  )
}
