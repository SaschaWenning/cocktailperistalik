"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Check, AlertCircle, GlassWater } from 'lucide-react'
import type { PumpConfig } from "@/types/pump"
import { makeSingleShot } from "@/lib/cocktail-machine"
import type { IngredientLevel } from "@/types/ingredient-level"
import { getAllIngredients } from "@/lib/ingredients"
import VirtualKeyboard from "./virtual-keyboard"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface ShotSelectorProps {
  pumpConfig: PumpConfig[]
  ingredientLevels: IngredientLevel[]
  onShotComplete: () => Promise<void>
}

export default function ShotSelector({ pumpConfig, ingredientLevels, onShotComplete }: ShotSelectorProps) {
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null)
  const [isMaking, setIsMaking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [shotSize, setShotSize] = useState<number>(40) // Standard: 40ml
  const [allIngredients, setAllIngredients] = useState<any[]>([])
  const [customShotSizes, setCustomShotSizes] = useState<{ [key: string]: number[] }>({})

  const [showKeyboard, setShowKeyboard] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [activeInput, setActiveInput] = useState<string | null>(null)
  const [showKeyboardModal, setShowKeyboardModal] = useState(false)

  useEffect(() => {
    const loadIngredients = async () => {
      const ingredients = await getAllIngredients()
      setAllIngredients(ingredients)
    }
    loadIngredients()
  }, [])

  const getAllAvailableIngredients = () => {
    if (!pumpConfig || !Array.isArray(pumpConfig)) {
      return []
    }

    return pumpConfig
      .filter((pump) => pump.enabled) // Nur aktivierte Pumpen anzeigen
      .map((pump) => {
        const ingredient = allIngredients.find((i) => i.id === pump.ingredient)
        const cleanName = ingredient?.name || pump.ingredient.replace(/^custom-\d+-/, "")
        return {
          id: pump.ingredient,
          name: cleanName,
          alcoholic: ingredient?.alcoholic || false,
          pumpId: pump.id,
          hasPump: true,
        }
      })
  }

  const allAvailableIngredients = getAllAvailableIngredients()

  const alcoholicIngredients = allAvailableIngredients.filter((i) => i.alcoholic)
  const nonAlcoholicIngredients = allAvailableIngredients.filter((i) => !i.alcoholic)

  const handleSelectShot = (ingredientId: string) => {
    setSelectedIngredient(ingredientId)
  }

  const handleCancelSelection = () => {
    setSelectedIngredient(null)
  }

  const checkIngredientAvailable = (ingredientId: string) => {
    if (!ingredientLevels || !Array.isArray(ingredientLevels)) {
      return false
    }
    const pump = pumpConfig.find((p) => p.ingredient === ingredientId)
    if (!pump) return false

    const level = ingredientLevels.find((level) => level.pumpId === pump.id)
    return level && level.currentLevel >= shotSize
  }

  const handleMakeShot = async () => {
    if (!selectedIngredient) return

    setIsMaking(true)
    setProgress(0)
    setStatusMessage("Bereite Shot vor...")
    setErrorMessage(null)

    let intervalId: NodeJS.Timeout

    try {
      try {
        console.log("[v0] Shot: Activating preparation lighting")
        await fetch("/api/lighting-control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "cocktailPreparation" }),
        })
      } catch (error) {
        console.error("[v0] Error activating preparation lighting:", error)
      }

      intervalId = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(intervalId)
            return 100
          }
          return prev + 10
        })
      }, 200)

      await makeSingleShot(selectedIngredient, shotSize, pumpConfig)

      clearInterval(intervalId)
      setProgress(100)

      try {
        console.log("[v0] Shot: Activating finished lighting")
        await fetch("/api/lighting-control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "cocktailFinished" }),
        })
      } catch (error) {
        console.error("[v0] Error activating finished lighting:", error)
      }

      const ingredient = allIngredients.find((i) => i.id === selectedIngredient)
      const ingredientName = ingredient?.name || selectedIngredient.replace(/^custom-\d+-/, "")
      setStatusMessage(`${ingredientName} Shot (${shotSize}ml) fertig!`)
      setShowSuccess(true)

      await onShotComplete()

      setTimeout(() => {
        console.log("[v0] Shot: Returning to idle lighting")
        setIsMaking(false)
        setShowSuccess(false)
        setSelectedIngredient(null)

        fetch("/api/lighting-control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "idle" }),
        }).catch((error) => console.error("[v0] Error returning to idle lighting:", error))
      }, 3000)
    } catch (error) {
      clearInterval(intervalId)
      setProgress(0)
      setStatusMessage("Fehler bei der Zubereitung!")
      setErrorMessage(error instanceof Error ? error.message : "Unbekannter Fehler")
      setTimeout(() => setIsMaking(false), 3000)
    }
  }

  const getAvailableSizes = (ingredientId: string) => {
    const customSizes = customShotSizes[ingredientId] || []
    const defaultSizes = [20, 40]
    return [...new Set([...defaultSizes, ...customSizes])].sort((a, b) => a - b)
  }

  const handleKeyboardInput = (value: string) => {
    setInputValue(value)
  }

  const handleKeyboardConfirm = () => {
    if (activeInput === "custom-size" && selectedIngredient) {
      const value = Number.parseInt(inputValue)
      if (value > 0) {
        setCustomShotSizes((prev) => ({
          ...prev,
          [selectedIngredient]: [...(prev[selectedIngredient] || []), value],
        }))
        setShotSize(value)
      }
    }
    setShowKeyboardModal(false)
    setActiveInput(null)
    setInputValue("")
  }

  const handleKeyboardCancel = () => {
    setShowKeyboardModal(false)
    setActiveInput(null)
    setInputValue("")
  }

  const openKeyboard = (inputId: string, currentValue = "") => {
    setActiveInput(inputId)
    setInputValue(currentValue)
    setShowKeyboardModal(true)
  }

  if (isMaking) {
    return (
      <Card className="border-[hsl(var(--cocktail-card-border))] bg-black text-[hsl(var(--cocktail-text))]">
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-center">{statusMessage}</h2>
          <Progress value={progress} className="h-2" />

          {errorMessage && (
            <Alert className="bg-[hsl(var(--cocktail-error))]/10 border-[hsl(var(--cocktail-error))]/30">
              <AlertCircle className="h-4 w-4 text-[hsl(var(--cocktail-error))]" />
              <AlertDescription className="text-[hsl(var(--cocktail-error))]">{errorMessage}</AlertDescription>
            </Alert>
          )}

          {showSuccess && (
            <div className="flex justify-center">
              <div className="rounded-full bg-[hsl(var(--cocktail-success))]/20 p-3">
                <Check className="h-8 w-8 text-[hsl(var(--cocktail-success))]" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (selectedIngredient) {
    const ingredient = allIngredients.find((i) => i.id === selectedIngredient)
    const cleanName = ingredient?.name || selectedIngredient.replace(/^custom-\d+-/, "")
    const isAvailable = checkIngredientAvailable(selectedIngredient)
    const availableSizes = getAvailableSizes(selectedIngredient)

    return (
      <div className="space-y-4">
        <Card className="border-[hsl(var(--cocktail-card-border))] bg-black">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-[hsl(var(--cocktail-primary))]/10 flex items-center justify-center">
                <GlassWater className="h-10 w-10 text-[hsl(var(--cocktail-primary))]" />
              </div>
              <h2 className="text-xl font-semibold text-[hsl(var(--cocktail-text))]">{cleanName} Shot</h2>

              <div className="w-full max-w-xs">
                <h4 className="text-base mb-2 text-center text-[hsl(var(--cocktail-text))]">Shot-Größe wählen:</h4>
                <div className="flex gap-3 justify-center">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setShotSize(size)}
                      className={`min-w-[60px] text-sm py-2 px-3 rounded border transition-colors ${
                        shotSize === size
                          ? "bg-[hsl(var(--cocktail-primary))] text-black border-[hsl(var(--cocktail-primary))] font-semibold"
                          : "bg-[hsl(var(--cocktail-card-bg))] text-[hsl(var(--cocktail-text-muted))] border-[hsl(var(--cocktail-card-border))] hover:text-[hsl(var(--cocktail-primary))] hover:border-[hsl(var(--cocktail-primary))]"
                      }`}
                    >
                      {size}ml
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 w-full mt-4">
                <Button
                  className="flex-1 bg-transparent"
                  variant="outline"
                  onClick={handleCancelSelection}
                  className="flex-1 bg-[hsl(var(--cocktail-card-bg))] text-[hsl(var(--cocktail-text))] border-[hsl(var(--cocktail-card-border))]"
                >
                  Abbrechen
                </Button>
                <Button
                  className="flex-1 bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black"
                  onClick={handleMakeShot}
                  disabled={!isAvailable}
                >
                  Shot zubereiten
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showKeyboardModal} onOpenChange={setShowKeyboardModal}>
          <DialogContent className="w-[95vw] h-[95vh] max-w-none max-h-none m-0 rounded-none bg-[hsl(var(--cocktail-bg))] border-[hsl(var(--cocktail-card-border))]">
            <div className="flex flex-col h-full">
              <div className="flex-1 flex items-center justify-center">
                <VirtualKeyboard
                  onChange={handleKeyboardInput}
                  onConfirm={handleKeyboardConfirm}
                  onCancel={handleKeyboardCancel}
                  value={inputValue}
                  layout="numeric"
                  title="Shot-Größe eingeben (ml)"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-[hsl(var(--cocktail-text))] text-center">Alkoholische Shots</h2>
        <div className="grid grid-cols-4 gap-3">
          {alcoholicIngredients.map((ingredient) => {
            const isAvailable = checkIngredientAvailable(ingredient.id)

            return (
              <Button
                key={ingredient.id}
                variant="outline"
                className={`h-auto py-2 px-2 justify-center text-center transition-all duration-200 ${
                  isAvailable
                    ? "bg-[hsl(var(--cocktail-card-bg))] text-[hsl(var(--cocktail-text))] border-[hsl(var(--cocktail-card-border))] hover:bg-[hsl(var(--cocktail-card-border))] hover:text-[hsl(var(--cocktail-primary))] hover:scale-105"
                    : "bg-[hsl(var(--cocktail-card-bg))]/50 text-[hsl(var(--cocktail-text))]/50 border-[hsl(var(--cocktail-card-border))]/50 cursor-not-allowed"
                }`}
                onClick={() => handleSelectShot(ingredient.id)}
                disabled={!isAvailable}
              >
                <div className="flex flex-col items-center">
                  <span className="font-medium text-sm">{ingredient.name}</span>
                  {!isAvailable && <span className="text-xs text-[hsl(var(--cocktail-warning))] mt-1">Leer</span>}
                </div>
              </Button>
            )
          })}
        </div>
      </div>

      {nonAlcoholicIngredients.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-[hsl(var(--cocktail-text))] text-center">
            Alkoholfreie Shots
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {nonAlcoholicIngredients.map((ingredient) => {
              const isAvailable = checkIngredientAvailable(ingredient.id)

              return (
                <Button
                  key={ingredient.id}
                  variant="outline"
                  className={`h-auto py-2 px-2 justify-center text-center transition-all duration-200 ${
                    isAvailable
                      ? "bg-[hsl(var(--cocktail-card-bg))] text-[hsl(var(--cocktail-text))] border-[hsl(var(--cocktail-card-border))] hover:bg-[hsl(var(--cocktail-card-border))] hover:text-[hsl(var(--cocktail-primary))] hover:scale-105"
                      : "bg-[hsl(var(--cocktail-card-bg))]/50 text-[hsl(var(--cocktail-text))]/50 border-[hsl(var(--cocktail-card-border))]/50 cursor-not-allowed"
                  }`}
                  onClick={() => handleSelectShot(ingredient.id)}
                  disabled={!isAvailable}
                >
                  <div className="flex flex-col items-center">
                    <span className="font-medium text-sm">{ingredient.name}</span>
                    {!isAvailable && <span className="text-xs text-[hsl(var(--cocktail-warning))] mt-1">Leer</span>}
                  </div>
                </Button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
