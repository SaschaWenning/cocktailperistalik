"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import LowLevelWarning from "@/components/low-level-warning"
import type { Cocktail } from "@/types/cocktail"
import type { IngredientLevel } from "@/types/ingredient-level"
import type { PumpConfig } from "@/types/pump"

interface CocktailCardProps {
  cocktail: Cocktail
  onClick: () => void
  onEdit?: (id: string) => void
  ingredientLevels: IngredientLevel[]
  pumpConfig: PumpConfig[]
  allIngredients: any[]
}

export default function CocktailCard({
  cocktail,
  onClick,
  onEdit,
  ingredientLevels,
  pumpConfig,
  allIngredients,
}: CocktailCardProps) {
  const placeholder = `/placeholder.svg?height=300&width=300&query=${encodeURIComponent(cocktail.name)}`
  const [imageSrc, setImageSrc] = useState<string>(placeholder)

  // Bildpfad direkt berechnen ohne async Tests (die auf dem Server nicht funktionieren)
  useEffect(() => {
    if (!cocktail.image) {
      setImageSrc(placeholder)
      return
    }
    
    let imagePath = cocktail.image
    
    // Absoluten Dateisystempfad in Web-Pfad umwandeln
    // z.B. /home/pi/cocktailbot/cocktailbot-main/public/images/cocktails/big_john.jpg
    // wird zu /images/cocktails/big_john.jpg
    if (imagePath.includes("/public/")) {
      imagePath = imagePath.split("/public")[1]
    } else if (imagePath.startsWith("/home/")) {
      // Falls kein /public/ im Pfad, nur den Dateinamen extrahieren
      const filename = imagePath.split("/").pop() || imagePath
      imagePath = `/images/cocktails/${filename}`
    } else if (!imagePath.startsWith("/") && !imagePath.startsWith("http")) {
      // Relativer Pfad - mit / beginnen
      imagePath = `/${imagePath}`
    }
    
    // Falls der Pfad immer noch nicht /images/ enthält, zu /images/cocktails/ hinzufügen
    if (!imagePath.includes("/images/") && !imagePath.startsWith("http")) {
      const filename = imagePath.split("/").pop() || imagePath
      imagePath = `/images/cocktails/${filename}`
    }
    
    setImageSrc(imagePath)
  }, [cocktail.id, cocktail.image, placeholder])

  const handleImageError = () => {
    // Bei Fehler: Placeholder verwenden
    if (imageSrc !== placeholder) {
      setImageSrc(placeholder)
    }
  }

  const availability = useMemo(() => {
    if (!pumpConfig.length || !ingredientLevels.length || !allIngredients.length) {
      return { canMake: true, lowIngredients: [], missingIngredients: [] }
    }

    const selectedSize = 200
    const totalRecipeVolume = cocktail.recipe.reduce((total, item) => total + item.amount, 0)
    const scaleFactor = totalRecipeVolume > 0 ? selectedSize / totalRecipeVolume : 1
    const missingIngredients: Array<{ ingredient: string; needed: number; available: number }> = []
    const lowIngredients: string[] = []

    const ingredientLookup = allIngredients.reduce(
      (acc, ingredient) => {
        acc[ingredient.id] = { name: ingredient.name }
        return acc
      },
      {} as Record<string, { name: string }>,
    )

    for (const recipeItem of cocktail.recipe) {
      if (recipeItem.type === "manual" || recipeItem.manual === true) continue

      const requiredAmount = Math.round(recipeItem.amount * scaleFactor)
      const pump = pumpConfig.find((p) => p.ingredient === recipeItem.ingredientId && p.enabled)

      if (!pump) {
        const ingredient = ingredientLookup[recipeItem.ingredientId]
        missingIngredients.push({
          ingredient: ingredient?.name || recipeItem.ingredientId,
          needed: requiredAmount,
          available: 0,
        })
        continue
      }

      const level = ingredientLevels.find((l) => l.pumpId === pump.id)
      const availableAmount = level?.currentLevel || 0

      if (availableAmount < requiredAmount) {
        const ingredient = ingredientLookup[recipeItem.ingredientId]
        missingIngredients.push({
          ingredient: ingredient?.name || recipeItem.ingredientId,
          needed: requiredAmount,
          available: availableAmount,
        })
      } else if (availableAmount < 100) {
        lowIngredients.push(recipeItem.ingredientId)
      }
    }

    return {
      canMake: missingIngredients.length === 0,
      lowIngredients,
      missingIngredients,
    }
  }, [cocktail, pumpConfig, ingredientLevels, allIngredients])

  return (
    <Card
      className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer bg-black border-[hsl(var(--cocktail-card-border))] hover:border-[hsl(var(--cocktail-primary))]/50"
      onClick={onClick}
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={imageSrc || "/placeholder.svg"}
          alt={cocktail.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          onError={handleImageError}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <LowLevelWarning availability={availability} />

        <Badge className="absolute top-3 right-3 bg-[hsl(var(--cocktail-primary))] text-black font-medium shadow-lg">
          {cocktail.alcoholic ? "Alkoholisch" : "Alkoholfrei"}
        </Badge>
      </div>

      <CardContent className="p-4">
        <div className="space-y-2">
          <h3 className="font-bold text-lg text-[hsl(var(--cocktail-text))] line-clamp-1 group-hover:text-[hsl(var(--cocktail-primary))] transition-colors duration-200">
            {cocktail.name}
          </h3>
          <p className="text-sm text-[hsl(var(--cocktail-text-muted))] line-clamp-2 leading-relaxed">
            {cocktail.description}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
