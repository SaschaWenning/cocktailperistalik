"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, FolderOpen, Trash2, RefreshCw, ArrowUp, ArrowLeft, X, Lock, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function RecipeListManager({ onCocktailsReload }: { onCocktailsReload?: () => void }) {
  const { toast } = useToast()
  const [files, setFiles] = useState<string[]>([])
  const [currentFile, setCurrentFile] = useState("cocktails.json")
  const [cocktailCount, setCocktailCount] = useState(0)
  const [saveFileName, setSaveFileName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
  const [loadingFile, setLoadingFile] = useState<string | null>(null)
  
  // Keyboard state
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [keyboardValue, setKeyboardValue] = useState("")
  const [isShiftActive, setIsShiftActive] = useState(false)
  const [isCapsLockActive, setIsCapsLockActive] = useState(false)

  const loadFileList = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/recipe-lists")
      if (!res.ok) throw new Error("Fehler beim Laden")
      const data = await res.json()
      setFiles(data.files || [])
      setCurrentFile(data.currentFile || "cocktails.json")
      setCocktailCount(data.cocktailCount || 0)
    } catch (error) {
      toast({ title: "Fehler", description: "Dateiliste konnte nicht geladen werden.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadFileList()
  }, [loadFileList])

  // Keyboard layout
  const alphaKeys = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["q", "w", "e", "r", "t", "z", "u", "i", "o", "p", "ü"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ö", "ä"],
    ["y", "x", "c", "v", "b", "n", "m", "-", "_", " "],
  ]

  const openKeyboard = () => {
    setKeyboardValue(saveFileName)
    setShowKeyboard(true)
  }

  const handleKeyPress = (key: string) => {
    let newKey = key
    if (key.length === 1 && key.match(/[a-z]/)) {
      const shouldUppercase = (isShiftActive && !isCapsLockActive) || (!isShiftActive && isCapsLockActive)
      newKey = shouldUppercase ? key.toUpperCase() : key.toLowerCase()
      if (isShiftActive && !isCapsLockActive) {
        setIsShiftActive(false)
      }
    }
    setKeyboardValue((prev) => prev + newKey)
  }

  const handleShift = () => setIsShiftActive(!isShiftActive)
  const handleCapsLock = () => setIsCapsLockActive(!isCapsLockActive)
  const handleBackspace = () => setKeyboardValue((prev) => prev.slice(0, -1))
  const handleClear = () => setKeyboardValue("")

  const handleKeyboardConfirm = () => {
    setSaveFileName(keyboardValue)
    setShowKeyboard(false)
  }

  const handleKeyboardCancel = () => {
    setShowKeyboard(false)
  }

  const handleSave = async () => {
    if (!saveFileName.trim()) {
      toast({ title: "Fehler", description: "Bitte einen Dateinamen eingeben.", variant: "destructive" })
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch("/api/recipe-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", filename: saveFileName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Fehler")
      toast({ title: "Gespeichert", description: data.message })
      setSaveFileName("")
      loadFileList()
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLoad = async (filename: string) => {
    setLoadingFile(filename)
    try {
      const res = await fetch("/api/recipe-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "load", filename }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Fehler")
      toast({ title: "Geladen", description: data.message })
      loadFileList()
      // Cocktails in der Hauptseite direkt neu laden statt Seite neu laden
      if (onCocktailsReload) {
        onCocktailsReload()
      } else {
        setTimeout(() => window.location.reload(), 500)
      }
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" })
    } finally {
      setLoadingFile(null)
    }
  }

  const handleDelete = async (filename: string) => {
    setDeletingFile(filename)
    try {
      const res = await fetch("/api/recipe-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", filename }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Fehler")
      toast({ title: "Gelöscht", description: data.message })
      loadFileList()
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" })
    } finally {
      setDeletingFile(null)
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-[hsl(var(--cocktail-text))]">Rezeptlisten</h3>

      {/* Aktuelle Liste */}
      <Card className="bg-[hsl(var(--cocktail-card-bg))] border-[hsl(var(--cocktail-card-border))]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[hsl(var(--cocktail-text))]">Aktuelle Liste</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[hsl(var(--cocktail-text))]">{currentFile}</p>
              <p className="text-xs text-[hsl(var(--cocktail-text-muted))]">{cocktailCount} Rezepte geladen</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadFileList}
              disabled={isLoading}
              className="bg-transparent border-[hsl(var(--cocktail-card-border))] text-[hsl(var(--cocktail-text))]"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Aktuelle Rezepte speichern */}
      <Card className="bg-[hsl(var(--cocktail-card-bg))] border-[hsl(var(--cocktail-card-border))]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[hsl(var(--cocktail-text))]">Aktuelle Rezepte speichern</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!showKeyboard ? (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="Dateiname (z.B. Sommer 2025)"
                  value={saveFileName}
                  onClick={openKeyboard}
                  readOnly
                  className="bg-[hsl(var(--cocktail-bg))] border-[hsl(var(--cocktail-card-border))] text-[hsl(var(--cocktail-text))] h-10 cursor-pointer"
                />
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !saveFileName.trim()}
                  className="bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black font-semibold shrink-0"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Speichert..." : "Speichern"}
                </Button>
              </div>
              <p className="text-xs text-[hsl(var(--cocktail-text-muted))]">
                Die aktuelle Rezeptliste wird als .json Datei im Datenordner gespeichert.
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <div className="text-center">
                <h3 className="text-sm font-semibold text-white mb-2">Dateinamen eingeben</h3>
                <div className="bg-white text-black text-lg p-3 rounded mb-3 min-h-[44px] break-all border-2 border-[#00ff00]">
                  {keyboardValue || <span className="text-gray-400">Eingabe...</span>}
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  {alphaKeys.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex gap-1 justify-center">
                      {row.map((key) => {
                        let displayKey = key
                        if (key.length === 1 && key.match(/[a-z]/)) {
                          const shouldShowUppercase =
                            (isShiftActive && !isCapsLockActive) || (!isShiftActive && isCapsLockActive)
                          displayKey = shouldShowUppercase ? key.toUpperCase() : key.toLowerCase()
                        }
                        return (
                          <Button
                            key={key}
                            type="button"
                            onClick={() => handleKeyPress(key)}
                            className="flex-1 h-9 text-sm bg-gray-700 hover:bg-gray-600 text-white min-h-0"
                          >
                            {displayKey === " " ? "Space" : displayKey}
                          </Button>
                        )
                      })}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-1 w-20">
                  <Button
                    type="button"
                    onClick={handleShift}
                    className={`h-9 text-white flex items-center justify-center ${
                      isShiftActive ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-700 hover:bg-gray-600"
                    }`}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCapsLock}
                    className={`h-9 text-white flex items-center justify-center ${
                      isCapsLockActive ? "bg-orange-600 hover:bg-orange-700" : "bg-gray-700 hover:bg-gray-600"
                    }`}
                  >
                    <Lock className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    onClick={handleBackspace}
                    className="h-9 bg-red-700 hover:bg-red-600 text-white flex items-center justify-center"
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    onClick={handleClear}
                    className="h-9 bg-yellow-700 hover:bg-yellow-600 text-white flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    onClick={handleKeyboardCancel}
                    className="h-9 bg-gray-700 hover:bg-gray-600 text-white text-xs"
                  >
                    Abbruch
                  </Button>
                  <Button
                    type="button"
                    onClick={handleKeyboardConfirm}
                    className="h-9 bg-green-700 hover:bg-green-600 text-white flex items-center justify-center"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gespeicherte Listen laden */}
      <Card className="bg-[hsl(var(--cocktail-card-bg))] border-[hsl(var(--cocktail-card-border))]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[hsl(var(--cocktail-text))]">Rezepte laden</CardTitle>
        </CardHeader>
        <CardContent>
          {files.filter((f) => f !== "cocktails.json").length === 0 ? (
            <p className="text-sm text-[hsl(var(--cocktail-text-muted))] text-center py-4">
              Noch keine gespeicherten Listen vorhanden.
            </p>
          ) : (
            <div className="space-y-2">
              {files
                .filter((f) => f !== "cocktails.json")
                .map((file) => (
                  <div
                    key={file}
                    className="flex items-center justify-between p-3 rounded-xl bg-[hsl(var(--cocktail-bg))] border border-[hsl(var(--cocktail-card-border))]"
                  >
                    <span className="text-sm text-[hsl(var(--cocktail-text))] font-medium">{file}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleLoad(file)}
                        disabled={loadingFile === file}
                        className="bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black font-semibold h-8"
                      >
                        <FolderOpen className="h-3.5 w-3.5 mr-1" />
                        {loadingFile === file ? "Lädt..." : "Laden"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(file)}
                        disabled={deletingFile === file}
                        className="bg-transparent border-red-500/50 text-red-400 hover:bg-red-500/10 h-8"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
