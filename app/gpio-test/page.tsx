"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function GPIOTestPage() {
  const [pin, setPin] = useState("17")
  const [duration, setDuration] = useState("1000")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApiTest = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/gpio")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unbekannter Fehler")
    } finally {
      setLoading(false)
    }
  }

  const handleSetup = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/gpio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "setup" }),
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unbekannter Fehler")
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/gpio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "activate",
          pin: Number.parseInt(pin),
          duration: Number.parseInt(duration),
        }),
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unbekannter Fehler")
    } finally {
      setLoading(false)
    }
  }

  const handleCleanup = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/gpio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "cleanup" }),
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unbekannter Fehler")
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/gpio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "test" }),
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unbekannter Fehler")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>GPIO Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pin">GPIO Pin</Label>
              <Input id="pin" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Pin-Nummer" />
            </div>
            <div>
              <Label htmlFor="duration">Dauer (ms)</Label>
              <Input
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Dauer in Millisekunden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button onClick={handleApiTest} disabled={loading}>
              API Test (GET)
            </Button>
            <Button onClick={handleTest} disabled={loading}>
              Test (ohne Python)
            </Button>
            <Button onClick={handleSetup} disabled={loading}>
              Setup
            </Button>
            <Button onClick={handleActivate} disabled={loading}>
              Pin aktivieren
            </Button>
            <Button onClick={handleCleanup} disabled={loading} className="col-span-2">
              Cleanup
            </Button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p className="font-bold">Fehler</p>
              <p>{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-gray-100 p-4 rounded">
              <h3 className="font-bold mb-2">Ergebnis:</h3>
              <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
