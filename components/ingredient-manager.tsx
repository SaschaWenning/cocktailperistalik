"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Trash2, Plus, ArrowUp, Lock, ArrowLeft, X, Check } from "lucide-react"
import type { Ingredient } from "@/types/pump"

interface IngredientManagerProps {
  onClose: () => void
}

export function IngredientManager({ onClose }: IngredientManagerProps) {
  const [customIngredients, setCustomIngredients] = useState<Ingredient[]>([])
  const [newIngredient, setNewIngredient] = useState({
    name: "",
    alcoholic: false,
  })
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [keyboardValue, setKeyboardValue] = useState("")
  const [isShiftActive, setIsShiftActive] = useState(false)
  const [isCapsLockActive, setIsCapsLockActive] = useState(false)

  useEffect(() => {
    loadCustomIngredients()
  }, [])

  const loadCustomIngredients = () => {
    try {
      const stored = localStorage.getItem("customIngredients")
      if (stored) {
        setCustomIngredients(JSON.parse(stored))
      }
    } catch (error) {
      console.error("Fehler beim Laden der benutzerdefinierten Zutaten:", error)
    }
  }

  const saveCustomIngredients = (ingredients: Ingredient[]) => {
    try {
      localStorage.setItem("customIngredients", JSON.stringify(ingredients))
      setCustomIngredients(ingredients)
    } catch (error) {
      console.error("Fehler beim Speichern der benutzerdefinierten Zutaten:", error)
    }
  }

  const openKeyboard = () => {
    console.log("[v0] Opening keyboard")
    setKeyboardValue(newIngredient.name)
    setShowKeyboard(true)
    setIsShiftActive(false)
    setIsCapsLockActive(false)
  }

  const addIngredient = () => {
    if (!newIngredient.name.trim()) return

    console.log("[v0] Adding ingredient:", newIngredient.name)
    const id = `custom-${Date.now()}-${newIngredient.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
    const ingredient: Ingredient = {
      id,
      name: newIngredient.name.trim(),
      alcoholic: newIngredient.alcoholic,
    }

    const updatedIngredients = [...customIngredients, ingredient]
    saveCustomIngredients(updatedIngredients)

    setNewIngredient({ name: "", alcoholic: false })
    setKeyboardValue("")
    setShowKeyboard(false)
    setIsShiftActive(false)
    setIsCapsLockActive(false)
    console.log("[v0] Ingredient added and states reset")
  }

  const deleteIngredient = (id: string) => {
    const updatedIngredients = customIngredients.filter((ing) => ing.id !== id)
    saveCustomIngredients(updatedIngredients)
  }

  const handleClose = () => {
    console.log("[v0] Closing ingredient manager")
    onClose()
  }

  const handleKeyPress = (key: string) => {
    let newValue = keyboardValue
    if (key === "Backspace") {
      newValue = newValue.slice(0, -1)
    } else {
      let processedKey = key
      if (key.length === 1 && key.match(/[A-Za-z]/)) {
        // Für Buchstaben: prüfe Shift und Caps Lock Status
        const shouldBeUppercase = (isShiftActive && !isCapsLockActive) || (!isShiftActive && isCapsLockActive)
        processedKey = shouldBeUppercase ? key.toUpperCase() : key.toLowerCase()
      }
      newValue += processedKey
    }
    setKeyboardValue(newValue)

    if (isShiftActive && !isCapsLockActive) {
      setIsShiftActive(false)
    }
  }

  const handleShift = () => {
    setIsShiftActive(!isShiftActive)
  }

  const handleCapsLock = () => {
    setIsCapsLockActive(!isCapsLockActive)
  }

  const handleBackspace = () => {
    setKeyboardValue(keyboardValue.slice(0, -1))
  }

  const handleClear = () => {
    setKeyboardValue("")
  }

  const handleKeyboardCancel = () => {
    console.log("[v0] Keyboard cancelled")
    setKeyboardValue("")
    setShowKeyboard(false)
    setIsShiftActive(false)
    setIsCapsLockActive(false)
  }

  const handleKeyboardConfirm = () => {
    console.log("[v0] Keyboard confirmed with value:", keyboardValue)
    setNewIngredient((prev) => ({ ...prev, name: keyboardValue }))
    setShowKeyboard(false)
    setIsShiftActive(false)
    setIsCapsLockActive(false)
  }

  const alphaKeys = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["q", "w", "e", "r", "t", "z", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["y", "x", "c", "v", "b", "n", "m"],
    ["ä", "ö", "ü", "ß"],
    [" ", "-", "_", ".", "/"],
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-4xl max-h-[95vh] bg-black border-[hsl(var(--cocktail-card-border))] flex flex-col">
          {!showKeyboard ? (
            <>
              <CardHeader className="flex-shrink-0">
                <CardTitle className="text-white">Zutaten verwalten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 overflow-auto flex-1">
                {/* Neue Zutat hinzufügen */}
                <div className="space-y-4 p-4 border border-[hsl(var(--cocktail-card-border))] rounded-lg bg-[hsl(var(--cocktail-card-bg))]">
                  <h3 className="font-semibold text-white">Neue Zutat hinzufügen</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="ingredient-name" className="text-white">
                        Name der Zutat
                      </Label>
                      <Input
                        id="ingredient-name"
                        value={newIngredient.name}
                        readOnly
                        placeholder="z.B. Erdbeersaft"
                        className="bg-white text-black border-[hsl(var(--cocktail-card-border))] placeholder:text-gray-400 cursor-pointer"
                        onClick={openKeyboard}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="ingredient-alcoholic"
                        checked={newIngredient.alcoholic}
                        onCheckedChange={(checked) => setNewIngredient((prev) => ({ ...prev, alcoholic: checked }))}
                        className="scale-50 data-[state=checked]:bg-[#00ff00]"
                      />
                      <Label htmlFor="ingredient-alcoholic" className="text-white text-sm">
                        Alkoholisch
                      </Label>
                    </div>
                    <Button onClick={addIngredient} className="h-8 px-4 bg-[#00ff00] text-black hover:bg-[#00cc00]">
                      <Plus className="w-4 h-4 mr-2" />
                      Zutat hinzufügen
                    </Button>
                  </div>
                </div>

                {/* Benutzerdefinierte Zutaten anzeigen */}
                {customIngredients.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-white">Ihre benutzerdefinierten Zutaten</h3>
                    <div className="space-y-2">
                      {customIngredients.map((ingredient) => (
                        <div
                          key={ingredient.id}
                          className="flex items-center justify-between p-3 border border-[hsl(var(--cocktail-card-border))] rounded-lg bg-[hsl(var(--cocktail-card-bg))]"
                        >
                          <div>
                            <span className="font-medium text-white">{ingredient.name}</span>
                            <span className="ml-2 text-sm text-[hsl(var(--cocktail-text))]">
                              {ingredient.alcoholic ? "(Alkoholisch)" : "(Alkoholfrei)"}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteIngredient(ingredient.id)}
                            className="bg-[hsl(var(--cocktail-card-bg))] text-white border-[hsl(var(--cocktail-card-border))] hover:bg-[hsl(var(--cocktail-card-border))]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <div className="flex-shrink-0 p-6 pt-0">
                <Button onClick={handleClose} className="h-8 px-4 bg-[#00ff00] text-black hover:bg-[#00cc00]">
                  Schließen
                </Button>
              </div>
            </>
          ) : (
            <div className="flex gap-3 my-2 h-[85vh] p-2">
              {/* Tastatur links */}
              <div className="flex-1 flex flex-col">
                <div className="text-center mb-2">
                  <h3 className="text-base font-semibold text-white mb-1">Zutatennamen eingeben</h3>
                  <div className="bg-white text-black text-base p-2 rounded mb-2 min-h-[40px] break-all">
                    {keyboardValue || <span className="text-gray-400">Eingabe...</span>}
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  {alphaKeys.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex gap-1 justify-center flex-1">
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
                            className="flex-1 text-lg bg-gray-700 hover:bg-gray-600 text-white min-h-0 h-full"
                          >
                            {displayKey}
                          </Button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons rechts */}
              <div className="flex flex-col gap-2 w-24">
                <Button
                  type="button"
                  onClick={handleShift}
                  className={`h-16 text-white flex flex-col items-center justify-center ${
                    isShiftActive ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  <ArrowUp className="h-4 w-4" />
                  <span className="text-xs">Shift</span>
                </Button>
                <Button
                  type="button"
                  onClick={handleCapsLock}
                  className={`h-16 text-white flex flex-col items-center justify-center ${
                    isCapsLockActive ? "bg-orange-600 hover:bg-orange-700" : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  <Lock className="h-4 w-4" />
                  <span className="text-xs">Caps</span>
                </Button>
                <Button
                  type="button"
                  onClick={handleBackspace}
                  className="h-16 bg-red-700 hover:bg-red-600 text-white flex flex-col items-center justify-center"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-xs">Back</span>
                </Button>
                <Button
                  type="button"
                  onClick={handleClear}
                  className="h-16 bg-yellow-700 hover:bg-yellow-600 text-white flex flex-col items-center justify-center"
                >
                  <X className="h-4 w-4" />
                  <span className="text-xs">Clear</span>
                </Button>
                <Button
                  type="button"
                  onClick={handleKeyboardCancel}
                  className="h-16 bg-gray-700 hover:bg-gray-600 text-white flex flex-col items-center justify-center"
                >
                  <span className="text-xs">Cancel</span>
                </Button>
                <Button
                  type="button"
                  onClick={handleKeyboardConfirm}
                  className="h-16 bg-green-700 hover:bg-green-600 text-white flex flex-col items-center justify-center"
                >
                  <Check className="h-4 w-4" />
                  <span className="text-xs">OK</span>
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}

export default IngredientManager
