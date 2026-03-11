export interface CocktailPreparationLog {
  id: string
  cocktailId: string
  cocktailName: string
  category: "cocktails" | "virgin" | "shots"
  size: number
  timestamp: string
  ingredients: {
    ingredientId: string
    amount: number
  }[]
}

export interface CocktailStatistics {
  cocktailId: string
  cocktailName: string
  category: "cocktails" | "virgin" | "shots"
  preparationCount: number
  totalVolume: number
  lastPrepared: string
}

export interface IngredientConsumption {
  ingredientId: string
  ingredientName: string
  totalAmount: number
  usageCount: number
}

export interface IngredientPrice {
  ingredientId: string
  pricePerLiter: number
}

export interface SizeStatistics {
  size: number
  count: number
}

export interface StatisticsData {
  logs: CocktailPreparationLog[]
  cocktailStats: CocktailStatistics[]
  ingredientConsumption: IngredientConsumption[]
  ingredientPrices: IngredientPrice[]
  sizeStats: SizeStatistics[]
}
