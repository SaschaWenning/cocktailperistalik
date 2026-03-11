import { notFound, redirect } from "next/navigation"
import { cocktails } from "@/data/cocktails"

export default function CocktailPage({ params }: { params: { id: string } }) {
  // Finde den Cocktail anhand der ID
  const cocktail = cocktails.find((c) => c.id === params.id)

  // Wenn der Cocktail nicht gefunden wurde, zeige die 404-Seite an
  if (!cocktail) {
    notFound()
  }

  // Leite zur Hauptseite weiter, da wir die Detailansicht jetzt dort integriert haben
  redirect("/")
}
