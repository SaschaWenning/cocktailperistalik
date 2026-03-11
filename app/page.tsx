"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { pumpConfig as initialPumpConfig } from "@/data/pump-config"
import { makeCocktail, getPumpConfig, saveRecipe, getAllCocktails, deleteRecipe } from "@/lib/cocktail-machine"
import { AlertCircle, Edit, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Cocktail } from "@/types/cocktail"
import { getIngredientLevels } from "@/lib/ingredient-level-service"
import type { IngredientLevel } from "@/types/ingredient-level"
import type { PumpConfig } from "@/types/pump"
import { Badge } from "@/components/ui/badge"
import CocktailCard from "@/components/cocktail-card"
import PumpCleaning from "@/components/pump-cleaning"
import IngredientLevels from "@/components/ingredient-levels"
import ShotSelector from "@/components/shot-selector"
import PasswordModal from "@/components/password-modal"
import RecipeEditor from "@/components/recipe-editor"
import RecipeCreator from "@/components/recipe-creator"
import DeleteConfirmation from "@/components/delete-confirmation"
import ImageEditor from "@/components/image-editor"
import QuickShotSelector from "@/components/quick-shot-selector"
import { toast } from "@/hooks/use-toast"
import ServiceMenu from "@/components/service-menu"
import { getAllIngredients } from "@/lib/ingredients"
import type { AppConfig } from "@/lib/tab-config"
import IngredientManager from "@/components/ingredient-manager"
import PumpCalibration from "@/components/pump-calibration"
import { Progress } from "@/components/ui/progress"
import { Check, GlassWater } from "lucide-react"
import TermsOfService from "@/components/terms-of-service"
import LightingControl from "@/components/lighting-control"

// Anzahl der Cocktails pro Seite
const COCKTAILS_PER_PAGE = 9

export default function Home() {
  const [selectedCocktail, setSelectedCocktail] = useState<Cocktail | null>(null)
  const [selectedSize, setSelectedSize] = useState<number>(300)
  const [isMaking, setIsMaking] = useState(false)
  const [progress, setProgress] = useState<number>(0)
  const [statusMessage, setStatusMessage] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState("cocktails")
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showRecipeEditor, setShowRecipeEditor] = useState(false)
  const [showRecipeCreator, setShowRecipeCreator] = useState(false)
  const [showRecipeCreatorPasswordModal, setShowRecipeCreatorPasswordModal] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [cocktailToEdit, setCocktailToEdit] = useState<string | null>(null)
  const [cocktailToDelete, setCocktailToDelete] = useState<Cocktail | null>(null)
  const [cocktailsData, setCocktailsData] = useState<Cocktail[]>([])
  const [ingredientLevels, setIngredientLevels] = useState<IngredientLevel[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lowIngredients, setLowIngredients] = useState<string[]>([])
  const [pumpConfig, setPumpConfig] = useState<PumpConfig[]>(initialPumpConfig)
  const [loading, setLoading] = useState(true)
  const [showImageEditor, setShowImageEditor] = useState(false)
  const [allIngredientsData, setAllIngredientsData] = useState<any[]>([])
  const [manualIngredients, setManualIngredients] = useState<
    Array<{ ingredientId: string; amount: number; instructions?: string; name?: string }>
  >([])
  const [showManualIngredientsModal, setShowManualIngredientsModal] = useState(false)
  const [showImageEditorPasswordModal, setShowImageEditorPasswordModal] = useState(false)
  const [tabConfig, setTabConfig] = useState<AppConfig | null>(null)
  const [mainTabs, setMainTabs] = useState<string[]>([])

  const [kioskExitClicks, setKioskExitClicks] = useState(0)
  const [lastClickTime, setLastClickTime] = useState(0)

  const [currentPage, setCurrentPage] = useState(1)
  const [virginCurrentPage, setVirginCurrentPage] = useState(1)

  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [showTerms, setShowTerms] = useState(false)

  const handleCocktailPageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleVirginPageChange = (page: number) => {
    setVirginCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const alcoholicCocktails = cocktailsData.filter((cocktail) => cocktail.alcoholic)
  const virginCocktails = cocktailsData.filter((cocktail) => !cocktail.alcoholic)

  const totalPages = Math.ceil(alcoholicCocktails.length / COCKTAILS_PER_PAGE)
  const virginTotalPages = Math.ceil(virginCocktails.length / COCKTAILS_PER_PAGE)

  const getCurrentPageCocktails = (cocktails: Cocktail[], page: number) => {
    const startIndex = (page - 1) * COCKTAILS_PER_PAGE
    const endIndex = startIndex + COCKTAILS_PER_PAGE
    return cocktails.slice(startIndex, endIndex)
  }

  const currentPageCocktails = getCurrentPageCocktails(alcoholicCocktails, currentPage)
  const currentPageVirginCocktails = getCurrentPageCocktails(virginCocktails, virginCurrentPage)

  const getAvailableIngredientsFromCocktails = () => {
    const allIngredients = new Set<string>()
    cocktailsData.forEach((cocktail) => {
      cocktail.recipe.forEach((item) => {
        allIngredients.add(item.ingredientId)
      })
    })
    return Array.from(allIngredients)
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await Promise.all([
          loadIngredientLevels(),
          loadPumpConfig(),
          loadCocktails(),
          loadAllIngredients(),
          loadTabConfig(),
        ])
      } catch (error) {
        console.error("Fehler beim Laden der Daten:", error)
      } finally {
        setLoading(false)
      }
    }

    const termsAccepted = localStorage.getItem("cocktailbot-terms-accepted")
    if (!termsAccepted) {
      setShowTerms(true)
    }

    loadData()

    loadAndApplyIdleLighting()
  }, [])

  const loadAndApplyIdleLighting = async () => {
    try {
      console.log("[v0] Loading and applying idle LED configuration...")
      const response = await fetch("/api/lighting-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "idle" }),
      })

      if (response.ok) {
        console.log("[v0] Idle LED configuration applied successfully")
      } else {
        console.error("[v0] Failed to apply idle LED configuration:", response.status)
      }
    } catch (error) {
      console.error("[v0] Error applying idle LED configuration:", error)
    }
  }

  useEffect(() => {
    const handleRefresh = () => {
      console.log("[v0] Main page: Received cocktail-data-refresh event")
      setRefreshTrigger((prev) => prev + 1)
      loadIngredientLevels()
    }

    window.addEventListener("cocktail-data-refresh", handleRefresh)
    return () => window.removeEventListener("cocktail-data-refresh", handleRefresh)
  }, [])

  useEffect(() => {
    const handleHiddenCocktailsChange = () => {
      console.log("[v0] Hidden cocktails changed, reloading cocktails...")
      loadCocktails()
    }

    window.addEventListener("hidden-cocktails-changed", handleHiddenCocktailsChange)

    return () => {
      window.removeEventListener("hidden-cocktails-changed", handleHiddenCocktailsChange)
    }
  }, [])

  const loadCocktails = async () => {
    try {
      console.log("[v0] Loading cocktails...")
      const cocktails = await getAllCocktails()
      console.log("[v0] Loaded cocktails from getAllCocktails:", cocktails?.length || 0)

      try {
        const response = await fetch("/api/hidden-cocktails")
        if (response.ok) {
          const data = await response.json()
          const hiddenCocktails: string[] = data.hiddenCocktails || []
          console.log("[v0] Hidden cocktails from API:", hiddenCocktails)

          const visibleCocktails = cocktails.filter((cocktail: Cocktail) => !hiddenCocktails.includes(cocktail.id))
          console.log("[v0] Visible cocktails after filtering:", visibleCocktails.length)
          console.log("[v0] Filtered out cocktails:", cocktails.length - visibleCocktails.length)

          setCocktailsData(visibleCocktails)
          console.log("[v0] Setting cocktails data with", visibleCocktails.length, "cocktails")
        } else {
          console.log("[v0] Hidden cocktails API not available, showing all cocktails")
          setCocktailsData(cocktails)
        }
      } catch (error) {
        console.error("[v0] Error loading hidden cocktails:", error)
        console.log("[v0] Fallback: showing all cocktails")
        setCocktailsData(cocktails)
      }
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error)
      console.log("[v0] Using empty fallback - no server imports in browser")
      setCocktailsData([])
    }
  }

  const loadPumpConfig = async () => {
    try {
      const config = await getPumpConfig()
      setPumpConfig(config)
    } catch (error) {
      console.error("Fehler beim Laden der Pumpenkonfiguration:", error)
      console.log("[v0] Using fallback pump configuration")
      setPumpConfig(initialPumpConfig)
    }
  }

  const loadIngredientLevels = async () => {
    try {
      console.log("[v0] Loading ingredient levels from server...")

      const response = await fetch("/api/ingredient-levels")
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.levels.length > 0) {
          console.log("[v0] Loaded levels from server:", data.levels)
          setIngredientLevels(
            data.levels.map((level: any) => ({
              ...level,
              currentAmount: level.currentLevel,
            })),
          )

          const lowLevels = data.levels.filter((level: any) => level.currentLevel < 100)
          setLowIngredients(lowLevels.map((level: any) => level.ingredientId))
          return
        }
      }

      console.log("[v0] Falling back to localStorage...")
      const levels = await getIngredientLevels()
      setIngredientLevels(levels)

      const lowLevels = levels.filter((level) => level.currentAmount < 100)
      setLowIngredients(lowLevels.map((level) => level.ingredientId))
    } catch (error) {
      console.error("Fehler beim Laden der Füllstände:", error)
      console.log("[v0] Using empty ingredient levels as fallback")
      const defaultLevels: IngredientLevel[] = initialPumpConfig.map((pump) => ({
        pumpId: pump.id,
        ingredientId: pump.ingredient,
        currentAmount: 1000,
        currentLevel: 1000,
        maxAmount: 1000,
        lastUpdated: new Date().toISOString(),
      }))
      setIngredientLevels(defaultLevels)
      setLowIngredients([])
    }
  }

  const loadAllIngredients = async () => {
    try {
      const ingredients = await getAllIngredients()
      setAllIngredientsData(ingredients)
    } catch (error) {
      console.error("Fehler beim Laden der Zutaten:", error)
      console.log("[v0] Using empty fallback ingredients - no server imports in browser")
      setAllIngredientsData([])
    }
  }

  const loadTabConfig = async () => {
    try {
      console.log("[v0] Loading tab config from API...")
      const response = await fetch("/api/tab-config")

      if (!response.ok) {
        console.error("[v0] Tab config API response not ok:", response.status, response.statusText)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const config: AppConfig = await response.json()
      const mainTabIds = config.tabs.filter((tab) => tab.location === "main").map((tab) => tab.id)

      console.log("[v0] Tab config loaded successfully:", config)
      setTabConfig(config)
      setMainTabs(mainTabIds)

      if (mainTabIds.length > 0 && !mainTabIds.includes(activeTab) && activeTab !== "service") {
        setActiveTab(mainTabIds[0])
      }
    } catch (error) {
      console.error("[v0] Error loading tab config:", error)
      console.log("[v0] Using fallback tab configuration")
      const fallbackConfig: AppConfig = {
        tabs: [
          { id: "cocktails", name: "Cocktails", location: "main" },
          { id: "virgin", name: "Alkoholfrei", location: "main" },
          { id: "shots", name: "Shots", location: "main" },
        ],
      }
      setTabConfig(fallbackConfig)
      setMainTabs(["cocktails", "virgin", "shots"])
      if (!["cocktails", "virgin", "shots", "service"].includes(activeTab)) {
        setActiveTab("cocktails")
      }
    }
  }

  const handleImageEditClick = (cocktailId: string) => {
    setCocktailToEdit(cocktailId)
    setShowImageEditorPasswordModal(true)
  }

  const handleDeleteClick = (cocktailId: string) => {
    const cocktail = cocktailsData.find((c) => c.id === cocktailId)
    if (cocktail) {
      setCocktailToDelete(cocktail)
      setShowDeleteConfirmation(true)
    }
  }

  const handleCalibrationClick = () => {
    setActiveTab("service")
    setShowPasswordModal(true)
  }

  const handlePasswordSuccess = () => {
    setShowPasswordModal(false)
    if (activeTab === "cocktails" || activeTab === "virgin") {
      setShowRecipeEditor(true)
    } else if (activeTab === "service") {
      setActiveTab("service")
    }
  }

  const handleRecipeCreatorPasswordSuccess = () => {
    setShowRecipeCreatorPasswordModal(false)
    setShowRecipeCreator(true)
  }

  const handleImageEditorPasswordSuccess = () => {
    setShowImageEditorPasswordModal(false)
    setShowImageEditor(true)
  }

  const handleEditRecipe = (cocktailId: string) => {
    setCocktailToEdit(cocktailId)
    setShowPasswordModal(true)
  }

  const handleRecipeEditClick = (cocktailId: string) => {
    const cocktail = cocktailsData.find((c) => c.id === cocktailId)
    if (cocktail) {
      setCocktailToEdit(cocktailId)
      setShowPasswordModal(true)
    }
  }

  const handleImageSave = async (updatedCocktail: Cocktail) => {
    try {
      await saveRecipe(updatedCocktail)

      setCocktailsData((prev) => prev.map((c) => (c.id === updatedCocktail.id ? updatedCocktail : c)))

      await loadIngredientLevels()
    } catch (error) {
      console.error("Fehler beim Speichern des Bildes:", error)
    }
  }

  const handleRecipeSave = async (updatedCocktail: Cocktail) => {
    try {
      await saveRecipe(updatedCocktail)

      setCocktailsData((prev) => prev.map((c) => (c.id === updatedCocktail.id ? updatedCocktail : c)))

      await loadIngredientLevels()
    } catch (error) {
      console.error("Fehler beim Speichern des Rezepts:", error)
    }
  }

  const handleNewRecipeSave = async (newCocktail: Cocktail) => {
    try {
      await saveRecipe(newCocktail)

      setCocktailsData((prev) => [...prev, newCocktail])

      await loadIngredientLevels()
    } catch (error) {
      console.error("Fehler beim Speichern des neuen Rezepts:", error)
    }
  }

  const handleRequestDelete = (cocktailId: string) => {
    const cocktail = cocktailsData.find((c) => c.id === cocktailId)
    if (cocktail) {
      setCocktailToDelete(cocktail)
      setShowRecipeEditor(false)
      setShowDeleteConfirmation(true)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!cocktailToDelete) return

    try {
      console.log("[v0] Deleting cocktail permanently:", cocktailToDelete.id)

      await deleteRecipe(cocktailToDelete.id)
      console.log("[v0] Cocktail deleted permanently from database")

      setCocktailsData((prev) => prev.filter((c) => c.id !== cocktailToDelete.id))
      console.log("[v0] Removed cocktail from local state")

      if (selectedCocktail?.id === cocktailToDelete.id) {
        setSelectedCocktail(null)
      }

      setCocktailToDelete(null)
      setShowDeleteConfirmation(false)

      toast({
        title: "Cocktail gelöscht",
        description: `${cocktailToDelete.name} wurde erfolgreich gelöscht.`,
      })
    } catch (error) {
      console.error("Fehler beim Löschen des Cocktails:", error)

      toast({
        title: "Fehler beim Löschen",
        description: "Der Cocktail konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    }
  }

  const calculateCocktailDuration = (cocktail: Cocktail, pumpConfig: PumpConfig[], selectedSize: number): number => {
    const totalRecipeVolume = cocktail.recipe.reduce((total, item) => total + item.amount, 0)
    const scaleFactor = selectedSize / totalRecipeVolume

    let totalDuration = 0

    for (const item of cocktail.recipe) {
      if (item.type === "automatic") {
        const pump = pumpConfig.find((p) => p.ingredient === item.ingredientId && p.enabled)
        if (pump) {
          const scaledAmount = Math.round(item.amount * scaleFactor)
          const duration = (scaledAmount / pump.flowRate) * 1000
          totalDuration += duration

          if (item.ingredientId === "grenadine") {
            totalDuration += 2000
          }
        }
      }
    }

    return totalDuration
  }

  const handleMakeCocktail = async () => {
    if (!selectedCocktail || isMaking) {
      return
    }

    const cocktail = selectedCocktail

    if (!cocktail) {
      return
    }

    if (!pumpConfig || pumpConfig.length === 0) {
      console.log("[v0] PumpConfig not available, loading...")
      await loadPumpConfig()
      if (!pumpConfig || pumpConfig.length === 0) {
        setErrorMessage("Pumpenkonfiguration nicht verfügbar. Bitte versuchen Sie es erneut.")
        return
      }
    }

    setIsMaking(true)
    setProgress(0)
    setStatusMessage("Bereite Cocktail vor...")
    setErrorMessage(null)
    setManualIngredients([])

    try {
      const currentPumpConfig = pumpConfig

      const totalRecipeVolume = cocktail.recipe.reduce((total, item) => total + item.amount, 0)
      const scaleFactor = selectedSize / totalRecipeVolume

      const freshIngredients = await getAllIngredients() // Directly fetch ingredients here
      const ingredientLookup = freshIngredients.reduce(
        (acc, ingredient) => {
          acc[ingredient.id] = { name: ingredient.name }
          return acc
        },
        {} as Record<string, { name: string }>,
      )

      const manualRecipeItems = cocktail.recipe
        .filter((item) => item?.manual === true || item?.type === "manual")
        .map((item) => {
          const ingredientName =
            ingredientLookup?.[item.ingredientId]?.name ?? item.ingredientId.replace(/^custom-\d+-/, "").trim()
          const totalRecipeVolume = cocktail.recipe.reduce((t, it) => t + (Number(it?.amount) || 0), 0) || 1
          const scaleFactor = selectedSize / totalRecipeVolume
          const ml = Math.round((Number(item.amount) || 0) * scaleFactor)
          return { ingredientName, ml }
        })

      if (manualRecipeItems.length > 0) {
        const freshIngredients = await getAllIngredients()
        const ingredientLookupMap = new Map(freshIngredients.map((ing) => [ing.id, ing.name]))

        const manualIngredientsWithNames = cocktail.recipe
          .filter((item) => item?.manual === true || item?.type === "manual")
          .map((item) => {
            let name = ingredientLookupMap.get(item.ingredientId)

            // If not found in lookup, try to extract name from custom ingredient ID
            if (!name && item.ingredientId.startsWith("custom-")) {
              name = item.ingredientId.replace(/^custom-\d+-/, "").trim()
            }

            return {
              ...item,
              name: name || item.ingredientId,
            }
          })

        setManualIngredients(manualIngredientsWithNames)
        setStatusMessage(`${cocktail.name} (${selectedSize}ml) fast fertig!\nBitte manuelle Zutaten hinzufügen.`)
      } else {
        setManualIngredients([])
        setStatusMessage(`${cocktail.name} (${selectedSize}ml) fertig!`)
      }

      const estimatedDuration = calculateCocktailDuration(cocktail, currentPumpConfig, selectedSize)
      const progressInterval = Math.max(100, estimatedDuration / 100)

      console.log(`[v0] Estimated cocktail duration: ${estimatedDuration}ms, progress interval: ${progressInterval}ms`)
      console.log(
        `[v0] Using pumpConfig:`,
        currentPumpConfig.map((p) => `${p.id}: ${p.ingredient} (enabled: ${p.enabled})`),
      )

      console.log("[v0] Ingredient levels before cocktail:", ingredientLevels)

      let intervalId: NodeJS.Timeout
      intervalId = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(intervalId)
            return prev
          }
          return prev + 1
        })
      }, progressInterval)

      try {
        await fetch("/api/lighting-control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "cocktailPreparation" }),
        })
      } catch (error) {
        console.error("[v0] Error activating preparation lighting:", error)
      }

      const category = activeTab === "virgin" ? "virgin" : activeTab === "shots" ? "shots" : "cocktails"
      await makeCocktail(cocktail, currentPumpConfig, selectedSize, category)

      clearInterval(intervalId)
      setProgress(100)

      try {
        await fetch("/api/lighting-control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "cocktailFinished" }),
        })
      } catch (error) {
        console.error("[v0] Error activating finished lighting:", error)
      }

      // The status message is set above, so no need to set it again here.
      // The setShowManualIngredientsModal is also handled above.

      setShowSuccess(true)

      console.log("[v0] Reloading levels immediately after cocktail...")
      await loadIngredientLevels()
      console.log("[v0] Ingredient levels after cocktail:", ingredientLevels)

      console.log("[v0] Triggering cocktail-data-refresh event after cocktail preparation")
      window.dispatchEvent(new CustomEvent("cocktail-data-refresh"))

      const displayDuration = manualRecipeItems.length > 0 ? 8000 : 3000

      if (manualRecipeItems.length > 0) {
        // Show success dialog for 3 seconds, then show manual ingredients modal for 8 seconds
        setTimeout(() => {
          setShowSuccess(false)
          setShowManualIngredientsModal(true)

          // Hide manual ingredients modal after 8 seconds and return to idle
          setTimeout(() => {
            setShowManualIngredientsModal(false)
            setIsMaking(false)
            setSelectedCocktail(null)

            fetch("/api/lighting-control", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mode: "idle" }),
            }).catch((error) => console.error("[v0] Error returning to idle lighting:", error))
          }, 8000)
        }, 3000)
      } else {
        // No manual ingredients, just hide success dialog after 3 seconds
        setTimeout(() => {
          setIsMaking(false)
          setShowSuccess(false)
          setSelectedCocktail(null)

          fetch("/api/lighting-control", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "idle" }),
          }).catch((error) => console.error("[v0] Error returning to idle lighting:", error))
        }, displayDuration)
      }
    } catch (error) {
      let intervalId: NodeJS.Timeout
      clearInterval(intervalId)
      setProgress(0)
      setStatusMessage("Fehler bei der Zubereitung!")
      setErrorMessage(error instanceof Error ? error.message : "Unbekannter Fehler")
      setManualIngredients([])
      setTimeout(() => setIsMaking(false), 3000)
    }
  }

  const getCurrentVolume = () => {
    const cocktail = selectedCocktail
    if (!cocktail) return 0
    return cocktail.recipe.reduce((total, item) => total + item.amount, 0)
  }

  const ingredientAvailability = useMemo(() => {
    console.log("[v0] Main page: Recalculating ingredient availability, refreshTrigger:", refreshTrigger)

    if (!selectedCocktail || !pumpConfig || !ingredientLevels) {
      return { available: true, missingIngredients: [] }
    }

    const cocktail = selectedCocktail
    if (!cocktail) {
      return { available: false, missingIngredients: [] }
    }

    const totalRecipeVolume = cocktail.recipe.reduce((total, item) => total + item.amount, 0)
    const scaleFactor = selectedSize / totalRecipeVolume
    const missingIngredients: Array<{ ingredient: string; needed: number; available: number }> = []

    const ingredientLookup = allIngredientsData.reduce(
      (acc, ingredient) => {
        acc[ingredient.id] = { name: ingredient.name }
        return acc
      },
      {} as Record<string, { name: string }>,
    )

    console.log(
      "[v0] Main page: Checking availability for",
      cocktail.name,
      "with",
      cocktail.recipe.length,
      "ingredients",
    )

    for (const recipeItem of cocktail.recipe) {
      if (recipeItem.manual || recipeItem.type === "manual") {
        continue
      }

      const requiredAmount = Math.round(recipeItem.amount * scaleFactor)
      const pump = pumpConfig.find((p) => p.ingredient === recipeItem.ingredientId && p.enabled)

      console.log("[v0] Main page: Checking ingredient", recipeItem.ingredientId, "required:", requiredAmount + "ml")

      if (!pump) {
        console.log("[v0] Main page: No pump found for", recipeItem.ingredientId)
        const ingredient = ingredientLookup[recipeItem.ingredientId]
        missingIngredients.push({
          ingredient: ingredient?.name || recipeItem.ingredientId,
          needed: requiredAmount,
          available: 0,
        })
        continue
      }

      const level = ingredientLevels.find((l) => l.pumpId === pump.id)
      const availableAmount = level?.currentLevel || level?.currentAmount || 0

      console.log(
        "[v0] Main page: Pump",
        pump.id,
        "available:",
        availableAmount + "ml",
        "required:",
        requiredAmount + "ml",
      )

      if (availableAmount < requiredAmount) {
        console.log("[v0] Main page: Insufficient amount for", recipeItem.ingredientId)
        const ingredient = ingredientLookup[recipeItem.ingredientId]
        missingIngredients.push({
          ingredient: ingredient?.name || recipeItem.ingredientId,
          needed: requiredAmount,
          available: availableAmount,
        })
      }
    }

    const result = {
      available: missingIngredients.length === 0,
      missingIngredients,
    }

    console.log("[v0] Main page: Availability result:", result)
    return result
  }, [selectedCocktail, pumpConfig, ingredientLevels, selectedSize, allIngredientsData, refreshTrigger])

  const ingredientsAvailable = ingredientAvailability.available

  const getIngredientName = (id: string) => {
    const ingredient = allIngredientsData.find((i) => i.id === id)
    return ingredient ? ingredient.name : id
  }

  const handleTabChange = (newTab: string) => {
    setSelectedCocktail(null)
    setActiveTab(newTab)
  }

  const handleExitKiosk = async () => {
    try {
      const response = await fetch("/api/exit-kiosk", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Kiosk-Modus wird beendet",
          description: "Die Anwendung wird in wenigen Sekunden geschlossen.",
        })
      } else {
        toast({
          title: "Fehler",
          description: "Kiosk-Modus konnte nicht beendet werden.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Fehler beim Beenden des Kiosk-Modus:", error)
      toast({
        title: "Fehler",
        description: "Verbindungsproblem beim Beenden des Kiosk-Modus.",
        variant: "destructive",
      })
    }
  }

  const handleTitleClick = () => {
    const currentTime = Date.now()

    if (currentTime - lastClickTime > 3000 && kioskExitClicks > 0) {
      setKioskExitClicks(1)
    } else {
      setKioskExitClicks((prev) => prev + 1)
    }

    setLastClickTime(currentTime)

    if (kioskExitClicks + 1 >= 5) {
      handleExitKiosk()
      setKioskExitClicks(0)
    }
  }

  const findDetailImagePath = async (cocktail: Cocktail): Promise<string> => {
    if (!cocktail.image) {
      console.log(`[v0] No image specified for ${cocktail.name}, using placeholder`)
      return `/placeholder.svg?height=400&width=400&query=${encodeURIComponent(cocktail.name)}`
    }

    const filename = cocktail.image.split("/").pop() || cocktail.image
    const filenameWithoutExt = filename.replace(/\.[^/.]+$/, "")
    const originalExt = filename.split(".").pop()?.toLowerCase() || ""

    const imageExtensions = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg"]

    const extensionsToTry = originalExt
      ? [originalExt, ...imageExtensions.filter((ext) => ext !== originalExt)]
      : imageExtensions

    const basePaths = ["/images/cocktails/", "/", ""]

    const strategies: string[] = []

    for (const basePath of basePaths) {
      for (const ext of extensionsToTry) {
        strategies.push(`${basePath}${filenameWithoutExt}.${ext}`)
      }
      strategies.push(`${basePath}${filename}`)
    }

    strategies.push(
      cocktail.image,
      cocktail.image.startsWith("/") ? cocktail.image.slice(1) : `/${cocktail.image}`,
      cocktail.image.split("?")[0],
    )

    const uniqueStrategies = [...new Set(strategies)]

    console.log(
      `[v0] Testing ${uniqueStrategies.length} detail image strategies for ${cocktail.name}:`,
      uniqueStrategies.slice(0, 10),
    )

    for (let i = 0; i < uniqueStrategies.length; i++) {
      const testPath = uniqueStrategies[i]

      try {
        const img = new Image()
        img.crossOrigin = "anonymous"

        const loadPromise = new Promise<boolean>((resolve) => {
          img.onload = () => resolve(true)
          img.onerror = () => resolve(false)
        })

        img.src = testPath
        const success = await loadPromise

        if (success) {
          console.log(`[v0] ✅ Found working detail image for ${cocktail.name}: ${testPath}`)
          return testPath
        }
      } catch (error) {
        // Fehler ignorieren und nächste Strategie versuchen
      }
    }

    console.log(`[v0] ❌ No working detail image found for ${cocktail.name}, using placeholder`)
    return `/placeholder.svg?height=400&width=400&query=${encodeURIComponent(cocktail.name)}`
  }

  function CocktailDetail({
    cocktail,
    onBack,
    onEdit,
    onDelete,
    onImageEdit,
    onMakeCocktail,
    pumpConfig,
    ingredientLevels,
    allIngredients,
  }: {
    cocktail: Cocktail
    onBack: () => void
    onEdit: (id: string) => void
    onDelete: (id: string) => void
    onImageEdit: (id: string) => void
    onMakeCocktail: () => void
    pumpConfig: PumpConfig[]
    ingredientLevels: IngredientLevel[]
    allIngredients: any[]
  }) {
    const [detailImageSrc, setDetailImageSrc] = useState<string>("")

    useEffect(() => {
      const loadDetailImage = async () => {
        console.log(`[v0] CocktailDetail: Loading detail image for ${cocktail.name}`)
        console.log(`[v0] CocktailDetail: Original cocktail.image = ${cocktail.image}`)
        const imagePath = await findDetailImagePath(cocktail)
        console.log(`[v0] CocktailDetail: Setting detail image path: ${imagePath}`)
        setDetailImageSrc(imagePath)
      }

      loadDetailImage()
    }, [cocktail])

    useEffect(() => {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }, [cocktail.id])

    const handleDetailImageError = () => {
      console.log(`[v0] CocktailDetail: Image error for ${cocktail.name}, current src: ${detailImageSrc}`)
      console.log(`[v0] CocktailDetail: Falling back to placeholder`)
      const placeholder = `/placeholder.svg?height=400&width=400&query=${encodeURIComponent(cocktail.id)}`
      setDetailImageSrc(placeholder)
    }

    const availableSizes = cocktail.sizes || [200, 300, 400]
    const allAvailableSizes = availableSizes.sort((a, b) => a - b)

    const isCompleted = progress === 100

    const freshIngredients = getAllIngredients()
    const ingredientLookup = freshIngredients.reduce(
      (acc, ingredient) => {
        acc[ingredient.id] = { name: ingredient.name }
        return acc
      },
      {} as Record<string, { name: string }>,
    )

    const manualRecipeItems = cocktail.recipe
      .filter((item) => item?.manual === true || item?.type === "manual")
      .map((item) => {
        const ingredientName =
          ingredientLookup?.[item.ingredientId]?.name ?? item.ingredientId.replace(/^custom-\d+-/, "").trim()
        const totalRecipeVolume = cocktail.recipe.reduce((t, it) => t + (Number(it?.amount) || 0), 0) || 1
        const scaleFactor = selectedSize / totalRecipeVolume
        const ml = Math.round((Number(item.amount) || 0) * scaleFactor)
        return { ingredientName, ml }
      })

    return (
      <Card className="overflow-hidden transition-all bg-black border-[hsl(var(--cocktail-card-border))] ring-2 ring-[hsl(var(--cocktail-primary))] shadow-2xl">
        <div className="flex flex-col md:flex-row">
          <div className="relative w-full md:w-1/3 h-48 md:h-64">
            <img
              src={detailImageSrc || "/placeholder.svg"}
              alt={cocktail.name}
              className="w-full h-full object-cover rounded-t-lg md:rounded-l-lg md:rounded-t-none"
              onError={handleDetailImageError}
              onLoad={() => console.log(`[v0] CocktailDetail: Image loaded successfully: ${detailImageSrc}`)}
              crossOrigin="anonymous"
              key={`${cocktail.image}-${detailImageSrc}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-t-lg md:rounded-l-lg md:rounded-t-none" />
            <Badge
              variant={cocktail.alcoholic ? "default" : "default"}
              className="absolute top-3 left-3 text-sm bg-[hsl(var(--cocktail-primary))] text-black px-3 py-1 shadow-lg"
            >
              {cocktail.alcoholic ? "Alkoholisch" : "Alkoholfrei"}
            </Badge>
          </div>
          <div className="flex-1 p-6 flex flex-col">
            <div className="flex flex-col md:flex-row gap-6 flex-1">
              <div className="md:w-3/5">
                <h3
                  className="font-bold text-2xl text-[hsl(var(--cocktail-text))] mb-2 cursor-pointer"
                  onClick={handleTitleClick}
                >
                  {cocktail.name}
                </h3>
                <p className="text-base text-[hsl(var(--cocktail-text-muted))] mb-4 leading-relaxed">
                  {cocktail.description}
                </p>
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-[hsl(var(--cocktail-text))]">Zutaten:</h4>
                  <ul className="space-y-2 text-[hsl(var(--cocktail-text))]">
                    {cocktail.recipe.map((item, index) => {
                      const ingredient = freshIngredients.find((i) => i.id === item.ingredientId)
                      let ingredientName = ingredient ? ingredient.name : item.ingredientId

                      if (!ingredient && item.ingredientId.startsWith("custom-")) {
                        ingredientName = item.ingredientId.replace(/^custom-\d+-/, "").trim()
                        // If extraction still results in empty or just "custom", try to get from lookup
                        if (!ingredientName || ingredientName === "custom") {
                          ingredientName = ingredientLookup?.[item.ingredientId]?.name || item.ingredientId
                        }
                      }

                      const isManual = item.manual === true || item.type === "manual"

                      return (
                        <li key={index} className={`flex items-center ${isManual ? "opacity-60" : ""}`}>
                          <span className="mr-2 text-[hsl(var(--cocktail-primary))]">•</span>
                          <span className={isManual ? "italic text-gray-400" : ""}>
                            {Math.round(
                              item.amount * (selectedSize / (cocktail.recipe.reduce((t, it) => t + it.amount, 0) || 1)),
                            )}
                            ml {ingredientName}
                            {isManual && <span className="text-[hsl(var(--cocktail-text-muted))] ml-2">(manuell)</span>}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
              <div className="md:w-2/5 flex flex-col">
                <div className="flex flex-col items-center mb-6">
                  <h4 className="text-lg font-semibold mb-4 text-[hsl(var(--cocktail-text))] text-center">
                    Cocktailgröße:
                  </h4>
                  <div className="flex gap-2 w-full justify-center">
                    {allAvailableSizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`py-1.5 px-2.5 rounded-lg transition-all duration-200 font-medium text-xs ${
                          selectedSize === size
                            ? "bg-[hsl(var(--cocktail-primary))] text-black shadow-lg scale-105"
                            : "bg-[hsl(var(--cocktail-card-bg))] text-[hsl(var(--cocktail-text-muted))] hover:bg-[hsl(var(--cocktail-card-border))] hover:text-[hsl(var(--cocktail-primary))] hover:scale-102 shadow-md"
                        }`}
                      >
                        {size}ml
                      </button>
                    ))}
                  </div>
                  <div className="text-sm text-[hsl(var(--cocktail-text-muted))] mt-3 text-center">
                    Original: ca. {getCurrentVolume()}ml
                  </div>
                </div>

                {!ingredientsAvailable && (
                  <Alert className="bg-[hsl(var(--cocktail-error))]/10 border-[hsl(var(--cocktail-error))]/30 mb-6">
                    <AlertCircle className="h-4 w-4 text-[hsl(var(--cocktail-error))]" />
                    <AlertDescription className="text-[hsl(var(--cocktail-error))] text-sm">
                      <div className="space-y-1">
                        <div className="font-medium">Fehlende Zutaten:</div>
                        {ingredientAvailability.missingIngredients.map((missing, index) => (
                          <div key={index} className="text-xs">
                            • {missing.ingredient}: {missing.needed}ml benötigt, {missing.available}ml verfügbar
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex flex-col gap-3 mt-auto">
                  <Button
                    onClick={onMakeCocktail}
                    disabled={!ingredientsAvailable || isMaking}
                    className="w-full bg-[#00ff00] hover:bg-[#00ff00]/90 text-black font-bold py-3 px-6 rounded-lg text-base"
                  >
                    {isMaking ? "Zubereitung läuft..." : "Cocktail zubereiten"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 bg-[hsl(var(--cocktail-card-bg))] text-[hsl(var(--cocktail-text))] border-[hsl(var(--cocktail-card-border))] hover:bg-[hsl(var(--cocktail-card-border))]"
                    onClick={() => onEdit(cocktail.id)}
                  >
                    <Edit className="h-4 w-4" />
                    Bearbeiten
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {isCompleted &&
          statusMessage.includes("Bitte manuelle Zutaten hinzufügen.") &&
          cocktail &&
          manualRecipeItems.length > 0 && (
            <div className="mt-3 p-4 bg-[hsl(var(--cocktail-card-bg))]/50 rounded-b-lg">
              <div className="font-medium">
                Bitte folgende Zutat{manualRecipeItems.length > 1 ? "en" : ""} hinzufügen:
              </div>
              <ul className="list-disc pl-6 mt-1 space-y-1">
                {manualRecipeItems.map((item, index) => (
                  <li key={index} className="text-base leading-tight">
                    {item.ml}ml {item.ingredientName}
                  </li>
                ))}
              </ul>
            </div>
          )}
      </Card>
    )
  }

  function PaginationComponent({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
  }) {
    return (
      <div className="flex justify-center items-center gap-3 mt-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-10 w-10 p-0 bg-[#00ff00] text-black border-[#00ff00] hover:bg-[#00ff00] disabled:opacity-50 disabled:bg-[hsl(var(--cocktail-card-bg))] disabled:text-[hsl(var(--cocktail-text))] disabled:border-[hsl(var(--cocktail-card-border))] shadow-lg"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium text-[hsl(var(--cocktail-text))] bg-[hsl(var(--cocktail-card-bg))] px-4 py-2 rounded-lg border border-[hsl(var(--cocktail-card-border))]">
          Seite {currentPage} von {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-10 w-10 p-0 bg-[#00ff00] text-black border-[#00ff00] hover:bg-[#00ff00] disabled:opacity-50 disabled:bg-[hsl(var(--cocktail-card-bg))] disabled:text-[hsl(var(--cocktail-text))] disabled:border-[hsl(var(--cocktail-card-border))] shadow-lg"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    )
  }

  const renderContent = () => {
    if (selectedCocktail) {
      return (
        <CocktailDetail
          cocktail={selectedCocktail}
          onBack={() => setSelectedCocktail(null)}
          onEdit={handleEditRecipe}
          onDelete={handleDeleteClick}
          onImageEdit={handleImageEditClick}
          onMakeCocktail={handleMakeCocktail}
          pumpConfig={pumpConfig}
          ingredientLevels={ingredientLevels}
          allIngredients={allIngredientsData}
        />
      )
    }

    switch (activeTab) {
      case "cocktails":
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-[hsl(var(--cocktail-text))] text-center">Cocktails mit Alkohol</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentPageCocktails.map((cocktail) => (
                <CocktailCard
                  key={cocktail.id}
                  cocktail={cocktail}
                  onClick={() => setSelectedCocktail(cocktail)}
                  onEdit={() => handleRecipeEditClick(cocktail.id)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <PaginationComponent
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handleCocktailPageChange}
              />
            )}
          </div>
        )
      case "virgin":
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-[hsl(var(--cocktail-text))] text-center">Alkoholfreie Cocktails</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentPageVirginCocktails.map((cocktail) => (
                <CocktailCard
                  key={cocktail.id}
                  cocktail={cocktail}
                  onClick={() => setSelectedCocktail(cocktail)}
                  onEdit={() => handleRecipeEditClick(cocktail.id)}
                />
              ))}
            </div>

            {virginTotalPages > 1 && (
              <PaginationComponent
                currentPage={virginCurrentPage}
                totalPages={virginTotalPages}
                onPageChange={handleVirginPageChange}
              />
            )}
          </div>
        )
      case "shots":
        return (
          <ShotSelector
            pumpConfig={pumpConfig}
            ingredientLevels={ingredientLevels}
            onShotComplete={loadIngredientLevels}
          />
        )
      case "recipe-creator":
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-[hsl(var(--cocktail-text))]">Neues Rezept erstellen</h2>
            <RecipeCreator isOpen={true} onClose={() => setActiveTab("cocktails")} onSave={handleNewRecipeSave} />
          </div>
        )
      case "levels":
        return <IngredientLevels pumpConfig={pumpConfig} onLevelsUpdated={loadIngredientLevels} />
      case "ingredients":
        return <IngredientManager onClose={() => setActiveTab("cocktails")} />
      case "calibration":
        return <PumpCalibration pumpConfig={pumpConfig} onConfigUpdate={loadPumpConfig} />
      case "cleaning":
        return <PumpCleaning pumpConfig={pumpConfig} />
      case "venting":
        return (
          <QuickShotSelector
            pumpConfig={pumpConfig}
            ingredientLevels={ingredientLevels}
            onShotComplete={loadIngredientLevels}
          />
        )
      case "beleuchtung":
        return <LightingControl />
      case "service":
        return (
          <ServiceMenu
            pumpConfig={pumpConfig}
            ingredientLevels={ingredientLevels}
            onLevelsUpdated={loadIngredientLevels}
            onConfigUpdate={loadPumpConfig}
            onShotComplete={loadIngredientLevels}
            availableIngredients={getAvailableIngredientsFromCocktails()}
            cocktails={cocktailsData}
            onCocktailSelect={(cocktail) => setSelectedCocktail(cocktail)}
            onImageEditClick={handleImageEditClick}
            onDeleteCocktail={handleDeleteClick}
            onNewRecipe={handleNewRecipeSave}
            onTabConfigReload={reloadTabConfig}
          />
        )
      default:
        return null
    }
  }

  const renderTabButton = (tabId: string, tabName: string) => (
    <Button
      key={tabId}
      onClick={() => handleTabChange(tabId)}
      className={`flex-1 py-1.5 px-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none text-sm ${
        activeTab === tabId
          ? "bg-[#00ff00] text-black scale-105 focus:bg-[#00ff00]"
          : "bg-[hsl(var(--cocktail-card-bg))] text-[hsl(var(--cocktail-text))] hover:bg-[hsl(var(--cocktail-card-border))] hover:scale-102 focus:bg-[#00ff00] focus:text-black"
      }`}
    >
      {tabName}
    </Button>
  )

  const reloadTabConfig = async () => {
    console.log("[v0] Reloading tab configuration...")
    await loadTabConfig()
  }

  useEffect(() => {
    const syncLevels = async () => {
      if (pumpConfig && pumpConfig.length > 0) {
        const { syncLevelsWithPumpConfig } = await import("@/lib/ingredient-level-service")
        await syncLevelsWithPumpConfig(pumpConfig)
      }
    }
    syncLevels()
  }, [pumpConfig])

  const handleTermsAccept = () => {
    setShowTerms(false)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {showTerms && <TermsOfService onAccept={handleTermsAccept} />}

      <div className="container mx-auto p-6 max-w-7xl">
        <header className="mb-8">
          <h1
            className="text-4xl font-bold text-center text-[hsl(var(--cocktail-text))] mb-2 cursor-pointer"
            onClick={handleTitleClick}
          >
            CocktailBot
          </h1>
        </header>

        <div className="mb-8">
          <nav className="tabs-list">
            <div className="flex flex-wrap justify-center gap-3 pb-2">
              {tabConfig &&
                mainTabs
                  .filter((tabId) => tabId !== "service")
                  .map((tabId) => {
                    const tab = tabConfig.tabs.find((t) => t.id === tabId)
                    return tab ? renderTabButton(tab.id, tab.name) : null
                  })}
              {renderTabButton("service", "Servicemenü")}
            </div>
          </nav>
        </div>

        <main className="min-h-[60vh]">{renderContent()}</main>

        {isMaking && (
          <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md mx-auto">
              <Card className="border-[hsl(var(--cocktail-card-border))] bg-black text-[hsl(var(--cocktail-text))]">
                <CardContent className="pt-8 pb-8 space-y-6">
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-[hsl(var(--cocktail-primary))]/10 flex items-center justify-center">
                      <GlassWater className="h-12 w-12 text-[hsl(var(--cocktail-primary))]" />
                    </div>
                    <h2 className="text-2xl font-semibold text-center">{statusMessage}</h2>
                  </div>

                  <div className="space-y-3">
                    <Progress value={progress} className="h-4" />
                    <div className="text-center text-lg text-[hsl(var(--cocktail-text-muted))]">
                      {progress}% abgeschlossen
                    </div>
                  </div>

                  {errorMessage && (
                    <Alert className="bg-[hsl(var(--cocktail-error))]/10 border-[hsl(var(--cocktail-error))]/30">
                      <AlertCircle className="h-4 w-4 text-[hsl(var(--cocktail-error))]" />
                      <AlertDescription className="text-[hsl(var(--cocktail-error))]">{errorMessage}</AlertDescription>
                    </Alert>
                  )}

                  {showSuccess && (
                    <div className="flex justify-center">
                      <div className="rounded-full bg-[hsl(var(--cocktail-success))]/20 p-4">
                        <Check className="h-10 w-10 text-[hsl(var(--cocktail-success))]" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <PasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          onSuccess={handlePasswordSuccess}
        />

        <PasswordModal
          isOpen={showImageEditorPasswordModal}
          onClose={() => setShowImageEditorPasswordModal(false)}
          onSuccess={handleImageEditorPasswordSuccess}
        />

        <PasswordModal
          isOpen={showRecipeCreatorPasswordModal}
          onClose={() => setShowRecipeCreatorPasswordModal(false)}
          onSuccess={handleRecipeCreatorPasswordSuccess}
        />

        {showRecipeEditor && selectedCocktail && (
          <RecipeEditor
            isOpen={showRecipeEditor}
            onClose={() => {
              setShowRecipeEditor(false)
              setSelectedCocktail(null)
            }}
            cocktail={selectedCocktail}
            onSave={handleRecipeSave}
            onRequestDelete={handleRequestDelete}
          />
        )}

        <RecipeCreator
          isOpen={showRecipeCreator}
          onClose={() => setShowRecipeCreator(false)}
          onSave={handleNewRecipeSave}
        />

        <DeleteConfirmation
          isOpen={showDeleteConfirmation}
          onClose={() => setShowDeleteConfirmation(false)}
          onConfirm={handleDeleteConfirm}
          cocktailName={cocktailToDelete?.name || ""}
        />

        <ImageEditor
          isOpen={showImageEditor}
          onClose={() => setShowImageEditor(false)}
          cocktail={selectedCocktail}
          onSave={handleImageSave}
        />

        {showManualIngredientsModal && manualIngredients.length > 0 && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
            <div className="w-full max-w-lg mx-auto">
              <Card className="border-[hsl(var(--cocktail-card-border))] bg-[hsl(var(--cocktail-card-bg))] text-[hsl(var(--cocktail-text))]">
                <CardContent className="pt-8 pb-8 space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-[hsl(var(--cocktail-primary))]/20 flex items-center justify-center">
                      <Plus className="h-8 w-8 text-[hsl(var(--cocktail-primary))]" />
                    </div>
                    <h2 className="text-2xl font-semibold text-center text-[hsl(var(--cocktail-text))]">
                      Manuelle Zutaten hinzufügen
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {manualIngredients.map((item, index) => {
                      const totalRecipeVolume =
                        selectedCocktail?.recipe.reduce((t, it) => t + (Number(it?.amount) || 0), 0) || 1
                      const scaleFactor = selectedSize / totalRecipeVolume
                      const scaledAmount = Math.round((Number(item.amount) || 0) * scaleFactor)

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 rounded-lg bg-[hsl(var(--cocktail-card-bg))]/50 border border-[hsl(var(--cocktail-card-border))]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-[hsl(var(--cocktail-primary))]"></div>
                            <span className="font-medium text-[hsl(var(--cocktail-text))]">{item.name}</span>
                          </div>
                          <span className="text-lg font-semibold text-[hsl(var(--cocktail-primary))]">
                            {scaledAmount}ml
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
