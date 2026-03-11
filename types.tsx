export interface Cocktail {
  id: string
  name: string
  description: string
  image: string
  alcoholic: boolean
  ingredients: string[]
  recipe: {
    ingredientId: string
    amount: number // in ml
  }[]
}
