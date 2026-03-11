"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, Zap, Palette, RotateCcw, Play, Loader2, Sun } from 'lucide-react'
import { toast } from "@/components/ui/use-toast"
import { type LightingConfig, defaultConfig } from "@/lib/lighting-config-types"

const colorPresets = [
  { name: "Rot", value: "#ff0000" },
  { name: "Grün", value: "#00ff00" },
  { name: "Blau", value: "#0000ff" },
  { name: "Gelb", value: "#ffff00" },
  { name: "Magenta", value: "#ff00ff" },
  { name: "Cyan", value: "#00ffff" },
  { name: "Weiß", value: "#ffffff" },
  { name: "Orange", value: "#ff8000" },
  { name: "Lila", value: "#8000ff" },
  { name: "Pink", value: "#ff0080" },
]

const idleSchemes = [
  { name: "Regenbogen", value: "rainbow", icon: "🌈" },
  { name: "Pulsieren", value: "pulse", icon: "✨" },
  { name: "Blitz", value: "blink", icon: "⚡" },
  { name: "Statisch", value: "static", icon: "⚪" },
  { name: "Aus", value: "off", icon: "⚫" },
]

export default function LightingControl() {
  const [config, setConfig] = useState<LightingConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)
  const [brightness, setBrightness] = useState(128) // 0-255, default 50%
  const [tempBrightness, setTempBrightness] = useState(128)

  useEffect(() => {
    loadConfig()
    loadBrightness()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/lighting-config")
      if (response.ok) {
        const loadedConfig = await response.json()
        setConfig(loadedConfig)
      } else {
        setConfig(defaultConfig)
      }
    } catch (error) {
      console.error("[v0] Error loading lighting config:", error)
      setConfig(defaultConfig)
    } finally {
      setLoading(false)
    }
  }

  const loadBrightness = () => {
    try {
      const saved = localStorage.getItem("led-brightness")
      if (saved) {
        const value = Number.parseInt(saved)
        setBrightness(value)
        setTempBrightness(value)
      }
    } catch (error) {
      console.error("[v0] Error loading brightness:", error)
    }
  }

  const applyLighting = async (mode: "preparation" | "finished" | "idle" | "off", isTest = false) => {
    setApplying(mode)
    try {
      console.log("[v0] Applying lighting mode:", mode, "isTest:", isTest)

      console.log("[v0] Saving config before applying:", config)
      const saveResponse = await fetch("/api/lighting-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (!saveResponse.ok) {
        throw new Error("Failed to save configuration")
      }
      console.log("[v0] Config saved successfully")

      let body: any = {}

      if (mode === "preparation") {
        body = {
          mode: "cocktailPreparation",
          blinking: config.cocktailPreparation.blinking,
          color: config.cocktailPreparation.color,
        }
      } else if (mode === "finished") {
        body = {
          mode: "cocktailFinished",
          blinking: config.cocktailFinished.blinking,
          color: config.cocktailFinished.color,
        }
      } else if (mode === "idle") {
        if (config.idleMode.scheme === "static" && config.idleMode.colors.length > 0) {
          body = { mode: "color", color: config.idleMode.colors[0] }
        } else if (config.idleMode.scheme === "off") {
          body = { mode: "off" }
        } else if (config.idleMode.scheme === "pulse" || config.idleMode.scheme === "blink") {
          body = {
            mode: "idle",
            scheme: config.idleMode.scheme,
            color: config.idleMode.colors.length > 0 ? config.idleMode.colors[0] : "#ffffff",
          }
        } else {
          body = { mode: "idle", scheme: config.idleMode.scheme }
        }
      } else if (mode === "off") {
        body = { mode: "off" }
      }

      const res = await fetch("/api/lighting-control", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })

      console.log("[v0] API response status:", res.status)

      if (!res.ok) {
        const errorText = await res.text()
        console.error("[v0] API error response:", errorText)
        throw new Error(`HTTP ${res.status}: ${errorText}`)
      }

      const modeNames: Record<string, string> = {
        preparation: "Zubereitung",
        finished: "Fertig",
        idle: "Idle",
        off: "Aus",
      }

      if (isTest && (mode === "preparation" || mode === "finished")) {
        toast({
          title: "Test-Modus",
          description: `${modeNames[mode]} wird für 3 Sekunden angezeigt, dann zurück zum Idle-Modus.`,
        })

        setTimeout(async () => {
          console.log("[v0] Test complete, returning to idle mode")
          await fetch("/api/lighting-control", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ mode: "idle" }),
          })
        }, 3000)
      } else {
        toast({
          title: "Angewendet & Gespeichert",
          description: `${modeNames[mode] || mode} Beleuchtung wurde dauerhaft aktiviert und gespeichert.`,
        })
      }

      console.log("[v0] Lighting applied and saved successfully")
    } catch (error) {
      console.error("[v0] Error applying lighting:", error)
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler"
      toast({
        title: "Fehler beim Anwenden",
        description: `Beleuchtung konnte nicht angewendet werden: ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setApplying(null)
    }
  }

  const applyBrightness = async (value: number) => {
    try {
      setBrightness(value)
      localStorage.setItem("led-brightness", value.toString())

      const response = await fetch("/api/lighting-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "brightness",
          brightness: value,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to set brightness")
      }

      console.log("[v0] Brightness set to:", value)
    } catch (error) {
      console.error("[v0] Error setting brightness:", error)
      toast({
        title: "Fehler",
        description: "Helligkeit konnte nicht angewendet werden",
        variant: "destructive",
      })
    }
  }

  const handleApplyBrightness = async () => {
    setApplying("brightness")
    try {
      setBrightness(tempBrightness)
      localStorage.setItem("led-brightness", tempBrightness.toString())

      const response = await fetch("/api/lighting-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "brightness",
          brightness: tempBrightness,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to set brightness")
      }

      // Re-apply current idle lighting mode to make brightness change visible immediately
      await applyLighting("idle", false)

      toast({
        title: "Helligkeit angewendet",
        description: `Helligkeit auf ${Math.round((tempBrightness / 255) * 100)}% eingestellt.`,
      })

      console.log("[v0] Brightness set to:", tempBrightness)
    } catch (error) {
      console.error("[v0] Error setting brightness:", error)
      toast({
        title: "Fehler",
        description: "Helligkeit konnte nicht angewendet werden",
        variant: "destructive",
      })
    } finally {
      setApplying(null)
    }
  }

  const resetToDefault = () => {
    setConfig(defaultConfig)
  }

  const updateConfig = (path: string, value: any) => {
    setConfig((prev) => {
      const newConfig = JSON.parse(JSON.stringify(prev))
      const keys = path.split(".")
      let current = newConfig

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value

      return newConfig
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 bg-[hsl(var(--cocktail-bg))] min-h-[400px]">
        <div className="text-center space-y-4">
          <Lightbulb className="h-16 w-16 mx-auto animate-pulse text-[hsl(var(--cocktail-primary))]" />
          <h3 className="text-xl font-semibold text-[hsl(var(--cocktail-text))]">
            Beleuchtungseinstellungen werden geladen
          </h3>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-[hsl(var(--cocktail-bg))] min-h-screen p-4 lg:p-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[hsl(var(--cocktail-primary))]/10 border border-[hsl(var(--cocktail-primary))]/20">
              <Lightbulb className="h-7 w-7 text-[hsl(var(--cocktail-primary))]" />
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-[hsl(var(--cocktail-text))]">LED-Beleuchtung</h2>
              <p className="text-sm text-[hsl(var(--cocktail-text-muted))]">Steuern Sie die RGB-Beleuchtung</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={resetToDefault}
            className="bg-[hsl(var(--cocktail-button-bg))] hover:bg-[hsl(var(--cocktail-button-hover))] text-[hsl(var(--cocktail-text))] border-[hsl(var(--cocktail-card-border))] flex-1 lg:flex-none h-12 px-6"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Standard
          </Button>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-[hsl(var(--cocktail-card-bg))] to-[hsl(var(--cocktail-card-bg))]/80 border-[hsl(var(--cocktail-card-border))]/50 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg text-[hsl(var(--cocktail-text))]">
            <div className="p-2 rounded-lg bg-[hsl(var(--cocktail-primary))]/10">
              <Sun className="h-5 w-5 text-[hsl(var(--cocktail-primary))]" />
            </div>
            Globale Helligkeit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-[hsl(var(--cocktail-text))] w-16">
                {Math.round((tempBrightness / 255) * 100)}%
              </span>
              <input
                type="range"
                min="0"
                max="255"
                value={tempBrightness}
                onChange={(e) => setTempBrightness(Number.parseInt(e.target.value))}
                className="flex-1 h-3 bg-[hsl(var(--cocktail-card-bg))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--cocktail-primary))]"
              />
              <span className="text-sm text-[hsl(var(--cocktail-text-muted))] w-16 text-right">{tempBrightness}/255</span>
            </div>
            <Button
              onClick={handleApplyBrightness}
              disabled={applying !== null || tempBrightness === brightness}
              className="w-full bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black font-semibold h-12 text-base px-4 disabled:opacity-50"
            >
              {applying === "brightness" ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Wird angewendet...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Anwenden
                </>
              )}
            </Button>
            <p className="text-xs text-[hsl(var(--cocktail-text-muted))]">
              Steuert die Helligkeit aller LED-Modi (0-255)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-[hsl(var(--cocktail-card-bg))] to-[hsl(var(--cocktail-card-bg))]/80 border-[hsl(var(--cocktail-card-border))]/50 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg text-[hsl(var(--cocktail-text))]">
              <div className="p-2 rounded-lg bg-[hsl(var(--cocktail-primary))]/10">
                <Zap className="h-5 w-5 text-[hsl(var(--cocktail-primary))]" />
              </div>
              Zubereitung
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-[hsl(var(--cocktail-text))]">Farbe wählen</label>
              <div className="grid grid-cols-5 gap-2">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => updateConfig("cocktailPreparation.color", preset.value)}
                    className={`w-full aspect-square rounded-xl border-2 transition-all hover:scale-110 ${
                      config.cocktailPreparation.color === preset.value
                        ? "border-[hsl(var(--cocktail-primary))] scale-110 shadow-lg"
                        : "border-[hsl(var(--cocktail-card-border))]"
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.name}
                  />
                ))}
              </div>
              <input
                type="color"
                value={config.cocktailPreparation.color}
                onChange={(e) => updateConfig("cocktailPreparation.color", e.target.value)}
                className="w-full h-12 rounded-xl border-2 border-[hsl(var(--cocktail-card-border))] cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[hsl(var(--cocktail-card-bg))]/50 border border-[hsl(var(--cocktail-card-border))]/30">
              <label className="text-sm font-semibold text-[hsl(var(--cocktail-text))]">Blinken</label>
              <Button
                variant={config.cocktailPreparation.blinking ? "default" : "outline"}
                size="sm"
                onClick={() => updateConfig("cocktailPreparation.blinking", !config.cocktailPreparation.blinking)}
                className={
                  config.cocktailPreparation.blinking
                    ? "bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black font-semibold h-10 px-6"
                    : "bg-[hsl(var(--cocktail-button-bg))] hover:bg-[hsl(var(--cocktail-button-hover))] text-[hsl(var(--cocktail-text))] border-[hsl(var(--cocktail-card-border))] h-10 px-6"
                }
              >
                {config.cocktailPreparation.blinking ? "Ein" : "Aus"}
              </Button>
            </div>
            <div className="pt-2">
              <Button
                onClick={() => applyLighting("preparation", true)} // isTest = true for 3 second preview
                disabled={applying !== null}
                className="w-full bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black font-semibold h-14 text-base px-4 disabled:opacity-50"
              >
                {applying === "preparation" ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Wird angewendet...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Anwenden
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[hsl(var(--cocktail-card-bg))] to-[hsl(var(--cocktail-card-bg))]/80 border-[hsl(var(--cocktail-card-border))]/50 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg text-[hsl(var(--cocktail-text))]">
              <Badge className="bg-[hsl(var(--cocktail-primary))] text-black font-bold text-base px-3 py-1">✓</Badge>
              Fertig
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-[hsl(var(--cocktail-text))]">Farbe wählen</label>
              <div className="grid grid-cols-5 gap-2">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => updateConfig("cocktailFinished.color", preset.value)}
                    className={`w-full aspect-square rounded-xl border-2 transition-all hover:scale-110 ${
                      config.cocktailFinished.color === preset.value
                        ? "border-[hsl(var(--cocktail-primary))] scale-110 shadow-lg"
                        : "border-[hsl(var(--cocktail-card-border))]"
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.name}
                  />
                ))}
              </div>
              <input
                type="color"
                value={config.cocktailFinished.color}
                onChange={(e) => updateConfig("cocktailFinished.color", e.target.value)}
                className="w-full h-12 rounded-xl border-2 border-[hsl(var(--cocktail-card-border))] cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[hsl(var(--cocktail-card-bg))]/50 border border-[hsl(var(--cocktail-card-border))]/30">
              <label className="text-sm font-semibold text-[hsl(var(--cocktail-text))]">Blinken</label>
              <Button
                variant={config.cocktailFinished.blinking ? "default" : "outline"}
                size="sm"
                onClick={() => updateConfig("cocktailFinished.blinking", !config.cocktailFinished.blinking)}
                className={
                  config.cocktailFinished.blinking
                    ? "bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black font-semibold h-10 px-6"
                    : "bg-[hsl(var(--cocktail-button-bg))] hover:bg-[hsl(var(--cocktail-button-hover))] text-[hsl(var(--cocktail-text))] border-[hsl(var(--cocktail-card-border))] h-10 px-6"
                }
              >
                {config.cocktailFinished.blinking ? "Ein" : "Aus"}
              </Button>
            </div>
            <div className="pt-2">
              <Button
                onClick={() => applyLighting("finished", true)} // isTest = true for 3 second preview
                disabled={applying !== null}
                className="w-full bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black font-semibold h-14 text-base px-4 disabled:opacity-50"
              >
                {applying === "finished" ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Wird angewendet...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Anwenden
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[hsl(var(--cocktail-card-bg))] to-[hsl(var(--cocktail-card-bg))]/80 border-[hsl(var(--cocktail-card-border))]/50 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg text-[hsl(var(--cocktail-text))]">
              <div className="p-2 rounded-lg bg-[hsl(var(--cocktail-primary))]/10">
                <Palette className="h-5 w-5 text-[hsl(var(--cocktail-primary))]" />
              </div>
              Idle-Modus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-[hsl(var(--cocktail-text))]">Farbschema</label>
              <div className="grid grid-cols-1 gap-2">
                {idleSchemes.map((scheme) => (
                  <Button
                    key={scheme.value}
                    variant={config.idleMode.scheme === scheme.value ? "default" : "outline"}
                    onClick={() => updateConfig("idleMode.scheme", scheme.value)}
                    className={
                      config.idleMode.scheme === scheme.value
                        ? "bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black font-semibold h-12 justify-start"
                        : "bg-[hsl(var(--cocktail-button-bg))] hover:bg-[hsl(var(--cocktail-button-hover))] text-[hsl(var(--cocktail-text))] border-[hsl(var(--cocktail-card-border))] h-12 justify-start"
                    }
                  >
                    <span className="text-xl mr-3">{scheme.icon}</span>
                    {scheme.name}
                  </Button>
                ))}
              </div>
            </div>
            {(config.idleMode.scheme === "static" ||
              config.idleMode.scheme === "pulse" ||
              config.idleMode.scheme === "blink") && (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-[hsl(var(--cocktail-text))]">
                  {config.idleMode.scheme === "static"
                    ? "Statische Farbe"
                    : config.idleMode.scheme === "pulse"
                      ? "Pulsier-Farbe"
                      : "Blitz-Farbe"}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => updateConfig("idleMode.colors", [preset.value])}
                      className={`w-full aspect-square rounded-xl border-2 transition-all hover:scale-110 ${
                        config.idleMode.colors[0] === preset.value
                          ? "border-[hsl(var(--cocktail-primary))] scale-110 shadow-lg"
                          : "border-[hsl(var(--cocktail-card-border))]"
                      }`}
                      style={{ backgroundColor: preset.value }}
                      title={preset.name}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={config.idleMode.colors[0] || "#ffffff"}
                  onChange={(e) => updateConfig("idleMode.colors", [e.target.value])}
                  className="w-full h-12 rounded-xl border-2 border-[hsl(var(--cocktail-card-border))] cursor-pointer"
                />
              </div>
            )}
            <div className="pt-2">
              <Button
                onClick={() => applyLighting("idle", false)}
                disabled={applying !== null}
                className="w-full bg-[hsl(var(--cocktail-primary))] hover:bg-[hsl(var(--cocktail-primary-hover))] text-black font-semibold h-14 text-base px-4 disabled:opacity-50"
              >
                {applying === "idle" ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Wird angewendet...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Anwenden
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
