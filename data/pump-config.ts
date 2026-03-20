import type { PumpConfig } from "@/types/pump"

// PCA9685 Board IN1 (0x40), Board IN2 (0x50), Board PWM (0x60)
// Jede Pumpe belegt Kanal (pump_id - 1) auf allen drei Boards
export const pumpConfig: PumpConfig[] = [
  { id: 1,  ingredient: "vodka",               flowRate: 25.0, enabled: true, speed: 100, antiDripMl: 0.5 },
  { id: 2,  ingredient: "dark-rum",             flowRate: 25.0, enabled: true, speed: 100, antiDripMl: 0.5 },
  { id: 3,  ingredient: "malibu",               flowRate: 25.0, enabled: true, speed: 100, antiDripMl: 0.5 },
  { id: 4,  ingredient: "peach-liqueur",         flowRate: 25.0, enabled: true, speed: 100, antiDripMl: 0.5 },
  { id: 5,  ingredient: "tequila",              flowRate: 25.0, enabled: true, speed: 100, antiDripMl: 0.5 },
  { id: 6,  ingredient: "triple-sec",           flowRate: 25.0, enabled: true, speed: 100, antiDripMl: 0.5 },
  { id: 7,  ingredient: "blue-curacao",         flowRate: 25.0, enabled: true, speed: 100, antiDripMl: 0.5 },
  { id: 8,  ingredient: "gin",                  flowRate: 25.0, enabled: true, speed: 100, antiDripMl: 0.5 },
  { id: 9,  ingredient: "lime-juice",           flowRate: 25.0, enabled: true, speed: 100, antiDripMl: 0.5 },
  { id: 10, ingredient: "grenadine",            flowRate: 25.0, enabled: true, speed: 100, antiDripMl: 0.5 },
  { id: 11, ingredient: "vanilla-syrup",        flowRate: 25.0, enabled: true, speed: 100, antiDripMl: 0.5 },
  { id: 12, ingredient: "orange-juice",         flowRate: 25.0, enabled: true, speed: 100, antiDripMl: 0.5 },
  { id: 13, ingredient: "pineapple-juice",      flowRate: 25.0, enabled: true, speed: 100, antiDripMl: 0.5 },
  { id: 14, ingredient: "passion-fruit-juice",  flowRate: 25.0, enabled: true, speed: 100, antiDripMl: 0.5 },
  { id: 15, ingredient: "almond-syrup",         flowRate: 25.0, enabled: true, speed: 100, antiDripMl: 0.5 },
  { id: 16, ingredient: "coconut-syrup",        flowRate: 25.0, enabled: true, speed: 100, antiDripMl: 0.5 },
]
