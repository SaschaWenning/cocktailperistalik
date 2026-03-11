"use client"

export interface IngredientLevel {
  pumpId: number
  ingredient: string
  ingredientId: string
  currentLevel: number
  containerSize: number
  lastUpdated: Date
}

const STORAGE_KEY = "cocktail-ingredient-levels"

// Default levels for all 18 pumps
const getDefaultLevels = (): IngredientLevel[] => {
  return Array.from({ length: 18 }, (_, i) => ({
    pumpId: i + 1,
    ingredient: `Zutat ${i + 1}`,
    ingredientId: `ingredient-${i + 1}`,
    currentLevel: 1000,
    containerSize: 1000,
    lastUpdated: new Date(),
  }))
}

const LEVELS_UPDATED_EVENT = "ingredient-levels:updated"
function emitLevelsUpdated() {
  if (typeof window !== "undefined") {
    console.log("[v0] Emitting ingredient levels updated event")
    window.dispatchEvent(new CustomEvent(LEVELS_UPDATED_EVENT))
  }
}

export function onIngredientLevelsUpdated(cb: () => void) {
  if (typeof window === "undefined") return () => {}
  const handler = () => {
    console.log("[v0] Ingredient levels updated event received")
    cb()
  }
  window.addEventListener(LEVELS_UPDATED_EVENT, handler)
  return () => window.removeEventListener(LEVELS_UPDATED_EVENT, handler)
}

// Load levels from localStorage with fallback to defaults
export const getIngredientLevels = (): IngredientLevel[] => {
  if (typeof window === "undefined") return getDefaultLevels()

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const levels = JSON.parse(stored)
      console.log("[v0] Loaded ingredient levels from localStorage:", levels.length, "levels")
      // Ensure we have all 18 pumps
      const defaults = getDefaultLevels()
      const merged = defaults.map((defaultLevel) => {
        const existing = levels.find((l: IngredientLevel) => l.pumpId === defaultLevel.pumpId)
        return existing ? { ...existing, lastUpdated: new Date(existing.lastUpdated) } : defaultLevel
      })
      return merged
    }
  } catch (error) {
    console.error("Error loading ingredient levels from localStorage:", error)
  }

  console.log("[v0] Using default ingredient levels")
  return getDefaultLevels()
}

// Save levels to localStorage and API
export const saveIngredientLevels = async (levels: IngredientLevel[]): Promise<void> => {
  try {
    console.log(
      "[v0] Saving ingredient levels:",
      levels.map((l) => `Pump ${l.pumpId}: ${l.currentLevel}ml`),
    )
    // Save to localStorage immediately
    localStorage.setItem(STORAGE_KEY, JSON.stringify(levels))
    emitLevelsUpdated()

    // Save to server via API
    try {
      const response = await fetch("/api/ingredient-levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ levels }),
      })

      if (response.ok) {
        console.log("[v0] Successfully saved levels to server")
      } else {
        console.warn("Could not save to server, using localStorage only:", response.statusText)
      }
    } catch (apiError) {
      console.warn("Could not save to server, using localStorage only:", apiError)
    }
  } catch (error) {
    console.error("Error saving ingredient levels:", error)
    throw error
  }
}

// Update level for a specific pump
export const updateIngredientLevel = async (pumpId: number, newLevel: number): Promise<void> => {
  const levels = getIngredientLevels()
  const levelIndex = levels.findIndex((l) => l.pumpId === pumpId)

  if (levelIndex !== -1) {
    levels[levelIndex].currentLevel = Math.max(0, newLevel)
    levels[levelIndex].lastUpdated = new Date()
    await saveIngredientLevels(levels)
  }
}

// Update container size for a specific pump
export const updateContainerSize = async (pumpId: number, newSize: number): Promise<void> => {
  const levels = getIngredientLevels()
  const levelIndex = levels.findIndex((l) => l.pumpId === pumpId)

  if (levelIndex !== -1) {
    levels[levelIndex].containerSize = Math.max(100, newSize)
    levels[levelIndex].lastUpdated = new Date()
    await saveIngredientLevels(levels)
  }
}

// Update ingredient name for a specific pump
export const updateIngredientName = async (pumpId: number, newName: string): Promise<void> => {
  const levels = getIngredientLevels()
  const levelIndex = levels.findIndex((l) => l.pumpId === pumpId)

  if (levelIndex !== -1) {
    levels[levelIndex].ingredient = newName || `Zutat ${pumpId}`
    levels[levelIndex].ingredientId = newName || `ingredient-${pumpId}`
    levels[levelIndex].lastUpdated = new Date()
    await saveIngredientLevels(levels)
  }
}

// Reduce level after cocktail making
export const updateLevelsAfterCocktail = async (ingredients: { pumpId: number; amount: number }[]): Promise<void> => {
  console.log("[v0] Updating levels after cocktail:", ingredients)
  const levels = getIngredientLevels()
  let updated = false

  for (const ingredient of ingredients) {
    const levelIndex = levels.findIndex((l) => l.pumpId === ingredient.pumpId)
    if (levelIndex !== -1) {
      const oldLevel = levels[levelIndex].currentLevel
      levels[levelIndex].currentLevel = Math.max(0, levels[levelIndex].currentLevel - ingredient.amount)
      levels[levelIndex].lastUpdated = new Date()
      console.log(
        `[v0] Pump ${ingredient.pumpId}: ${oldLevel}ml -> ${levels[levelIndex].currentLevel}ml (used ${ingredient.amount}ml)`,
      )
      updated = true
    }
  }

  if (updated) {
    await saveIngredientLevels(levels)
    console.log("[v0] Levels updated and saved after cocktail")
  } else {
    console.log("[v0] No levels were updated")
  }
}

// Reduce level after single shot
export const updateLevelAfterShot = async (pumpId: number, amount: number): Promise<void> => {
  await updateLevelsAfterCocktail([{ pumpId, amount }])
}

// Reset all levels to full
export const resetAllLevels = async (): Promise<void> => {
  const levels = getIngredientLevels()
  const resetLevels = levels.map((level) => ({
    ...level,
    currentLevel: level.containerSize,
    lastUpdated: new Date(),
  }))
  await saveIngredientLevels(resetLevels)
}

// Update ingredient capacity for a specific pump
export const updateIngredientCapacity = async (pumpId: number, newCapacity: number): Promise<void> => {
  await updateContainerSize(pumpId, newCapacity)
}

// Refill all ingredients to full capacity
export const refillAllIngredients = async (): Promise<void> => {
  await resetAllLevels()
}

// Set levels from external source (API load)
export const setIngredientLevels = async (newLevels: IngredientLevel[]): Promise<void> => {
  await saveIngredientLevels(newLevels)
}

export async function restoreIngredientLevelsFromFile(): Promise<IngredientLevel[]> {
  const res = await fetch("/api/load-from-file", { method: "POST" })
  if (!res.ok) throw new Error("Restore fehlgeschlagen")
  const { levels } = (await res.json()) as { levels: IngredientLevel[] }
  await setIngredientLevels(levels)
  return levels
}

// Clear cache (for compatibility)
export const resetCache = (): void => {
  // No cache to reset in this implementation
}

export const syncLevelsWithPumpConfig = async (pumpConfig: any[]): Promise<void> => {
  console.log("[v0] Syncing levels with pump config:", pumpConfig.length, "pumps")
  const levels = getIngredientLevels()
  let updated = false

  for (const pump of pumpConfig) {
    const levelIndex = levels.findIndex((l) => l.pumpId === pump.id)
    if (levelIndex !== -1) {
      // Update ingredientId from pump config
      if (levels[levelIndex].ingredientId !== pump.ingredient) {
        console.log(
          `[v0] Updating pump ${pump.id} ingredient: ${levels[levelIndex].ingredientId} -> ${pump.ingredient}`,
        )
        levels[levelIndex].ingredientId = pump.ingredient
        levels[levelIndex].ingredient = pump.ingredient.replace(/^custom-\d+-/, "")
        updated = true
      }
    }
  }

  if (updated) {
    await saveIngredientLevels(levels)
    console.log("[v0] Levels synced with pump config")
  }
}
