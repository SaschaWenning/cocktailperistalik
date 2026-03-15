export interface PumpConfig {
  id: number
  pin: number
  ingredient: string
  flowRate: number // ml pro Sekunde
  enabled: boolean // Hinzugefügt für Aktivierung/Deaktivierung
  priority?: number // Priorität bei gleicher Zutat (1 = wird zuerst verwendet, 2 = danach, etc.)
}

export interface Ingredient {
  id: string
  name: string
  alcoholic: boolean
}
