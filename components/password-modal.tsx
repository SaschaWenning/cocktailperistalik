"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock } from "lucide-react"
import AlphaKeyboard from "./alpha-keyboard"

interface PasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function PasswordModal({ isOpen, onClose, onSuccess }: PasswordModalProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState(false)
  const [showKeyboard, setShowKeyboard] = useState(true)
  const [customPassword, setCustomPassword] = useState("")

  useEffect(() => {
    if (isOpen) {
      setPassword("")
      setError(false)
      setShowKeyboard(true)

      try {
        const savedPassword = localStorage.getItem("customPassword")
        setCustomPassword(savedPassword || "")
      } catch (error) {
        console.error("Fehler beim Laden des benutzerdefinierten Passworts:", error)
      }
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (password === "cocktail" || (customPassword && password === customPassword)) {
      setError(false)
      setPassword("")
      onSuccess()
    } else {
      setError(true)
    }
  }

  const handleKeyPress = (key: string) => {
    setPassword((prev) => prev + key)
    setError(false)
  }

  const handleBackspace = () => {
    setPassword((prev) => prev.slice(0, -1))
    setError(false)
  }

  const handleClear = () => {
    setPassword("")
    setError(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-[hsl(var(--cocktail-card-border))] text-[hsl(var(--cocktail-text))] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Passwort erforderlich
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Bitte gib das Passwort ein, um Rezepte zu bearbeiten:</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`bg-[hsl(var(--cocktail-bg))] border-[hsl(var(--cocktail-card-border))] ${error ? "border-[hsl(var(--cocktail-error))]" : ""}`}
              placeholder="Passwort eingeben"
              autoComplete="off"
              readOnly
              onFocus={() => setShowKeyboard(true)}
            />
            {error && (
              <p className="text-[hsl(var(--cocktail-error))] text-sm">Falsches Passwort. Bitte versuche es erneut.</p>
            )}
          </div>

          {showKeyboard && (
            <div className="mt-2">
              <AlphaKeyboard
                onKeyPress={handleKeyPress}
                onBackspace={handleBackspace}
                onClear={handleClear}
                onConfirm={handleSubmit}
                onCancel={onClose}
              />
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
