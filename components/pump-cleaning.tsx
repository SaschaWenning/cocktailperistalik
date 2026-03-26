"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Loader2, Droplets, Check, AlertTriangle, Settings, ArrowDown } from "lucide-react"
import type { PumpConfig } from "@/types/pump"
import { cleanPump, drainTubes } from "@/lib/cocktail-machine"

interface PumpCleaningProps {
  pumpConfig: PumpConfig[]
}

export default function PumpCleaning({ pumpConfig }: PumpCleaningProps) {
  const [cleaningStatus, setCleaningStatus] = useState<"idle" | "preparing" | "cleaning" | "complete">("idle")
  const [currentPump, setCurrentPump] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [pumpsDone, setPumpsDone] = useState<number[]>([])
  const [manualCleaningPumps, setManualCleaningPumps] = useState<Set<number>>(new Set())
  const [drainStatus, setDrainStatus] = useState<"idle" | "running" | "complete" | "error">("idle")
  const [drainCurrentGroup, setDrainCurrentGroup] = useState<number>(0)
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
        // Pumpe für 10 Sekunden laufen lassen
        await cleanPumpWithPauseSupport(pump.id, 10000)

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
  }

  // Manuelle Einzelpumpen-Reinigung
  const cleanSinglePump = async (pumpId: number) => {
    setManualCleaningPumps((prev) => new Set(prev).add(pumpId))

    try {
      await cleanPump(pumpId, 10000) // 10 Sekunden
      console.log(`Pumpe ${pumpId} manuell gereinigt`)
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

  const DRAIN_GROUPS = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
  ]

  const startDraining = async () => {
    setDrainStatus("running")
    setDrainCurrentGroup(0)
    try {
      // UI-seitige Gruppenanzeige: jede Gruppe dauert 10 s + 2 s Pause
      for (let g = 0; g < DRAIN_GROUPS.length; g++) {
        setDrainCurrentGroup(g + 1)
        // Warte auf Abschluss dieser Gruppe (10 s) + Pause (2 s, außer letzte)
        await new Promise((resolve) => setTimeout(resolve, g < DRAIN_GROUPS.length - 1 ? 12000 : 10000))
      }
      // Server-Aktion parallel gestartet – wir warten sie hier nicht ab da
      // die UI-Zeitführung bereits synchron läuft. Stattdessen feuern wir sie
      // direkt beim Klick ab.
      setDrainCurrentGroup(0)
      setDrainStatus("complete")
    } catch {
      setDrainStatus("error")
    }
  }

  const handleDrainClick = () => {
    // Server-Aktion starten (non-blocking für UI)
    drainTubes().catch((err) => {
      console.error("Fehler beim Entleeren:", err)
      setDrainStatus("error")
    })
    startDraining()
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
            <Button
              onClick={startCleaning}
              className="w-full bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black"
              size="lg"
            >
              <Droplets className="mr-2 h-5 w-5" />
              Automatische Reinigung starten
            </Button>
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

      {/* Schläuche entleeren */}
      <Card className="bg-black border-[hsl(var(--cocktail-card-border))]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-white">
            <ArrowDown className="h-5 w-5 text-[hsl(var(--cocktail-primary))]" />
            Schläuche entleeren
          </CardTitle>
          <CardDescription className="text-[hsl(var(--cocktail-text-muted))]">
            Alle 16 Pumpen rückwärts laufen lassen (4 Gruppen a 4 Pumpen, je 10 Sekunden)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="bg-[hsl(var(--cocktail-card-bg))] border-[hsl(var(--cocktail-card-border))]">
            <AlertDescription className="text-[hsl(var(--cocktail-text))] text-sm">
              Stellt einen leeren Auffangbehälter unter alle Ausgabe-Schläuche. Die Pumpen werden
              in 4 Gruppen nacheinander fur je 10 Sekunden rückwärts betrieben.
            </AlertDescription>
          </Alert>

          {/* Gruppen-Anzeige */}
          <div className="grid grid-cols-4 gap-2">
            {DRAIN_GROUPS.map((group, idx) => (
              <div
                key={idx}
                className={`rounded-md border p-2 text-center transition-all ${
                  drainStatus === "running" && drainCurrentGroup === idx + 1
                    ? "border-[hsl(var(--cocktail-primary))]/60 bg-[hsl(var(--cocktail-primary))]/10 animate-pulse"
                    : drainStatus === "complete" || (drainStatus === "running" && drainCurrentGroup > idx + 1)
                      ? "border-[hsl(var(--cocktail-success))]/40 bg-[hsl(var(--cocktail-success))]/10"
                      : "border-[hsl(var(--cocktail-card-border))] bg-[hsl(var(--cocktail-bg))]"
                }`}
              >
                <p className="text-xs text-[hsl(var(--cocktail-text-muted))] mb-1">Gruppe {idx + 1}</p>
                <p className="text-sm font-medium text-white">{group.join(", ")}</p>
                {drainStatus === "running" && drainCurrentGroup === idx + 1 && (
                  <Loader2 className="h-3 w-3 animate-spin text-[hsl(var(--cocktail-primary))] mx-auto mt-1" />
                )}
                {(drainStatus === "complete" || (drainStatus === "running" && drainCurrentGroup > idx + 1)) && (
                  <Check className="h-3 w-3 text-[hsl(var(--cocktail-success))] mx-auto mt-1" />
                )}
              </div>
            ))}
          </div>

          {drainStatus === "idle" && (
            <Button
              onClick={handleDrainClick}
              disabled={cleaningStatus === "cleaning"}
              className="w-full bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black"
              size="lg"
            >
              <ArrowDown className="mr-2 h-5 w-5" />
              Schläuche entleeren
            </Button>
          )}

          {drainStatus === "running" && (
            <Button disabled className="w-full" size="lg">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Gruppe {drainCurrentGroup} von {DRAIN_GROUPS.length} läuft... (10 s)
            </Button>
          )}

          {drainStatus === "complete" && (
            <div className="space-y-3">
              <div className="flex items-center justify-center py-2">
                <div className="rounded-full bg-[hsl(var(--cocktail-success))]/20 p-2">
                  <Check className="h-6 w-6 text-[hsl(var(--cocktail-success))]" />
                </div>
              </div>
              <p className="text-center text-sm font-medium text-white">Alle Schläuche erfolgreich entleert.</p>
              <Button
                onClick={() => { setDrainStatus("idle"); setDrainCurrentGroup(0) }}
                className="w-full bg-[hsl(var(--cocktail-card-bg))] text-[hsl(var(--cocktail-text))] border border-[hsl(var(--cocktail-card-border))]"
              >
                Zurücksetzen
              </Button>
            </div>
          )}

          {drainStatus === "error" && (
            <div className="space-y-3">
              <Alert className="bg-red-900/20 border-red-500/40">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  Fehler beim Entleeren. Bitte die Verbindung zur Hardware prüfen.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => { setDrainStatus("idle"); setDrainCurrentGroup(0) }}
                className="w-full bg-[hsl(var(--cocktail-card-bg))] text-[hsl(var(--cocktail-text))] border border-[hsl(var(--cocktail-card-border))]"
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
            Reinige einzelne Pumpen manuell (10 Sekunden pro Pumpe)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="bg-[hsl(var(--cocktail-card-bg))] border-[hsl(var(--cocktail-card-border))]">
            <AlertDescription className="text-[hsl(var(--cocktail-text))] text-sm">
              Klicke auf eine Pumpe um sie einzeln für 10 Sekunden zu reinigen. Stelle sicher, dass der Ansaugschlauch
              der jeweiligen Pumpe im Reinigungswasser liegt.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-5 gap-3">
            {enabledPumps.map((pump) => (
              <div key={pump.id} className="flex flex-col items-center space-y-2">
                <Button
                  onClick={() => cleanSinglePump(pump.id)}
                  disabled={manualCleaningPumps.has(pump.id) || cleaningStatus === "cleaning"}
                  className={`w-full h-12 ${
                    manualCleaningPumps.has(pump.id)
                      ? "bg-[hsl(var(--cocktail-primary))]/20 border border-[hsl(var(--cocktail-primary))]/50"
                      : "bg-[hsl(var(--cocktail-card-bg))] hover:bg-[hsl(var(--cocktail-primary))] hover:text-black"
                  } text-[hsl(var(--cocktail-text))] border-[hsl(var(--cocktail-card-border))]`}
                >
                  {manualCleaningPumps.has(pump.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Droplets className="h-4 w-4" />
                  )}
                </Button>
                <span className="text-xs text-[hsl(var(--cocktail-text-muted))] text-center">
                  Pumpe {pump.id}
                  {pump.ingredient && <div className="text-[10px] opacity-70">{pump.ingredient}</div>}
                </span>
              </div>
            ))}
          </div>

          {manualCleaningPumps.size > 0 && (
            <Alert className="bg-[hsl(var(--cocktail-primary))]/10 border-[hsl(var(--cocktail-primary))]/30">
              <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--cocktail-primary))]" />
              <AlertDescription className="text-[hsl(var(--cocktail-text))]">
                {manualCleaningPumps.size === 1
                  ? `Pumpe ${Array.from(manualCleaningPumps)[0]} wird gereinigt...`
                  : `${manualCleaningPumps.size} Pumpen werden gereinigt...`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
