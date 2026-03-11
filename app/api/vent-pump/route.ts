import { type NextRequest, NextResponse } from "next/server"
import { ventPumpAction } from "@/lib/cocktail-machine-server"

export async function POST(request: NextRequest) {
  try {
    const { pumpId, durationMs } = await request.json()

    console.log(`[v0] Vent pump request: pumpId=${pumpId}, duration=${durationMs}ms`)

    const result = await ventPumpAction(pumpId, durationMs)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error venting pump:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to vent pump",
      },
      { status: 500 },
    )
  }
}
