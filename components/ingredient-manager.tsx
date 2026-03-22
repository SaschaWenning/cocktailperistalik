"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    setKeyboardValue(newIngredient.name)
    setShowKeyboard(true)
    setIsShiftActive(false)
    setIsCapsLockActive(false)
  }

  const addIngredient = () => {
    if (!newIngredient.name.trim()) return

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
  }

  const deleteIngredient = (id: string) => {
    const updatedIngredients = customIngredients.filter((ing) => ing.id !== id)
    saveCustomIngredients(updatedIngredients)
  }

  const handleClose = () => {
    onClose()
  }

  const handleKeyboardCancel = () => {
    setKeyboardValue("")
    setShowKeyboard(false)
    setIsShiftActive(false)
    setIsCapsLockActive(false)
  }

  const handleKeyboardConfirm = () => {
    setNewIngredient((prev) => ({ ...prev, name: keyboardValue }))
    setShowKeyboard(false)
    setIsShiftActive(false)
    setIsCapsLockActive(false)
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
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-4xl max-h-[95vh] bg-black border-gray-700 flex flex-col">
          {!showKeyboard ? (
            <>
              <CardHeader className="flex-shrink-0 border-b border-gray-700 pb-4">
                <div className="text-center">
                  <CardTitle className="text-xl font-bold text-[#00ff00]">Zutaten verwalten</CardTitle>
                  <p className="text-gray-400 text-sm mt-1">Erstelle und verwalte deine eigenen Zutaten</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 overflow-auto flex-1 pt-5">
                {/* Neue Zutat hinzufügen */}
                <div className="bg-gray-900/50 rounded-lg p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-[#00ff00] uppercase tracking-wide">Neue Zutat hinzufügen</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-1.5">
                      <Label htmlFor="ingredient-name" className="text-gray-300 text-sm">
                        Name der Zutat *
                      </Label>
                      <Input
                        id="ingredient-name"
                        value={newIngredient.name}
                        readOnly
                        placeholder="z.B. Erdbeersaft"
                        className="bg-gray-800 border-gray-600 text-white h-10 cursor-pointer hover:border-[#00ff00] transition-colors placeholder:text-gray-500"
                        onClick={openKeyboard}
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-sm">Art</Label>
                      <Select 
                        value={newIngredient.alcoholic ? "true" : "false"} 
                        onValueChange={(value) => setNewIngredient((prev) => ({ ...prev, alcoholic: value === "true" }))}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white h-10 hover:border-[#00ff00] transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border border-gray-600">
                          <SelectItem value="true" className="text-white hover:bg-gray-700 cursor-pointer">
                            Mit Alkohol
                          </SelectItem>
                          <SelectItem value="false" className="text-white hover:bg-gray-700 cursor-pointer">
                            Ohne Alkohol
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={addIngredient} 
                    disabled={!newIngredient.name.trim()}
                    className="h-10 px-6 bg-[#00ff00] text-black hover:bg-[#00cc00] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Zutat hinzufügen
                  </Button>
                </div>

                {/* Benutzerdefinierte Zutaten anzeigen */}
                <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#00ff00] uppercase tracking-wide">
                      Deine Zutaten
                    </h3>
                    {customIngredients.length > 0 && (
                      <span className="text-gray-500 text-sm">{customIngredients.length} Zutat{customIngredients.length !== 1 ? 'en' : ''}</span>
                    )}
                  </div>
                  
                  {customIngredients.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Noch keine eigenen Zutaten erstellt.</p>
                      <p className="text-sm mt-1">Erstelle oben deine erste Zutat.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customIngredients.map((ingredient) => (
                        <div
                          key={ingredient.id}
                          className="flex items-center justify-between bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${ingredient.alcoholic ? 'bg-red-500' : 'bg-green-500'}`} />
                            <span className="font-medium text-white">{ingredient.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              ingredient.alcoholic 
                                ? 'bg-red-900/50 text-red-400' 
                                : 'bg-green-900/50 text-green-400'
                            }`}>
                              {ingredient.alcoholic ? "Alkoholisch" : "Alkoholfrei"}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteIngredient(ingredient.id)}
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
              <div className="flex-shrink-0 p-4 pt-0 border-t border-gray-700 mt-4">
                <div className="flex justify-between items-center pt-4">
                  <p className="text-gray-500 text-xs">* Pflichtfeld</p>
                  <Button onClick={handleClose} className="h-10 px-6 bg-gray-700 text-white hover:bg-gray-600">
                    Schliessen
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="overflow-y-auto p-2" style={{ maxHeight: "85vh" }}>
              <div className="flex gap-3 my-2">
                {/* Tastatur links */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="text-center mb-2">
                    <h3 className="text-base font-semibold text-white mb-1">Zutatennamen eingeben</h3>
                    <div className="bg-white text-black text-lg p-3 rounded mb-3 min-h-[44px] break-all border-2 border-[#00ff00]">
                      {keyboardValue || <span className="text-gray-400">Eingabe...</span>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
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
                              className="flex-1 h-10 text-sm bg-gray-700 hover:bg-gray-600 text-white min-h-0"
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
                    className={`h-11 text-white flex flex-col items-center justify-center ${
                      isShiftActive ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-700 hover:bg-gray-600"
                    }`}
                  >
                    <ArrowUp className="h-3 w-3" />
                    <span className="text-xs">Shift</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCapsLock}
                    className={`h-11 text-white flex flex-col items-center justify-center ${
                      isCapsLockActive ? "bg-orange-600 hover:bg-orange-700" : "bg-gray-700 hover:bg-gray-600"
                    }`}
                  >
                    <Lock className="h-3 w-3" />
                    <span className="text-xs">Caps</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={handleBackspace}
                    className="h-11 bg-red-700 hover:bg-red-600 text-white flex flex-col items-center justify-center"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    <span className="text-xs">Back</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={handleClear}
                    className="h-11 bg-yellow-700 hover:bg-yellow-600 text-white flex flex-col items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                    <span className="text-xs">Clear</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={handleKeyboardCancel}
                    className="h-11 bg-gray-700 hover:bg-gray-600 text-white flex flex-col items-center justify-center"
                  >
                    <span className="text-xs">Cancel</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={handleKeyboardConfirm}
                    className="h-11 bg-green-700 hover:bg-green-600 text-white flex flex-col items-center justify-center"
                  >
                    <Check className="h-3 w-3" />
                    <span className="text-xs">OK</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}

export default IngredientManager
