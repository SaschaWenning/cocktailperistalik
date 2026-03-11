"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import type { Cocktail } from "@/types/cocktail"
import { getAllIngredients } from "@/lib/ingredients"
import { saveRecipe } from "@/lib/cocktail-machine"
import {
  Loader2,
  ImageIcon,
  Trash2,
  Plus,
  Minus,
  FolderOpen,
  ArrowLeft,
  X,
  Check,
  ArrowUp,
  Lock,
  EyeOff,
} from "lucide-react"
import FileBrowser from "./file-browser"
import type { RecipeEditorProps } from "@/types/recipe-editor"

export default function RecipeEditor({ isOpen, onClose, cocktail, onSave, onRequestDelete }: RecipeEditorProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [alcoholic, setAlcoholic] = useState(true)
  const [recipe, setRecipe] = useState<
    { ingredientId: string; amount: number; type: "automatic" | "manual"; instruction?: string; delayed?: boolean }[]
  >([])
  const [sizes, setSizes] = useState<number[]>([200, 300, 400])
  const [saving, setSaving] = useState(false)
  const [ingredients, setIngredients] = useState(getAllIngredients())
  const [hidingCocktail, setHidingCocktail] = useState(false)

  const [showKeyboard, setShowKeyboard] = useState(false)
  const [keyboardMode, setKeyboardMode] = useState("")
  const [keyboardValue, setKeyboardValue] = useState("")
  const [isNumericKeyboard, setIsNumericKeyboard] = useState(false)
  const [isShiftActive, setIsShiftActive] = useState(false)
  const [isCapsLockActive, setIsCapsLockActive] = useState(false)
  const [showFileBrowser, setShowFileBrowser] = useState(false)
  const [newSizeInput, setNewSizeInput] = useState("")

  useEffect(() => {
    if (isOpen) {
      setIngredients(getAllIngredients())
    }
  }, [isOpen])

  useEffect(() => {
    if (cocktail && isOpen) {
      setName(cocktail.name)
      setDescription(cocktail.description)
      setAlcoholic(cocktail.alcoholic)
      setSizes(cocktail.sizes || [200, 300, 400])
      setRecipe(
        cocktail.recipe.map((item) => ({
          ...item,
          type: item.type || (item.manual === true ? "manual" : "automatic"),
          instruction: item.instruction || "",
          delayed: item.delayed || false,
        })),
      )

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

      setShowKeyboard(false)
      setKeyboardMode("")
      setKeyboardValue("")

      console.log(`Editor loaded for ${cocktail.name}:`, {
        name: cocktail.name,
        description: cocktail.description,
        image: imagePath,
        alcoholic: cocktail.alcoholic,
        recipe: cocktail.recipe,
        sizes: cocktail.sizes,
      })
    }
  }, [cocktail, isOpen])

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

  const addSize = (value: number) => {
    if (value > 0 && !sizes.includes(value)) {
      setSizes([...sizes, value].sort((a, b) => a - b))
    }
  }

  const removeSize = (size: number) => {
    setSizes(sizes.filter((s) => s !== size))
  }

  const handleKeyPress = (key: string) => {
    let newValue = keyboardValue
    if (key === "Backspace") {
      newValue = newValue.slice(0, -1)
    } else {
      let processedKey = key
      if (key.length === 1 && key.match(/[A-Za-z]/)) {
        const shouldShowUppercase = (isShiftActive && !isCapsLockActive) || (!isShiftActive && isCapsLockActive)
        processedKey = shouldShowUppercase ? key.toUpperCase() : key.toLowerCase()
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
          setNewSizeInput("")
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

  const handleAmountChange = (index: number, amount: number) => {
    const updatedRecipe = [...recipe]
    updatedRecipe[index] = { ...updatedRecipe[index], amount }
    setRecipe(updatedRecipe)
  }

  const handleIngredientChange = (index: number, ingredientId: string) => {
    const updatedRecipe = [...recipe]
    updatedRecipe[index] = { ...updatedRecipe[index], ingredientId }
    setRecipe(updatedRecipe)
  }

  const handleTypeChange = (index: number, type: "automatic" | "manual") => {
    const updatedRecipe = [...recipe]
    updatedRecipe[index] = { ...updatedRecipe[index], type }
    setRecipe(updatedRecipe)
  }

  const handleDelayedChange = (index: number, delayed: boolean) => {
    const updatedRecipe = [...recipe]
    updatedRecipe[index] = { ...updatedRecipe[index], delayed }
    setRecipe(updatedRecipe)
  }

  const handleInstructionChange = (index: number, instruction: string) => {
    const updatedRecipe = [...recipe]
    updatedRecipe[index] = { ...updatedRecipe[index], instruction }
    setRecipe(updatedRecipe)
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

  const removeIngredient = (index: number) => {
    if (recipe.length > 1) {
      const updatedRecipe = recipe.filter((_, i) => i !== index)
      setRecipe(updatedRecipe)
    }
  }

  const handleSelectImageFromBrowser = (imagePath: string) => {
    setImageUrl(imagePath)
    setShowFileBrowser(false)
  }

  const handleSave = async () => {
    if (!cocktail || !name.trim() || recipe.length === 0) return

    setSaving(true)
    try {
      const updatedCocktail: Cocktail = {
        ...cocktail,
        name: name.trim(),
        description: description.trim(),
        image: imageUrl || "/placeholder.svg?height=200&width=400",
        alcoholic,
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

      await saveRecipe(updatedCocktail)
      onSave(updatedCocktail)
      onClose()

      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error) {
      console.error("Fehler beim Speichern des Rezepts:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRequest = () => {
    if (!cocktail) return
    onRequestDelete(cocktail.id)
  }

  const handleHideCocktail = async () => {
    if (!cocktail) return

    try {
      setHidingCocktail(true)

      // Get current hidden cocktails
      const response = await fetch("/api/hidden-cocktails")
      const data = await response.json()
      const hiddenCocktails: string[] = data.hiddenCocktails || []

      // Add cocktail to hidden list if not already there
      if (!hiddenCocktails.includes(cocktail.id)) {
        hiddenCocktails.push(cocktail.id)

        // Update API
        await fetch("/api/hidden-cocktails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hiddenCocktails }),
        })
      }

      // Close editor and trigger parent update
      onClose()
      // Trigger a refresh of the cocktail list
      window.location.reload()
    } catch (error) {
      console.error("Fehler beim Ausblenden des Cocktails:", error)
    } finally {
      setHidingCocktail(false)
    }
  }

  const getIngredientName = (id: string) => {
    const ingredient = ingredients.find((i) => i.id === id)
    return ingredient ? ingredient.name : id.replace(/^custom-\d+-/, "")
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

  const renderFormView = () => (
    <div className="space-y-6 my-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-white">
          Name des Cocktails
        </Label>
        <Input
          id="name"
          value={name}
          onClick={() => openKeyboard("name", name)}
          readOnly
          className="bg-white border-[hsl(var(--cocktail-card-border))] text-black cursor-pointer h-10"
          placeholder="z.B. Mein Cocktail"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-white">
          Beschreibung
        </Label>
        <Input
          id="description"
          value={description}
          onClick={() => openKeyboard("description", description)}
          readOnly
          className="bg-white border-[hsl(var(--cocktail-card-border))] text-black cursor-pointer h-10"
          placeholder="Beschreibe deinen Cocktail..."
        />
      </div>

      <div className="space-y-2">
        <Label className="text-white">Typ</Label>
        <Select
          value={alcoholic ? "alcoholic" : "virgin"}
          onValueChange={(value) => setAlcoholic(value === "alcoholic")}
        >
          <SelectTrigger className="bg-white border-[hsl(var(--cocktail-card-border))] text-black">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border border-[hsl(var(--cocktail-card-border))]">
            <SelectItem value="alcoholic" className="text-black hover:bg-gray-100 cursor-pointer">
              Mit Alkohol
            </SelectItem>
            <SelectItem value="virgin" className="text-black hover:bg-gray-100 cursor-pointer">
              Alkoholfrei
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-white">
          <ImageIcon className="h-4 w-4" />
          Bild (optional)
        </Label>
        <div className="flex gap-2">
          <Input
            value={imageUrl}
            onClick={() => openKeyboard("imageUrl", imageUrl)}
            readOnly
            className="bg-white border-[hsl(var(--cocktail-card-border))] text-black cursor-pointer flex-1"
            placeholder="Bild-URL oder aus Galerie wählen"
          />
          <Button
            type="button"
            onClick={() => setShowFileBrowser(true)}
            className="bg-[hsl(var(--cocktail-primary))] text-black hover:bg-[hsl(var(--cocktail-primary-hover))]"
          >
            <FolderOpen className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-white">Cocktailgrößen für dieses Rezept</Label>
        <div className="flex gap-2 items-center">
          <Input
            value={newSizeInput}
            onClick={() => openKeyboard("newSize", newSizeInput, true)}
            readOnly
            className="bg-white border-[hsl(var(--cocktail-card-border))] text-black h-10 flex-1 cursor-pointer"
            placeholder="ml eingeben"
          />
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

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label className="text-white">Zutaten</Label>
          <Button
            type="button"
            size="sm"
            onClick={addIngredient}
            className="bg-[hsl(var(--cocktail-primary))] text-black hover:bg-[hsl(var(--cocktail-primary-hover))]"
            disabled={recipe.length >= ingredients.length}
          >
            <Plus className="h-4 w-4 mr-1" />
            Zutat hinzufügen
          </Button>
        </div>

        {recipe.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-12 gap-2 items-center p-3 bg-[hsl(var(--cocktail-card-bg))] rounded-lg border border-[hsl(var(--cocktail-card-border))]"
          >
            <div className="col-span-5">
              <Select value={item.ingredientId} onValueChange={(value) => handleIngredientChange(index, value)}>
                <SelectTrigger className="bg-white border-[hsl(var(--cocktail-card-border))] text-black">
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
            <div className="col-span-1">
              <Input
                type="text"
                value={item.amount}
                onClick={() => openKeyboard(`amount-${index}`, item.amount.toString(), true)}
                readOnly
                className="bg-white border-[hsl(var(--cocktail-card-border))] text-black cursor-pointer text-center"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <span className="text-sm text-white">ml</span>
              <div className="flex flex-col items-center gap-1">
                <Checkbox
                  checked={item.delayed || false}
                  onCheckedChange={(checked) => handleDelayedChange(index, checked as boolean)}
                  className="!w-1.5 !h-1.5 border-white data-[state=checked]:bg-[hsl(var(--cocktail-primary))] data-[state=checked]:border-[hsl(var(--cocktail-primary))]"
                />
                <span className="text-xs text-white">Verzögert</span>
              </div>
            </div>
            <div className="col-span-3">
              <Select
                value={item.type}
                onValueChange={(value: "automatic" | "manual") => handleTypeChange(index, value)}
              >
                <SelectTrigger className="bg-white border-[hsl(var(--cocktail-card-border))] text-black">
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
            <div className="col-span-1">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => removeIngredient(index)}
                disabled={recipe.length <= 1}
                className="h-8 w-8 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
            {item.type === "manual" && (
              <div className="col-span-12 mt-2">
                <Input
                  value={item.instruction || ""}
                  onClick={() => openInstructionKeyboard(index, item.instruction || "")}
                  readOnly
                  className="bg-white border-[hsl(var(--cocktail-card-border))] text-black cursor-pointer"
                  placeholder="Anleitung (z.B. 'mit Eiswürfeln auffüllen')"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const renderKeyboardView = () => (
    <div className="flex gap-3 my-2 h-[80vh]">
      <div className="flex-1 flex flex-col">
        <div className="text-center mb-2">
          <h3 className="text-base font-semibold text-white mb-1">
            {keyboardMode === "name" && "Name eingeben"}
            {keyboardMode === "description" && "Beschreibung eingeben"}
            {keyboardMode === "imageUrl" && "Bild-URL eingeben"}
            {keyboardMode === "newSize" && "Neue Cocktailgröße eingeben (ml)"}
            {keyboardMode.startsWith("amount-") && "Menge eingeben (ml)"}
            {keyboardMode.startsWith("instruction-") && "Anleitung eingeben"}
          </h3>
          <div className="bg-white text-black text-lg p-1 rounded mb-4 h-8 break-all border-2 border-[hsl(var(--cocktail-primary))] overflow-auto">
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
                if (key.length === 1 && key.match(/[A-Za-z]/)) {
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
  )

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-black border-[hsl(var(--cocktail-card-border))] text-white w-[95vw] h-[95vh] max-w-none max-h-none overflow-hidden">
          {!showKeyboard ? renderFormView() : renderKeyboardView()}

          {!showKeyboard && (
            <DialogFooter className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleDeleteRequest} type="button">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Löschen
                </Button>
                <Button
                  onClick={handleHideCocktail}
                  disabled={hidingCocktail}
                  variant="outline"
                  className="bg-[hsl(var(--cocktail-card-bg))] text-[hsl(var(--cocktail-warning))] border-[hsl(var(--cocktail-card-border))] hover:bg-[hsl(var(--cocktail-card-border))]"
                  type="button"
                >
                  {hidingCocktail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird ausgeblendet...
                    </>
                  ) : (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Ausblenden
                    </>
                  )}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="bg-[hsl(var(--cocktail-card-bg))] text-white border-[hsl(var(--cocktail-card-border))] hover:bg-[hsl(var(--cocktail-card-border))]"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !name.trim() || recipe.length === 0}
                  className="bg-[#00ff00] text-black hover:bg-[#00cc00]"
                >
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
            </DialogFooter>
          )}
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
