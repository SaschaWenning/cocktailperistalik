"use client"

import { Button } from "@/components/ui/button"
import { X, ArrowLeft } from "lucide-react"

interface VirtualKeyboardProps {
  layout?: "alphanumeric" | "numeric"
  value?: string
  onChange?: (value: string) => void
  onConfirm?: () => void
  onCancel?: () => void
  title?: string
  // Legacy props for backward compatibility
  onKeyPress?: (key: string) => void
  onBackspace?: () => void
  onClear?: () => void
}

export function VirtualKeyboard({
  layout = "alphanumeric",
  value = "",
  onChange,
  onConfirm,
  onCancel,
  title,
  onKeyPress,
  onBackspace,
  onClear,
}: VirtualKeyboardProps) {
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
    if (onChange) {
      onChange(value + key)
    }
    if (onKeyPress) {
      onKeyPress(key)
    }
  }

  const handleBackspace = () => {
    if (onChange) {
      onChange(value.slice(0, -1))
    }
    if (onBackspace) {
      onBackspace()
    }
  }

  const handleClear = () => {
    if (onChange) {
      onChange("")
    }
    if (onClear) {
      onClear()
    }
  }

  return (
    <div className="bg-black border border-[hsl(var(--cocktail-card-border))] rounded-lg p-4 shadow-lg max-w-sm mx-auto">
      {title && (
        <div className="text-center mb-4">
          <h3 className="text-white text-lg font-medium mb-2">{title}</h3>
          <div className="text-green-400 text-2xl font-bold">{value || "0"} ml</div>
        </div>
      )}

      <div className="keyboard-main space-y-1">
        {currentKeys.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1">
            {row.map((key) => (
              <Button
                key={key}
                onClick={() => handleKeyPress(key)}
                className="flex-1 h-8 text-sm bg-[hsl(var(--cocktail-card-bg))] text-white hover:bg-[hsl(var(--cocktail-card-border))]"
              >
                {key}
              </Button>
            ))}
          </div>
        ))}
      </div>
      <div className="keyboard-controls flex justify-center gap-1 mt-2">
        <Button onClick={handleBackspace} className="flex-1 h-8 text-sm bg-red-600 text-white hover:bg-red-700">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button onClick={handleClear} className="flex-1 h-8 text-sm bg-yellow-600 text-white hover:bg-yellow-700">
          <X className="h-4 w-4" />
        </Button>
        {onCancel && (
          <Button onClick={onCancel} className="flex-1 h-8 text-sm bg-gray-600 text-white hover:bg-gray-700">
            Abbrechen
          </Button>
        )}
        {onConfirm && (
          <Button onClick={onConfirm} className="flex-1 h-8 text-sm bg-green-600 text-white hover:bg-green-700">
            ✓
          </Button>
        )}
      </div>
    </div>
  )
}

export default VirtualKeyboard
