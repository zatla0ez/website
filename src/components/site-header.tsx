import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary text-primary-foreground text-lg font-black tracking-tight leading-none">
            INGCO
          </span>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Catalogue
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link to="/" className="text-foreground/70 hover:text-foreground transition-colors">
            Produits
          </Link>
          <Link
            to="/admin"
            className="text-foreground/70 hover:text-foreground transition-colors"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}