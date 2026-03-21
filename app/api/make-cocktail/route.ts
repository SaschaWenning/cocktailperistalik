import { makeCocktailAction } from "@/lib/cocktail-machine-server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { cocktail, pumpConfig, size, ingredientLevels } = await request.json()

    // Verwende die ursprüngliche Server Action für Raspberry Pi
    // ingredientLevels wird für die Multi-Pumpen-Verteilung benötigt
    const result = await makeCocktailAction(cocktail, pumpConfig, size, ingredientLevels)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error making cocktail:", error)
    return NextResponse.json({ success: false, error: "Failed to make cocktail" }, { status: 500 })
  }
}
