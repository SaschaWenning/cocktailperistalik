import type { Ingredient } from "@/types/pump"

export const ingredients: Ingredient[] = [
  // Alkoholische Getränke - Spirituosen (currently in use)
  { id: "vodka", name: "Vodka", alcoholic: true },
  { id: "dark-rum", name: "Brauner Rum", alcoholic: true },
  { id: "gin", name: "Gin", alcoholic: true },
  { id: "tequila", name: "Tequila", alcoholic: true },

  // Alkoholische Getränke - Liköre (currently in use)
  { id: "malibu", name: "Malibu", alcoholic: true },
  { id: "peach-liqueur", name: "Pfirsichlikör", alcoholic: true },
  { id: "blue-curacao", name: "Blue Curaçao", alcoholic: true },
  { id: "triple-sec", name: "Triple Sec", alcoholic: true },

  // Nicht-alkoholische Getränke - Fruchtsäfte (currently in use)
  { id: "orange-juice", name: "Orangensaft", alcoholic: false },
  { id: "pineapple-juice", name: "Ananassaft", alcoholic: false },
  { id: "cranberry-juice", name: "Cranberrysaft", alcoholic: false },
  { id: "passion-fruit-juice", name: "Maracujasaft", alcoholic: false },

  // Nicht-alkoholische Getränke - Zitrusfrüchte (currently in use)
  { id: "lime-juice", name: "Limettensaft", alcoholic: false },
  { id: "lemon-juice", name: "Zitronensaft", alcoholic: false },

  // Nicht-alkoholische Getränke - Kohlensäurehaltige Getränke
  { id: "cola", name: "Cola", alcoholic: false },
  { id: "soda-water", name: "Sodawasser", alcoholic: false },

  // Nicht-alkoholische Getränke - Milchprodukte
  { id: "creme-of-coconut", name: "Cream of Coconut", alcoholic: false },

  // Sirupe (currently in use)
  { id: "vanilla-syrup", name: "Vanillesirup", alcoholic: false },
  { id: "almond-syrup", name: "Mandelsirup", alcoholic: false },
  { id: "grenadine", name: "Grenadine", alcoholic: false },
  { id: "coconut-syrup", name: "Kokossirup", alcoholic: false },
]
