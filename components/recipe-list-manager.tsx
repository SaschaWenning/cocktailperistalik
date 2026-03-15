"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, FolderOpen, Trash2, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function RecipeListManager() {
  const { toast } = useToast()
  const [files, setFiles] = useState<string[]>([])
  const [currentFile, setCurrentFile] = useState("cocktails.json")
  const [cocktailCount, setCocktailCount] = useState(0)
  const [saveFileName, setSaveFileName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
  const [loadingFile, setLoadingFile] = useState<string | null>(null)

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
      // Seite neu laden damit die Cocktailliste aktualisiert wird
      setTimeout(() => window.location.reload(), 1000)
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
          <div className="flex gap-2">
            <Input
              placeholder="Dateiname (z.B. Sommer 2025)"
              value={saveFileName}
              onChange={(e) => setSaveFileName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="bg-[hsl(var(--cocktail-bg))] border-[hsl(var(--cocktail-card-border))] text-[hsl(var(--cocktail-text))] h-10"
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
