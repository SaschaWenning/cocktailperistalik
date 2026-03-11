import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log("[v0] Manual save request received:", Object.keys(data).length, "items")

    console.log("[v0] ❌ Dateispeicherung nicht verfügbar - läuft in Browser-Umgebung")

    return NextResponse.json(
      {
        success: false,
        message: "Dateispeicherung nicht verfügbar - läuft in Browser-Umgebung",
        error: "File system access not available in browser environment",
      },
      { status: 400 },
    )
  } catch (error) {
    console.error("[v0] Error in manual save:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Fehler beim manuellen Speichern",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
