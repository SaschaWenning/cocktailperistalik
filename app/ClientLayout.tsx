"use client"

import type React from "react"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { useEffect } from "react"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // <CHANGE> Füge beforeunload Event-Listener hinzu für Persistierung beim App-Beenden
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      console.log("[v0] App wird beendet - speichere Füllstände und Behältergrößen...")

      try {
        // Hole aktuelle Füllstände
        const response = await fetch("/api/ingredient-levels", {
          method: "GET",
          cache: "no-store",
        })

        if (response.ok) {
          const levels = await response.json()

          // Speichere in localStorage als Backup
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "ingredient-levels-backup",
              JSON.stringify({
                levels,
                timestamp: new Date().toISOString(),
              }),
            )
            console.log("[v0] Füllstände erfolgreich beim App-Beenden gespeichert")
          }

          // Explizite Speicherung über API
          await fetch("/api/ingredient-levels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(levels),
          })
        }
      } catch (error) {
        console.error("[v0] Fehler beim Speichern der Füllstände beim App-Beenden:", error)
      }

      // Zeige Bestätigung an (optional)
      event.preventDefault()
      event.returnValue = ""
    }

    // Event-Listener hinzufügen
    window.addEventListener("beforeunload", handleBeforeUnload)

    // Cleanup beim Unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [])

  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-screen bg-[hsl(var(--cocktail-bg))]">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
