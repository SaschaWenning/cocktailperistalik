import { type LightingConfig, defaultConfig } from "./lighting-config-types"
import { promises as fs } from "fs"
import path from "path"

export type { LightingConfig }
export { defaultConfig }

const LIGHTING_CONFIG_PATH = path.join(process.cwd(), "data", "lighting-config.json")

// In-memory cache
let cachedConfig: LightingConfig | null = null

function isNodeEnvironment(): boolean {
  return typeof process !== "undefined" && process.versions != null && process.versions.node != null
}

export async function loadLightingConfig(): Promise<LightingConfig> {
  if (!isNodeEnvironment()) {
    console.log("[v0] Not in Node environment, returning default config")
    return defaultConfig
  }

  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig
  }

  try {
    const data = await fs.readFile(LIGHTING_CONFIG_PATH, "utf-8")
    cachedConfig = JSON.parse(data)
    console.log("[v0] Loaded lighting config from file:", LIGHTING_CONFIG_PATH)
    return cachedConfig!
  } catch (error: any) {
    if (error.code === "ENOENT") {
      console.log("[v0] No lighting config file found, using default config")
      // Save default config to file
      await saveLightingConfig(defaultConfig)
      return defaultConfig
    }
    console.error("[v0] Error loading lighting config:", error)
    return defaultConfig
  }
}

export async function saveLightingConfig(config: LightingConfig): Promise<void> {
  if (!isNodeEnvironment()) {
    console.log("[v0] Not in Node environment, cannot save to file")
    return
  }

  try {
    // Ensure data directory exists
    await fs.mkdir(path.dirname(LIGHTING_CONFIG_PATH), { recursive: true })
    
    // Write config to file
    await fs.writeFile(LIGHTING_CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
    
    // Update cache
    cachedConfig = config
    
    console.log("[v0] Lighting config saved to file:", LIGHTING_CONFIG_PATH)
  } catch (error) {
    console.error("[v0] Error saving lighting config:", error)
    throw error
  }
}

export async function hexToRgb(hex: string): Promise<{ r: number; g: number; b: number } | null> {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null
}
