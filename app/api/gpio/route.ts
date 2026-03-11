import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"

const execAsync = promisify(exec)

// Pfad zum Python-Skript
const PYTHON_SCRIPT = path.join(process.cwd(), "scripts/gpio_controller.py")

export async function GET(request: Request) {
  try {
    // Einfacher Test, um zu prüfen, ob die API-Route funktioniert
    return NextResponse.json({ success: true, message: "GPIO API ist aktiv" })
  } catch (error) {
    console.error("Fehler in der GPIO API-Route (GET):", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    // Parse den Request-Body
    let data
    try {
      data = await request.json()
    } catch (error) {
      console.error("Fehler beim Parsen des Request-Body:", error)
      return NextResponse.json({ success: false, error: "Ungültiger Request-Body" }, { status: 400 })
    }

    const { action, pin, duration } = data

    // Validiere die Parameter
    if (!action) {
      return NextResponse.json({ success: false, error: "Aktion ist erforderlich" }, { status: 400 })
    }

    let result
    let cmdOutput = ""

    try {
      switch (action) {
        case "setup":
          console.log("Führe Setup-Aktion aus...")
          const setupCmd = `python3 ${PYTHON_SCRIPT} setup`
          console.log(`Befehl: ${setupCmd}`)
          const setupResult = await execAsync(setupCmd)
          cmdOutput = setupResult.stdout.trim()
          console.log(`Setup-Ausgabe: ${cmdOutput}`)
          break

        case "activate":
          if (!pin || !duration) {
            return NextResponse.json({ success: false, error: "Pin und Dauer sind erforderlich" }, { status: 400 })
          }
          console.log(`Aktiviere Pin ${pin} für ${duration}ms...`)
          const activateCmd = `python3 ${PYTHON_SCRIPT} activate ${pin} ${duration}`
          console.log(`Befehl: ${activateCmd}`)
          const activateResult = await execAsync(activateCmd)
          cmdOutput = activateResult.stdout.trim()
          console.log(`Aktivierungs-Ausgabe: ${cmdOutput}`)
          break

        case "cleanup":
          console.log("Führe Cleanup-Aktion aus...")
          const cleanupCmd = `python3 ${PYTHON_SCRIPT} cleanup`
          console.log(`Befehl: ${cleanupCmd}`)
          const cleanupResult = await execAsync(cleanupCmd)
          cmdOutput = cleanupResult.stdout.trim()
          console.log(`Cleanup-Ausgabe: ${cmdOutput}`)
          break

        case "test":
          // Einfacher Test, der kein Python-Skript benötigt
          console.log("Führe Test-Aktion aus...")
          return NextResponse.json({ success: true, message: "Test erfolgreich" })

        default:
          return NextResponse.json({ success: false, error: `Ungültige Aktion: ${action}` }, { status: 400 })
      }

      // Parse die Ausgabe des Python-Skripts
      try {
        result = JSON.parse(cmdOutput)
      } catch (error) {
        console.error(`Fehler beim Parsen der Python-Ausgabe: ${cmdOutput}`, error)
        return NextResponse.json(
          {
            success: false,
            error: "Ungültige Ausgabe vom Python-Skript",
            output: cmdOutput,
          },
          { status: 500 },
        )
      }

      return NextResponse.json(result)
    } catch (error) {
      console.error(`Fehler bei der Ausführung der Aktion ${action}:`, error)
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unbekannter Fehler",
          command: action,
          output: cmdOutput,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Allgemeiner Fehler in der GPIO API-Route:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" },
      { status: 500 },
    )
  }
}
