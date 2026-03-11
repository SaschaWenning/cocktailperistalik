"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Check, ArrowLeft } from "lucide-react"

interface SimpleKeyboardProps {
  isOpen: boolean
  title: string
  value: string
  onValueChange: (value: string) => void
  onConfirm: () => void
  onCancel: () => void
  layout: "alphanumeric" | "numeric"
  placeholder?: string
}

export default function SimpleKeyboard({
  isOpen,
  title,
  value,
  onValueChange,
  onConfirm,
  onCancel,
  layout,
  placeholder = "",
}: SimpleKeyboardProps) {
  if (!isOpen) return null

  const alphanumericKeys = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Y", "X", "C", "V", "B", "N", "M"],
    [" ", "-", "_", ".", "@", "#", "&"],
  ]

  const numericKeys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "00"],
  ]

  const currentKeys = layout === "numeric" ? numericKeys : alphanumericKeys

  const handleKeyPress = (key: string) => {
    if (layout === "numeric") {
      if (key === "." && value.includes(".")) return
      if (key === "00" && value === "") {
        onValueChange("0")
        return
      }
      if (isNaN(Number(key)) && key !== "." && key !== "00") return
    }
    onValueChange(value + key)
  }

  const handleBackspace = () => {
    onValueChange(value.slice(0, -1))
  }

  const handleClear = () => {
    onValueChange("")
  }

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[99999]">
      <div className="w-full max-w-lg p-4 flex flex-col">
        <div className="bg-black border border-[hsl(var(--cocktail-card-border))] rounded-lg p-4 mb-4">
          <Label className="text-white mb-2 block">{title}</Label>
          <Input
            value={value}
            readOnly
            className="bg-white border-[hsl(var(--cocktail-card-border))] text-black text-center text-lg"
            placeholder={placeholder}
          />
        </div>

        <div className="bg-black border border-[hsl(var(--cocktail-card-border))] rounded-lg p-2 shadow-lg w-full">
          <div className="space-y-1">
            {currentKeys.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-1">
                {row.map((key) => (
                  <Button
                    key={key}
                    onClick={() => handleKeyPress(key)}
                    className="flex-1 h-10 text-base bg-[hsl(var(--cocktail-card-bg))] text-white hover:bg-[hsl(var(--cocktail-card-border))]"
                  >
                    {key}
                  </Button>
                ))}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-1 mt-2">
            <Button onClick={handleBackspace} className="flex-1 h-10 text-base bg-red-600 text-white hover:bg-red-700">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              onClick={handleClear}
              className="flex-1 h-10 text-base bg-yellow-600 text-white hover:bg-yellow-700"
            >
              <X className="h-5 w-5" />
            </Button>
            <Button onClick={onCancel} className="flex-1 h-10 text-base bg-gray-600 text-white hover:bg-gray-700">
              Abbrechen
            </Button>
            <Button onClick={onConfirm} className="flex-1 h-10 text-base bg-green-600 text-white hover:bg-green-700">
              <Check className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
