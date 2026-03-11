"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, ArrowLeft, Check } from "lucide-react"

interface BasicKeyboardProps {
  initialValue: string
  onSubmit: (value: string) => void
  onCancel: () => void
  isNumeric?: boolean
}

export default function BasicKeyboard({ initialValue, onSubmit, onCancel, isNumeric = false }: BasicKeyboardProps) {
  const [value, setValue] = useState(initialValue || "")

  const handleKeyPress = (key: string) => {
    if (isNumeric) {
      // Für numerische Eingaben
      if (key === "." && value.includes(".")) return
      if (key === "00" && value === "") {
        setValue("0")
        return
      }
    }
    setValue((prev) => prev + key)
  }

  const handleBackspace = () => {
    setValue((prev) => prev.slice(0, -1))
  }

  const handleClear = () => {
    setValue("")
  }

  const handleSubmit = () => {
    onSubmit(value)
  }

  // Tastaturen definieren
  const alphaKeys = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Y", "X", "C", "V", "B", "N", "M"],
    [" ", "-", "_", ".", "/"],
  ]

  const numericKeys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["0", "00", "."],
  ]

  const keys = isNumeric ? numericKeys : alphaKeys

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[9999]">
      <div className="w-full max-w-md bg-black border border-gray-700 rounded-lg p-4 mb-4">
        <div className="bg-white text-black text-xl p-2 rounded mb-4 min-h-[40px] break-all">
          {value || <span className="text-gray-400">Eingabe...</span>}
        </div>

        <div className="grid gap-2">
          {keys.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1 justify-center">
              {row.map((key) => (
                <Button
                  key={key}
                  type="button"
                  onClick={() => handleKeyPress(key)}
                  className="flex-1 h-12 text-lg bg-gray-700 hover:bg-gray-600"
                >
                  {key}
                </Button>
              ))}
            </div>
          ))}

          <div className="flex gap-1 mt-2">
            <Button
              type="button"
              onClick={handleBackspace}
              className="flex-1 h-12 bg-red-700 hover:bg-red-600 text-white"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <Button
              type="button"
              onClick={handleClear}
              className="flex-1 h-12 bg-yellow-700 hover:bg-yellow-600 text-white"
            >
              <X className="h-6 w-6" />
            </Button>
            <Button type="button" onClick={onCancel} className="flex-1 h-12 bg-gray-700 hover:bg-gray-600 text-white">
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex-1 h-12 bg-green-700 hover:bg-green-600 text-white"
            >
              <Check className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
