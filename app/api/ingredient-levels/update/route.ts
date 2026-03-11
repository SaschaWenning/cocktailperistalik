import { type NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

interface IngredientLevel {
  pumpId: number
  ingredient: string
  ingredientId: string
  currentLevel: number
  containerSize: number
  lastUpdated: string
}

const LEVELS_FILE = path.join(process.cwd(), "data", "ingredient-levels.json")

export async function POST(request: NextRequest) {
  try {
    const { ingredients } = await request.json()

    let ingredientLevels: IngredientLevel[] = []

    try {
      const data = await fs.readFile(LEVELS_FILE, "utf-8")
      ingredientLevels = JSON.parse(data)
    } catch (error) {
      // Initialize with default levels if file doesn't exist
      ingredientLevels = [
        {
          pumpId: 1,
          ingredient: "Vodka",
          ingredientId: "vodka",
          currentLevel: 100,
          containerSize: 1000,
          lastUpdated: new Date().toISOString(),
        },
        {
          pumpId: 2,
          ingredient: "Rum",
          ingredientId: "rum",
          currentLevel: 100,
          containerSize: 1000,
          lastUpdated: new Date().toISOString(),
        },
        {
          pumpId: 3,
          ingredient: "Gin",
          ingredientId: "gin",
          currentLevel: 100,
          containerSize: 1000,
          lastUpdated: new Date().toISOString(),
        },
        {
          pumpId: 4,
          ingredient: "Tequila",
          ingredientId: "tequila",
          currentLevel: 100,
          containerSize: 1000,
          lastUpdated: new Date().toISOString(),
        },
        {
          pumpId: 5,
          ingredient: "Whiskey",
          ingredientId: "whiskey",
          currentLevel: 100,
          containerSize: 1000,
          lastUpdated: new Date().toISOString(),
        },
        {
          pumpId: 6,
          ingredient: "Cointreau",
          ingredientId: "cointreau",
          currentLevel: 100,
          containerSize: 1000,
          lastUpdated: new Date().toISOString(),
        },
        {
          pumpId: 7,
          ingredient: "Peach Schnapps",
          ingredientId: "peach_schnapps",
          currentLevel: 100,
          containerSize: 1000,
          lastUpdated: new Date().toISOString(),
        },
        {
          pumpId: 8,
          ingredient: "Blue Curacao",
          ingredientId: "blue_curacao",
          currentLevel: 100,
          containerSize: 1000,
          lastUpdated: new Date().toISOString(),
        },
        {
          pumpId: 9,
          ingredient: "Grenadine",
          ingredientId: "grenadine",
          currentLevel: 100,
          containerSize: 1000,
          lastUpdated: new Date().toISOString(),
        },
        {
          pumpId: 10,
          ingredient: "Lime Juice",
          ingredientId: "lime_juice",
          currentLevel: 100,
          containerSize: 1000,
          lastUpdated: new Date().toISOString(),
        },
        {
          pumpId: 11,
          ingredient: "Lemon Juice",
          ingredientId: "lemon_juice",
          currentLevel: 100,
          containerSize: 1000,
          lastUpdated: new Date().toISOString(),
        },
        {
          pumpId: 12,
          ingredient: "Simple Syrup",
          ingredientId: "simple_syrup",
          currentLevel: 100,
          containerSize: 1000,
          lastUpdated: new Date().toISOString(),
        },
        {
          pumpId: 13,
          ingredient: "Cranberry Juice",
          ingredientId: "cranberry_juice",
          currentLevel: 100,
          containerSize: 1000,
          lastUpdated: new Date().toISOString(),
        },
        {
          pumpId: 14,
          ingredient: "Pineapple Juice",
          ingredientId: "pineapple_juice",
          currentLevel: 100,
          containerSize: 1000,
          lastUpdated: new Date().toISOString(),
        },
        {
          pumpId: 15,
          ingredient: "Orange Juice",
          ingredientId: "orange_juice",
          currentLevel: 100,
          containerSize: 1000,
          lastUpdated: new Date().toISOString(),
        },
        {
          pumpId: 16,
          ingredient: "Coconut Cream",
          ingredientId: "coconut_cream",
          currentLevel: 100,
          containerSize: 1000,
          lastUpdated: new Date().toISOString(),
        },
        {
          pumpId: 17,
          ingredient: "Amaretto",
          ingredientId: "amaretto",
          currentLevel: 100,
          containerSize: 1000,
          lastUpdated: new Date().toISOString(),
        },
        {
          pumpId: 18,
          ingredient: "Kahlua",
          ingredientId: "kahlua",
          currentLevel: 100,
          containerSize: 1000,
          lastUpdated: new Date().toISOString(),
        },
      ]
    }

    // Aktualisiere die Levels
    for (const ingredient of ingredients) {
      const levelIndex = ingredientLevels.findIndex((l) => l.pumpId === ingredient.pumpId)
      if (levelIndex !== -1) {
        ingredientLevels[levelIndex].currentLevel = Math.max(
          0,
          ingredientLevels[levelIndex].currentLevel - ingredient.amount,
        )
        ingredientLevels[levelIndex].lastUpdated = new Date().toISOString()
      }
    }

    await fs.mkdir(path.dirname(LEVELS_FILE), { recursive: true })
    await fs.writeFile(LEVELS_FILE, JSON.stringify(ingredientLevels, null, 2))

    return NextResponse.json({
      success: true,
      levels: ingredientLevels.map((level) => ({
        pumpId: level.pumpId,
        ingredient: level.ingredient,
        ingredientId: level.ingredientId,
        currentLevel: level.currentLevel,
        containerSize: level.containerSize,
        lastUpdated: new Date(level.lastUpdated),
      })),
    })
  } catch (error) {
    console.error("Error updating ingredient levels:", error)
    return NextResponse.json({ error: "Failed to update levels" }, { status: 500 })
  }
}
