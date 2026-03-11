// Service für LED-Beleuchtungssteuerung während Cocktail-Zubereitung

interface LightingConfig {
  cocktailPreparation: {
    color: string
    blinking: boolean
  }
  cocktailFinished: {
    color: string
    blinking: boolean
  }
  idleMode: {
    scheme: string
    colors: string[]
  }
}

let currentConfig: LightingConfig | null = null

export async function loadLightingConfig(): Promise<LightingConfig> {
  if (currentConfig) {
    return currentConfig
  }

  try {
    const response = await fetch("/api/lighting-config")
    if (response.ok) {
      currentConfig = await response.json()
      return currentConfig!
    }
  } catch (error) {
    console.error("[v0] Error loading lighting config:", error)
  }

  // Fallback to default config
  currentConfig = {
    cocktailPreparation: {
      color: "#00ff00",
      blinking: false,
    },
    cocktailFinished: {
      color: "#0000ff",
      blinking: true,
    },
    idleMode: {
      scheme: "rainbow",
      colors: ["#ff0000", "#00ff00", "#0000ff"],
    },
  }

  return currentConfig
}

export async function setLightingMode(mode: "preparation" | "finished" | "idle") {
  try {
    const config = await loadLightingConfig()

    let lightingParams: { color?: string; blinking?: boolean } = {}

    switch (mode) {
      case "preparation":
        lightingParams = {
          color: config.cocktailPreparation.color,
          blinking: config.cocktailPreparation.blinking,
        }
        break
      case "finished":
        lightingParams = {
          color: config.cocktailFinished.color,
          blinking: config.cocktailFinished.blinking,
        }
        break
      case "idle":
        // Idle mode uses scheme-based lighting
        break
    }

    await fetch("/api/lighting-control", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode,
        ...lightingParams,
      }),
    })

    console.log("[v0] Lighting mode set to:", mode, lightingParams)
  } catch (error) {
    console.error("[v0] Error setting lighting mode:", error)
  }
}

// Invalidate cache when config changes
export function invalidateLightingConfig() {
  currentConfig = null
}
