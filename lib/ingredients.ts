import { ingredients as defaultIngredients } from "@/data/ingredients"
import type { Ingredient } from "@/types/pump"

export function getAllIngredients(): Ingredient[] {
  try {
    if (typeof window === "undefined") {
      return defaultIngredients
    }

    const customIngredients = localStorage.getItem("customIngredients")
    const custom: Ingredient[] = customIngredients ? JSON.parse(customIngredients) : []
    return [...defaultIngredients, ...custom]
  } catch (error) {
    console.error("Fehler beim Laden der Zutaten:", error)
    return defaultIngredients
  }
}

export function getIngredientById(id: string): Ingredient | undefined {
  return getAllIngredients().find((ingredient) => ingredient.id === id)
}
