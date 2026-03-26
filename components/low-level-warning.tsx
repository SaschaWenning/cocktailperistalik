import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"
import type { IngredientAvailability } from "@/lib/ingredient-availability"

interface LowLevelWarningProps {
  availability: IngredientAvailability
}

export default function LowLevelWarning({ availability }: LowLevelWarningProps) {
  console.log("[v0] LowLevelWarning - Availability:", {
    canMake: availability.canMake,
    lowIngredients: availability.lowIngredients,
    missingIngredients: availability.missingIngredients,
  })

  // Keine Warnung anzeigen, wenn genug Zutaten da sind
  if (availability.canMake && availability.lowIngredients.length === 0) {
    console.log("[v0] LowLevelWarning - No warning needed (enough ingredients)")
    return null
  }

  // Rot: Kann nicht gemacht werden (fehlende Zutaten)
  if (!availability.canMake) {
    console.log("[v0] LowLevelWarning - Showing RED warning (cannot make)")
    return (
      <Badge className="absolute top-2 left-2 bg-red-600 text-white font-medium shadow-lg flex items-center gap-1 text-xs px-2 py-1">
        <AlertTriangle className="h-3 w-3" />
        Niedriger Füllstand
      </Badge>
    )
  }

  // Orange: Kann gemacht werden, aber niedrige Füllstände
  if (availability.lowIngredients.length > 0) {
    console.log("[v0] LowLevelWarning - Showing ORANGE warning (low ingredients)")
    return (
      <Badge className="absolute top-2 left-2 bg-orange-500 text-white font-medium shadow-lg flex items-center gap-1 text-xs px-2 py-1">
        <AlertTriangle className="h-3 w-3" />
        Niedriger Füllstand
      </Badge>
    )
  }

  console.log("[v0] LowLevelWarning - No warning shown (fallback)")
  return null
}
