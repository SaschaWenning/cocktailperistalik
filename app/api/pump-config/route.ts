export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getPumpConfig, savePumpConfig } from "@/lib/cocktail-machine-server"

export async function GET() {
  try {
    const pumpConfig = await getPumpConfig()
    return NextResponse.json({ success: true, pumpConfig })
  } catch (error) {
    console.error("Error getting pump config:", error)
    return NextResponse.json({ success: false, error: "Failed to get pump config" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { pumpConfig } = await request.json()
    await savePumpConfig(pumpConfig)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving pump config:", error)
    return NextResponse.json({ success: false, error: "Failed to save pump config" }, { status: 500 })
  }
}
