"use server"

import type { Cocktail } from "@/types/cocktail"
import type { PumpConfig } from "@/types/pump"

// Check if we're in a Node.js environment
function isNodeEnvironment(): boolean {
  return (
    typeof process !== "undefined" &&
    process.versions != null &&
    process.versions.node != null &&
    typeof window === "undefined"
  )
}

let fs: typeof import("fs/promises") | null = null
let fsSync: typeof import("fs") | null = null
let path: typeof import("path") | null = null
let execPromise: any = null

// Lazy loading für Node.js Module nur auf dem Server
async function getNodeModules() {
  if (!isNodeEnvironment()) {
    throw new Error("Node.js modules not available in browser")
  }

  if (!fs) {
    try {
      fsSync = require("fs")
      fs = require("fs/promises")
      path = require("path")
      const { exec } = require("child_process")
      const { promisify } = require("util")
      execPromise = promisify(exec)
    } catch (error) {
      console.error("[v0] Failed to load Node.js modules:", error)
      throw new Error("Failed to load Node.js modules")
    }
  }

  return { fs, fsSync, path, execPromise }
}

// Pfad zur JSON-Datei für die Pumpenkonfiguration
const getPumpConfigPath = () => {
  if (!isNodeEnvironment() || !path) return ""
  return path.join(process.cwd(), "data", "pump-config.json")
}

const getCocktailsPath = () => {
  if (!isNodeEnvironment() || !path) return ""
  return path.join(process.cwd(), "data", "cocktails.json")
}

// Funktion zum Laden der Pumpenkonfiguration
export async function getPumpConfig(): Promise<PumpConfig[]> {
  try {
    if (!isNodeEnvironment()) {
      console.log("[v0] Not in Node environment, returning default config")
      const { pumpConfig } = await import("@/data/pump-config")
      return pumpConfig
    }

    const { fsSync, path } = await getNodeModules()
    const PUMP_CONFIG_PATH = getPumpConfigPath()

    if (fsSync!.existsSync(PUMP_CONFIG_PATH)) {
      const data = fsSync!.readFileSync(PUMP_CONFIG_PATH, "utf8")
      const loaded: PumpConfig[] = JSON.parse(data)
      // Migration: fehlende Felder mit Defaults auffüllen
      const migrated = loaded.map((p) => ({
        speed: 100,
        antiDripMl: 0.5,
        ...p,
      }))
      return migrated
    } else {
      const { pumpConfig } = await import("@/data/pump-config")
      fsSync!.mkdirSync(path!.dirname(PUMP_CONFIG_PATH), { recursive: true })
      fsSync!.writeFileSync(PUMP_CONFIG_PATH, JSON.stringify(pumpConfig, null, 2), "utf8")
      return pumpConfig
    }
  } catch (error) {
    console.error("Fehler beim Laden der Pumpenkonfiguration:", error)
    const { pumpConfig } = await import("@/data/pump-config")
    return pumpConfig
  }
}

// Funktion zum Speichern der Pumpen-Konfiguration
export async function savePumpConfig(pumpConfig: PumpConfig[]) {
  try {
    if (!isNodeEnvironment()) {
      throw new Error("Cannot save config in browser environment")
    }

    const { fsSync, path } = await getNodeModules()
    const PUMP_CONFIG_PATH = getPumpConfigPath()

    console.log("Speichere Pumpen-Konfiguration:", pumpConfig)

    // Stelle sicher, dass das Verzeichnis existiert
    fsSync!.mkdirSync(path!.dirname(PUMP_CONFIG_PATH), { recursive: true })

    // Speichere die Konfiguration in der JSON-Datei
    fsSync!.writeFileSync(PUMP_CONFIG_PATH, JSON.stringify(pumpConfig, null, 2), "utf8")

    console.log("Pumpen-Konfiguration erfolgreich gespeichert")
    return { success: true }
  } catch (error) {
    console.error("Fehler beim Speichern der Pumpen-Konfiguration:", error)
    throw error
  }
}

export async function getAllCocktails(): Promise<Cocktail[]> {
  try {
    console.log("[v0] Loading cocktails from getAllCocktails...")

    if (!isNodeEnvironment()) {
      console.log("[v0] Not in Node environment, returning default cocktails")
      const { cocktails } = await import("@/data/cocktails")
      return cocktails
    }

    const { fsSync, path } = await getNodeModules()
    const COCKTAILS_PATH = getCocktailsPath()

    // Stelle sicher, dass das data Verzeichnis existiert
    const dataDir = path!.dirname(COCKTAILS_PATH)
    if (!fsSync!.existsSync(dataDir)) {
      console.log("[v0] Creating data directory:", dataDir)
      fsSync!.mkdirSync(dataDir, { recursive: true })
    }

    // Prüfe, ob die Cocktails-Datei existiert
    if (fsSync!.existsSync(COCKTAILS_PATH)) {
      console.log("[v0] Loading cocktails from:", COCKTAILS_PATH)
      const data = fsSync!.readFileSync(COCKTAILS_PATH, "utf8")
      const cocktails: Cocktail[] = JSON.parse(data)
      console.log("[v0] Total cocktails loaded:", cocktails.length)
      return cocktails
    } else {
      // Erstelle die Datei mit Standard-Cocktails
      console.log("[v0] No cocktails file found, creating with default cocktails")
      const { cocktails: defaultCocktails } = await import("@/data/cocktails")

      // Aktualisiere Rum zu Brauner Rum in den Standard-Cocktails
      const updatedCocktails = defaultCocktails.map((cocktail) => ({
        ...cocktail,
        ingredients: cocktail.ingredients.map((ingredient) =>
          ingredient.includes("Rum") && !ingredient.includes("Brauner Rum")
            ? ingredient.replace("Rum", "Brauner Rum")
            : ingredient,
        ),
      }))

      fsSync!.writeFileSync(COCKTAILS_PATH, JSON.stringify(updatedCocktails, null, 2), "utf8")
      console.log("[v0] Created cocktails file with", updatedCocktails.length, "default cocktails")
      return updatedCocktails
    }
  } catch (error) {
    console.error("[v0] Error in getAllCocktails:", error)

    // Fallback: Lade nur die Standard-Cocktails
    try {
      const { cocktails } = await import("@/data/cocktails")
      console.log("[v0] Fallback: returning default cocktails only:", cocktails.length)
      return cocktails
    } catch (fallbackError) {
      console.error("[v0] Even fallback failed:", fallbackError)
      return []
    }
  }
}

export async function saveRecipe(cocktail: Cocktail) {
  try {
    const { fsSync, path } = await getNodeModules()
    const COCKTAILS_PATH = getCocktailsPath()

    console.log("Speichere Rezept:", cocktail)

    // Stelle sicher, dass das Verzeichnis existiert
    fsSync!.mkdirSync(path!.dirname(COCKTAILS_PATH), { recursive: true })

    // Lade alle bestehenden Cocktails
    let allCocktails: Cocktail[] = []
    if (fsSync!.existsSync(COCKTAILS_PATH)) {
      const data = fsSync!.readFileSync(COCKTAILS_PATH, "utf8")
      allCocktails = JSON.parse(data)
    } else {
      // Falls die Datei nicht existiert, lade Standard-Cocktails
      const { cocktails: defaultCocktails } = await import("@/data/cocktails")
      allCocktails = defaultCocktails.map((c) => ({
        ...c,
        ingredients: c.ingredients.map((ingredient) =>
          ingredient.includes("Rum") && !ingredient.includes("Brauner Rum")
            ? ingredient.replace("Rum", "Brauner Rum")
            : ingredient,
        ),
      }))
    }

    // Prüfe, ob der Cocktail bereits existiert
    const index = allCocktails.findIndex((c) => c.id === cocktail.id)

    if (index !== -1) {
      // Aktualisiere den bestehenden Cocktail
      allCocktails[index] = cocktail
      console.log("Cocktail aktualisiert:", cocktail.id)
    } else {
      // Füge den neuen Cocktail hinzu
      allCocktails.push(cocktail)
      console.log("Neuer Cocktail hinzugefügt:", cocktail.id)
    }

    // Speichere alle Cocktails zurück in die Datei
    fsSync!.writeFileSync(COCKTAILS_PATH, JSON.stringify(allCocktails, null, 2), "utf8")

    console.log("Rezept erfolgreich gespeichert. Total cocktails:", allCocktails.length)
    return { success: true }
  } catch (error) {
    console.error("Fehler beim Speichern des Rezepts:", error)
    throw error
  }
}

export async function deleteRecipe(cocktailId: string) {
  try {
    const { fsSync, path } = await getNodeModules()
    const COCKTAILS_PATH = getCocktailsPath()

    console.log("[v0] Deleting cocktail from file:", cocktailId)

    // Lade alle bestehenden Cocktails
    let allCocktails: Cocktail[] = []
    if (fsSync!.existsSync(COCKTAILS_PATH)) {
      const data = fsSync!.readFileSync(COCKTAILS_PATH, "utf8")
      allCocktails = JSON.parse(data)
    } else {
      // Falls die Datei nicht existiert, lade Standard-Cocktails
      const { cocktails: defaultCocktails } = await import("@/data/cocktails")
      allCocktails = defaultCocktails.map((c) => ({
        ...c,
        ingredients: c.ingredients.map((ingredient) =>
          ingredient.includes("Rum") && !ingredient.includes("Brauner Rum")
            ? ingredient.replace("Rum", "Brauner Rum")
            : ingredient,
        ),
      }))
    }

    // Finde und entferne den Cocktail
    const initialLength = allCocktails.length
    allCocktails = allCocktails.filter((c) => c.id !== cocktailId)

    if (allCocktails.length === initialLength) {
      console.log("[v0] Cocktail not found in file:", cocktailId)
      return { success: false, message: "Cocktail not found" }
    }

    // Speichere die aktualisierte Liste zurück in die Datei
    fsSync!.writeFileSync(COCKTAILS_PATH, JSON.stringify(allCocktails, null, 2), "utf8")

    console.log("[v0] Cocktail successfully deleted from file. Remaining cocktails:", allCocktails.length)
    return { success: true, message: `Cocktail ${cocktailId} deleted successfully` }
  } catch (error) {
    console.error("[v0] Error deleting cocktail from file:", error)
    throw error
  }
}

// Anti-Tropf: verwendete Pumpen kurz rückwärts laufen lassen
async function runAntiDrip(usedPumps: PumpConfig[]): Promise<void> {
  if (usedPumps.length === 0) return
  // 2000 ms Pause damit Pumpen mechanisch vollständig gestoppt sind vor Richtungsumkehr
  await new Promise((resolve) => setTimeout(resolve, 2000))
  await Promise.all(
    usedPumps.map((pump) => {
      const antiDripMl = pump.antiDripMl ?? 0.5
      if (antiDripMl <= 0) return Promise.resolve()
      const durationMs = (antiDripMl / pump.flowRate) * 1000
      return activatePump(pump.id, durationMs, "reverse", pump.speed ?? 100)
    }),
  )
}

// Diese Funktion aktiviert eine Pumpe für eine bestimmte Zeit
async function activatePump(
  pumpId: number,
  durationMs: number,
  direction: "forward" | "reverse" = "forward",
  speedPercent = 100,
) {
  try {
    const { fsSync, path, execPromise } = await getNodeModules()

    const PUMP_CONTROL_SCRIPT = path!.join(process.cwd(), "pump_control_i2c.py")
    const roundedDuration = Math.round(durationMs)

    if (!fsSync!.existsSync(PUMP_CONTROL_SCRIPT)) {
      throw new Error(`I2C Python-Skript nicht gefunden: ${PUMP_CONTROL_SCRIPT}`)
    }

    // python3 pump_control_i2c.py activate <pump_id> <duration_ms> <direction> <speed_%>
    const command = `python3 ${PUMP_CONTROL_SCRIPT} activate ${pumpId} ${roundedDuration} ${direction} ${speedPercent}`

    const { stdout, stderr } = await execPromise(command)

    if (stderr && !stderr.includes("Warning") && !stderr.includes("DeprecationWarning")) {
      console.error(`[PUMP] Python stderr (Pumpe ${pumpId}): ${stderr}`)
    }
    if (stdout) {
      try {
        const result = JSON.parse(stdout.trim())
        if (!result.success) {
          throw new Error(`Python-Fehler Pumpe ${pumpId}: ${result.error || "Unbekannt"}`)
        }
      } catch (parseErr) {
        // stdout war kein JSON – nur loggen, kein throw
        if (stdout.toLowerCase().includes("error") || stdout.toLowerCase().includes("traceback")) {
          throw new Error(`Python-Skript Fehler (Pumpe ${pumpId}): ${stdout.trim()}`)
        }
      }
    }

    return true
  } catch (error) {
    console.error(`[PUMP] Fehler beim Aktivieren von Pumpe ${pumpId}:`, error)
    throw error
  }
}

export async function makeCocktailAction(cocktail: Cocktail, pumpConfig: PumpConfig[], size = 300) {
  console.log(`Bereite Cocktail zu: ${cocktail.name} (${size}ml)`)

  // Skaliere das Rezept auf die gewünschte Größe
  const currentTotal = cocktail.recipe.reduce((total, item) => total + item.amount, 0)
  const scaleFactor = currentTotal === 0 ? 1 : size / currentTotal
  const scaledRecipe = cocktail.recipe.map((item) => ({
    ...item,
    amount: Math.round(item.amount * scaleFactor),
  }))

  const delayedItems = scaledRecipe.filter((item) => item.delayed === true)
  const immediateItems = scaledRecipe.filter((item) => item.delayed !== true)

  console.log(`[v0] Sofortige Zutaten: ${immediateItems.length}, Verzögerte Zutaten: ${delayedItems.length}`)

  // Sammle Pumpen-Updates für Level-Reduktion
  const levelUpdates: { pumpId: number; amount: number }[] = []

  // Sofortige Pumpen gestaffelt starten (200 ms Verzögerung pro Pumpe) um Spannungsabfall zu vermeiden
  const immediatePumpPromises = immediateItems.map((item, index) => {
    const pump = pumpConfig.find((p) => p.ingredient === item.ingredientId)

    if (!pump) {
      console.error(`Keine Pumpe für Zutat ${item.ingredientId} konfiguriert!`)
      return Promise.resolve()
    }

    const pumpTimeMs = (item.amount / pump.flowRate) * 1000
    const startDelayMs = index * 200

    levelUpdates.push({ pumpId: pump.id, amount: item.amount })

    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        activatePump(pump.id, pumpTimeMs, "forward", pump.speed ?? 100)
          .then(() => resolve())
          .catch(reject)
      }, startDelayMs)
    })
  })

  // Warte, bis alle sofortigen Pumpen aktiviert wurden
  await Promise.all(immediatePumpPromises)

  if (delayedItems.length > 0) {
    console.log(`[v0] Warte 2 Sekunden vor dem Hinzufügen von ${delayedItems.length} verzögerten Zutaten...`)
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Verzögerte Pumpen ebenfalls gestaffelt starten (200 ms pro Pumpe)
    const delayedPumpPromises = delayedItems.map((item, index) => {
      const pump = pumpConfig.find((p) => p.ingredient === item.ingredientId)

      if (!pump) {
        console.error(`Keine Pumpe für Zutat ${item.ingredientId} konfiguriert!`)
        return Promise.resolve()
      }

      const pumpTimeMs = (item.amount / pump.flowRate) * 1000
      const startDelayMs = index * 200

      levelUpdates.push({ pumpId: pump.id, amount: item.amount })

      return new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          activatePump(pump.id, pumpTimeMs, "forward", pump.speed ?? 100)
            .then(() => resolve())
            .catch(reject)
        }, startDelayMs)
      })
    })

    await Promise.all(delayedPumpPromises)
  }

  // Anti-Tropf: alle verwendeten Pumpen kurz rückwärts
  const usedPumps = levelUpdates
    .map((u) => pumpConfig.find((p) => p.id === u.pumpId))
    .filter((p): p is PumpConfig => p !== undefined)
  await runAntiDrip(usedPumps)

  // Aktualisiere die Füllstände über API
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/ingredient-levels/update`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: levelUpdates }),
      },
    )

    if (response.ok) {
      const data = await response.json()
      console.log("[v0] Füllstände erfolgreich aktualisiert:", data.levels?.length || 0, "Levels")
    } else {
      console.error("Fehler beim Aktualisieren der Füllstände:", response.statusText)
    }
  } catch (error) {
    console.error("Error updating levels:", error)
  }

  // Return ingredient usage data so client can save statistics
  return {
    success: true,
    ingredientUsage: levelUpdates.map((update) => {
      const pump = pumpConfig.find((p) => p.id === update.pumpId)
      return {
        ingredientId: pump?.ingredient || `pump-${update.pumpId}`,
        amount: update.amount,
      }
    }),
  }
}

export async function makeSingleShotAction(ingredientId: string, amount = 40, pumpConfig: PumpConfig[]) {
  console.log(`Bereite Shot zu: ${ingredientId} (${amount}ml)`)

  // Finde die Pumpe für diese Zutat
  const pump = pumpConfig.find((p) => p.ingredient === ingredientId)

  if (!pump) {
    throw new Error(`Keine Pumpe für Zutat ${ingredientId} konfiguriert!`)
  }

  // Berechne, wie lange die Pumpe laufen muss
  const pumpTimeMs = (amount / pump.flowRate) * 1000

  console.log(`Pumpe ${pump.id} (${pump.ingredient}): ${amount}ml für ${pumpTimeMs}ms aktivieren`)

  await activatePump(pump.id, pumpTimeMs, "forward", pump.speed ?? 100)
  await runAntiDrip([pump])

  // Aktualisiere den Füllstand über API
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/ingredient-levels/update`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: [{ pumpId: pump.id, amount }] }),
      },
    )

    if (response.ok) {
      const data = await response.json()
      console.log("[v0] Füllstände erfolgreich aktualisiert:", data.levels?.length || 0, "Levels")
    } else {
      console.error("Fehler beim Aktualisieren der Füllstände:", response.statusText)
    }
  } catch (error) {
    console.error("Error updating levels:", error)
  }

  return { success: true }
}

export async function calibratePumpAction(pumpId: number, durationMs: number) {
  try {
    const pumpConfig = await getPumpConfig()
    const pump = pumpConfig.find((p) => p.id === pumpId)

    if (!pump) {
      throw new Error(`Pumpe mit ID ${pumpId} nicht gefunden`)
    }

    // Kalibrierung läuft immer mit der konfigurierten Pumpengeschwindigkeit
    await activatePump(pump.id, durationMs, "forward", pump.speed ?? 100)

    return { success: true }
  } catch (error) {
    console.error(`Fehler bei der Kalibrierung von Pumpe ${pumpId}:`, error)
    throw error
  }
}

// Schlauch-Entleerungs-Funktion: 4 Pumpen gleichzeitig rückwärts, in 4 Gruppen
export async function drainTubesAction(): Promise<{ success: boolean; message: string }> {
  const DRAIN_DURATION_MS = 10000
  const DRAIN_SPEED = 100
  const PAUSE_BETWEEN_GROUPS_MS = 2000

  const groups = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
  ]

  const pumpConfig = await getPumpConfig()

  for (let g = 0; g < groups.length; g++) {
    const group = groups[g]
    // Alle 4 Pumpen der Gruppe gleichzeitig rückwärts starten
    await Promise.all(
      group.map((pumpId) => {
        const pump = pumpConfig.find((p) => p.id === pumpId)
        if (!pump || !pump.enabled) return Promise.resolve()
        return activatePump(pump.id, DRAIN_DURATION_MS, "reverse", DRAIN_SPEED)
      }),
    )
    // Pause zwischen Gruppen (außer nach der letzten)
    if (g < groups.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_GROUPS_MS))
    }
  }

  return { success: true, message: "Alle Schläuche wurden entleert." }
}

export async function cleanPumpAction(pumpId: number, durationMs: number, reverse = false) {
  try {
    console.log(`Reinige Pumpe ${pumpId} für ${durationMs}ms ${reverse ? "(RÜCKWÄRTS)" : "(VORWÄRTS)"}`)

    // Finde die Pumpe in der Konfiguration
    const pumpConfig = await getPumpConfig()
    const pump = pumpConfig.find((p) => p.id === pumpId)

    if (!pump) {
      throw new Error(`Pumpe mit ID ${pumpId} nicht gefunden`)
    }

    const direction = reverse ? "reverse" : "forward"
    await activatePump(pump.id, durationMs, direction, 100)

    console.log(`Pumpe ${pumpId} erfolgreich gereinigt`)

    return { success: true }
  } catch (error) {
    console.error(`Fehler bei der Reinigung der Pumpe ${pumpId}:`, error)
    throw error
  }
}

export async function activatePumpForDurationAction(
  pumpId: string,
  durationMs: number,
  pumpConfig: PumpConfig[],
): Promise<void> {
  console.log(`Aktiviere Pumpe mit ID: ${pumpId} für ${durationMs}ms`)
  const pump = pumpConfig.find((p) => p.id.toString() === pumpId)
  if (!pump) {
    throw new Error(`Pumpe mit ID "${pumpId}" nicht gefunden.`)
  }

  await activatePump(pump.id, durationMs, "forward", 100)
}

export async function ventPumpAction(pumpId: number, durationMs: number) {
  try {
    const pumpConfig = await getPumpConfig()
    const pump = pumpConfig.find((p) => p.id === pumpId)

    if (!pump) {
      throw new Error(`Pumpe mit ID ${pumpId} nicht gefunden`)
    }

    // Aktiviere die Pumpe über das Python-Skript
    const { fsSync, path, execPromise } = await getNodeModules()
    const PUMP_CONTROL_SCRIPT = path!.join(process.cwd(), "pump_control_i2c.py")
    const roundedDuration = Math.round(durationMs)

    await execPromise(`python3 ${PUMP_CONTROL_SCRIPT} activate ${pump.id} ${roundedDuration} 'forward' 100`)

    console.log(`Pumpe ${pumpId} erfolgreich entlüftet`)

    return { success: true }
  } catch (error) {
    console.error(`Fehler beim Entlüften der Pumpe ${pumpId}:`, error)
    throw error
  }
}

export async function makeShotAction(ingredient: string, pumpConfig: PumpConfig[], size = 40) {
  console.log(`Bereite Shot zu: ${ingredient} (${size}ml)`)

  // Finde die Pumpe für diese Zutat
  const pump = pumpConfig.find((p) => p.ingredient === ingredient)

  if (!pump) {
    throw new Error(`Keine Pumpe für Zutat ${ingredient} konfiguriert!`)
  }

  // Berechne, wie lange die Pumpe laufen muss
  const pumpTimeMs = (size / pump.flowRate) * 1000

  console.log(`Pumpe ${pump.id} (${pump.ingredient}): ${size}ml für ${pumpTimeMs}ms aktivieren`)

  await activatePump(pump.id, pumpTimeMs, "forward", 100)
  await runAntiDrip([pump])

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/ingredient-levels/update`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: [{ pumpId: pump.id, amount: size }] }),
      },
    )
    if (!response.ok) {
      console.error("Failed to update levels after shot:", response.statusText)
    } else {
      const data = await response.json()
      console.log("[v0] Füllstände erfolgreich aktualisiert:", data.levels?.length || 0, "Levels")
    }
  } catch (error) {
    console.error("Error updating levels after shot:", error)
  }

  return {
    success: true,
    ingredientUsage: [
      {
        ingredientId: ingredient,
        amount: size,
      },
    ],
  }
}
