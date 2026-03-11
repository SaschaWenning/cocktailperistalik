"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

interface TermsOfServiceProps {
  onAccept: () => void
}

export default function TermsOfService({ onAccept }: TermsOfServiceProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Prüfen, ob die Nutzungsbedingungen bereits akzeptiert wurden
    const termsAccepted = localStorage.getItem("cocktailbot-terms-accepted")
    if (!termsAccepted) {
      setIsVisible(true)
    }
  }, [])

  const handleAccept = () => {
    // Akzeptierung in localStorage speichern
    localStorage.setItem("cocktailbot-terms-accepted", "true")
    setIsVisible(false)
    onAccept()
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] bg-gray-900 border-gray-700 text-white flex flex-col">
        <CardHeader className="text-center flex-shrink-0">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Nutzungsbedingungen</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-6">
          <div className="text-gray-200 leading-relaxed space-y-4">
            <p>
              Diese Software und die dazugehörige Bauanleitung sind ausschließlich für den
              <strong className="text-green-400"> privaten Gebrauch</strong> bestimmt.
            </p>
            <p>
              Jegliche <strong className="text-red-400">gewerbliche Nutzung</strong> - insbesondere der Bau und Verkauf
              vom Cocktailbot, die Nutzung in Gastronomie, auf Events sowie die kommerzielle Verwendung der Software -
              ist ohne vorherige schriftliche Lizenzvereinbarung mit dem Urheber
              <strong className="text-red-400"> nicht gestattet</strong>.
            </p>
            <p>
              Mit dem Fortfahren bestätigen Sie, dass Sie diese Bedingungen gelesen, verstanden und akzeptiert haben.
            </p>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
              <p className="text-sm text-gray-300">
                <strong>Kontakt für Lizenzanfragen:</strong>
                <br />
                <span className="text-green-400">printcore@outlook.de</span>
              </p>
            </div>
          </div>
        </CardContent>
        <div className="flex-shrink-0 p-6 pt-0">
          <div className="flex justify-center">
            <Button
              onClick={handleAccept}
              className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 text-lg"
              size="lg"
            >
              Ich akzeptiere die Bedingungen
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
