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

    // Prüfe, ob die Datei existiert
    if (fsSync!.existsSync(PUMP_CONFIG_PATH)) {
      // Lese die Datei
      const data = fsSync!.readFileSync(PUMP_CONFIG_PATH, "utf8")
      return JSON.parse(data)
    } else {
      // Wenn die Datei nicht existiert, lade die Standardkonfiguration
      const { pumpConfig } = await import("@/data/pump-config")

      // Speichere die Standardkonfiguration in der JSON-Datei
      fsSync!.mkdirSync(path!.dirname(PUMP_CONFIG_PATH), { recursive: true })
      fsSync!.writeFileSync(PUMP_CONFIG_PATH, JSON.stringify(pumpConfig, null, 2), "utf8")

      return pumpConfig
    }
  } catch (error) {
    console.error("Fehler beim Laden der Pumpenkonfiguration:", error)

    // Fallback: Lade die Standardkonfiguration
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

// Diese Funktion aktiviert eine Pumpe für eine bestimmte Zeit
async function activatePump(pin: number, durationMs: number) {
  try {
    const { fsSync, path, execPromise } = await getNodeModules()

    console.log(`[PUMP DEBUG] ==========================================`)
    console.log(`[PUMP DEBUG] Aktiviere Pumpe an GPIO Pin ${pin} für ${durationMs}ms`)
    console.log(`[PUMP DEBUG] Aktueller Arbeitsordner: ${process.cwd()}`)

    // Verwende das Python-Skript zur Steuerung der Pumpe
    const PUMP_CONTROL_SCRIPT = path!.join(process.cwd(), "pump_control.py")
    const roundedDuration = Math.round(durationMs)

    if (!fsSync!.existsSync(PUMP_CONTROL_SCRIPT)) {
      console.error(`[PUMP DEBUG] ❌ Python-Skript nicht gefunden: ${PUMP_CONTROL_SCRIPT}`)
      throw new Error(`Python-Skript nicht gefunden: ${PUMP_CONTROL_SCRIPT}`)
    }

    console.log(`[PUMP DEBUG] Python-Skript gefunden: ${PUMP_CONTROL_SCRIPT}`)

    const command = `python3 ${PUMP_CONTROL_SCRIPT} activate ${pin} ${roundedDuration}`
    console.log(`[PUMP DEBUG] Führe Befehl aus: ${command}`)

    const { stdout, stderr } = await execPromise(command)

    console.log(`[PUMP DEBUG] ✅ Befehl erfolgreich ausgeführt`)
    if (stdout) {
      console.log(`[PUMP DEBUG] Python stdout: ${stdout}`)
    }
    if (stderr) {
      console.log(`[PUMP DEBUG] Python stderr: ${stderr}`)
    }
    console.log(`[PUMP DEBUG] ==========================================`)

    return true
  } catch (error) {
    console.error(`[PUMP DEBUG] ❌ FEHLER beim Aktivieren der Pumpe an Pin ${pin}:`)
    console.error(`[PUMP DEBUG] Error message: ${error}`)
    if (error instanceof Error) {
      console.error(`[PUMP DEBUG] Error stack: ${error.stack}`)
    }
    console.error(`[PUMP DEBUG] ==========================================`)
    throw error
  }
}

// Hilfsfunktion: Finde alle Pumpen für eine Zutat, sortiert nach Priorität
function getPumpsForIngredient(ingredientId: string, pumpConfig: PumpConfig[]): PumpConfig[] {
  return pumpConfig
    .filter((p) => p.ingredient === ingredientId && p.enabled)
    .sort((a, b) => (a.priority || 999) - (b.priority || 999))
}

// Hilfsfunktion: Verteile die benötigte Menge auf mehrere Pumpen basierend auf Füllstand
async function distributeToPumps(
  ingredientId: string,
  amountNeeded: number,
  pumpConfig: PumpConfig[],
  ingredientLevels: Map<number, number>
): Promise<{ pumpId: number; pin: number; amount: number; flowRate: number }[]> {
  const pumps = getPumpsForIngredient(ingredientId, pumpConfig)
  
  if (pumps.length === 0) {
    console.error(`Keine Pumpe für Zutat ${ingredientId} konfiguriert!`)
    return []
  }

  const distribution: { pumpId: number; pin: number; amount: number; flowRate: number }[] = []
  let remainingAmount = amountNeeded

  for (const pump of pumps) {
    if (remainingAmount <= 0) break

    const currentLevel = ingredientLevels.get(pump.id) || 0
    
    if (currentLevel <= 0) {
      console.log(`[v0] Pumpe ${pump.id} (${pump.ingredient}) ist leer, überspringe...`)
      continue
    }

    const amountFromThisPump = Math.min(remainingAmount, currentLevel)
    
    distribution.push({
      pumpId: pump.id,
      pin: pump.pin,
      amount: amountFromThisPump,
      flowRate: pump.flowRate
    })

    console.log(`[v0] Pumpe ${pump.id} (Priorität ${pump.priority || 999}): ${amountFromThisPump}ml von ${currentLevel}ml verfügbar`)
    
    remainingAmount -= amountFromThisPump
  }

  if (remainingAmount > 0) {
    console.warn(`[v0] WARNUNG: ${remainingAmount}ml von ${ingredientId} konnten nicht verteilt werden!`)
  }

  return distribution
}

export async function makeCocktailAction(cocktail: Cocktail, pumpConfig: PumpConfig[], size = 300, ingredientLevelsData?: { pumpId: number; currentLevel: number }[]) {
  console.log(`Bereite Cocktail zu: ${cocktail.name} (${size}ml)`)

  // Erstelle eine Map der Füllstände für schnellen Zugriff
  const ingredientLevels = new Map<number, number>()
  if (ingredientLevelsData) {
    for (const level of ingredientLevelsData) {
      ingredientLevels.set(level.pumpId, level.currentLevel)
    }
  } else {
    // Fallback: Setze alle Pumpen auf "genug" wenn keine Levels übergeben werden
    for (const pump of pumpConfig) {
      ingredientLevels.set(pump.id, 10000)
    }
  }

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

  // Verarbeite sofortige Zutaten mit Multi-Pumpen-Unterstützung
  const immediatePumpPromises: Promise<void>[] = []
  
  for (const item of immediateItems) {
    const distribution = await distributeToPumps(
      item.ingredientId,
      item.amount,
      pumpConfig,
      ingredientLevels
    )

    for (const dist of distribution) {
      const pumpTimeMs = (dist.amount / dist.flowRate) * 1000
      
      console.log(`[v0] Sofort: Pumpe ${dist.pumpId}: ${dist.amount}ml für ${pumpTimeMs}ms aktivieren`)
      
      levelUpdates.push({ pumpId: dist.pumpId, amount: dist.amount })
      
      // Aktualisiere den lokalen Füllstand für weitere Berechnungen
      const currentLevel = ingredientLevels.get(dist.pumpId) || 0
      ingredientLevels.set(dist.pumpId, currentLevel - dist.amount)
      
      immediatePumpPromises.push(activatePump(dist.pin, pumpTimeMs).then(() => {}))
    }
  }

  // Warte, bis alle sofortigen Pumpen aktiviert wurden
  await Promise.all(immediatePumpPromises)

  if (delayedItems.length > 0) {
    console.log(`[v0] Warte 2 Sekunden vor dem Hinzufügen von ${delayedItems.length} verzögerten Zutaten...`)
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Füge verzögerte Zutaten mit Multi-Pumpen-Unterstützung hinzu
    for (const item of delayedItems) {
      const distribution = await distributeToPumps(
        item.ingredientId,
        item.amount,
        pumpConfig,
        ingredientLevels
      )

      for (const dist of distribution) {
        const pumpTimeMs = (dist.amount / dist.flowRate) * 1000
        
        console.log(`[v0] Verzögert: Pumpe ${dist.pumpId}: ${dist.amount}ml für ${pumpTimeMs}ms aktivieren`)
        
        levelUpdates.push({ pumpId: dist.pumpId, amount: dist.amount })
        
        // Aktualisiere den lokalen Füllstand
        const currentLevel = ingredientLevels.get(dist.pumpId) || 0
        ingredientLevels.set(dist.pumpId, currentLevel - dist.amount)
        
        await activatePump(dist.pin, pumpTimeMs)
      }
    }
  }

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

  // Aktiviere die Pumpe
  await activatePump(pump.pin, pumpTimeMs)

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
    console.log(`[CALIBRATE DEBUG] ==========================================`)
    console.log(`[CALIBRATE DEBUG] Kalibriere Pumpe ${pumpId} für ${durationMs}ms`)

    const pumpConfig = await getPumpConfig()
    const pump = pumpConfig.find((p) => p.id === pumpId)

    if (!pump) {
      console.error(`[CALIBRATE DEBUG] ❌ Pumpe mit ID ${pumpId} nicht gefunden`)
      console.error(
        `[CALIBRATE DEBUG] Verfügbare Pumpen: ${pumpConfig.map((p) => `ID:${p.id} GPIO:${p.pin}`).join(", ")}`,
      )
      throw new Error(`Pumpe mit ID ${pumpId} nicht gefunden`)
    }

    console.log(`[CALIBRATE DEBUG] Gefundene Pumpe: ID:${pump.id}, GPIO:${pump.pin}, Enabled:${pump.enabled}`)

    if (!pump.enabled) {
      console.warn(`[CALIBRATE DEBUG] ⚠️  Pumpe ${pumpId} ist deaktiviert (enabled: false)`)
    }

    const { fsSync, path, execPromise } = await getNodeModules()
    const PUMP_CONTROL_SCRIPT = path!.join(process.cwd(), "pump_control.py")
    const roundedDuration = Math.round(durationMs)

    if (!fsSync!.existsSync(PUMP_CONTROL_SCRIPT)) {
      console.error(`[CALIBRATE DEBUG] ❌ Python-Skript nicht gefunden: ${PUMP_CONTROL_SCRIPT}`)
      throw new Error(`Python-Skript nicht gefunden: ${PUMP_CONTROL_SCRIPT}`)
    }

    const command = `python3 ${PUMP_CONTROL_SCRIPT} activate ${pump.pin} ${roundedDuration}`
    console.log(`[CALIBRATE DEBUG] Führe Befehl aus: ${command}`)

    const { stdout, stderr } = await execPromise(command)

    if (stdout) {
      console.log(`[CALIBRATE DEBUG] Python stdout: ${stdout}`)
    }
    if (stderr) {
      console.log(`[CALIBRATE DEBUG] Python stderr: ${stderr}`)
    }

    console.log(`[CALIBRATE DEBUG] ✅ Pumpe ${pumpId} erfolgreich kalibriert`)
    console.log(`[CALIBRATE DEBUG] ==========================================`)

    return { success: true }
  } catch (error) {
    console.error(`[CALIBRATE DEBUG] ❌ FEHLER bei der Kalibrierung der Pumpe ${pumpId}:`)
    console.error(`[CALIBRATE DEBUG] Error message: ${error}`)
    if (error instanceof Error) {
      console.error(`[CALIBRATE DEBUG] Error stack: ${error.stack}`)
    }
    console.error(`[CALIBRATE DEBUG] ==========================================`)
    throw error
  }
}

export async function cleanPumpAction(pumpId: number, durationMs: number) {
  try {
    console.log(`Reinige Pumpe ${pumpId} für ${durationMs}ms`)

    // Finde die Pumpe in der Konfiguration
    const pumpConfig = await getPumpConfig()
    const pump = pumpConfig.find((p) => p.id === pumpId)

    if (!pump) {
      throw new Error(`Pumpe mit ID ${pumpId} nicht gefunden`)
    }

    // Aktiviere die Pumpe über das Python-Skript
    const { fsSync, path, execPromise } = await getNodeModules()
    const PUMP_CONTROL_SCRIPT = path!.join(process.cwd(), "pump_control.py")
    const roundedDuration = Math.round(durationMs)

    await execPromise(`python3 ${PUMP_CONTROL_SCRIPT} activate ${pump.pin} ${roundedDuration}`)

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

  console.log(`Gefundene Pumpe: ${pump.id} (GPIO ${pump.pin})`)
  await activatePump(pump.pin, durationMs)
  console.log(`Pumpe ${pump.id} deaktiviert.`)
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
    const PUMP_CONTROL_SCRIPT = path!.join(process.cwd(), "pump_control.py")
    const roundedDuration = Math.round(durationMs)

    await execPromise(`python3 ${PUMP_CONTROL_SCRIPT} activate ${pump.pin} ${roundedDuration}`)

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

  // Aktiviere die Pumpe
  await activatePump(pump.pin, pumpTimeMs)

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
