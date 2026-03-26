"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import LowLevelWarning from "@/components/low-level-warning"
import type { Cocktail } from "@/types/cocktail"
import { getIngredientLevels } from "@/lib/ingredient-level-service"
import { getPumpConfig } from "@/lib/cocktail-machine"
import { getAllIngredients } from "@/lib/ingredients"
import type { IngredientLevel } from "@/types/ingredient-level"
import type { PumpConfig } from "@/types/pump"

interface CocktailCardProps {
  cocktail: Cocktail
  onClick: () => void
  onEdit?: (id: string) => void
}

export default function CocktailCard({ cocktail, onClick, onEdit }: CocktailCardProps) {
  const [imageSrc, setImageSrc] = useState<string>("")
  const [imageLoaded, setImageLoaded] = useState<boolean>(false)
  const [ingredientLevels, setIngredientLevels] = useState<IngredientLevel[]>([])
  const [pumpConfig, setPumpConfig] = useState<PumpConfig[]>([])
  const [allIngredientsData, setAllIngredientsData] = useState<any[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const loadData = async () => {
    try {
      console.log("[v0] CocktailCard: Loading fresh data...")
      const [levels, config, ingredients] = await Promise.all([
        getIngredientLevels(),
        getPumpConfig(),
        getAllIngredients(),
      ])
      setIngredientLevels(levels)
      setPumpConfig(config)
      setAllIngredientsData(ingredients)
      console.log("[v0] CocktailCard: Data loaded successfully")
    } catch (error) {
      console.error("[v0] Error loading data for availability check:", error)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      console.log("[v0] CocktailCard: Auto-refreshing data...")
      loadData()
      setRefreshTrigger((prev) => prev + 1)
    }, 5000) // Alle 5 Sekunden aktualisieren

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleRefresh = () => {
      console.log("[v0] CocktailCard: Manual refresh triggered")
      loadData()
      setRefreshTrigger((prev) => prev + 1)
    }

    window.addEventListener("cocktail-data-refresh", handleRefresh)

    return () => {
      window.removeEventListener("cocktail-data-refresh", handleRefresh)
    }
  }, [])

  const availability = useMemo(() => {
    if (!pumpConfig || !ingredientLevels || !allIngredientsData) {
      console.log("[v0] CocktailCard: Missing data for availability check")
      return { canMake: true, lowIngredients: [], missingIngredients: [] }
    }

    console.log(`[v0] CocktailCard: Checking availability for ${cocktail.name}`)
    console.log(
      "[v0] CocktailCard: Current ingredient levels:",
      ingredientLevels.map((l) => ({ pumpId: l.pumpId, level: l.currentLevel })),
    )

    const selectedSize = 300 // Standard-Größe für die Prüfung
    const totalRecipeVolume = cocktail.recipe.reduce((total, item) => total + item.amount, 0)
    const scaleFactor = selectedSize / totalRecipeVolume
    const missingIngredients: Array<{ ingredient: string; needed: number; available: number }> = []
    const lowIngredients: string[] = []

    const ingredientLookup = allIngredientsData.reduce(
      (acc, ingredient) => {
        acc[ingredient.id] = { name: ingredient.name }
        return acc
      },
      {} as Record<string, { name: string }>,
    )

    for (const recipeItem of cocktail.recipe) {
      if (recipeItem.type === "manual" || recipeItem.manual === true) {
        console.log(`[v0] CocktailCard: Skipping manual ingredient ${recipeItem.ingredientId}`)
        continue
      }

      const requiredAmount = Math.round(recipeItem.amount * scaleFactor)
      const pump = pumpConfig.find((p) => p.ingredient === recipeItem.ingredientId && p.enabled)

      console.log(`[v0] CocktailCard: Checking ingredient ${recipeItem.ingredientId}, required: ${requiredAmount}ml`)

      if (!pump) {
        const ingredient = ingredientLookup[recipeItem.ingredientId]
        console.log(`[v0] CocktailCard: No pump found for ingredient ${recipeItem.ingredientId}`)
        missingIngredients.push({
          ingredient: ingredient?.name || recipeItem.ingredientId,
          needed: requiredAmount,
          available: 0,
        })
        continue
      }

      const level = ingredientLevels.find((l) => l.pumpId === pump.id)
      const availableAmount = level?.currentLevel || 0

      console.log(`[v0] CocktailCard: Pump ${pump.id}, available: ${availableAmount}ml, required: ${requiredAmount}ml`)

      if (availableAmount < requiredAmount) {
        const ingredient = ingredientLookup[recipeItem.ingredientId]
        console.log(
          `[v0] CocktailCard: Insufficient ${ingredient?.name || recipeItem.ingredientId}: ${availableAmount}ml < ${requiredAmount}ml`,
        )
        missingIngredients.push({
          ingredient: ingredient?.name || recipeItem.ingredientId,
          needed: requiredAmount,
          available: availableAmount,
        })
      } else if (availableAmount < 100) {
        console.log(`[v0] CocktailCard: Low level for ${recipeItem.ingredientId}: ${availableAmount}ml`)
        lowIngredients.push(recipeItem.ingredientId)
      }
    }

    const canMake = missingIngredients.length === 0

    console.log(`[v0] CocktailCard availability result for ${cocktail.name}:`, {
      canMake,
      lowIngredients: lowIngredients.length,
      missingIngredients: missingIngredients.length,
      refreshTrigger,
    })

    return {
      canMake,
      lowIngredients,
      missingIngredients,
    }
  }, [cocktail, pumpConfig, ingredientLevels, allIngredientsData, refreshTrigger])

  useEffect(() => {
    const loadImage = async () => {
      const imagePath = await findImagePath(cocktail)
      setImageSrc(imagePath)
      setImageLoaded(true)
    }

    loadImage()
  }, [cocktail])

  const handleImageError = () => {
    console.log(`[v0] ❌ Final image error for ${cocktail.name}: ${imageSrc}`)
    const placeholder = `/placeholder.svg?height=300&width=300&query=${encodeURIComponent(cocktail.name)}`
    setImageSrc(placeholder)
  }

  const handleImageLoad = () => {
    console.log(`[v0] ✅ Image loaded successfully for ${cocktail.name}: ${imageSrc}`)
  }

  const findImagePath = async (cocktail: Cocktail): Promise<string> => {
    if (!cocktail.image) {
      return `/placeholder.svg?height=300&width=300&query=${encodeURIComponent(cocktail.name)}`
    }

    const filename = cocktail.image.split("/").pop() || cocktail.image
    const filenameWithoutExt = filename.replace(/\.[^/.]+$/, "")
    const originalExt = filename.split(".").pop()?.toLowerCase() || ""

    const imageExtensions = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg"]

    const extensionsToTry = originalExt
      ? [originalExt, ...imageExtensions.filter((ext) => ext !== originalExt)]
      : imageExtensions

    const basePaths = ["/images/cocktails/", "/", "", "/public/images/cocktails/", "/public/"]

    const strategies: string[] = []

    for (const basePath of basePaths) {
      for (const ext of extensionsToTry) {
        strategies.push(`${basePath}${filenameWithoutExt}.${ext}`)
      }
      strategies.push(`${basePath}${filename}`)
    }

    strategies.push(
      cocktail.image,
      cocktail.image.startsWith("/") ? cocktail.image.substring(1) : cocktail.image,
      cocktail.image.startsWith("/") ? cocktail.image : `/${cocktail.image}`,
      `/api/image?path=${encodeURIComponent(`/home/pi/cocktailbot/cocktailbot-main/public/images/cocktails/${filename}`)}`,
      `/api/image?path=${encodeURIComponent(`/home/pi/cocktailbot/cocktailbot-main/public/${filename}`)}`,
    )

    console.log(`[v0] Testing ${strategies.length} image strategies for ${cocktail.name}:`, strategies.slice(0, 5))

    const uniqueStrategies = Array.from(new Set(strategies))

    for (let i = 0; i < uniqueStrategies.length; i++) {
      const testPath = uniqueStrategies[i]

      try {
        const img = new Image()
        img.crossOrigin = "anonymous"

        const loadPromise = new Promise<boolean>((resolve) => {
          img.onload = () => resolve(true)
          img.onerror = () => resolve(false)
        })

        img.src = testPath
        const success = await loadPromise

        if (success) {
          console.log(`[v0] ✅ Found working image for ${cocktail.name}: ${testPath}`)
          return testPath
        }
      } catch (error) {}
    }

    console.log(`[v0] ❌ No working image found for ${cocktail.name}, using placeholder`)
    return `/placeholder.svg?height=300&width=300&query=${encodeURIComponent(cocktail.name)}`
  }

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
          onLoad={handleImageLoad}
          crossOrigin="anonymous"
          key={`${cocktail.image}-${imageSrc}`}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <LowLevelWarning availability={availability} />

        <Badge className="absolute top-3 right-3 bg-[hsl(var(--cocktail-primary))] text-black font-medium shadow-lg">
          {cocktail.alcoholic ? "Alkoholisch" : "Alkoholfrei"}
        </Badge>

        {process.env.NODE_ENV === "development" && (
          <div className="absolute bottom-2 left-2 text-xs bg-black/70 text-white p-1 rounded">
            {imageLoaded ? "✅" : "🔄"}
          </div>
        )}
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
