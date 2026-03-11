"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { VirtualKeyboard } from "./virtual-keyboard"
import { Plus, Trash2 } from "lucide-react"

interface StandardSizeManagerProps {
  onSizesChange?: (sizes: number[]) => void
}

const StandardSizeManager = ({ onSizesChange }: StandardSizeManagerProps) => {
  const [standardSizes, setStandardSizes] = useState<number[]>([200, 300, 400])
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [activeInput, setActiveInput] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [newSize, setNewSize] = useState("")

  useEffect(() => {
    loadStandardSizes()
  }, [])

  const loadStandardSizes = async () => {
    try {
      const response = await fetch("/api/standard-sizes")
      const data = await response.json()
      setStandardSizes(data.standardSizes)
    } catch (error) {
      console.error("Error loading standard sizes:", error)
    }
  }

  const saveStandardSizes = async (sizes: number[]) => {
    try {
      await fetch("/api/standard-sizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ standardSizes: sizes }),
      })
      onSizesChange?.(sizes)
    } catch (error) {
      console.error("Error saving standard sizes:", error)
    }
  }

  const handleSizeChange = (index: number, value: string) => {
    const numValue = Number.parseInt(value)
    if (!isNaN(numValue) && numValue > 0) {
      const newSizes = [...standardSizes]
      newSizes[index] = numValue
      setStandardSizes(newSizes)
      saveStandardSizes(newSizes)
    }
  }

  const handleAddSize = () => {
    const numValue = Number.parseInt(newSize)
    if (!isNaN(numValue) && numValue > 0 && !standardSizes.includes(numValue)) {
      const newSizes = [...standardSizes, numValue].sort((a, b) => a - b)
      setStandardSizes(newSizes)
      saveStandardSizes(newSizes)
      setNewSize("")
    }
  }

  const handleRemoveSize = (index: number) => {
    if (standardSizes.length > 1) {
      const newSizes = standardSizes.filter((_, i) => i !== index)
      setStandardSizes(newSizes)
      saveStandardSizes(newSizes)
    }
  }

  const handleInputClick = (inputId: string, currentValue: string) => {
    setActiveInput(inputId)
    setInputValue(currentValue)
    setShowKeyboard(true)
  }

  const handleKeyboardInput = (value: string) => {
    setInputValue(value)
  }

  const handleKeyboardConfirm = () => {
    if (activeInput?.startsWith("size-")) {
      const index = Number.parseInt(activeInput.split("-")[1])
      handleSizeChange(index, inputValue)
    } else if (activeInput === "new-size") {
      setNewSize(inputValue)
    }
    setShowKeyboard(false)
    setActiveInput(null)
  }

  const handleKeyboardCancel = () => {
    setShowKeyboard(false)
    setActiveInput(null)
    setInputValue("")
  }

  return (
    <Card className="bg-[hsl(var(--cocktail-card-bg))] border-[hsl(var(--cocktail-card-border))]">
      <CardHeader>
        <CardTitle className="text-[hsl(var(--cocktail-text))]">Standard-Cocktailgrößen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {standardSizes.map((size, index) => (
            <div key={index} className="flex items-center gap-3">
              <Input
                value={size.toString()}
                readOnly
                onClick={() => handleInputClick(`size-${index}`, size.toString())}
                className="flex-1 bg-[hsl(var(--cocktail-bg))] border-[hsl(var(--cocktail-card-border))] text-[hsl(var(--cocktail-text))] cursor-pointer"
              />
              <span className="text-[hsl(var(--cocktail-text))] text-sm">ml</span>
              {standardSizes.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveSize(index)}
                  className="bg-red-600 hover:bg-red-700 border-red-600 text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-[hsl(var(--cocktail-card-border))]">
          <Input
            value={newSize}
            readOnly
            placeholder="Neue Größe hinzufügen"
            onClick={() => handleInputClick("new-size", newSize)}
            className="flex-1 bg-[hsl(var(--cocktail-bg))] border-[hsl(var(--cocktail-card-border))] text-[hsl(var(--cocktail-text))] cursor-pointer"
          />
          <span className="text-[hsl(var(--cocktail-text))] text-sm">ml</span>
          <Button
            onClick={handleAddSize}
            disabled={!newSize || isNaN(Number.parseInt(newSize)) || Number.parseInt(newSize) <= 0}
            className="bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary))]/80 text-black"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {showKeyboard && (
          <div className="mt-6">
            <VirtualKeyboard
              onChange={handleKeyboardInput}
              onConfirm={handleKeyboardConfirm}
              onCancel={handleKeyboardCancel}
              value={inputValue}
              layout="numeric"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { StandardSizeManager }
export default StandardSizeManager
