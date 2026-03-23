"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Loader2, Droplets, Check, AlertTriangle, Settings, Clock } from "lucide-react"
import type { PumpConfig } from "@/types/pump"
import { cleanPump } from "@/lib/cocktail-machine"

interface PumpCleaningProps {
  pumpConfig: PumpConfig[]
}

// Hilfsfunktion um Zutatennamen zu formatieren (entfernt custom-TIMESTAMP- Präfix)
function formatIngredientName(ingredient: string | undefined): string {
  if (!ingredient) return ""
  // Format: custom-TIMESTAMP-name -> nur name
  if (ingredient.startsWith("custom-")) {
    const extracted = ingredient.replace(/^custom-\d+-/, "").trim()
    if (extracted && !/^\d+$/.test(extracted)) {
      return extracted
    }
    return ""
  }
  return ingredient
}

export default function PumpCleaning({ pumpConfig }: PumpCleaningProps) {
  const [cleaningStatus, setCleaningStatus] = useState<"idle" | "preparing" | "cleaning" | "complete">("idle")
  const [currentPump, setCurrentPump] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [pumpsDone, setPumpsDone] = useState<number[]>([])
  const [manualCleaningPumps, setManualCleaningPumps] = useState<Set<number>>(new Set())
  const [selectedPumpsForCleaning, setSelectedPumpsForCleaning] = useState<Set<number>>(new Set())
  const [cleaningDuration, setCleaningDuration] = useState(10) // Sekunden
  const cleaningProcessRef = useRef<{ cancel: boolean }>({ cancel: false })

  const enabledPumps = pumpConfig.filter((pump) => pump.enabled)

  const startCleaning = async () => {
    // Reinigungsprozess starten
    setCleaningStatus("preparing")
    setProgress(0)
    setPumpsDone([])
    cleaningProcessRef.current = { cancel: false }

    // Kurze Verzögerung für die Vorbereitung
    await new Promise((resolve) => setTimeout(resolve, 2000))

    if (cleaningProcessRef.current.cancel) return
    setCleaningStatus("cleaning")

    // Jede Pumpe nacheinander reinigen
    for (let i = 0; i < enabledPumps.length; i++) {
      const pump = enabledPumps[i]
      setCurrentPump(pump.id)

      // Prüfen, ob der Prozess pausiert oder abgebrochen wurde
      if (cleaningProcessRef.current.cancel) return

      try {
        // Pumpe für die eingestellte Zeit laufen lassen
        await cleanPumpWithPauseSupport(pump.id, cleaningDuration * 1000)

        // Wenn der Prozess während der Reinigung abgebrochen wurde, beenden
        if (cleaningProcessRef.current.cancel) return

        setPumpsDone((prev) => [...prev, pump.id])

        // Fortschritt aktualisieren
        setProgress(Math.round(((i + 1) / enabledPumps.length) * 100))
      } catch (error) {
        console.error(`Fehler beim Reinigen der Pumpe ${pump.id}:`, error)
        if (cleaningProcessRef.current.cancel) return
      }
    }

    setCurrentPump(null)
    setCleaningStatus("complete")
  }

  // Funktion zum Reinigen einer Pumpe mit Unterstützung für Pausen
  const cleanPumpWithPauseSupport = async (pumpId: number, duration: number) => {
    try {
      await cleanPump(pumpId, duration)
    } catch (error) {
      throw error
    }
  }

  const resetCleaning = () => {
    cleaningProcessRef.current.cancel = true
    setCleaningStatus("idle")
    setCurrentPump(null)
    setProgress(0)
    setPumpsDone([])
    setSelectedPumpsForCleaning(new Set())
  }

  // Pumpe für Mehrfach-Reinigung auswählen/abwählen
  const togglePumpSelection = (pumpId: number) => {
    setSelectedPumpsForCleaning(prev => {
      const newSet = new Set(prev)
      if (newSet.has(pumpId)) {
        newSet.delete(pumpId)
      } else {
        newSet.add(pumpId)
      }
      return newSet
    })
  }

  // Mehrere Pumpen gleichzeitig reinigen (mit 1 Sek Verzögerung zwischen Start)
  const cleanSelectedPumps = async () => {
    if (selectedPumpsForCleaning.size === 0) return
    
    const pumpsToClean = Array.from(selectedPumpsForCleaning)
    
    // Alle ausgewählten Pumpen als "reinigend" markieren
    setManualCleaningPumps(new Set(pumpsToClean))
    
    // Starte alle Pumpen mit 1 Sekunde Verzögerung zwischen den Starts
    const cleaningPromises = pumpsToClean.map((pumpId, index) => {
      return new Promise<void>(async (resolve) => {
        // Verzögerten Start für alle außer der ersten Pumpe
        await new Promise(r => setTimeout(r, index * 1000))
        try {
          await cleanPump(pumpId, cleaningDuration * 1000)
        } catch (error) {
          console.error(`Fehler beim Reinigen der Pumpe ${pumpId}:`, error)
        }
        resolve()
      })
    })

    await Promise.all(cleaningPromises)
    
    setManualCleaningPumps(new Set())
    setSelectedPumpsForCleaning(new Set())
  }

  // Manuelle Einzelpumpen-Reinigung
  const cleanSinglePump = async (pumpId: number) => {
    setManualCleaningPumps((prev) => new Set(prev).add(pumpId))

    try {
      await cleanPump(pumpId, cleaningDuration * 1000)
    } catch (error) {
      console.error(`Fehler beim manuellen Reinigen der Pumpe ${pumpId}:`, error)
    } finally {
      setManualCleaningPumps((prev) => {
        const newSet = new Set(prev)
        newSet.delete(pumpId)
        return newSet
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Automatische Reinigung */}
      <Card className="bg-black border-[hsl(var(--cocktail-card-border))]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-white">
            <Droplets className="h-5 w-5 text-[hsl(var(--cocktail-primary))]" />
            Automatische Pumpenreinigung
          </CardTitle>
          <CardDescription className="text-[hsl(var(--cocktail-text-muted))]">
            Reinige alle Pumpen nacheinander mit warmem Wasser und Spülmittel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="bg-[hsl(var(--cocktail-card-bg))] border-[hsl(var(--cocktail-card-border))]">
            <AlertDescription className="text-[hsl(var(--cocktail-text))] text-sm">
              <p className="font-medium mb-1">Vorbereitung:</p>
              <ol className="list-decimal pl-4 space-y-1 text-sm">
                <li>Stelle einen Behälter mit warmem Wasser und etwas Spülmittel bereit.</li>
                <li>Lege die Ansaugschläuche aller Pumpen in diesen Behälter.</li>
                <li>Stelle einen leeren Auffangbehälter unter die Ausgänge.</li>
              </ol>
            </AlertDescription>
          </Alert>

          {cleaningStatus === "idle" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--cocktail-text))] flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Reinigungsdauer pro Pumpe:
                  </span>
                  <span className="text-lg font-bold text-[hsl(var(--cocktail-primary))]">{cleaningDuration} Sek</span>
                </div>
                <Slider
                  value={[cleaningDuration]}
                  onValueChange={(value) => setCleaningDuration(value[0])}
                  min={5}
                  max={30}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-[hsl(var(--cocktail-text-muted))]">
                  <span>5 Sek</span>
                  <span>30 Sek</span>
                </div>
              </div>
              
              <Button
                onClick={startCleaning}
                className="w-full bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black"
                size="lg"
              >
                <Droplets className="mr-2 h-5 w-5" />
                Automatische Reinigung starten
              </Button>
            </div>
          )}

          {cleaningStatus === "preparing" && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--cocktail-primary))]" />
              </div>
              <p className="text-center text-[hsl(var(--cocktail-text))]">Vorbereitung der Reinigung...</p>
              <p className="text-center text-sm text-[hsl(var(--cocktail-text-muted))]">
                Stelle sicher, dass alle Schläuche korrekt positioniert sind.
              </p>
            </div>
          )}

          {cleaningStatus === "cleaning" && (
            <div className="space-y-3">
              <Progress value={progress} className="h-2" indicatorClassName="bg-[hsl(var(--cocktail-primary))]" />

              <div className="flex justify-between items-center">
                <span className="text-sm text-[hsl(var(--cocktail-text-muted))]">
                  {pumpsDone.length} von {enabledPumps.length} Pumpen gereinigt
                </span>
                <span className="text-sm font-medium">{progress}%</span>
              </div>

              {currentPump !== null && (
                <Alert className="bg-[hsl(var(--cocktail-card-bg))] border-[hsl(var(--cocktail-card-border))]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--cocktail-primary))]" />
                    <AlertDescription className="text-[hsl(var(--cocktail-text))]">
                      Reinige Pumpe {currentPump}...
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
                          : "bg-[hsl(var(--cocktail-bg))] border border-[hsl(var(--cocktail-card-border))]"
                    }`}
                  >
                    <span className={`text-sm ${currentPump === pump.id ? "text-white font-bold" : ""}`}>
                      {pump.id}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={resetCleaning}
                  className="w-full bg-[hsl(var(--cocktail-card-bg))] text-[hsl(var(--cocktail-text))] border-[hsl(var(--cocktail-card-border))]"
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}

          {cleaningStatus === "complete" && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <div className="rounded-full bg-[hsl(var(--cocktail-success))]/20 p-3">
                  <Check className="h-8 w-8 text-[hsl(var(--cocktail-success))]" />
                </div>
              </div>

              <p className="text-center font-medium">Automatische Reinigung abgeschlossen!</p>

              <Alert className="bg-[hsl(var(--cocktail-warning))]/10 border-[hsl(var(--cocktail-warning))]/30">
                <AlertTriangle className="h-4 w-4 text-[hsl(var(--cocktail-warning))]" />
                <AlertDescription className="text-[hsl(var(--cocktail-text))]">
                  <p className="font-medium mb-1">Wichtig:</p>
                  <p>Spüle die Pumpen nun mit klarem Wasser nach, um Spülmittelreste zu entfernen.</p>
                </AlertDescription>
              </Alert>

              <Button
                onClick={resetCleaning}
                className="w-full bg-[hsl(var(--cocktail-card-bg))] text-[hsl(var(--cocktail-text))] border-[hsl(var(--cocktail-card-border))]"
              >
                Zurücksetzen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manuelle Einzelpumpen-Reinigung */}
      <Card className="bg-black border-[hsl(var(--cocktail-card-border))]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-white">
            <Settings className="h-5 w-5 text-[hsl(var(--cocktail-primary))]" />
            Manuelle Pumpenreinigung
          </CardTitle>
          <CardDescription className="text-[hsl(var(--cocktail-text-muted))]">
            Wähle Pumpen aus und starte die Reinigung ({cleaningDuration} Sekunden)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Zeit-Einstellung */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[hsl(var(--cocktail-text))] flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Reinigungsdauer:
              </span>
              <span className="text-lg font-bold text-[hsl(var(--cocktail-primary))]">{cleaningDuration} Sek</span>
            </div>
            <Slider
              value={[cleaningDuration]}
              onValueChange={(value) => setCleaningDuration(value[0])}
              min={5}
              max={30}
              step={1}
              className="w-full"
              disabled={manualCleaningPumps.size > 0 || cleaningStatus === "cleaning"}
            />
          </div>

          <Alert className="bg-[hsl(var(--cocktail-card-bg))] border-[hsl(var(--cocktail-card-border))]">
            <AlertDescription className="text-[hsl(var(--cocktail-text))] text-sm">
              <strong>Einzeln:</strong> Klicke auf eine Pumpe um sie sofort zu reinigen.<br/>
              <strong>Mehrere:</strong> Halte gedrückt oder doppelklicke um Pumpen auszuwählen, dann starte unten.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-5 gap-3">
            {enabledPumps.map((pump) => {
              const ingredientName = formatIngredientName(pump.ingredient)
              const isSelected = selectedPumpsForCleaning.has(pump.id)
              const isCleaning = manualCleaningPumps.has(pump.id)
              
              return (
                <div key={pump.id} className="flex flex-col items-center space-y-1">
                  <Button
                    onClick={() => cleanSinglePump(pump.id)}
                    onDoubleClick={() => togglePumpSelection(pump.id)}
                    onContextMenu={(e) => { e.preventDefault(); togglePumpSelection(pump.id) }}
                    disabled={isCleaning || cleaningStatus === "cleaning"}
                    className={`w-full h-14 flex flex-col items-center justify-center ${
                      isCleaning
                        ? "bg-[hsl(var(--cocktail-primary))]/20 border-2 border-[hsl(var(--cocktail-primary))]"
                        : isSelected
                          ? "bg-[hsl(var(--cocktail-primary))]/30 border-2 border-[hsl(var(--cocktail-primary))] ring-2 ring-[hsl(var(--cocktail-primary))]/50"
                          : "bg-[hsl(var(--cocktail-card-bg))] hover:bg-[hsl(var(--cocktail-primary))] hover:text-black border border-[hsl(var(--cocktail-card-border))]"
                    } text-[hsl(var(--cocktail-text))]`}
                  >
                    {isCleaning ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <span className="font-bold text-base">P{pump.id}</span>
                        {isSelected && <Check className="h-3 w-3 text-[hsl(var(--cocktail-primary))]" />}
                      </>
                    )}
                  </Button>
                  <span className="text-sm text-[hsl(var(--cocktail-text))] text-center font-medium">
                    {ingredientName || <span className="text-[hsl(var(--cocktail-text-muted))] italic">Leer</span>}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Mehrfach-Auswahl Aktionen */}
          {selectedPumpsForCleaning.size > 0 && (
            <div className="flex gap-2">
              <Button
                onClick={cleanSelectedPumps}
                disabled={manualCleaningPumps.size > 0}
                className="flex-1 bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black"
              >
                <Droplets className="mr-2 h-4 w-4" />
                {selectedPumpsForCleaning.size} Pumpen gleichzeitig reinigen
              </Button>
              <Button
                onClick={() => setSelectedPumpsForCleaning(new Set())}
                disabled={manualCleaningPumps.size > 0}
                variant="outline"
                className="bg-[hsl(var(--cocktail-card-bg))] border-[hsl(var(--cocktail-card-border))] text-[hsl(var(--cocktail-text))]"
              >
                Auswahl aufheben
              </Button>
            </div>
          )}

          {manualCleaningPumps.size > 0 && (
            <Alert className="bg-[hsl(var(--cocktail-primary))]/10 border-[hsl(var(--cocktail-primary))]/30">
              <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--cocktail-primary))]" />
              <AlertDescription className="text-[hsl(var(--cocktail-text))]">
                {manualCleaningPumps.size === 1
                  ? `Pumpe ${Array.from(manualCleaningPumps)[0]} wird gereinigt...`
                  : `${manualCleaningPumps.size} Pumpen werden gereinigt (mit 1 Sek Verzögerung)...`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
