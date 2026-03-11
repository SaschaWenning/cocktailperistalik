import type React from "react"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import ClientWrapper from "./ClientWrapper"
import Footer from "@/components/footer"

export const metadata = {
  title: "CocktailBot - Automatische Cocktailmaschine",
  description: "Steuere deine Cocktailmaschine mit dem Raspberry Pi",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-screen bg-[hsl(var(--cocktail-bg))] flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <div className="flex-1">
            <ClientWrapper>{children}</ClientWrapper>
          </div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
