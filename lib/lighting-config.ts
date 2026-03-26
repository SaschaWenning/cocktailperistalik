import { type LightingConfig, defaultConfig } from "./lighting-config-types"

export type { LightingConfig }
export { defaultConfig }

// In-memory storage (simulating localStorage on server)
let storedConfig: LightingConfig = defaultConfig

export async function loadLightingConfig(): Promise<LightingConfig> {
  try {
    // For server-side, we return the stored config
    return storedConfig
  } catch (error) {
    console.error("[v0] Error loading lighting config:", error)
  }
  return defaultConfig
}

export async function saveLightingConfig(config: LightingConfig): Promise<void> {
  try {
    storedConfig = config
    console.log("[v0] Lighting config saved successfully")
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
