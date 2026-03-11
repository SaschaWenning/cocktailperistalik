"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Settings, RotateCcw, Sparkles, Shield } from "lucide-react"
import { defaultTabConfig } from "@/lib/tab-config"
import type { AppConfig, TabConfig } from "@/lib/tab-config"
import { toast } from "@/components/ui/use-toast"

interface TabConfigSettingsProps {
  onClose: () => void
}

export default function TabConfigSettings({ onClose }: TabConfigSettingsProps) {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalConfig, setOriginalConfig] = useState<AppConfig | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      let currentConfig: AppConfig

      try {
        const stored = localStorage.getItem("tab-config")
        if (stored) {
          currentConfig = JSON.parse(stored)
        } else {
          const response = await fetch("/api/tab-config")
          if (!response.ok) throw new Error("Failed to load tab config")
          currentConfig = await response.json()
        }
      } catch (error) {
        console.error("[v0] Error loading tab config:", error)
        currentConfig = defaultTabConfig
      }

      setConfig(currentConfig)
      setOriginalConfig(JSON.parse(JSON.stringify(currentConfig)))
      setHasChanges(false)
    } catch (error) {
      console.error("[v0] Error loading tab config:", error)
      toast({
        title: "Fehler",
        description: "Konfiguration konnte nicht geladen werden.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    if (!config) return

    try {
      setSaving(true)

      localStorage.setItem("tab-config", JSON.stringify(config))

      try {
        const response = await fetch("/api/tab-config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
        })

        if (!response.ok) {
          console.warn("[v0] API save failed, but localStorage save succeeded")
        }
      } catch (error) {
        console.warn("[v0] API save failed, but localStorage save succeeded:", error)
      }

      setOriginalConfig(JSON.parse(JSON.stringify(config)))
      setHasChanges(false)

      toast({
        title: "Gespeichert",
        description: "Tab-Konfiguration wurde erfolgreich gespeichert.",
      })

      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      console.error("[v0] Error saving config:", error)
      toast({
        title: "Fehler",
        description: "Konfiguration konnte nicht gespeichert werden.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const moveTabToMain = async (tabId: string) => {
    if (!config) return

    const tab = config.tabs.find((t) => t.id === tabId)
    if (!tab || tab.alwaysVisible) return

    setConfig((prev) => {
      if (!prev) return prev
      const newConfig = {
        ...prev,
        tabs: prev.tabs.map((t) => (t.id === tabId ? { ...t, location: "main" as const } : t)),
      }
      setHasChanges(JSON.stringify(newConfig) !== JSON.stringify(originalConfig))
      return newConfig
    })
  }

  const moveTabToService = async (tabId: string) => {
    if (!config) return

    const tab = config.tabs.find((t) => t.id === tabId)
    if (!tab || tab.alwaysVisible) return

    setConfig((prev) => {
      if (!prev) return prev
      const newConfig = {
        ...prev,
        tabs: prev.tabs.map((t) => (t.id === tabId ? { ...t, location: "service" as const } : t)),
      }
      setHasChanges(JSON.stringify(newConfig) !== JSON.stringify(originalConfig))
      return newConfig
    })
  }

  const resetToDefault = async () => {
    setConfig(defaultTabConfig)
    setHasChanges(JSON.stringify(defaultTabConfig) !== JSON.stringify(originalConfig))
  }

  const moveTabUp = (tabId: string) => {
    if (!config) return

    setConfig((prev) => {
      if (!prev) return prev

      const mainTabs = prev.tabs.filter((t) => t.location === "main")
      const otherTabs = prev.tabs.filter((t) => t.location !== "main")

      const currentIndex = mainTabs.findIndex((t) => t.id === tabId)
      if (currentIndex <= 0) return prev

      const newMainTabs = [...mainTabs]
      const [movedTab] = newMainTabs.splice(currentIndex, 1)
      newMainTabs.splice(currentIndex - 1, 0, movedTab)

      const newConfig = {
        ...prev,
        tabs: [...newMainTabs, ...otherTabs],
      }

      setHasChanges(JSON.stringify(newConfig) !== JSON.stringify(originalConfig))
      return newConfig
    })
  }

  const moveTabDown = (tabId: string) => {
    if (!config) return

    setConfig((prev) => {
      if (!prev) return prev

      const mainTabs = prev.tabs.filter((t) => t.location === "main")
      const otherTabs = prev.tabs.filter((t) => t.location !== "main")

      const currentIndex = mainTabs.findIndex((t) => t.id === tabId)
      if (currentIndex >= mainTabs.length - 1) return prev

      const newMainTabs = [...mainTabs]
      const [movedTab] = newMainTabs.splice(currentIndex, 1)
      newMainTabs.splice(currentIndex + 1, 0, movedTab)

      const newConfig = {
        ...prev,
        tabs: [...newMainTabs, ...otherTabs],
      }

      setHasChanges(JSON.stringify(newConfig) !== JSON.stringify(originalConfig))
      return newConfig
    })
  }

  const renderTabCard = (tab: TabConfig, showMoveButtons = true, tabIndex?: number, totalTabs?: number) => (
    <Card
      key={tab.id}
      className="group bg-gray-900 border-gray-700 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] backdrop-blur-sm hover:border-green-500/50"
      style={{ backgroundColor: "hsl(var(--cocktail-card-bg))" }}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-8 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: "hsl(var(--cocktail-primary))" }}
            />
            <div className="flex flex-col">
              <span className="font-semibold text-lg" style={{ color: "hsl(var(--cocktail-text))" }}>
                {tab.name}
              </span>
              {tab.alwaysVisible && (
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className="text-xs border-gray-600"
                    style={{
                      backgroundColor: "hsl(var(--cocktail-button-bg))",
                      color: "hsl(var(--cocktail-text-muted))",
                    }}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Fest
                  </Badge>
                </div>
              )}
            </div>
          </div>
          {showMoveButtons && !tab.alwaysVisible && (
            <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
              {tab.location === "main" && typeof tabIndex === "number" && typeof totalTabs === "number" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => moveTabUp(tab.id)}
                    disabled={tabIndex === 0}
                    className="h-8 w-8 p-0 border-gray-600 hover:border-green-500 transition-all duration-200"
                    style={{
                      backgroundColor: "hsl(var(--cocktail-button-bg))",
                      color: "hsl(var(--cocktail-text))",
                    }}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => moveTabDown(tab.id)}
                    disabled={tabIndex === totalTabs - 1}
                    className="h-8 w-8 p-0 border-gray-600 hover:border-green-500 transition-all duration-200"
                    style={{
                      backgroundColor: "hsl(var(--cocktail-button-bg))",
                      color: "hsl(var(--cocktail-text))",
                    }}
                  >
                    ↓
                  </Button>
                </>
              )}
              {tab.location === "service" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moveTabToMain(tab.id)}
                  className="h-10 w-10 p-0 border-gray-600 hover:border-green-500 transition-all duration-200"
                  style={{
                    backgroundColor: "hsl(var(--cocktail-button-bg))",
                    color: "hsl(var(--cocktail-text))",
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              {tab.location === "main" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moveTabToService(tab.id)}
                  className="h-10 w-10 p-0 border-gray-600 hover:border-green-500 transition-all duration-200"
                  style={{
                    backgroundColor: "hsl(var(--cocktail-button-bg))",
                    color: "hsl(var(--cocktail-text))",
                  }}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" style={{ backgroundColor: "hsl(var(--cocktail-bg))" }}>
        <div className="text-center space-y-4">
          <div className="relative">
            <Settings className="h-16 w-16 mx-auto animate-spin" style={{ color: "hsl(var(--cocktail-primary))" }} />
            <div
              className="absolute inset-0 rounded-full opacity-20 animate-pulse"
              style={{ backgroundColor: "hsl(var(--cocktail-primary))" }}
            />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold" style={{ color: "hsl(var(--cocktail-text))" }}>
              Konfiguration wird geladen
            </h3>
            <p style={{ color: "hsl(var(--cocktail-text-muted))" }}>Einen Moment bitte...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="text-center py-16" style={{ backgroundColor: "hsl(var(--cocktail-bg))" }}>
        <div className="space-y-4">
          <div
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
            style={{ backgroundColor: "hsl(var(--cocktail-card-bg))" }}
          >
            <Settings className="h-8 w-8" style={{ color: "hsl(var(--cocktail-error))" }} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold" style={{ color: "hsl(var(--cocktail-text))" }}>
              Fehler beim Laden
            </h3>
            <p style={{ color: "hsl(var(--cocktail-error))" }}>Konfiguration konnte nicht geladen werden.</p>
          </div>
          <Button
            onClick={loadConfig}
            className="mt-6 text-white"
            style={{ backgroundColor: "hsl(var(--cocktail-primary))" }}
          >
            Erneut versuchen
          </Button>
        </div>
      </div>
    )
  }

  const mainTabs = config.tabs.filter((tab) => tab.location === "main")
  const serviceTabs = config.tabs.filter((tab) => tab.location === "service")
  const hasPasswordProtectedServiceTabs = serviceTabs.some((tab) => tab.passwordProtected)

  return (
    <div
      className="space-y-8 max-w-7xl mx-auto"
      style={{ backgroundColor: "hsl(var(--cocktail-bg))", minHeight: "100vh", padding: "2rem" }}
    >
      <div
        className="relative overflow-hidden rounded-2xl p-8 border"
        style={{
          backgroundColor: "hsl(var(--cocktail-card-bg))",
          borderColor: "hsl(var(--cocktail-card-border))",
        }}
      >
        <div className="relative flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight" style={{ color: "hsl(var(--cocktail-text))" }}>
              Einstellungen
            </h1>
            <p className="text-lg" style={{ color: "hsl(var(--cocktail-text-muted))" }}>
              Konfigurieren Sie Ihre Tab-Anordnung
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={saveConfig}
              disabled={saving || !hasChanges}
              className="text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3"
              style={{ backgroundColor: "hsl(var(--cocktail-primary))" }}
            >
              {saving ? "Speichert..." : "Speichern"}
            </Button>
            <Button
              variant="outline"
              onClick={resetToDefault}
              disabled={saving}
              className="border transition-all duration-200 px-6 py-3 bg-transparent"
              style={{
                backgroundColor: "hsl(var(--cocktail-button-bg))",
                color: "hsl(var(--cocktail-text))",
                borderColor: "hsl(var(--cocktail-card-border))",
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Standard
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="border transition-all duration-200 px-6 py-3 bg-transparent"
              style={{
                backgroundColor: "hsl(var(--cocktail-button-bg))",
                color: "hsl(var(--cocktail-text))",
                borderColor: "hsl(var(--cocktail-card-border))",
              }}
            >
              Schließen
            </Button>
          </div>
        </div>
      </div>

      {hasChanges && (
        <div
          className="p-4 rounded-xl border backdrop-blur-sm"
          style={{
            backgroundColor: "hsl(var(--cocktail-card-bg))",
            borderColor: "hsl(var(--cocktail-primary))",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: "hsl(var(--cocktail-primary))" }}
            />
            <p className="font-medium" style={{ color: "hsl(var(--cocktail-primary))" }}>
              Sie haben ungespeicherte Änderungen. Klicken Sie auf "Speichern", um die Änderungen zu übernehmen.
            </p>
          </div>
        </div>
      )}

      <Card
        className="border backdrop-blur-sm"
        style={{
          backgroundColor: "hsl(var(--cocktail-card-bg))",
          borderColor: "hsl(var(--cocktail-card-border))",
        }}
      >
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "hsl(var(--cocktail-button-bg))" }}
            >
              <Settings className="h-6 w-6" style={{ color: "hsl(var(--cocktail-primary))" }} />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg" style={{ color: "hsl(var(--cocktail-text))" }}>
                Wie funktioniert es?
              </h3>
              <p className="leading-relaxed" style={{ color: "hsl(var(--cocktail-text-muted))" }}>
                Hier können Sie konfigurieren, welche Tabs in der Hauptnavigation und welche im Servicemenü angezeigt
                werden. Verwenden Sie die Pfeiltasten, um Tabs zwischen den Bereichen zu verschieben. Das Servicemenü
                bleibt immer in der Hauptnavigation verfügbar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <Card
          className="border backdrop-blur-sm overflow-hidden"
          style={{
            backgroundColor: "hsl(var(--cocktail-card-bg))",
            borderColor: "hsl(var(--cocktail-card-border))",
          }}
        >
          <CardHeader
            className="border-b"
            style={{
              backgroundColor: "hsl(var(--cocktail-button-bg))",
              borderColor: "hsl(var(--cocktail-card-border))",
            }}
          >
            <CardTitle className="flex items-center gap-3 text-xl" style={{ color: "hsl(var(--cocktail-text))" }}>
              <div
                className="w-4 h-4 rounded-full shadow-lg"
                style={{ backgroundColor: "hsl(var(--cocktail-primary))" }}
              />
              Hauptnavigation
              <Badge
                variant="secondary"
                className="ml-auto border"
                style={{
                  backgroundColor: "hsl(var(--cocktail-button-bg))",
                  color: "hsl(var(--cocktail-primary))",
                  borderColor: "hsl(var(--cocktail-primary))",
                }}
              >
                {mainTabs.length} Tabs
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {mainTabs.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "hsl(var(--cocktail-button-bg))" }}
                >
                  <ArrowLeft className="h-8 w-8" style={{ color: "hsl(var(--cocktail-text-muted))" }} />
                </div>
                <p style={{ color: "hsl(var(--cocktail-text-muted))" }}>Keine Tabs in der Hauptnavigation</p>
              </div>
            ) : (
              mainTabs.map((tab, index) => renderTabCard(tab, true, index, mainTabs.length))
            )}
          </CardContent>
        </Card>

        <Card
          className="border backdrop-blur-sm overflow-hidden"
          style={{
            backgroundColor: "hsl(var(--cocktail-card-bg))",
            borderColor: "hsl(var(--cocktail-card-border))",
          }}
        >
          <CardHeader
            className="border-b"
            style={{
              backgroundColor: "hsl(var(--cocktail-button-bg))",
              borderColor: "hsl(var(--cocktail-card-border))",
            }}
          >
            <CardTitle className="flex items-center gap-3 text-xl" style={{ color: "hsl(var(--cocktail-text))" }}>
              <div
                className="w-4 h-4 rounded-full shadow-lg"
                style={{ backgroundColor: "hsl(var(--cocktail-text-muted))" }}
              />
              Servicemenü
              <Badge
                variant="secondary"
                className="ml-auto border"
                style={{
                  backgroundColor: "hsl(var(--cocktail-button-bg))",
                  color: "hsl(var(--cocktail-text-muted))",
                  borderColor: "hsl(var(--cocktail-card-border))",
                }}
              >
                {serviceTabs.length} Tabs
              </Badge>
              {hasPasswordProtectedServiceTabs && (
                <Badge
                  variant="secondary"
                  className="border"
                  style={{
                    backgroundColor: "hsl(var(--cocktail-button-bg))",
                    color: "hsl(var(--cocktail-warning))",
                    borderColor: "hsl(var(--cocktail-warning))",
                  }}
                >
                  <Shield className="w-3 h-3 mr-1" />
                  Passwort
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {serviceTabs.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "hsl(var(--cocktail-button-bg))" }}
                >
                  <ArrowRight className="h-8 w-8" style={{ color: "hsl(var(--cocktail-text-muted))" }} />
                </div>
                <p style={{ color: "hsl(var(--cocktail-text-muted))" }}>Keine Tabs im Servicemenü</p>
              </div>
            ) : (
              serviceTabs.map((tab) => renderTabCard(tab))
            )}
          </CardContent>
        </Card>
      </div>

      <Card
        className="border backdrop-blur-sm"
        style={{
          backgroundColor: "hsl(var(--cocktail-card-bg))",
          borderColor: "hsl(var(--cocktail-card-border))",
        }}
      >
        <CardContent className="p-6">
          <h3
            className="font-semibold mb-4 text-lg flex items-center gap-2"
            style={{ color: "hsl(var(--cocktail-text))" }}
          >
            <Sparkles className="h-5 w-5" style={{ color: "hsl(var(--cocktail-primary))" }} />
            Legende
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ backgroundColor: "hsl(var(--cocktail-button-bg))" }}
            >
              <Badge
                variant="outline"
                className="border"
                style={{
                  backgroundColor: "hsl(var(--cocktail-button-bg))",
                  color: "hsl(var(--cocktail-text-muted))",
                  borderColor: "hsl(var(--cocktail-card-border))",
                }}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Fest
              </Badge>
              <span className="text-sm" style={{ color: "hsl(var(--cocktail-text-muted))" }}>
                Kann nicht verschoben werden
              </span>
            </div>
            <div
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ backgroundColor: "hsl(var(--cocktail-button-bg))" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "hsl(var(--cocktail-card-bg))" }}
              >
                <ArrowLeft className="h-4 w-4" style={{ color: "hsl(var(--cocktail-primary))" }} />
              </div>
              <span className="text-sm" style={{ color: "hsl(var(--cocktail-text-muted))" }}>
                Zur Hauptnavigation
              </span>
            </div>
            <div
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ backgroundColor: "hsl(var(--cocktail-button-bg))" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "hsl(var(--cocktail-card-bg))" }}
              >
                <ArrowRight className="h-4 w-4" style={{ color: "hsl(var(--cocktail-text-muted))" }} />
              </div>
              <span className="text-sm" style={{ color: "hsl(var(--cocktail-text-muted))" }}>
                Zum Servicemenü
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
