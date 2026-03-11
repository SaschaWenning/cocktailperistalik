export default function Footer() {
  return (
    <footer className="w-full py-4 mt-8 border-t border-[hsl(var(--cocktail-card-border))]/30">
      <div className="container mx-auto px-6">
        <p className="text-center text-xs text-[hsl(var(--cocktail-text-muted))]/60">
          © {new Date().getFullYear()} CocktailBot v2.0 - printcore@outlook.de
        </p>
      </div>
    </footer>
  )
}
