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
import { saveRecipe } from "@/lib/cocktail-machine"
import { Loader2, ImageIcon, Plus, Minus, FolderOpen, X, ArrowLeft, Check, ArrowUp, Lock } from "lucide-react"
import FileBrowser from "./file-browser"

interface RecipeCreatorProps {
  isOpen: boolean
  onClose: () => void
  onSave: (newCocktail: Cocktail) => void
  asTab?: boolean
}

export default function RecipeCreator({ isOpen, onClose, onSave, asTab = false }: RecipeCreatorProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [recipe, setRecipe] = useState<
    { ingredientId: string; amount: number; type: "automatic" | "manual"; instruction?: string; delayed?: boolean }[]
  >([])
  const [imageUrl, setImageUrl] = useState("")
  const [alcoholic, setAlcoholic] = useState(true)
  const [sizes, setSizes] = useState<number[]>([200, 300, 400])
  const [saving, setSaving] = useState(false)
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
    }
  }, [isOpen])

  useEffect(() => {
    if (recipe.length === 0) {
      addIngredient()
    }
  }, [recipe])

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
      const newCocktailId = `custom-${Date.now()}`

      const newCocktail: Cocktail = {
        id: newCocktailId,
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
        sizes: sizes.length > 0 ? sizes : [200, 300, 400],
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

      setName("")
      setDescription("")
      setRecipe([]) // Reset to empty, useEffect will add default
      setImageUrl("")
      setAlcoholic(true)
      setSizes([200, 300, 400])
      setErrors({})
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
        <div className="space-y-4 my-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label className="text-white">Name</Label>
            <Input
              value={name}
              onClick={() => openKeyboard("name", name)}
              readOnly
              className={`bg-white border-[hsl(var(--cocktail-card-border))] text-black cursor-pointer h-10 ${errors.name ? "border-red-500" : ""}`}
              placeholder="Name des Cocktails"
            />
            {errors.name && <p className="text-red-400 text-sm">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-white">Beschreibung</Label>
            <Input
              value={description}
              onClick={() => openKeyboard("description", description)}
              readOnly
              className="bg-white border-[hsl(var(--cocktail-card-border))] text-black cursor-pointer h-10"
              placeholder="Beschreibe deinen Cocktail..."
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-white">
              <ImageIcon className="h-4 w-4" />
              Bild-Pfad (optional)
            </Label>
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                onClick={() => openKeyboard("imageUrl", imageUrl)}
                readOnly
                className="bg-white border-[hsl(var(--cocktail-card-border))] text-black cursor-pointer flex-1 h-10"
                placeholder="/pfad/zum/bild.jpg"
              />
              <Button
                type="button"
                onClick={() => setShowFileBrowser(true)}
                className="bg-[hsl(var(--cocktail-primary))] text-black hover:bg-[hsl(var(--cocktail-primary-hover))] h-10 w-10 p-0"
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
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Alkoholisch</Label>
            <Select value={alcoholic ? "true" : "false"} onValueChange={(value) => setAlcoholic(value === "true")}>
              <SelectTrigger className="bg-white border-[hsl(var(--cocktail-card-border))] text-black h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border border-[hsl(var(--cocktail-card-border))]">
                <SelectItem value="true" className="text-black hover:bg-gray-100 cursor-pointer">
                  Ja
                </SelectItem>
                <SelectItem value="false" className="text-black hover:bg-gray-100 cursor-pointer">
                  Nein
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Cocktailgrößen für dieses Rezept</Label>
            <div className="flex gap-2">
              <Input
                value={newSizeValue}
                onClick={() => openKeyboard("newSize", newSizeValue, true)}
                readOnly
                placeholder="ml eingeben"
                className="bg-white border-[hsl(var(--cocktail-card-border))] text-black h-10 flex-1 cursor-pointer"
              />
              <Button
                type="button"
                onClick={handleAddSize}
                className="bg-[hsl(var(--cocktail-primary))] text-black hover:bg-[hsl(var(--cocktail-primary-hover))] h-10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {sizes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {sizes.map((size) => (
                  <div
                    key={size}
                    className="flex items-center gap-1 bg-[hsl(var(--cocktail-card-bg))] px-3 py-1 rounded border border-[hsl(var(--cocktail-card-border))]"
                  >
                    <span className="text-white text-sm">{size}ml</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeSize(size)}
                      className="h-4 w-4 p-0 text-red-400 hover:text-red-300"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2">
            <div className="flex justify-between items-center mb-2">
              <Label className="text-white">Zutaten</Label>
              <Button
                type="button"
                size="sm"
                onClick={addIngredient}
                className="bg-[hsl(var(--cocktail-primary))] text-black hover:bg-[hsl(var(--cocktail-primary-hover))]"
                disabled={recipe.length >= ingredients.length}
              >
                <Plus className="h-4 w-4 mr-2" />
                Zutat hinzufügen
              </Button>
            </div>
          </div>

          {recipe.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-2 items-center p-3 bg-[hsl(var(--cocktail-card-bg))] rounded border border-[hsl(var(--cocktail-card-border))]"
            >
              <div className="col-span-4">
                <Select value={item.ingredientId} onValueChange={(value) => handleIngredientChange(index, value)}>
                  <SelectTrigger className="bg-white border-[hsl(var(--cocktail-card-border))] text-black h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-[hsl(var(--cocktail-card-border))] max-h-48 overflow-y-auto">
                    {ingredients.map((ingredient) => (
                      <SelectItem
                        key={ingredient.id}
                        value={ingredient.id}
                        className="text-black hover:bg-gray-100 cursor-pointer"
                      >
                        {ingredient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Input
                  value={item.amount}
                  onClick={() => openKeyboard(`amount-${index}`, item.amount.toString(), true)}
                  readOnly
                  className="bg-white border-[hsl(var(--cocktail-card-border))] text-black cursor-pointer text-center h-9"
                />
              </div>
              <div className="col-span-1 text-sm text-white">ml</div>
              <div className="col-span-2">
                <Select
                  value={item.type}
                  onValueChange={(value: "automatic" | "manual") => handleTypeChange(index, value)}
                >
                  <SelectTrigger className="bg-white border-[hsl(var(--cocktail-card-border))] text-black h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-[hsl(var(--cocktail-card-border))]">
                    <SelectItem value="automatic" className="text-black hover:bg-gray-100 cursor-pointer">
                      Automatisch
                    </SelectItem>
                    <SelectItem value="manual" className="text-black hover:bg-gray-100 cursor-pointer">
                      Manuell
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1 flex justify-center">
                <div className="flex flex-col items-center gap-1">
                  <Checkbox
                    checked={item.delayed || false}
                    onCheckedChange={(checked) => handleDelayedChange(index, checked as boolean)}
                    className="w-3 h-3 border-white data-[state=checked]:bg-[hsl(var(--cocktail-primary))] data-[state=checked]:border-[hsl(var(--cocktail-primary))]"
                  />
                  <span className="text-xs text-white">Verzögert</span>
                </div>
              </div>
              <div className="col-span-1">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => removeIngredient(index)}
                  disabled={recipe.length <= 1}
                  className="h-9 w-9 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
              {item.type === "manual" && (
                <div className="col-span-12 mt-2">
                  <Input
                    value={item.instruction || ""}
                    onClick={() => openInstructionKeyboard(index, item.instruction)}
                    readOnly
                    className="bg-white border-[hsl(var(--cocktail-card-border))] text-black cursor-pointer h-9"
                    placeholder="Anleitung (z.B. 'mit Eiswürfeln auffüllen')"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 my-2 h-[80vh]">
          <div className="flex-1 flex flex-col">
            <div className="text-center mb-2">
              <h3 className="text-base font-semibold text-white mb-1">
                {keyboardMode === "name" && "Name eingeben"}
                {keyboardMode === "description" && "Beschreibung eingeben"}
                {keyboardMode === "imageUrl" && "Bild-Pfad eingeben"}
                {keyboardMode.startsWith("amount-") && "Menge eingeben (ml)"}
                {keyboardMode === "instruction" && "Anleitung eingeben"}
                {keyboardMode === "newSize" && "Neue Cocktailgröße eingeben (ml)"}
              </h3>
              <div className="bg-white text-black text-lg p-4 rounded mb-4 min-h-[60px] break-all border-2 border-[hsl(var(--cocktail-primary))]">
                {keyboardValue || <span className="text-gray-400">Eingabe...</span>}
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              {keys.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className={`flex ${isNumericKeyboard ? "gap-3 justify-center" : "gap-1 justify-center"} flex-1`}
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
                        className={`${isNumericKeyboard ? "w-20 h-12" : "flex-1 h-12"} text-sm bg-gray-700 hover:bg-gray-600 text-white min-h-0`}
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
                  className={`h-12 text-white flex flex-col items-center justify-center ${
                    isShiftActive ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  <ArrowUp className="h-3 w-3" />
                  <span className="text-xs">Shift</span>
                </Button>
                <Button
                  type="button"
                  onClick={handleCapsLock}
                  className={`h-12 text-white flex flex-col items-center justify-center ${
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
              className="h-12 bg-red-700 hover:bg-red-600 text-white flex flex-col items-center justify-center"
            >
              <ArrowLeft className="h-3 w-3" />
              <span className="text-xs">Back</span>
            </Button>
            <Button
              type="button"
              onClick={handleClear}
              className="h-12 bg-yellow-700 hover:bg-yellow-600 text-white flex flex-col items-center justify-center"
            >
              <X className="h-3 w-3" />
              <span className="text-xs">Clear</span>
            </Button>
            <Button
              type="button"
              onClick={handleKeyboardCancel}
              className="h-12 bg-gray-700 hover:bg-gray-600 text-white flex flex-col items-center justify-center"
            >
              <span className="text-xs">Cancel</span>
            </Button>
            <Button
              type="button"
              onClick={handleKeyboardConfirm}
              className="h-12 bg-green-700 hover:bg-green-600 text-white flex flex-col items-center justify-center"
            >
              <Check className="h-3 w-3" />
              <span className="text-xs">OK</span>
            </Button>
          </div>
        </div>
      )}

      {!showKeyboard && (
        <div className="flex justify-end gap-2 mt-2">
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
        <DialogContent className="bg-black border-[hsl(var(--cocktail-card-border))] text-white sm:max-w-4xl max-h-[95vh] overflow-hidden">
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
