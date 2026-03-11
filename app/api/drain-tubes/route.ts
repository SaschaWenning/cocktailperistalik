import { drainTubesAction } from "@/lib/cocktail-machine-server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const result = await drainTubesAction()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Fehler beim Entleeren der Schläuche:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" },
      { status: 500 },
    )
  }
}
