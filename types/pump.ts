export interface PumpConfig {
  id: number
  ingredient: string
  flowRate: number  // ml pro Sekunde
  enabled: boolean
  speed: number     // Pumpengeschwindigkeit 0–100 % (Standard: 100)
  antiDripMl: number // Anti-Tropf: ml rückwärts nach Förderung (Standard: 0.5 ml)
}

export interface Ingredient {
  id: string
  name: string
  alcoholic: boolean
}
