import { makeCocktailAction, getPumpConfig } from "@/lib/cocktail-machine-server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { cocktail, pumpConfig: clientPumpConfig, size } = await request.json()

    // Immer die Server-seitige Pumpenkonfiguration laden (aktuellste Daten vom Pi)
    // und mit dem Client-Config mergen falls nötig
    let pumpConfig = clientPumpConfig
    try {
      pumpConfig = await getPumpConfig()
    } catch {
      console.error("[PUMP] Konnte Server-Pumpenkonfiguration nicht laden, verwende Client-Config")
    }

    const result = await makeCocktailAction(cocktail, pumpConfig, size)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[PUMP] Server Error in /api/make-cocktail:", message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}
