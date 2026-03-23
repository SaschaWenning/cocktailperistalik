"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import type { Cocktail } from "@/types/cocktail"
import { getAllIngredients } from "@/lib/ingredients"
import type { Ingredient } from "@/types/pump"
import { saveRecipe } from "@/lib/cocktail-machine"
import { Loader2, ImageIcon, Plus, Minus, FolderOpen, X, ArrowLeft, Check, ArrowUp, Lock, EyeOff } from "lucide-react"
import FileBrowser from "./file-browser"

interface RecipeCreatorProps {
  isOpen: boolean
  onClose: () => void
  onSave: (newCocktail: Cocktail) => void
  asTab?: boolean
  cocktail?: Cocktail  // Optional: wenn gesetzt, wird bearbeitet statt neu erstellt
  onRequestDelete?: (id: string) => void
}

export default function RecipeCreator({ isOpen, onClose, onSave, asTab = false, cocktail, onRequestDelete }: RecipeCreatorProps) {
  const isEditMode = !!cocktail
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [recipe, setRecipe] = useState<
    { ingredientId: string; amount: number; type: "automatic" | "manual"; instruction?: string; delayed?: boolean }[]
  >([])
  const [imageUrl, setImageUrl] = useState("")
  const [alcoholic, setAlcoholic] = useState(true)
  const [sizes, setSizes] = useState<number[]>([200])
  const [saving, setSaving] = useState(false)
  const [hidingCocktail, setHidingCocktail] = useState(false)

  const handleHideCocktail = async () => {
    if (!cocktail) return
    try {
      setHidingCocktail(true)
      const response = await fetch("/api/hidden-cocktails")
      const data = await response.json()
      const hiddenCocktails: string[] = data.hiddenCocktails || []
      if (!hiddenCocktails.includes(cocktail.id)) {
        hiddenCocktails.push(cocktail.id)
        await fetch("/api/hidden-cocktails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hiddenCocktails }),
        })
      }
      onClose()
      window.location.reload()
    } catch (error) {
      console.error("Fehler beim Ausblenden:", error)
    } finally {
      setHidingCocktail(false)
    }
  }
  const [ingredients, setIngredients] = useState(getAllIngredients())
  const [errors, setErrors] = useState<{
    name?: string
    imageUrl?: string
  }>({})

  const [showKeyboard, setShowKeyboard] = useState(false)
  const [keyboardMode, setKeyboardMode] = useState("")
  const [keyboardValue, setKeyboardValue] = useState("")
  const [isNumericKeyboard, setIsNumericKeyboard] = useState(false)
  const [isShiftActive, setIsShiftActive] = useState(false)
  const [isCapsLockActive, setIsCapsLockActive] = useState(false)
  const [showFileBrowser, setShowFileBrowser] = useState(false)
  const [newSizeValue, setNewSizeValue] = useState("")

  useEffect(() => {
    if (isOpen) {
      setIngredients(getAllIngredients())
      
      // Im Bearbeitungsmodus: Daten vom Cocktail laden
      if (cocktail) {
        setName(cocktail.name)
        setDescription(cocktail.description || "")
        setAlcoholic(cocktail.alcoholic)
        setSizes(cocktail.sizes || [200])
        const loadedRecipe = cocktail.recipe.map((item) => ({
          ...item,
          type: item.type || (item.manual === true ? "manual" : "automatic"),
          instruction: item.instruction || "",
          delayed: item.delayed || false,
        }))
        setRecipe(loadedRecipe)
        
        // Stelle sicher dass alle Zutaten aus dem Rezept in der verfügbaren Liste sind
        const allIngredients = getAllIngredients()
        const missingIngredients: Ingredient[] = []
        for (const item of cocktail.recipe) {
          if (!allIngredients.find(ing => ing.id === item.ingredientId)) {
            // Zutat nicht gefunden - füge sie als unbekannte Zutat hinzu
            // Custom-Zutaten haben das Format: custom-TIMESTAMP-name
            let ingredientName = item.ingredientId
            if (item.ingredientId.startsWith("custom-")) {
              ingredientName = item.ingredientId.replace(/^custom-\d+-/, "").trim()
              // Bindestriche durch Leerzeichen ersetzen und großschreiben
              ingredientName = ingredientName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            }
            if (!ingredientName) ingredientName = "Unbekannte Zutat"
            
            missingIngredients.push({
              id: item.ingredientId,
              name: ingredientName,
              alcoholic: cocktail.alcoholic,
            })
          }
        }
        if (missingIngredients.length > 0) {
          setIngredients([...allIngredients, ...missingIngredients])
        }
        let imagePath = cocktail.image || ""
        if (imagePath.startsWith("/placeholder")) {
          setImageUrl("")
        } else {
          if (imagePath && !imagePath.startsWith("/") && !imagePath.startsWith("http")) {
            imagePath = `/${imagePath}`
          }
          imagePath = imagePath.split("?")[0]
          setImageUrl(imagePath)
        }
      } else {
        // Im Erstellungsmodus: Felder zurücksetzen
        setName("")
        setDescription("")
        setAlcoholic(true)
        setSizes([200])
        setRecipe([])
        setImageUrl("")
        setErrors({})
      }
    }
  }, [isOpen, cocktail])

  useEffect(() => {
    // Nur im Erstellungsmodus eine leere Zutat hinzufügen, nicht im Bearbeitungsmodus
    if (recipe.length === 0 && !isEditMode) {
      addIngredient()
    }
  }, [recipe, isEditMode])

  const openKeyboard = (
    mode: "name" | "description" | "imageUrl" | "instruction" | "newSize" | string,
    currentValue: string,
    numeric = false,
  ) => {
    setKeyboardMode(mode)
    setKeyboardValue(currentValue)
    setIsNumericKeyboard(numeric)
    setShowKeyboard(true)
    setIsShiftActive(false)
    setIsCapsLockActive(false)
  }

  const openInstructionKeyboard = (index: number, currentValue: string) => {
    setKeyboardMode(`instruction-${index}`)
    setKeyboardValue(currentValue || "")
    setIsNumericKeyboard(false)
    setShowKeyboard(true)
    setIsShiftActive(false)
    setIsCapsLockActive(false)
  }

  const addIngredient = () => {
    const availableIngredients = ingredients.filter(
      (ingredient) => !recipe.some((item) => item.ingredientId === ingredient.id),
    )

    if (availableIngredients.length > 0) {
      setRecipe([
        ...recipe,
        { ingredientId: availableIngredients[0].id, amount: 30, type: "automatic", instruction: "", delayed: false },
      ])
    }
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setSaving(true)
    try {
      // Im Bearbeitungsmodus: vorhandene ID verwenden, sonst neue erstellen
      const cocktailId = isEditMode && cocktail ? cocktail.id : `custom-${Date.now()}`

      const newCocktail: Cocktail = {
        ...(isEditMode && cocktail ? cocktail : {}),
        id: cocktailId,
        name: name.trim(),
        description: description.trim(),
        image: imageUrl || "/placeholder.svg?height=200&width=400",
        alcoholic: alcoholic,
        recipe: recipe.map((item) => ({
          ingredientId: item.ingredientId,
          amount: item.amount,
          type: item.type,
          instruction: item.instruction,
          delayed: item.delayed,
        })),
        sizes: sizes.length > 0 ? sizes : [200],
        ingredients: recipe.map((item) => {
          const ingredient = ingredients.find((i) => i.id === item.ingredientId)
          const ingredientName = ingredient?.name || item.ingredientId.replace(/^custom-\d+-/, "")
          return `${item.amount}ml ${ingredientName}${item.type === "manual" ? " (manuell)" : ""}`
        }),
      }

      await saveRecipe(newCocktail)
      onSave(newCocktail)
      onClose()

      window.scrollTo({ top: 0, behavior: "smooth" })

      // Nur im Erstellungsmodus zurücksetzen
      if (!isEditMode) {
        setName("")
        setDescription("")
        setRecipe([]) // Reset to empty, useEffect will add default
        setImageUrl("")
        setAlcoholic(true)
        setSizes([200])
        setErrors({})
      }
    } catch (error) {
      console.error("Fehler beim Speichern:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleSelectImageFromBrowser = (imagePath: string) => {
    setImageUrl(imagePath)
    setShowFileBrowser(false)
  }

  const handleIngredientChange = (index: number, value: string) => {
    const updatedRecipe = recipe.map((item, i) => {
      if (i === index) {
        return { ...item, ingredientId: value }
      }
      return item
    })
    setRecipe(updatedRecipe)
  }

  const handleTypeChange = (index: number, value: "automatic" | "manual") => {
    const updatedRecipe = recipe.map((item, i) => {
      if (i === index) {
        return { ...item, type: value }
      }
      return item
    })
    setRecipe(updatedRecipe)
  }

  const handleDelayedChange = (index: number, delayed: boolean) => {
    const updatedRecipe = recipe.map((item, i) => {
      if (i === index) {
        return { ...item, delayed }
      }
      return item
    })
    setRecipe(updatedRecipe)
  }

  const removeIngredient = (index: number) => {
    const updatedRecipe = recipe.filter((_, i) => i !== index)
    setRecipe(updatedRecipe)
  }

  const handleKeyPress = (key: string) => {
    let newValue = keyboardValue
    if (key === "Backspace") {
      newValue = newValue.slice(0, -1)
    } else {
      let processedKey = key
      if (key.length === 1 && key.match(/[A-Za-z]/)) {
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
    setShowKeyboard(false)
  }

  const handleKeyboardConfirm = () => {
    switch (keyboardMode) {
      case "name":
        setName(keyboardValue)
        break
      case "description":
        setDescription(keyboardValue)
        break
      case "imageUrl":
        setImageUrl(keyboardValue)
        break
      case "newSize":
        const value = Number.parseInt(keyboardValue)
        if (value > 0) {
          addSize(value)
          setNewSizeValue("")
        }
        break
      default:
        if (keyboardMode.startsWith("amount-")) {
          const index = Number.parseInt(keyboardMode.split("-")[1])
          const updatedRecipe = recipe.map((item, i) => {
            if (i === index) {
              return { ...item, amount: Number.parseFloat(keyboardValue) }
            }
            return item
          })
          setRecipe(updatedRecipe)
        } else if (keyboardMode.startsWith("instruction-")) {
          const index = Number.parseInt(keyboardMode.split("-")[1])
          const updatedRecipe = recipe.map((item, i) => {
            if (i === index) {
              return { ...item, instruction: keyboardValue }
            }
            return item
          })
          setRecipe(updatedRecipe)
        }
        break
    }
    setShowKeyboard(false)
  }

  const validateForm = () => {
    let valid = true
    const newErrors: typeof errors = {}

    if (!name.trim()) {
      newErrors.name = "Name ist erforderlich"
      valid = false
    }

    if (imageUrl && !imageUrl.trim().startsWith("/")) {
      newErrors.imageUrl = "Bild-Pfad muss mit / beginnen"
      valid = false
    }

    setErrors(newErrors)
    return valid
  }

  const addSize = (value: number) => {
    setSizes([...sizes, value])
  }

  const removeSize = (size: number) => {
    setSizes(sizes.filter((s) => s !== size))
  }

  const handleAddSize = () => {
    const value = Number.parseInt(newSizeValue)
    if (value > 0) {
      addSize(value)
      setNewSizeValue("")
    }
  }

  const alphaKeys = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["q", "w", "e", "r", "t", "z", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["y", "x", "c", "v", "b", "n", "m"],
    ["ä", "ö", "ü", "ß"],
    [" ", "-", "_", ".", "/"],
  ]

  const numericKeys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["0", "00", "."],
  ]

  const keys = isNumericKeyboard ? numericKeys : alphaKeys

  const renderContent = () => (
    <div className={`${asTab ? "space-y-6" : ""}`}>
      {!showKeyboard ? (
        <div className="space-y-5 my-2 max-h-[65vh] overflow-y-auto pr-2">
          {/* Header */}
          <div className="text-center pb-2 border-b border-gray-700">
            <h2 className="text-xl font-bold text-[#00ff00]">
              {isEditMode ? "Rezept bearbeiten" : "Neues Rezept erstellen"}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {isEditMode ? `Bearbeite "${cocktail?.name}"` : "Erstelle deinen eigenen Cocktail"}
            </p>
          </div>

          {/* Basis-Informationen */}
          <div className="bg-gray-900/50 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-[#00ff00] uppercase tracking-wide">Basis-Informationen</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Name *</Label>
                <Input
                  value={name}
                  onClick={() => openKeyboard("name", name)}
                  readOnly
                  className={`bg-gray-800 border-gray-600 text-white cursor-pointer h-10 hover:border-[#00ff00] transition-colors ${errors.name ? "border-red-500" : ""}`}
                  placeholder="Name des Cocktails"
                />
                {errors.name && <p className="text-red-400 text-xs">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Alkoholisch</Label>
                <Select value={alcoholic ? "true" : "false"} onValueChange={(value) => setAlcoholic(value === "true")}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white h-10 hover:border-[#00ff00] transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border border-gray-600">
                    <SelectItem value="true" className="text-white hover:bg-gray-700 cursor-pointer">
                      Ja - Mit Alkohol
                    </SelectItem>
                    <SelectItem value="false" className="text-white hover:bg-gray-700 cursor-pointer">
                      Nein - Alkoholfrei
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Beschreibung</Label>
              <Input
                value={description}
                onClick={() => openKeyboard("description", description)}
                readOnly
                className="bg-gray-800 border-gray-600 text-white cursor-pointer h-10 hover:border-[#00ff00] transition-colors"
                placeholder="Beschreibe deinen Cocktail..."
              />
            </div>
          </div>

          {/* Bild */}
          <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[#00ff00] uppercase tracking-wide flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Bild (optional)
            </h3>
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                onClick={() => openKeyboard("imageUrl", imageUrl)}
                readOnly
                className="bg-gray-800 border-gray-600 text-white cursor-pointer flex-1 h-10 hover:border-[#00ff00] transition-colors"
                placeholder="/images/cocktails/mein-cocktail.jpg"
              />
              <Button
                type="button"
                onClick={() => setShowFileBrowser(true)}
                className="bg-gray-700 text-white hover:bg-gray-600 h-10 w-10 p-0"
                title="Bild auswählen"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
              {imageUrl && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => setImageUrl("")}
                  className="h-10 w-10"
                  title="Bild entfernen"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Größen */}
          <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[#00ff00] uppercase tracking-wide">Cocktailgrößen (ml)</h3>
            <div className="flex gap-2 items-center">
              <Input
                value={newSizeValue}
                onClick={() => openKeyboard("newSize", newSizeValue, true)}
                readOnly
                placeholder="Größe in ml"
                className="bg-gray-800 border-gray-600 text-white h-10 flex-1 cursor-pointer hover:border-[#00ff00] transition-colors"
              />
              <Button
                type="button"
                onClick={handleAddSize}
                className="bg-[#00ff00] text-black hover:bg-[#00cc00] h-10 w-10 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {sizes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <div
                    key={size}
                    className="group flex items-center bg-gradient-to-r from-gray-800 to-gray-750 rounded-lg border border-gray-600 hover:border-[#00ff00]/50 transition-all overflow-hidden"
                  >
                    <span className="text-white text-sm font-semibold px-3 py-2">{size}</span>
                    <span className="text-gray-400 text-xs pr-2">ml</span>
                    <button
                      type="button"
                      onClick={() => removeSize(size)}
                      className="h-full px-2 py-2 bg-red-900/40 hover:bg-red-700 text-red-400 hover:text-white transition-colors border-l border-gray-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Zutaten */}
          <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-[#00ff00] uppercase tracking-wide">Zutaten</h3>
              <Button
                type="button"
                size="sm"
                onClick={addIngredient}
                className="bg-[#00ff00] text-black hover:bg-[#00cc00] h-9"
                disabled={recipe.length >= ingredients.length}
              >
                <Plus className="h-4 w-4 mr-1" />
                Hinzufügen
              </Button>
            </div>

            <div className="space-y-2">
              {recipe.map((item, index) => (
                <div
                  key={index}
                  className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {/* Zutat */}
                    <div className="flex-1 min-w-0">
                      <Select value={item.ingredientId} onValueChange={(value) => handleIngredientChange(index, value)}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border border-gray-600 max-h-48 overflow-y-auto">
                          {ingredients.map((ingredient) => (
                            <SelectItem
                              key={ingredient.id}
                              value={ingredient.id}
                              className="text-white hover:bg-gray-700 cursor-pointer"
                            >
                              {ingredient.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Menge */}
                    <div className="w-20">
                      <Input
                        value={item.amount}
                        onClick={() => openKeyboard(`amount-${index}`, item.amount.toString(), true)}
                        readOnly
                        className="bg-gray-700 border-gray-600 text-white cursor-pointer text-center h-10"
                      />
                    </div>
                    <span className="text-gray-400 text-sm w-6">ml</span>

                    {/* Typ */}
                    <div className="w-28">
                      <Select
                        value={item.type}
                        onValueChange={(value: "automatic" | "manual") => handleTypeChange(index, value)}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-10 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border border-gray-600">
                          <SelectItem value="automatic" className="text-white hover:bg-gray-700 cursor-pointer text-sm">
                            Auto
                          </SelectItem>
                          <SelectItem value="manual" className="text-white hover:bg-gray-700 cursor-pointer text-sm">
                            Manuell
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Verzögert */}
                    <div className="flex items-center gap-1.5 px-2">
                      <Checkbox
                        checked={item.delayed || false}
                        onCheckedChange={(checked) => handleDelayedChange(index, checked as boolean)}
                        className="w-4 h-4 border-gray-500 data-[state=checked]:bg-[#00ff00] data-[state=checked]:border-[#00ff00]"
                      />
                      <span className="text-xs text-gray-400 whitespace-nowrap">Verzögert</span>
                    </div>

                    {/* Entfernen */}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeIngredient(index)}
                      disabled={recipe.length <= 1}
                      className="h-10 w-10 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Manuelle Anleitung */}
                  {item.type === "manual" && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <Input
                        value={item.instruction || ""}
                        onClick={() => openInstructionKeyboard(index, item.instruction)}
                        readOnly
                        className="bg-gray-700 border-gray-600 text-white cursor-pointer h-10 text-sm"
                        placeholder="Anleitung (z.B. 'mit Eiswürfeln auffüllen')"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-y-auto" style={{ maxHeight: "80vh" }}>
          <div className="flex gap-3 my-2">
            <div className="flex-1 flex flex-col min-w-0">
              <div className="text-center mb-2">
                <h3 className="text-base font-semibold text-white mb-1">
                  {keyboardMode === "name" && "Name eingeben"}
                  {keyboardMode === "description" && "Beschreibung eingeben"}
                  {keyboardMode === "imageUrl" && "Bild-Pfad eingeben"}
                  {keyboardMode.startsWith("amount-") && "Menge eingeben (ml)"}
                  {keyboardMode === "instruction" && "Anleitung eingeben"}
                  {keyboardMode === "newSize" && "Neue Cocktailgröße eingeben (ml)"}
                </h3>
                <div className="bg-white text-black text-lg p-3 rounded mb-3 min-h-[44px] break-all border-2 border-[hsl(var(--cocktail-primary))]">
                  {keyboardValue || <span className="text-gray-400">Eingabe...</span>}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                {keys.map((row, rowIndex) => (
                  <div
                    key={rowIndex}
                    className={`flex ${isNumericKeyboard ? "gap-3 justify-center" : "gap-1 justify-center"}`}
                  >
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
                          className={`${isNumericKeyboard ? "w-20 h-11" : "flex-1 h-10"} text-sm bg-gray-700 hover:bg-gray-600 text-white min-h-0`}
                        >
                          {displayKey}
                        </Button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 w-24">
              {!isNumericKeyboard && (
                <>
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
                </>
              )}

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

      {!showKeyboard && (
        <div className="flex justify-between items-center gap-3 mt-4 pt-4 border-t border-gray-700">
          <p className="text-gray-500 text-xs">* Pflichtfeld</p>
          <div className="flex gap-3">
            {isEditMode && (
              <Button
                type="button"
                variant="outline"
                onClick={handleHideCocktail}
                disabled={hidingCocktail}
                className="bg-transparent text-yellow-400 border-yellow-700 hover:bg-yellow-900/30 px-4 h-11"
              >
                <EyeOff className="mr-2 h-4 w-4" />
                {hidingCocktail ? "..." : "Ausblenden"}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-transparent text-gray-300 border-gray-600 hover:bg-gray-800 hover:text-white px-6 h-11"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#00ff00] text-black hover:bg-[#00cc00] font-semibold px-8 h-11"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Speichern...
                </>
              ) : (
                isEditMode ? "Änderungen speichern" : "Rezept speichern"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  if (asTab) {
    return (
      <>
        {renderContent()}
        <FileBrowser
          isOpen={showFileBrowser}
          onClose={() => setShowFileBrowser(false)}
          onSelectImage={handleSelectImageFromBrowser}
        />
      </>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && !showFileBrowser && onClose()}>
        <DialogContent className="bg-black border-[hsl(var(--cocktail-card-border))] text-white sm:max-w-4xl max-h-[95vh] overflow-hidden [&>button.absolute]:hidden">
          {renderContent()}
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
