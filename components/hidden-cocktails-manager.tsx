"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import type { Cocktail } from "@/types/cocktail"

interface HiddenCocktailsManagerProps {
  onClose: () => void
}

export default function HiddenCocktailsManager({ onClose }: HiddenCocktailsManagerProps) {
  const [hiddenCocktails, setHiddenCocktails] = useState<string[]>([])
  const [allCocktails, setAllCocktails] = useState<Cocktail[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load hidden cocktails
      const hiddenResponse = await fetch("/api/hidden-cocktails")
      const hiddenData = await hiddenResponse.json()
      setHiddenCocktails(hiddenData.hiddenCocktails || [])

      // Load all cocktails
      const cocktailsResponse = await fetch("/api/cocktails")
      const cocktailsData = await cocktailsResponse.json()
      setAllCocktails(cocktailsData || [])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleShowCocktail = async (cocktailId: string) => {
    try {
      setUpdating(cocktailId)

      // Remove from hidden list
      const updatedHiddenCocktails = hiddenCocktails.filter((id) => id !== cocktailId)

      // Update API
      await fetch("/api/hidden-cocktails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hiddenCocktails: updatedHiddenCocktails }),
      })

      setHiddenCocktails(updatedHiddenCocktails)

      window.dispatchEvent(new CustomEvent("hidden-cocktails-changed"))
    } catch (error) {
      console.error("Error showing cocktail:", error)
    } finally {
      setUpdating(null)
    }
  }

  const getHiddenCocktailsWithDetails = () => {
    return hiddenCocktails
      .map((id) => allCocktails.find((cocktail) => cocktail.id === id))
      .filter(Boolean) as Cocktail[]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--cocktail-primary))]" />
        <span className="ml-2 text-[hsl(var(--cocktail-text))]">Lade ausgeblendete Cocktails...</span>
      </div>
    )
  }

  const hiddenCocktailsWithDetails = getHiddenCocktailsWithDetails()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-[hsl(var(--cocktail-text))]">Ausgeblendete Cocktails verwalten</h3>
      </div>

      {hiddenCocktailsWithDetails.length === 0 ? (
        <Card className="bg-[hsl(var(--cocktail-card-bg))] border-[hsl(var(--cocktail-card-border))]">
          <CardContent className="py-12 text-center">
            <EyeOff className="h-12 w-12 mx-auto mb-4 text-[hsl(var(--cocktail-text-muted))]" />
            <p className="text-[hsl(var(--cocktail-text-muted))] text-lg">Keine ausgeblendeten Cocktails vorhanden</p>
            <p className="text-[hsl(var(--cocktail-text-muted))] text-sm mt-2">
              Cocktails können über den Bearbeiten-Modus ausgeblendet werden
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hiddenCocktailsWithDetails.map((cocktail) => (
            <Card
              key={cocktail.id}
              className="bg-[hsl(var(--cocktail-card-bg))] border-[hsl(var(--cocktail-card-border))]"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-[hsl(var(--cocktail-text))] text-lg flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-[hsl(var(--cocktail-warning))]" />
                  {cocktail.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[hsl(var(--cocktail-text-muted))] text-sm">
                  {cocktail.description || "Keine Beschreibung"}
                </p>
                <div className="flex items-center gap-2 text-xs text-[hsl(var(--cocktail-text-muted))]">
                  <span
                    className={`px-2 py-1 rounded ${
                      cocktail.alcoholic ? "bg-red-900/30 text-red-300" : "bg-green-900/30 text-green-300"
                    }`}
                  >
                    {cocktail.alcoholic ? "Mit Alkohol" : "Alkoholfrei"}
                  </span>
                  <span>{cocktail.recipe.length} Zutaten</span>
                </div>
                <Button
                  onClick={() => handleShowCocktail(cocktail.id)}
                  disabled={updating === cocktail.id}
                  className="w-full bg-[hsl(var(--cocktail-primary))] text-black hover:bg-[hsl(var(--cocktail-primary-hover))]"
                >
                  {updating === cocktail.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird eingeblendet...
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Wieder einblenden
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
