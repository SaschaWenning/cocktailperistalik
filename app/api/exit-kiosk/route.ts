import { exec } from "child_process"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Führe den Befehl aus, um den Kiosk-Modus zu beenden
    // Dies funktioniert für Chromium im Kiosk-Modus auf Raspberry Pi
    exec("pkill -o chromium", (error, stdout, stderr) => {
      if (error) {
        console.error(`Fehler beim Beenden des Kiosk-Modus: ${error.message}`)
        return
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`)
        return
      }
      console.log(`Kiosk-Modus beendet: ${stdout}`)
    })

    return NextResponse.json({ success: true, message: "Kiosk-Modus wird beendet" })
  } catch (error) {
    console.error("Fehler beim Beenden des Kiosk-Modus:", error)
    return NextResponse.json({ success: false, message: "Fehler beim Beenden des Kiosk-Modus" }, { status: 500 })
  }
}
