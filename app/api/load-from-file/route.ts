import { NextResponse } from "next/server"

export async function POST() {
  try {
    console.log("[v0] 🔄 Starting manual load from file...")

    console.log("[v0] ❌ Dateisystem nicht verfügbar (läuft in Browser-Umgebung)")
    return NextResponse.json({
      success: false,
      message: "Dateisystem nicht verfügbar (läuft in Browser-Umgebung)",
      data: null,
    })
  } catch (error) {
    console.error("[v0] ❌ Error in manual load:", error)
    return NextResponse.json({
      success: false,
      message: `Unerwarteter Fehler: ${error}`,
      data: null,
    })
  }
}
