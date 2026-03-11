import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { mode, config } = await request.json()

    console.log("[v0] Testing lighting mode:", mode, "with config:", config)

    // Send test command to Raspberry Pico 2
    await sendLightingTestCommand(mode, config)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error testing lighting:", error)
    return NextResponse.json({ error: "Failed to test lighting" }, { status: 500 })
  }
}

async function sendLightingTestCommand(mode: string, config: any) {
  try {
    // This would communicate with the Raspberry Pico 2 for testing
    console.log("[v0] Sending test command to Pico 2:", { mode, config, duration: 5000 })

    // In a real implementation:
    // const serialPort = new SerialPort('/dev/ttyUSB0', { baudRate: 115200 })
    // serialPort.write(JSON.stringify({ command: 'test', mode, config, duration: 5000 }))

    return true
  } catch (error) {
    console.error("[v0] Error sending lighting test command:", error)
    return false
  }
}
