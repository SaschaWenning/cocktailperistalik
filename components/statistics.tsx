"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  BarChart3,
  TrendingUp,
  Droplet,
  RefreshCw,
  Trash2,
  Euro,
  Settings,
  Wine,
  Martini,
  GlassWater,
} from "lucide-react"
import type { StatisticsData, IngredientPrice, CocktailPreparationLog } from "@/types/statistics"
import { getAllIngredients } from "@/lib/ingredients"
import VirtualKeyboard from "./virtual-keyboard"
import { toast } from "@/components/ui/use-toast"

const STORAGE_KEY = "cocktailbot-statistics"
const PRICES_KEY = "cocktailbot-prices"

export default function Statistics() {
  const [statistics, setStatistics] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showPriceSettings, setShowPriceSettings] = useState(false)
  const [ingredientPrices, setIngredientPrices] = useState<IngredientPrice[]>([])
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [savingPrices, setSavingPrices] = useState(false)
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [keyboardValue, setKeyboardValue] = useState("")
  const [currentEditingIngredient, setCurrentEditingIngredient] = useState<string | null>(null)
  const [allIngredients, setAllIngredients] = useState<Array<{ id: string; name: string }>>([])

  const processStatistics = (logs: CocktailPreparationLog[]) => {
    // Generate cocktail statistics
    const cocktailMap = new Map<
      string,
      { name: string; category: string; count: number; volume: number; lastPrepared: string }
    >()

    logs.forEach((log) => {
      const existing = cocktailMap.get(log.cocktailId)
      if (existing) {
        existing.count++
        existing.volume += log.size
        if (new Date(log.timestamp) > new Date(existing.lastPrepared)) {
          existing.lastPrepared = log.timestamp
        }
      } else {
        cocktailMap.set(log.cocktailId, {
          name: log.cocktailName,
          category: log.category || "cocktails",
          count: 1,
          volume: log.size,
          lastPrepared: log.timestamp,
        })
      }
    })

    const cocktailStats = Array.from(cocktailMap.entries())
      .map(([id, data]) => ({
        cocktailId: id,
        cocktailName: data.name,
        category: data.category as "cocktails" | "virgin" | "shots",
        preparationCount: data.count,
        totalVolume: data.volume,
        lastPrepared: data.lastPrepared,
      }))
      .sort((a, b) => b.preparationCount - a.preparationCount)

    // Generate ingredient consumption statistics
    const ingredientMap = new Map<string, { amount: number; count: number }>()

    logs.forEach((log) => {
      log.ingredients.forEach((ingredient) => {
        const existing = ingredientMap.get(ingredient.ingredientId)
        if (existing) {
          existing.amount += ingredient.amount
          existing.count++
        } else {
          ingredientMap.set(ingredient.ingredientId, {
            amount: ingredient.amount,
            count: 1,
          })
        }
      })
    })

    const ingredientConsumption = Array.from(ingredientMap.entries())
      .map(([id, data]) => {
        const ingredientInfo = allIngredients.find((ing) => ing.id === id)
        return {
          ingredientId: id,
          ingredientName: ingredientInfo?.name || id,
          totalAmount: data.amount,
          usageCount: data.count,
        }
      })
      .sort((a, b) => b.totalAmount - a.totalAmount)

    const sizeMap = new Map<number, number>()
    logs.forEach((log) => {
      const count = sizeMap.get(log.size) || 0
      sizeMap.set(log.size, count + 1)
    })

    const sizeStats = Array.from(sizeMap.entries())
      .map(([size, count]) => ({ size, count }))
      .sort((a, b) => b.count - a.count)

    return { cocktailStats, ingredientConsumption, sizeStats }
  }

  const loadStatistics = () => {
    try {
      setRefreshing(true)

      const ingredients = getAllIngredients()
      setAllIngredients(ingredients)
      console.log("[v0] Loaded all ingredients including custom:", ingredients.length)

      // Load from localStorage
      const stored = localStorage.getItem(STORAGE_KEY)
      const storedPrices = localStorage.getItem(PRICES_KEY)

      if (stored) {
        const data = JSON.parse(stored)
        if (data.logs && data.logs.length > 0) {
          const { cocktailStats, ingredientConsumption, sizeStats } = processStatistics(data.logs)
          setStatistics({
            logs: data.logs,
            cocktailStats,
            ingredientConsumption,
            ingredientPrices: data.ingredientPrices || [],
            sizeStats,
          })
        } else {
          setStatistics({
            logs: [],
            cocktailStats: [],
            ingredientConsumption: [],
            ingredientPrices: [],
            sizeStats: [],
          })
        }
      } else {
        setStatistics({
          logs: [],
          cocktailStats: [],
          ingredientConsumption: [],
          ingredientPrices: [],
          sizeStats: [],
        })
      }

      if (storedPrices) {
        const prices = JSON.parse(storedPrices)
        setIngredientPrices(prices)
        console.log("[v0] Loaded saved prices:", prices.length)
      }

      console.log("[v0] Loaded statistics from localStorage")

      toast({
        title: "Statistiken aktualisiert",
        description: "Die Statistiken wurden erfolgreich geladen.",
      })
    } catch (error) {
      console.error("[v0] Error loading statistics:", error)
      setStatistics({
        logs: [],
        cocktailStats: [],
        ingredientConsumption: [],
        ingredientPrices: [],
        sizeStats: [],
      })

      toast({
        title: "Fehler",
        description: "Statistiken konnten nicht geladen werden.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const savePrices = () => {
    try {
      setSavingPrices(true)
      localStorage.setItem(PRICES_KEY, JSON.stringify(ingredientPrices))
      console.log("[v0] Saved prices to localStorage:", ingredientPrices.length)

      // Update statistics with new prices
      if (statistics) {
        const updated = { ...statistics, ingredientPrices }
        setStatistics(updated)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      }
    } catch (error) {
      console.error("[v0] Error saving prices:", error)
    } finally {
      setSavingPrices(false)
    }
  }

  const resetStatistics = () => {
    try {
      const emptyStats = {
        logs: [],
        cocktailStats: [],
        ingredientConsumption: [],
        ingredientPrices,
        sizeStats: [],
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyStats))
      setStatistics(emptyStats)
      setShowResetDialog(false)

      console.log("[v0] Reset statistics, kept prices")
    } catch (error) {
      console.error("[v0] Error resetting statistics:", error)
    }
  }

  const updatePrice = (ingredientId: string, price: number) => {
    setIngredientPrices((prev) => {
      const existing = prev.find((p) => p.ingredientId === ingredientId)
      if (existing) {
        return prev.map((p) => (p.ingredientId === ingredientId ? { ...p, pricePerLiter: price } : p))
      } else {
        return [...prev, { ingredientId, pricePerLiter: price }]
      }
    })
  }

  const calculateTotalCost = () => {
    if (!statistics) return 0
    return statistics.ingredientConsumption.reduce((total, ingredient) => {
      const price = ingredientPrices.find((p) => p.ingredientId === ingredient.ingredientId)
      if (price) {
        return total + (ingredient.totalAmount / 1000) * price.pricePerLiter
      }
      return total
    }, 0)
  }

  const openKeyboard = (ingredientId: string) => {
    const currentPrice = ingredientPrices.find((p) => p.ingredientId === ingredientId)?.pricePerLiter || 0
    setCurrentEditingIngredient(ingredientId)
    setKeyboardValue(currentPrice > 0 ? currentPrice.toString() : "")
    setShowKeyboard(true)
  }

  const handleKeyboardConfirm = () => {
    if (currentEditingIngredient) {
      const price = Number.parseFloat(keyboardValue) || 0
      updatePrice(currentEditingIngredient, price)
    }
    setShowKeyboard(false)
    setKeyboardValue("")
    setCurrentEditingIngredient(null)
  }

  const handleKeyboardCancel = () => {
    setShowKeyboard(false)
    setKeyboardValue("")
    setCurrentEditingIngredient(null)
  }

  useEffect(() => {
    loadStatistics()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-4">
          <BarChart3 className="h-16 w-16 mx-auto animate-pulse" style={{ color: "hsl(var(--cocktail-primary))" }} />
          <p style={{ color: "hsl(var(--cocktail-text-muted))" }}>Lade Statistiken...</p>
        </div>
      </div>
    )
  }

  const hasStatistics = statistics && statistics.logs.length > 0
  const totalCocktails = statistics?.logs.length || 0
  const totalVolume = statistics?.logs.reduce((sum, log) => sum + log.size, 0) || 0
  const totalCost = calculateTotalCost()

  const cocktailsStats = statistics?.cocktailStats.filter((s) => s.category === "cocktails") || []
  const virginStats = statistics?.cocktailStats.filter((s) => s.category === "virgin") || []
  const shotsStats = statistics?.cocktailStats.filter((s) => s.category === "shots") || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold" style={{ color: "hsl(var(--cocktail-text))" }}>
          Statistiken
        </h3>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowPriceSettings(!showPriceSettings)}
            variant="outline"
            className="border bg-transparent"
            style={{
              backgroundColor: showPriceSettings ? "hsl(var(--cocktail-primary))" : "hsl(var(--cocktail-button-bg))",
              color: showPriceSettings ? "black" : "hsl(var(--cocktail-text))",
              borderColor: "hsl(var(--cocktail-card-border))",
            }}
          >
            <Settings className="h-4 w-4 mr-2" />
            Preise
          </Button>
          <Button
            onClick={loadStatistics}
            disabled={refreshing}
            variant="outline"
            className="border bg-transparent"
            style={{
              backgroundColor: "hsl(var(--cocktail-button-bg))",
              color: "hsl(var(--cocktail-text))",
              borderColor: "hsl(var(--cocktail-card-border))",
            }}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Lädt..." : "Aktualisieren"}
          </Button>
          {hasStatistics && (
            <Button
              onClick={() => setShowResetDialog(true)}
              variant="outline"
              className="border bg-transparent"
              style={{
                backgroundColor: "hsl(var(--cocktail-button-bg))",
                color: "hsl(var(--cocktail-error))",
                borderColor: "hsl(var(--cocktail-error))",
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Zurücksetzen
            </Button>
          )}
        </div>
      </div>

      {showPriceSettings && (
        <Card
          className="border"
          style={{
            backgroundColor: "hsl(var(--cocktail-card-bg))",
            borderColor: "hsl(var(--cocktail-card-border))",
          }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: "hsl(var(--cocktail-text))" }}>
              <Euro className="h-5 w-5" style={{ color: "hsl(var(--cocktail-primary))" }} />
              Literpreise konfigurieren
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
                {allIngredients.map((ingredient) => {
                  const currentPrice =
                    ingredientPrices.find((p) => p.ingredientId === ingredient.id)?.pricePerLiter || 0

                  return (
                    <div key={ingredient.id} className="flex items-center gap-4">
                      <Label className="flex-1" style={{ color: "hsl(var(--cocktail-text))" }}>
                        {ingredient.name}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          value={currentPrice > 0 ? currentPrice.toFixed(2) : ""}
                          readOnly
                          onClick={() => openKeyboard(ingredient.id)}
                          placeholder="0.00"
                          className="w-32 border cursor-pointer"
                          style={{
                            backgroundColor: "hsl(var(--cocktail-button-bg))",
                            color: "hsl(var(--cocktail-text))",
                            borderColor: "hsl(var(--cocktail-card-border))",
                          }}
                        />
                        <span style={{ color: "hsl(var(--cocktail-text-muted))" }}>€/L</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <Button
                onClick={savePrices}
                disabled={savingPrices}
                className="w-full"
                style={{
                  backgroundColor: "hsl(var(--cocktail-primary))",
                  color: "black",
                }}
              >
                {savingPrices ? "Speichern..." : "Preise speichern"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasStatistics ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-6">
          <BarChart3 className="h-16 w-16" style={{ color: "hsl(var(--cocktail-text-muted))" }} />
          <h3 className="text-xl font-semibold" style={{ color: "hsl(var(--cocktail-text))" }}>
            Noch keine Statistiken
          </h3>
          <p style={{ color: "hsl(var(--cocktail-text-muted))" }}>
            Bereiten Sie Cocktails zu, um Statistiken zu sehen.
          </p>
          <p className="text-sm" style={{ color: "hsl(var(--cocktail-text-muted))" }}>
            Sie können bereits jetzt Preise für Zutaten konfigurieren.
          </p>
        </div>
      ) : (
        <>
          {/* Übersicht */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card
              className="border"
              style={{
                backgroundColor: "hsl(var(--cocktail-card-bg))",
                borderColor: "hsl(var(--cocktail-card-border))",
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "hsl(var(--cocktail-button-bg))" }}
                  >
                    <BarChart3 className="h-6 w-6" style={{ color: "hsl(var(--cocktail-primary))" }} />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: "hsl(var(--cocktail-text-muted))" }}>
                      Zubereitete Cocktails
                    </p>
                    <p className="text-2xl font-bold" style={{ color: "hsl(var(--cocktail-text))" }}>
                      {totalCocktails}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="border"
              style={{
                backgroundColor: "hsl(var(--cocktail-card-bg))",
                borderColor: "hsl(var(--cocktail-card-border))",
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "hsl(var(--cocktail-button-bg))" }}
                  >
                    <Droplet className="h-6 w-6" style={{ color: "hsl(var(--cocktail-primary))" }} />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: "hsl(var(--cocktail-text-muted))" }}>
                      Gesamtvolumen
                    </p>
                    <p className="text-2xl font-bold" style={{ color: "hsl(var(--cocktail-text))" }}>
                      {(totalVolume / 1000).toFixed(2)}L
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="border"
              style={{
                backgroundColor: "hsl(var(--cocktail-card-bg))",
                borderColor: "hsl(var(--cocktail-card-border))",
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "hsl(var(--cocktail-button-bg))" }}
                  >
                    <TrendingUp className="h-6 w-6" style={{ color: "hsl(var(--cocktail-primary))" }} />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: "hsl(var(--cocktail-text-muted))" }}>
                      Verschiedene Cocktails
                    </p>
                    <p className="text-2xl font-bold" style={{ color: "hsl(var(--cocktail-text))" }}>
                      {statistics.cocktailStats.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="border"
              style={{
                backgroundColor: "hsl(var(--cocktail-card-bg))",
                borderColor: "hsl(var(--cocktail-card-border))",
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "hsl(var(--cocktail-button-bg))" }}
                  >
                    <Euro className="h-6 w-6" style={{ color: "hsl(var(--cocktail-primary))" }} />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: "hsl(var(--cocktail-text-muted))" }}>
                      Gesamtkosten
                    </p>
                    <p className="text-2xl font-bold" style={{ color: "hsl(var(--cocktail-text))" }}>
                      {totalCost > 0 ? `${totalCost.toFixed(2)}€` : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {statistics.sizeStats.length > 0 && (
            <Card
              className="border"
              style={{
                backgroundColor: "hsl(var(--cocktail-card-bg))",
                borderColor: "hsl(var(--cocktail-card-border))",
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: "hsl(var(--cocktail-text))" }}>
                  <GlassWater className="h-5 w-5" style={{ color: "hsl(var(--cocktail-primary))" }} />
                  Cocktailgrößen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {statistics.sizeStats.map((stat) => {
                    const maxCount = statistics.sizeStats[0]?.count || 1
                    const percentage = (stat.count / maxCount) * 100

                    return (
                      <div
                        key={stat.size}
                        className="p-4 rounded-lg border"
                        style={{
                          backgroundColor: "hsl(var(--cocktail-button-bg))",
                          borderColor: "hsl(var(--cocktail-card-border))",
                        }}
                      >
                        <div className="text-center mb-2">
                          <p className="text-2xl font-bold" style={{ color: "hsl(var(--cocktail-primary))" }}>
                            {stat.size}ml
                          </p>
                          <p className="text-sm" style={{ color: "hsl(var(--cocktail-text-muted))" }}>
                            {stat.count}x zubereitet
                          </p>
                        </div>
                        <div
                          className="h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: "hsl(var(--cocktail-card-bg))" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: "hsl(var(--cocktail-primary))",
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {cocktailsStats.length > 0 && (
            <Card
              className="border"
              style={{
                backgroundColor: "hsl(var(--cocktail-card-bg))",
                borderColor: "hsl(var(--cocktail-card-border))",
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: "hsl(var(--cocktail-text))" }}>
                  <Martini className="h-5 w-5" style={{ color: "hsl(var(--cocktail-primary))" }} />
                  Cocktails (Alkoholisch)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cocktailsStats.map((stat, index) => {
                    const maxCount = cocktailsStats[0]?.preparationCount || 1
                    const percentage = (stat.preparationCount / maxCount) * 100

                    return (
                      <div
                        key={stat.cocktailId}
                        className="p-4 rounded-lg border"
                        style={{
                          backgroundColor: "hsl(var(--cocktail-button-bg))",
                          borderColor: "hsl(var(--cocktail-card-border))",
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span
                              className="text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor:
                                  index === 0 ? "hsl(var(--cocktail-primary))" : "hsl(var(--cocktail-card-bg))",
                                color: index === 0 ? "black" : "hsl(var(--cocktail-text))",
                              }}
                            >
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-semibold" style={{ color: "hsl(var(--cocktail-text))" }}>
                                {stat.cocktailName}
                              </p>
                              <p className="text-sm" style={{ color: "hsl(var(--cocktail-text-muted))" }}>
                                {stat.preparationCount}x zubereitet • {(stat.totalVolume / 1000).toFixed(2)}L gesamt
                              </p>
                            </div>
                          </div>
                          <span className="text-xl font-bold" style={{ color: "hsl(var(--cocktail-primary))" }}>
                            {stat.preparationCount}
                          </span>
                        </div>
                        <div
                          className="h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: "hsl(var(--cocktail-card-bg))" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: "hsl(var(--cocktail-primary))",
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {virginStats.length > 0 && (
            <Card
              className="border"
              style={{
                backgroundColor: "hsl(var(--cocktail-card-bg))",
                borderColor: "hsl(var(--cocktail-card-border))",
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: "hsl(var(--cocktail-text))" }}>
                  <GlassWater className="h-5 w-5" style={{ color: "hsl(var(--cocktail-primary))" }} />
                  Alkoholfreie Cocktails
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {virginStats.map((stat, index) => {
                    const maxCount = virginStats[0]?.preparationCount || 1
                    const percentage = (stat.preparationCount / maxCount) * 100

                    return (
                      <div
                        key={stat.cocktailId}
                        className="p-4 rounded-lg border"
                        style={{
                          backgroundColor: "hsl(var(--cocktail-button-bg))",
                          borderColor: "hsl(var(--cocktail-card-border))",
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span
                              className="text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor:
                                  index === 0 ? "hsl(var(--cocktail-primary))" : "hsl(var(--cocktail-card-bg))",
                                color: index === 0 ? "black" : "hsl(var(--cocktail-text))",
                              }}
                            >
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-semibold" style={{ color: "hsl(var(--cocktail-text))" }}>
                                {stat.cocktailName}
                              </p>
                              <p className="text-sm" style={{ color: "hsl(var(--cocktail-text-muted))" }}>
                                {stat.preparationCount}x zubereitet • {(stat.totalVolume / 1000).toFixed(2)}L gesamt
                              </p>
                            </div>
                          </div>
                          <span className="text-xl font-bold" style={{ color: "hsl(var(--cocktail-primary))" }}>
                            {stat.preparationCount}
                          </span>
                        </div>
                        <div
                          className="h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: "hsl(var(--cocktail-card-bg))" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: "hsl(var(--cocktail-primary))",
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {shotsStats.length > 0 && (
            <Card
              className="border"
              style={{
                backgroundColor: "hsl(var(--cocktail-card-bg))",
                borderColor: "hsl(var(--cocktail-card-border))",
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: "hsl(var(--cocktail-text))" }}>
                  <Wine className="h-5 w-5" style={{ color: "hsl(var(--cocktail-primary))" }} />
                  Shots
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {shotsStats.map((stat, index) => {
                    const maxCount = shotsStats[0]?.preparationCount || 1
                    const percentage = (stat.preparationCount / maxCount) * 100

                    return (
                      <div
                        key={stat.cocktailId}
                        className="p-4 rounded-lg border"
                        style={{
                          backgroundColor: "hsl(var(--cocktail-button-bg))",
                          borderColor: "hsl(var(--cocktail-card-border))",
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span
                              className="text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor:
                                  index === 0 ? "hsl(var(--cocktail-primary))" : "hsl(var(--cocktail-card-bg))",
                                color: index === 0 ? "black" : "hsl(var(--cocktail-text))",
                              }}
                            >
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-semibold" style={{ color: "hsl(var(--cocktail-text))" }}>
                                {stat.cocktailName}
                              </p>
                              <p className="text-sm" style={{ color: "hsl(var(--cocktail-text-muted))" }}>
                                {stat.preparationCount}x zubereitet • {(stat.totalVolume / 1000).toFixed(2)}L gesamt
                              </p>
                            </div>
                          </div>
                          <span className="text-xl font-bold" style={{ color: "hsl(var(--cocktail-primary))" }}>
                            {stat.preparationCount}
                          </span>
                        </div>
                        <div
                          className="h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: "hsl(var(--cocktail-card-bg))" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: "hsl(var(--cocktail-primary))",
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Zutaten-Verbrauch */}
          <Card
            className="border"
            style={{
              backgroundColor: "hsl(var(--cocktail-card-bg))",
              borderColor: "hsl(var(--cocktail-card-border))",
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: "hsl(var(--cocktail-text))" }}>
                <Droplet className="h-5 w-5" style={{ color: "hsl(var(--cocktail-primary))" }} />
                Zutaten-Verbrauch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statistics.ingredientConsumption.map((ingredient) => {
                  const maxAmount = statistics.ingredientConsumption[0]?.totalAmount || 1
                  const percentage = (ingredient.totalAmount / maxAmount) * 100
                  const price = ingredientPrices.find((p) => p.ingredientId === ingredient.ingredientId)
                  const cost = price ? (ingredient.totalAmount / 1000) * price.pricePerLiter : 0

                  return (
                    <div
                      key={ingredient.ingredientId}
                      className="p-4 rounded-lg border"
                      style={{
                        backgroundColor: "hsl(var(--cocktail-button-bg))",
                        borderColor: "hsl(var(--cocktail-card-border))",
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold" style={{ color: "hsl(var(--cocktail-text))" }}>
                            {ingredient.ingredientName}
                          </p>
                          <p className="text-sm" style={{ color: "hsl(var(--cocktail-text-muted))" }}>
                            {ingredient.usageCount}x verwendet
                            {cost > 0 && ` • ${cost.toFixed(2)}€`}
                          </p>
                        </div>
                        <span className="text-lg font-bold" style={{ color: "hsl(var(--cocktail-primary))" }}>
                          {(ingredient.totalAmount / 1000).toFixed(2)}L
                        </span>
                      </div>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: "hsl(var(--cocktail-card-bg))" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: "hsl(var(--cocktail-primary))",
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent
          style={{
            backgroundColor: "hsl(var(--cocktail-card-bg))",
            borderColor: "hsl(var(--cocktail-card-border))",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: "hsl(var(--cocktail-text))" }}>
              Statistiken zurücksetzen?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: "hsl(var(--cocktail-text-muted))" }}>
              Möchten Sie wirklich alle Statistiken zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden.
              Alle Zubereitungsdaten gehen verloren. Die gespeicherten Preise bleiben erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              style={{
                backgroundColor: "hsl(var(--cocktail-button-bg))",
                color: "hsl(var(--cocktail-text))",
                borderColor: "hsl(var(--cocktail-card-border))",
              }}
            >
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={resetStatistics}
              style={{
                backgroundColor: "hsl(var(--cocktail-error))",
                color: "white",
              }}
            >
              Zurücksetzen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Keyboard dialog for price input */}
      <Dialog open={showKeyboard} onOpenChange={(open) => !open && handleKeyboardCancel()}>
        <DialogContent
          className="bg-black border-[hsl(var(--cocktail-card-border))] sm:max-w-md text-white"
          style={{
            backgroundColor: "hsl(var(--cocktail-card-bg))",
            borderColor: "hsl(var(--cocktail-card-border))",
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "hsl(var(--cocktail-text))" }}>Preis eingeben</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm" style={{ color: "hsl(var(--cocktail-text-muted))" }}>
              {currentEditingIngredient &&
                `Preis für ${allIngredients.find((i) => i.id === currentEditingIngredient)?.name || "Zutat"} (€/L):`}
            </p>

            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={keyboardValue}
                readOnly
                placeholder="0.00"
                className="text-xl h-12 text-center border"
                style={{
                  backgroundColor: "hsl(var(--cocktail-bg))",
                  borderColor: "hsl(var(--cocktail-card-border))",
                  color: "hsl(var(--cocktail-text))",
                }}
              />
              <span className="text-sm" style={{ color: "hsl(var(--cocktail-text-muted))" }}>
                €/L
              </span>
            </div>

            <VirtualKeyboard
              layout="numeric"
              value={keyboardValue}
              onChange={setKeyboardValue}
              onConfirm={handleKeyboardConfirm}
              onCancel={handleKeyboardCancel}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
