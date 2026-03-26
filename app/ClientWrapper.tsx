"use client"

import type React from "react"
import { useEffect } from "react"

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    const autoSaveInterval = setInterval(async () => {
      try {
        const response = await fetch("/api/ingredient-levels", {
          method: "GET",
          cache: "no-store",
        })

        if (response.ok) {
          const levels = await response.json()

          // Speichere nur wenn Daten vorhanden sind
          if (levels && levels.length > 0) {
            await fetch("/api/ingredient-levels", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(levels),
            })
            console.log("[v0] Automatische Speicherung der Füllstände erfolgreich")
          }
        }
      } catch (error) {
        console.error("[v0] Fehler bei automatischer Speicherung:", error)
      }
    }, 30000) // Alle 30 Sekunden

    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      console.log("[v0] App wird beendet - speichere Füllstände...")

      try {
        const response = await fetch("/api/ingredient-levels", {
          method: "GET",
          cache: "no-store",
        })

        if (response.ok) {
          const levels = await response.json()

          if (typeof window !== "undefined") {
            localStorage.setItem(
              "ingredient-levels-backup",
              JSON.stringify({
                levels,
                timestamp: new Date().toISOString(),
              }),
            )
          }

          navigator.sendBeacon("/api/ingredient-levels", JSON.stringify(levels))
        }
      } catch (error) {
        console.error("[v0] Fehler beim Speichern beim App-Beenden:", error)
      }
    }

    // Event-Listener hinzufügen
    window.addEventListener("beforeunload", handleBeforeUnload)

    // Cleanup beim Unmount
    return () => {
      clearInterval(autoSaveInterval)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [])

  return <>{children}</>
}
