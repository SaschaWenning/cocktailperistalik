import { type NextRequest, NextResponse } from "next/server"
import { makeShotAction, getPumpConfig } from "@/lib/cocktail-machine-server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const ingredient: string | undefined = body.ingredient ?? body.ingredientId
    const size: number = body.size ?? body.amount ?? 40
    const pumpConfig = body.pumpConfig ?? (await getPumpConfig())

    if (!ingredient) {
      return NextResponse.json({ success: false, error: "Missing ingredient/ingredientId" }, { status: 400 })
    }

    const result = await makeShotAction(ingredient, pumpConfig, size)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error making shot:", error)
    return NextResponse.json({ success: false, error: "Failed to make shot" }, { status: 500 })
  }
}
