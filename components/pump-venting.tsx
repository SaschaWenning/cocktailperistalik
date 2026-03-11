"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Loader2, Wind, Play } from "lucide-react"
import type { PumpConfig } from "@/types/pump"
import { cleanPump } from "@/lib/cocktail-machine"
import { getAllIngredients } from "@/lib/ingredients"

interface PumpVentingProps {
  pumpConfig: PumpConfig[]
}

export default function PumpVenting({ pumpConfig }: PumpVentingProps) {
  const [autoVentingStatus, setAutoVentingStatus] = useState<"idle" | "venting">("idle")
  const [currentPump, setCurrentPump] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [pumpsDone, setPumpsDone] = useState<number[]>([])
  const [manualVentingPumps, setManualVentingPumps] = useState<Set<number>>(new Set())

  const enabledPumps = pumpConfig.filter((pump) => pump.enabled)

  // Automatische Entlüftung aller Pumpen
  const startAutoVenting = async () => {
    setAutoVentingStatus("venting")
    setProgress(0)
    setPumpsDone([])
    setCurrentPump(null)

    // Jede Pumpe nacheinander für 2 Sekunden entlüften
    for (let i = 0; i < enabledPumps.length; i++) {
      const pump = enabledPumps[i]
      setCurrentPump(pump.id)

      try {
        // Pumpe für 2 Sekunden laufen lassen
        await cleanPump(pump.id, 2000)
        setPumpsDone((prev) => [...prev, pump.id])

        // Fortschritt aktualisieren
        setProgress(Math.round(((i + 1) / enabledPumps.length) * 100))
      } catch (error) {
        console.error(`Fehler beim Entlüften der Pumpe ${pump.id}:`, error)
      }
    }

    setCurrentPump(null)
    setAutoVentingStatus("idle")
  }

  // Einzelne Pumpe entlüften (1 Sekunde, ohne Ladebildschirm)
  const ventSinglePump = async (pumpId: number) => {
    setManualVentingPumps((prev) => new Set(prev).add(pumpId))

    try {
      await cleanPump(pumpId, 1000) // 1 Sekunde
    } catch (error) {
      console.error(`Fehler beim Entlüften der Pumpe ${pumpId}:`, error)
    } finally {
      // Kurze Verzögerung für visuelle Rückmeldung
      setTimeout(() => {
        setManualVentingPumps((prev) => {
          const newSet = new Set(prev)
          newSet.delete(pumpId)
          return newSet
        })
      }, 100)
    }
  }

  const resetAutoVenting = () => {
    setAutoVentingStatus("idle")
    setCurrentPump(null)
    setProgress(0)
    setPumpsDone([])
  }

  const getIngredientDisplayName = (ingredientId: string): string => {
    if (!ingredientId) return ""

    const allIngredients = getAllIngredients()
    const ingredient = allIngredients.find((i) => i.id === ingredientId)

    if (ingredient) {
      return ingredient.name
    }

    // If it's a custom ingredient, extract the name from the ID
    if (ingredientId.startsWith("custom-")) {
      const extractedName = ingredientId.replace(/^custom-\d+-/, "").trim()
      return extractedName || ingredientId
    }

    return ingredientId
  }

  return (
    <div className="space-y-4">
      {/* Automatische Entlüftung */}
      <Card className="bg-black border-[hsl(var(--cocktail-card-border))]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-white">
            <Wind className="h-5 w-5 text-[hsl(var(--cocktail-primary))]" />
            Automatische Entlüftung
          </CardTitle>
          <CardDescription className="text-[hsl(var(--cocktail-text-muted))]">
            Entlüfte alle Pumpen nacheinander für 2 Sekunden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="bg-[hsl(var(--cocktail-card-bg))] border-[hsl(var(--cocktail-card-border))]">
            <AlertDescription className="text-[hsl(var(--cocktail-text))] text-sm">
              <p className="font-medium mb-1">Vorbereitung:</p>
              <p>
                Stelle einen Auffangbehälter unter die Ausgänge und sorge dafür, dass alle Ansaugschläuche in den
                entsprechenden Flüssigkeiten liegen.
              </p>
            </AlertDescription>
          </Alert>

          {autoVentingStatus === "idle" && (
            <Button
              onClick={startAutoVenting}
              className="w-full bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black"
              size="lg"
            >
              <Wind className="mr-2 h-5 w-5" />
              Automatische Entlüftung starten
            </Button>
          )}

          {autoVentingStatus === "venting" && (
            <div className="space-y-3">
              <Progress value={progress} className="h-2" indicatorClassName="bg-[hsl(var(--cocktail-primary))]" />

              <div className="flex justify-between items-center">
                <span className="text-sm text-[hsl(var(--cocktail-text-muted))]">
                  {pumpsDone.length} von {enabledPumps.length} Pumpen entlüftet
                </span>
                <span className="text-sm font-medium">{progress}%</span>
              </div>

              {currentPump !== null && (
                <Alert className="bg-[hsl(var(--cocktail-card-bg))] border-[hsl(var(--cocktail-card-border))]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--cocktail-primary))]" />
                    <AlertDescription className="text-[hsl(var(--cocktail-text))]">
                      Entlüfte Pumpe {currentPump}...
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              <div className="grid grid-cols-5 gap-2">
                {enabledPumps.map((pump) => (
                  <div
                    key={pump.id}
                    className={`p-2 rounded-md text-center ${
                      pumpsDone.includes(pump.id)
                        ? "bg-[hsl(var(--cocktail-success))]/10 border border-[hsl(var(--cocktail-success))]/30"
                        : currentPump === pump.id
                          ? "bg-[hsl(var(--cocktail-primary))]/20 border border-[hsl(var(--cocktail-primary))]/50 font-bold animate-pulse"
                          : "bg-[hsl(var(--cocktail-bg))] border border-[hsl(var(--cocktail-card-border)))"
                    }`}
                  >
                    <span className={`text-sm ${currentPump === pump.id ? "text-white font-bold" : ""}`}>
                      {pump.id}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                onClick={resetAutoVenting}
                className="w-full bg-[hsl(var(--cocktail-card-bg))] text-[hsl(var(--cocktail-text))] border-[hsl(var(--cocktail-card-border)))]"
              >
                Abbrechen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manuelle Einzelpumpen-Entlüftung */}
      <Card className="bg-black border-[hsl(var(--cocktail-card-border))]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-white">
            <Play className="h-5 w-5 text-[hsl(var(--cocktail-primary))]" />
            Manuelle Entlüftung
          </CardTitle>
          <CardDescription className="text-[hsl(var(--cocktail-text-muted))]">
            Entlüfte einzelne Pumpen für 1 Sekunde
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="bg-[hsl(var(--cocktail-card-bg))] border-[hsl(var(--cocktail-card-border))]">
            <AlertDescription className="text-[hsl(var(--cocktail-text))] text-sm">
              Klicke auf eine Pumpe um sie für 1 Sekunde zu entlüften. Die Pumpe startet sofort ohne Ladebildschirm.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-5 gap-3">
            {enabledPumps.map((pump) => (
              <div key={pump.id} className="flex flex-col items-center space-y-2">
                <Button
                  onClick={() => ventSinglePump(pump.id)}
                  disabled={autoVentingStatus === "venting"}
                  className={`w-full h-16 text-2xl font-bold ${
                    manualVentingPumps.has(pump.id)
                      ? "bg-[hsl(var(--cocktail-primary))]/30 border border-[hsl(var(--cocktail-primary))]/50"
                      : "bg-[hsl(var(--cocktail-card-bg))] hover:bg-[hsl(var(--cocktail-primary))] hover:text-black"
                  } text-[hsl(var(--cocktail-text))] border-[hsl(var(--cocktail-card-border))]`}
                >
                  {pump.id}
                </Button>
                {pump.ingredient && (
                  <span className="text-xs text-[hsl(var(--cocktail-text-muted))] text-center">
                    {getIngredientDisplayName(pump.ingredient)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
