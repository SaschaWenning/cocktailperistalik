"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bug } from "lucide-react"
import { ArrowLeft, X } from "lucide-react"
import { pumpConfig } from "@/data/pump-config"
import {
  getIngredientLevels,
  updateIngredientLevel,
  updateContainerSize,
  updateIngredientName,
  resetAllLevels,
  onIngredientLevelsUpdated,
  setIngredientLevels,
  type IngredientLevel,
} from "@/lib/ingredient-level-service"
import { getIngredientById } from "@/lib/ingredients"

export function IngredientLevels() {
  const [levels, setLevels] = useState<IngredientLevel[]>([])
  const [editingLevel, setEditingLevel] = useState<number | null>(null)
  const [editingSize, setEditingSize] = useState<number | null>(null)
  const [editingName, setEditingName] = useState<number | null>(null)
  const [tempValue, setTempValue] = useState("")
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [isFilling, setIsFilling] = useState(false)

  // Auto-Refresh während der Bearbeitung pausieren, danach fortsetzen
  const isEditing = editingLevel !== null || editingSize !== null || editingName !== null

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const fillingRef = useRef(false)
  const editingRef = useRef(false)
  const skipReloadUntil = useRef(0) // ts (ms). Solange now < ts: Reloads skippen

  useEffect(() => {
    fillingRef.current = isFilling
  }, [isFilling])
  useEffect(() => {
    editingRef.current = isEditing
  }, [isEditing])

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)])
  }

  useEffect(() => {
    if (unsubscribeRef.current) {
      try {
        unsubscribeRef.current()
      } catch {}
      unsubscribeRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (isEditing || isFilling) {
      return
    }

    loadLevels()
    unsubscribeRef.current = onIngredientLevelsUpdated(loadLevels)
    intervalRef.current = setInterval(loadLevels, 10000)

    return () => {
      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current()
        } catch {}
        unsubscribeRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [editingLevel, editingSize, editingName, isFilling])

  const loadLevels = async () => {
    const nowTs = Date.now()
    if (fillingRef.current || editingRef.current || nowTs < skipReloadUntil.current) {
      return
    }
    try {
      const response = await fetch("/api/ingredient-levels")

      if (response.ok) {
        const data = await response.json()

        if (data.success && data.levels) {
          setLevels(data.levels)
          await setIngredientLevels(data.levels)
          return
        }
      }
    } catch (error) {}

    const currentLevels = getIngredientLevels()
    setLevels(currentLevels)
  }

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    await loadLevels()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const getIngredientDisplayName = (ingredientId: string) => {
    const ingredient = getIngredientById(ingredientId)
    if (ingredient) {
      return ingredient.name
    }

    // Handle custom ingredients - remove the custom-timestamp- prefix
    if (ingredientId.startsWith("custom-")) {
      const withoutPrefix = ingredientId.replace(/^custom-\d+-/, "")
      return withoutPrefix
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    }

    // Handle regular ingredient IDs
    return ingredientId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const handleLevelEdit = (pumpId: number) => {
    const level = levels.find((l) => l.pumpId === pumpId)
    if (level) {
      setTempValue(level.currentLevel.toString())
      setEditingLevel(pumpId)
      setShowKeyboard(true)
    }
  }

  const handleSizeEdit = (pumpId: number) => {
    const level = levels.find((l) => l.pumpId === pumpId)
    if (level) {
      setTempValue(level.containerSize.toString())
      setEditingSize(pumpId)
      setShowKeyboard(true)
    }
  }

  const handleNameEdit = (pumpId: number) => {
    const level = levels.find((l) => l.pumpId === pumpId)
    if (level) {
      setTempValue(level.ingredient)
      setEditingName(pumpId)
      setShowKeyboard(true)
    }
  }

  const handleSave = async () => {
    try {
      if (editingLevel) {
        const newLevel = Number.parseInt(tempValue) || 0
        await updateIngredientLevel(editingLevel, newLevel)
      } else if (editingSize) {
        const newSize = Number.parseInt(tempValue) || 100
        await updateContainerSize(editingSize, newSize)
      } else if (editingName) {
        await updateIngredientName(editingName, tempValue)
      }

      await loadLevels()

      console.log("[v0] Ingredient-Levels: Triggering cocktail data refresh")
      window.dispatchEvent(new CustomEvent("cocktail-data-refresh"))

      handleCancel()
    } catch (error) {}
  }

  const handleCancel = () => {
    setEditingLevel(null)
    setEditingSize(null)
    setEditingName(null)
    setTempValue("")
    setShowKeyboard(false)
  }

  const handleResetAll = async () => {
    try {
      await resetAllLevels()
      await loadLevels()
    } catch (error) {}
  }

  const handleFillAll = async () => {
    try {
      setIsFilling(true)
      const now = new Date()
      const next = levels.map((l) => ({ ...l, currentLevel: Math.max(0, l.containerSize), lastUpdated: now }))
      setLevels(next)
      await setIngredientLevels(next)
      skipReloadUntil.current = Date.now() + 800

      console.log("[v0] Ingredient-Levels: Triggering cocktail data refresh after fill all")
      window.dispatchEvent(new CustomEvent("cocktail-data-refresh"))
    } catch (error) {
    } finally {
      setIsFilling(false)
    }
  }

  const handleFillSingle = async (pumpId: number) => {
    try {
      setIsFilling(true)
      const target = levels.find((l) => l.pumpId === pumpId)
      if (!target) {
        setIsFilling(false)
        return
      }
      const now = new Date()
      const next = levels.map((l) =>
        l.pumpId === pumpId ? { ...l, currentLevel: Math.max(0, target.containerSize), lastUpdated: now } : l,
      )
      setLevels(next)
      await setIngredientLevels(next)
      skipReloadUntil.current = Date.now() + 800

      console.log("[v0] Ingredient-Levels: Triggering cocktail data refresh after single fill")
      window.dispatchEvent(new CustomEvent("cocktail-data-refresh"))
    } catch (error) {
    } finally {
      setIsFilling(false)
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage > 50) return "bg-[hsl(var(--cocktail-primary))]"
    if (percentage > 20) return "bg-[hsl(var(--cocktail-warning))]"
    return "bg-[hsl(var(--cocktail-error))]"
  }

  const enabledLevels = levels.filter((level) => {
    const pump = pumpConfig.find((p) => p.id === level.pumpId)
    return pump?.enabled !== false
  })

  return (
    <div className="min-h-screen bg-[hsl(var(--cocktail-bg))] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-[hsl(var(--cocktail-text))]">Füllstände</h1>
          <div className="flex gap-3">
            <Button
              onClick={handleFillAll}
              className="bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black px-6 py-3 rounded-xl font-semibold"
            >
              Alle auffüllen
            </Button>
          </div>
        </div>

        {showDebug && (
          <Card className="bg-[hsl(var(--cocktail-card-bg))] border-[hsl(var(--cocktail-card-border))]">
            <CardHeader>
              <CardTitle className="text-[hsl(var(--cocktail-text))] flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Debug Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black rounded-lg p-4 max-h-60 overflow-y-auto">
                <div className="font-mono text-sm space-y-1">
                  {debugLogs.length === 0 ? (
                    <div className="text-gray-500">Keine Debug-Logs verfügbar</div>
                  ) : (
                    debugLogs.map((log, index) => (
                      <div key={index} className="text-green-400">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="mt-4 text-sm text-[hsl(var(--cocktail-text-muted))]">
                Aktuelle Levels: {levels.length} | Letzte Aktualisierung: {new Date().toLocaleTimeString()}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enabledLevels.map((level) => {
            const percentage = (level.currentLevel / level.containerSize) * 100
            const displayName = getIngredientDisplayName(level.ingredient)

            return (
              <Card
                key={level.pumpId}
                className="bg-[hsl(var(--cocktail-card-bg))] border-[hsl(var(--cocktail-card-border))] hover:bg-[hsl(var(--cocktail-card-border))] transition-all duration-300"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl text-[hsl(var(--cocktail-text))] font-bold flex justify-between items-center">
                    <span className="truncate">{displayName}</span>
                    <Button
                      size="sm"
                      onClick={() => handleFillSingle(level.pumpId)}
                      className="h-8 px-3 bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black text-xs font-semibold"
                    >
                      Auffüllen
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-[hsl(var(--cocktail-text-muted))]">
                      <span>Füllstand:</span>
                      <div className="flex items-center gap-2 ml-auto">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleLevelEdit(level.pumpId)}
                          className="h-6 px-2 text-[hsl(var(--cocktail-text))] hover:bg-[hsl(var(--cocktail-card-border))]"
                        >
                          {level.currentLevel}ml
                        </Button>
                      </div>
                    </div>
                    <div className="bg-[hsl(var(--cocktail-card-border))] rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${getProgressColor(percentage)}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="text-center text-sm text-[hsl(var(--cocktail-text-muted))]">
                      {percentage.toFixed(0)}%
                    </div>
                  </div>

                  <div className="flex justify-between text-sm text-[hsl(var(--cocktail-text-muted))]">
                    <span>Behältergröße:</span>
                    <div className="ml-auto">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSizeEdit(level.pumpId)}
                        className="h-6 px-2 text-[hsl(var(--cocktail-text))] hover:bg-[hsl(var(--cocktail-card-border))]"
                      >
                        {level.containerSize}ml
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-[hsl(var(--cocktail-text-muted))] text-center">
                    Aktualisiert: {new Date(level.lastUpdated).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {showKeyboard && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-1">
            <div className="bg-[hsl(var(--cocktail-card-bg))] border border-[hsl(var(--cocktail-card-border))] rounded-xl shadow-2xl max-w-sm w-full mx-1 max-h-[95vh] overflow-hidden flex flex-col">
              <div className="bg-[hsl(var(--cocktail-primary))] p-3 flex-shrink-0">
                <h3 className="text-base font-bold text-black">
                  {editingLevel && "Füllstand bearbeiten"}
                  {editingSize && "Behältergröße bearbeiten"}
                  {editingName && "Zutat bearbeiten"}
                </h3>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <Input
                  value={tempValue}
                  readOnly
                  className="text-lg text-center font-bold border-2 focus:border-[hsl(var(--cocktail-primary))] bg-[hsl(var(--cocktail-bg))] text-[hsl(var(--cocktail-text))] h-12 text-2xl"
                />

                <div className="space-y-2">
                  <div className="bg-black border border-[hsl(var(--cocktail-card-border))] rounded-lg p-2 shadow-lg w-full">
                    <div className="space-y-1">
                      {(editingName
                        ? [
                            ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
                            ["Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P"],
                            ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
                            ["Y", "X", "C", "V", "B", "N", "M"],
                            [" ", "-", "_", ".", "@", "#", "&"],
                          ]
                        : [
                            ["1", "2", "3"],
                            ["4", "5", "6"],
                            ["7", "8", "9"],
                            [".", "0", "00"],
                          ]
                      ).map((row, rowIndex) => (
                        <div key={rowIndex} className="flex justify-center gap-1">
                          {row.map((key) => (
                            <Button
                              key={key}
                              onClick={() => setTempValue(tempValue + key)}
                              className="flex-1 h-6 text-sm bg-[hsl(var(--cocktail-card-bg))] text-white hover:bg-[hsl(var(--cocktail-card-border))] min-w-0"
                            >
                              {key}
                            </Button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-center gap-1">
                    <Button
                      onClick={() => setTempValue("")}
                      className="flex-1 h-8 text-sm bg-red-600 text-white hover:bg-red-700"
                      title="Löschen"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => setTempValue(tempValue.slice(0, -1))}
                      className="flex-1 h-8 text-sm bg-gray-600 text-white hover:bg-gray-700"
                      title="Zurück"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={handleCancel}
                      className="flex-1 h-8 text-sm bg-orange-600 text-white hover:bg-orange-700"
                      title="Abbrechen"
                    >
                      Abb
                    </Button>
                    <Button
                      onClick={handleSave}
                      className="flex-1 h-8 text-sm bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black font-bold"
                      title="Speichern"
                    >
                      Speichern
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default IngredientLevels
