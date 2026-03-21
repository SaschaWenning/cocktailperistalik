import { NextResponse } from "next/server"

const DEFAULT_STANDARD_SIZES = [200, 300, 400]

export async function GET() {
  try {
    const standardSizes =
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("standardCocktailSizes") || JSON.stringify(DEFAULT_STANDARD_SIZES))
        : DEFAULT_STANDARD_SIZES

    return NextResponse.json({ standardSizes })
  } catch (error) {
    console.error("Error loading standard sizes:", error)
    return NextResponse.json({ standardSizes: DEFAULT_STANDARD_SIZES })
  }
}

export async function POST(request: Request) {
  try {
    const { standardSizes } = await request.json()

    if (typeof window !== "undefined") {
      localStorage.setItem("standardCocktailSizes", JSON.stringify(standardSizes))
    }

    return NextResponse.json({ success: true, standardSizes })
  } catch (error) {
    console.error("Error saving standard sizes:", error)
    return NextResponse.json({ success: false, error: "Failed to save standard sizes" }, { status: 500 })
  }
}
