"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import type { PumpConfig } from "@/types/pump"
import { savePumpConfig, calibratePump, getPumpConfig } from "@/lib/cocktail-machine"
import { getAllIngredients } from "@/lib/ingredients"
import { Loader2, Beaker, Save, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import VirtualKeyboard from "./virtual-keyboard"

interface PumpCalibrationProps {
  pumpConfig: PumpConfig[]
  onConfigUpdate?: () => Promise<void>
}

export default function PumpCalibration({ pumpConfig: initialConfig, onConfigUpdate }: PumpCalibrationProps) {
  const [pumpConfig, setPumpConfig] = useState<PumpConfig[]>(initialConfig)
  const [saving, setSaving] = useState(false)
  const [calibrating, setCalibrating] = useState<number | null>(null)
  const [measuredAmount, setMeasuredAmount] = useState<string>("")
  const [calibrationStep, setCalibrationStep] = useState<"idle" | "measuring" | "input">("idle")
  const [currentPumpId, setCurrentPumpId] = useState<number | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showInputDialog, setShowInputDialog] = useState(false)
  const [allIngredients, setAllIngredients] = useState(getAllIngredients())
  const [pumpCalibrationTimes, setPumpCalibrationTimes] = useState<Record<number, number>>({})
  const [currentCalibrationTime, setCurrentCalibrationTime] = useState<number>(2)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadPumpConfig()
    setAllIngredients(getAllIngredients())
    const initialTimes: Record<number, number> = {}
    initialConfig.forEach(pump => {
      initialTimes[pump.id] = 2 // Default 2 seconds
    })
    setPumpCalibrationTimes(initialTimes)
  }, [])

  const loadPumpConfig = async () => {
    try {
      setLoading(true)
      const config = await getPumpConfig()
      setPumpConfig(config)
    } catch (error) {
      console.error("Fehler beim Laden der Pumpenkonfiguration:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSpeedChange = (pumpId: number, speed: number) => {
    setPumpConfig((prev) => prev.map((pump) => (pump.id === pumpId ? { ...pump, speed } : pump)))
  }

  const handleAntiDripChange = (pumpId: number, antiDripMl: number) => {
    setPumpConfig((prev) => prev.map((pump) => (pump.id === pumpId ? { ...pump, antiDripMl } : pump)))
  }

  const handleIngredientChange = (pumpId: number, ingredient: string) => {
    setPumpConfig((prev) => prev.map((pump) => (pump.id === pumpId ? { ...pump, ingredient } : pump)))
  }

  const handleCalibrationTimeChange = (pumpId: number, time: number) => {
    setPumpCalibrationTimes(prev => ({ ...prev, [pumpId]: time }))
  }

  const handleToggleEnabled = async (pumpId: number) => {
    const updatedConfig = pumpConfig.map((pump) => (pump.id === pumpId ? { ...pump, enabled: !pump.enabled } : pump))
    setPumpConfig(updatedConfig)

    setSaving(true)
    try {
      await savePumpConfig(updatedConfig)
      console.log(
        `Pumpe ${pumpId} ${updatedConfig.find((p) => p.id === pumpId)?.enabled ? "aktiviert" : "deaktiviert"}`,
      )

      if (onConfigUpdate) {
        await onConfigUpdate()
      }
    } catch (error) {
      console.error("Fehler beim Speichern der Pumpen-Aktivierung:", error)
      setPumpConfig(pumpConfig)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await savePumpConfig(pumpConfig)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)

      if (onConfigUpdate) {
        await onConfigUpdate()
      }
    } catch (error) {
      console.error("Fehler beim Speichern der Pumpenkonfiguration:", error)
    } finally {
      setSaving(false)
    }
  }

  const startCalibration = async (pumpId: number) => {
    const calibrationTime = pumpCalibrationTimes[pumpId] || 2
    setCurrentCalibrationTime(calibrationTime)
    setCurrentPumpId(pumpId)
    setCalibrationStep("measuring")
    setCalibrating(pumpId)

    try {
      await calibratePump(pumpId, calibrationTime * 1000)
      setCalibrationStep("input")
      setMeasuredAmount("")
      setShowInputDialog(true)
    } catch (error) {
      console.error("Fehler bei der Kalibrierung:", error)
      setCalibrationStep("idle")
    } finally {
      setCalibrating(null)
    }
  }

  const handleMeasuredAmountChange = (value: string) => {
    if (/^\d*\.?\d*$/.test(value) || value === "") {
      setMeasuredAmount(value)
    }
  }

  const handleKeyPress = (key: string) => {
    if (key === "." && measuredAmount.includes(".")) {
      return
    }
    setMeasuredAmount((prev) => prev + key)
  }

  const handleBackspace = () => {
    setMeasuredAmount((prev) => prev.slice(0, -1))
  }

  const handleClear = () => {
    setMeasuredAmount("")
  }

  const saveCalibration = async () => {
    if (currentPumpId === null || measuredAmount === "") {
      setShowInputDialog(false)
      setCalibrationStep("idle")
      return
    }

    const amount = Number.parseFloat(measuredAmount)
    if (isNaN(amount) || amount <= 0) {
      setShowInputDialog(false)
      setCalibrationStep("idle")
      return
    }

    const flowRate = amount / currentCalibrationTime

    const updatedConfig = pumpConfig.map((pump) => (pump.id === currentPumpId ? { ...pump, flowRate } : pump))

    setPumpConfig(updatedConfig)

    setSaving(true)
    try {
      await savePumpConfig(updatedConfig)

      const pump = updatedConfig.find((p) => p.id === currentPumpId)
      if (pump) {
        console.log(`Kalibrierung für Pumpe ${pump.id} (${pump.ingredient}) aktualisiert: ${flowRate} ml/s (${currentCalibrationTime}s)`)
      }

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)

      if (onConfigUpdate) {
        await onConfigUpdate()
      }
    } catch (error) {
      console.error("Fehler beim Speichern der Kalibrierung:", error)
    } finally {
      setSaving(false)
    }

    setMeasuredAmount("")
    setCalibrationStep("idle")
    setCurrentPumpId(null)
    setShowInputDialog(false)
  }

  const cancelCalibration = () => {
    setMeasuredAmount("")
    setCalibrationStep("idle")
    setCurrentPumpId(null)
    setShowInputDialog(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--cocktail-primary))]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="bg-black border-[hsl(var(--cocktail-card-border))]">
        <CardHeader>
          <CardTitle className="text-white">CocktailBot Pumpenkalibrierung</CardTitle>
          <CardDescription className="text-white">
            Wähle für jede Pumpe die Kalibrierungszeit (2-5 Sekunden) und starte den Kalibrierungsvorgang. Messe die geförderte Menge in ml und trage den Wert ein.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end items-center mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={loadPumpConfig}
              disabled={loading || saving}
              className="flex items-center gap-1 bg-[hsl(var(--cocktail-card-bg))] text-white border-[hsl(var(--cocktail-card-border))] hover:bg-[hsl(var(--cocktail-card-border))]"
            >
              <RefreshCw className="h-4 w-4" />
              Konfiguration neu laden
            </Button>
          </div>

          {calibrationStep === "measuring" && (
            <Alert className="mb-4 bg-[hsl(var(--cocktail-accent))]/10 border-[hsl(var(--cocktail-accent))]/30">
              <Beaker className="h-4 w-4 text-[hsl(var(--cocktail-accent))]" />
              <AlertDescription className="text-[hsl(var(--cocktail-text))]">
                Pumpe {currentPumpId} läuft für {currentCalibrationTime} Sekunden. Bitte stelle ein Messgefäß bereit und miss die geförderte
                Menge in ml.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* Spaltenüberschriften */}
            <div className="grid grid-cols-13 gap-2 items-center text-xs text-gray-400 pb-1 border-b border-[hsl(var(--cocktail-card-border))]">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Zutat</div>
              <div className="col-span-1">Zeit</div>
              <div className="col-span-1">Speed</div>
              <div className="col-span-1">Anti-Tropf</div>
              <div className="col-span-2">Durchfluss</div>
              <div className="col-span-2">Kalibrieren</div>
              <div className="col-span-2">Status</div>
            </div>
            {pumpConfig.map((pump) => (
              <div key={pump.id} className="grid grid-cols-13 gap-2 items-center">
                <div className="col-span-1">
                  <span className="font-medium text-white">{pump.id}</span>
                </div>

                <div className="col-span-3">
                  <Select
                    value={pump.ingredient}
                    onValueChange={(value) => handleIngredientChange(pump.id, value)}
                    disabled={calibrationStep !== "idle" || !pump.enabled}
                  >
                    <SelectTrigger
                      className={`${pump.enabled ? "bg-[hsl(var(--cocktail-card-bg))]" : "bg-gray-800 opacity-50"} text-white border-[hsl(var(--cocktail-card-border))]`}
                    >
                      <SelectValue placeholder="Zutat wählen" />
                    </SelectTrigger>
                    <SelectContent className="bg-black text-white border-[hsl(var(--cocktail-card-border))]">
                      {allIngredients.map((ingredient) => (
                        <SelectItem key={ingredient.id} value={ingredient.id}>
                          {ingredient.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Kalibrierungszeit */}
                <div className="col-span-1">
                  <Select
                    value={(pumpCalibrationTimes[pump.id] || 2).toString()}
                    onValueChange={(value) => handleCalibrationTimeChange(pump.id, Number(value))}
                    disabled={calibrationStep !== "idle" || !pump.enabled}
                  >
                    <SelectTrigger
                      className={`w-full ${pump.enabled ? "bg-[hsl(var(--cocktail-card-bg))]" : "bg-gray-800 opacity-50"} text-white border-[hsl(var(--cocktail-card-border))]`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black text-white border-[hsl(var(--cocktail-card-border))]">
                      <SelectItem value="2">2s</SelectItem>
                      <SelectItem value="3">3s</SelectItem>
                      <SelectItem value="4">4s</SelectItem>
                      <SelectItem value="5">5s</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* PWM-Geschwindigkeit */}
                <div className="col-span-1">
                  <Select
                    value={(pump.speed ?? 100).toString()}
                    onValueChange={(value) => handleSpeedChange(pump.id, Number(value))}
                    disabled={calibrationStep !== "idle" || !pump.enabled}
                  >
                    <SelectTrigger
                      className={`w-full ${pump.enabled ? "bg-[hsl(var(--cocktail-card-bg))]" : "bg-gray-800 opacity-50"} text-white border-[hsl(var(--cocktail-card-border))]`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black text-white border-[hsl(var(--cocktail-card-border))]">
                      <SelectItem value="25">25%</SelectItem>
                      <SelectItem value="50">50%</SelectItem>
                      <SelectItem value="75">75%</SelectItem>
                      <SelectItem value="100">100%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Anti-Tropf ml */}
                <div className="col-span-1">
                  <Select
                    value={(pump.antiDripMl ?? 0.5).toString()}
                    onValueChange={(value) => handleAntiDripChange(pump.id, Number(value))}
                    disabled={calibrationStep !== "idle" || !pump.enabled}
                  >
                    <SelectTrigger
                      className={`w-full ${pump.enabled ? "bg-[hsl(var(--cocktail-card-bg))]" : "bg-gray-800 opacity-50"} text-white border-[hsl(var(--cocktail-card-border))]`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black text-white border-[hsl(var(--cocktail-card-border))]">
                      <SelectItem value="0">Aus</SelectItem>
                      <SelectItem value="0.3">0.3 ml</SelectItem>
                      <SelectItem value="0.5">0.5 ml</SelectItem>
                      <SelectItem value="0.8">0.8 ml</SelectItem>
                      <SelectItem value="1.0">1.0 ml</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Durchflussrate (readonly, nach Kalibrierung) */}
                <div className="col-span-2">
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      value={pump.flowRate.toFixed(1)}
                      readOnly
                      className={`w-full ${pump.enabled ? "bg-[hsl(var(--cocktail-bg))]" : "bg-gray-800 opacity-50"} text-white border-[hsl(var(--cocktail-card-border))]`}
                    />
                    <span className="text-xs whitespace-nowrap text-white">ml/s</span>
                  </div>
                </div>

                <div className="col-span-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-[hsl(var(--cocktail-card-bg))] text-[hsl(var(--cocktail-text))] border-[hsl(var(--cocktail-card-border))] hover:bg-[hsl(var(--cocktail-card-border))] hover:text-[hsl(var(--cocktail-primary))]"
                    onClick={() => startCalibration(pump.id)}
                    disabled={calibrationStep !== "idle" || calibrating !== null || !pump.enabled}
                  >
                    {calibrating === pump.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kalibrieren"}
                  </Button>
                </div>

                <div className="col-span-2">
                  <Button
                    variant={pump.enabled ? "destructive" : "default"}
                    size="sm"
                    className={`w-full ${
                      pump.enabled
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black"
                    }`}
                    onClick={() => handleToggleEnabled(pump.id)}
                    disabled={calibrationStep !== "idle"}
                  >
                    {pump.enabled ? "Deaktivieren" : "Aktivieren"}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            className="w-full mt-6 bg-[hsl(var(--cocktail-primary))] text-black hover:bg-[hsl(var(--cocktail-primary-hover))]"
            onClick={handleSave}
            disabled={saving || calibrationStep !== "idle"}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Konfiguration speichern
              </>
            )}
          </Button>

          {showSuccess && (
            <Alert className="mt-4 bg-[hsl(var(--cocktail-success))]/10 border-[hsl(var(--cocktail-success))]/30">
              <AlertDescription className="text-[hsl(var(--cocktail-success))]">
                Pumpenkonfiguration erfolgreich gespeichert!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Dialog open={showInputDialog} onOpenChange={(open) => !open && cancelCalibration()}>
        <DialogContent className="bg-black border-[hsl(var(--cocktail-card-border))] sm:max-w-md text-white">
          <DialogHeader>
            <DialogTitle>Gemessene Menge eingeben</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-[hsl(var(--cocktail-text))]">
              Bitte gib die gemessene Menge für Pumpe {currentPumpId} ein (Kalibrierungszeit: {currentCalibrationTime}s):
            </p>

            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                type="text"
                value={measuredAmount}
                onChange={(e) => handleMeasuredAmountChange(e.target.value)}
                placeholder="Menge in ml"
                className="text-xl h-12 text-center bg-[hsl(var(--cocktail-bg))] border-[hsl(var(--cocktail-card-border))]"
                autoFocus
                readOnly
              />
              <span className="text-sm">ml</span>
            </div>

            <VirtualKeyboard
              onKeyPress={handleKeyPress}
              onBackspace={handleBackspace}
              onClear={handleClear}
              onConfirm={saveCalibration}
              allowDecimal={true}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancelCalibration}
              className="bg-[hsl(var(--cocktail-card-bg))] text-white border-[hsl(var(--cocktail-card-border))] hover:bg-[hsl(var(--cocktail-card-border))]"
            >
              Abbrechen
            </Button>
            <Button
              onClick={saveCalibration}
              disabled={!measuredAmount}
              className="bg-[hsl(var(--cocktail-primary))] text-black hover:bg-[hsl(var(--cocktail-primary-hover))]"
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
