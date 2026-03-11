"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Folder, File, ImageIcon, ArrowLeft, Home, HardDrive } from "lucide-react"

interface FileItem {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
  size: number
  modified: string
  isImage: boolean
}

interface FileBrowserData {
  currentPath: string
  parentPath: string | null
  items: FileItem[]
}

interface FileBrowserProps {
  isOpen: boolean
  onClose: () => void
  onSelectImage: (imagePath: string) => void
}

export default function FileBrowser({ isOpen, onClose, onSelectImage }: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState("/home/pi")
  const [browserData, setBrowserData] = useState<FileBrowserData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)

  // Lade Dateisystem-Daten
  const loadDirectory = async (path: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/filesystem?path=${encodeURIComponent(path)}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Fehler beim Laden des Verzeichnisses")
      }
      const data: FileBrowserData = await response.json()
      setBrowserData(data)
      setCurrentPath(data.currentPath)
      setSelectedImage(null)
      setImagePreviewUrl(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler")
      setBrowserData(null)
    } finally {
      setLoading(false)
    }
  }

  // Lade Bildvorschau
  const loadImagePreview = async (imagePath: string) => {
    setImageLoading(true)
    try {
      // Erstelle URL für die Bildvorschau über unsere API
      const previewUrl = `/api/image?path=${encodeURIComponent(imagePath)}`
      setImagePreviewUrl(previewUrl)
    } catch (err) {
      console.error("Fehler beim Laden der Bildvorschau:", err)
      setImagePreviewUrl(null)
    } finally {
      setImageLoading(false)
    }
  }

  // Lade Root-Verzeichnis beim Öffnen
  useEffect(() => {
    if (isOpen) {
      loadDirectory("/home/pi").catch(() => {
        console.log("Fallback to root directory")
        loadDirectory("/")
      })
    }
  }, [isOpen])

  const handleDirectoryClick = (path: string) => {
    loadDirectory(path)
  }

  const handleImageClick = (imagePath: string) => {
    setSelectedImage(imagePath)
    loadImagePreview(imagePath)
  }

  const handleSelectImage = () => {
    if (selectedImage) {
      onSelectImage(selectedImage)
      onClose()
    }
  }

  const goToParent = () => {
    if (browserData?.parentPath) {
      loadDirectory(browserData.parentPath)
    }
  }

  const goToRoot = () => {
    loadDirectory("/")
  }

  const goToHome = () => {
    loadDirectory("/home/pi").catch(() => {
      loadDirectory("/home")
    })
  }

  const goToMedia = () => {
    loadDirectory("/media")
  }

  const goToOpt = () => {
    loadDirectory("/opt")
  }

  const goToVar = () => {
    loadDirectory("/var")
  }

  const goToEtc = () => {
    loadDirectory("/etc")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-[hsl(var(--cocktail-card-border))] text-white sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Dateibrowser - Bild auswählen</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[70vh]">
          {/* Navigation Bar */}
          <div className="flex items-center gap-2 p-2 bg-[hsl(var(--cocktail-card-bg))] rounded-md mb-4 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToRoot}
              className="text-white hover:bg-[hsl(var(--cocktail-card-border))]"
            >
              <HardDrive className="h-4 w-4 mr-1" />
              Root
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToHome}
              className="text-white hover:bg-[hsl(var(--cocktail-card-border))]"
            >
              <Home className="h-4 w-4 mr-1" />
              Home
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToMedia}
              className="text-white hover:bg-[hsl(var(--cocktail-card-border))]"
            >
              <Folder className="h-4 w-4 mr-1" />
              Media
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToOpt}
              className="text-white hover:bg-[hsl(var(--cocktail-card-border))]"
            >
              <Folder className="h-4 w-4 mr-1" />
              Opt
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToVar}
              className="text-white hover:bg-[hsl(var(--cocktail-card-border))]"
            >
              <Folder className="h-4 w-4 mr-1" />
              Var
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToEtc}
              className="text-white hover:bg-[hsl(var(--cocktail-card-border))]"
            >
              <Folder className="h-4 w-4 mr-1" />
              Etc
            </Button>
            {browserData?.parentPath && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goToParent}
                className="text-white hover:bg-[hsl(var(--cocktail-card-border))]"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Zurück
              </Button>
            )}
          </div>

          {/* Current Path Display */}
          <div className="text-sm text-gray-300 mb-2 p-2 bg-[hsl(var(--cocktail-card-bg))] rounded">
            Aktueller Pfad: {currentPath}
          </div>

          <div className="grid grid-cols-[2fr_1fr] gap-4 flex-1">
            {/* File List */}
            <div className="border border-[hsl(var(--cocktail-card-border))] rounded-md">
              <div className="p-2 bg-[hsl(var(--cocktail-card-bg))] border-b border-[hsl(var(--cocktail-card-border))]">
                <h3 className="font-semibold">Dateien und Ordner</h3>
              </div>
              <ScrollArea className="h-[calc(70vh-200px)]">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Lade Verzeichnis...</span>
                  </div>
                ) : error ? (
                  <div className="p-4 text-red-400">
                    <p>Fehler: {error}</p>
                  </div>
                ) : browserData ? (
                  <div className="p-2">
                    {browserData.items.map((item) => (
                      <div
                        key={item.path}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-[hsl(var(--cocktail-card-border))] ${
                          selectedImage === item.path ? "bg-[hsl(var(--cocktail-primary))] text-black" : ""
                        }`}
                        onClick={() => {
                          if (item.isDirectory) {
                            handleDirectoryClick(item.path)
                          } else if (item.isImage) {
                            handleImageClick(item.path)
                          }
                        }}
                      >
                        {item.isDirectory ? (
                          <Folder className="h-4 w-4 text-yellow-400" />
                        ) : item.isImage ? (
                          <ImageIcon className="h-4 w-4 text-green-400" />
                        ) : (
                          <File className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="flex-1 text-sm">{item.name}</span>
                        {item.isFile && (
                          <span className="text-xs text-gray-400">{(item.size / 1024).toFixed(1)} KB</span>
                        )}
                      </div>
                    ))}
                    {browserData.items.length === 0 && (
                      <div className="p-4 text-gray-400 text-center">Dieser Ordner ist leer</div>
                    )}
                  </div>
                ) : null}
              </ScrollArea>
            </div>

            {/* Image Preview */}
            <div className="border border-[hsl(var(--cocktail-card-border))] rounded-md">
              <div className="p-2 bg-[hsl(var(--cocktail-card-bg))] border-b border-[hsl(var(--cocktail-card-border))]">
                <h3 className="font-semibold">Vorschau</h3>
              </div>
              <div className="p-4 flex flex-col items-center justify-center h-[calc(70vh-200px)]">
                {selectedImage ? (
                  <>
                    <div className="relative w-full aspect-square border border-[hsl(var(--cocktail-card-border))] rounded-md overflow-hidden mb-2">
                      {imageLoading ? (
                        <div className="flex items-center justify-center w-full h-full">
                          <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                      ) : imagePreviewUrl ? (
                        <img
                          src={imagePreviewUrl || "/placeholder.svg"}
                          alt="Vorschau"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            console.error("Fehler beim Laden des Bildes:", selectedImage)
                            e.currentTarget.src = "/placeholder.svg?height=200&width=200"
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-gray-400">
                          <ImageIcon className="h-12 w-12" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-center text-gray-300">{selectedImage.split("/").pop()}</p>
                    <p className="text-xs text-center text-gray-400 mt-1">{selectedImage}</p>
                  </>
                ) : (
                  <div className="text-center text-gray-400">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Wähle ein Bild aus der Liste aus</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="bg-[hsl(var(--cocktail-card-bg))] text-white border-[hsl(var(--cocktail-card-border))] hover:bg-[hsl(var(--cocktail-card-border))]"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSelectImage}
            disabled={!selectedImage}
            className="bg-[hsl(var(--cocktail-primary))] text-black hover:bg-[hsl(var(--cocktail-primary-hover))]"
          >
            Bild auswählen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
