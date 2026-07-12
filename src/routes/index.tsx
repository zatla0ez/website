import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ChevronDown, Search, X, LayoutGrid } from "lucide-react";
import { listProducts, type Product } from "@/lib/products.functions";
import { CATEGORIES } from "@/lib/categories";
import { SiteHeader } from "@/components/site-header";

const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: () => listProducts(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: Index,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
});

function Index() {
  const { data: products } = useSuspenseQuery(productsQuery);
  const [selected, setSelected] = useState<string | null>(null);
  const [catsOpen, setCatsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const catsRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) m.set(p.category, (m.get(p.category) ?? 0) + 1);
    return m;
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (selected && p.category !== selected) return false;
      if (!q) return true;
      const hay = `${p.name} ${p.category} ${p.description ?? ""}`.toLowerCase();
      return q.split(/\s+/).every((token) => hay.includes(token));
    });
  }, [products, selected, query]);

  // Close categories dropdown on outside click / Escape
  useEffect(() => {
    if (!catsOpen) return;
    function onDoc(e: MouseEvent) {
      if (catsRef.current && !catsRef.current.contains(e.target as Node)) {
        setCatsOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCatsOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [catsOpen]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative sm:w-72" ref={catsRef}>
            <button
              onClick={() => setCatsOpen((v) => !v)}
              aria-expanded={catsOpen}
              className="w-full h-11 px-4 rounded-md bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-between gap-2 hover:brightness-95 transition-all"
            >
              <span className="flex items-center gap-2 truncate">
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span className="truncate">{selected ?? "Toutes catégories"}</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 transition-transform ${catsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {catsOpen && (
              <div className="absolute z-30 mt-2 w-full sm:w-80 max-h-[70vh] overflow-y-auto rounded-md border border-border bg-card shadow-2xl shadow-black/50 p-1.5">
                <button
                  onClick={() => {
                    setSelected(null);
                    setCatsOpen(false);
                  }}
                  className={`w-full text-left text-sm py-2 px-3 rounded flex items-center justify-between ${
                    selected === null
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted"
                  }`}
                >
                  <span>Toutes catégories</span>
                  <span className="text-xs opacity-60">{products.length}</span>
                </button>
                {CATEGORIES.map((c) => {
                  const active = selected === c;
                  return (
                    <button
                      key={c}
                      onClick={() => {
                        setSelected(c);
                        setCatsOpen(false);
                      }}
                      className={`w-full text-left text-sm py-2 px-3 rounded flex items-center justify-between ${
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span className="truncate pr-2">{c}</span>
                      <span className="text-xs opacity-60">{counts.get(c) ?? 0}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit, une marque, une référence…"
              className="w-full h-11 pl-10 pr-10 rounded-md bg-card border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Effacer"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Active filters */}
        {(selected || query) && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Filtres:
            </span>
            {selected && (
              <Chip onClear={() => setSelected(null)}>{selected}</Chip>
            )}
            {query && <Chip onClear={() => setQuery("")}>« {query} »</Chip>}
          </div>
        )}

        <div className="mb-6 flex items-end justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {selected ?? "Tous les produits"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filtered.length} article{filtered.length !== 1 ? "s" : ""}
              {query ? ` pour « ${query} »` : ""}
            </p>
          </div>
        </div>

          {filtered.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground text-sm">
              Aucun produit trouvé.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
      </main>

      <footer className="border-t border-border mt-16 py-8 text-center text-xs text-muted-foreground">
        INGCO Catalogue · Vitrine produits
      </footer>
    </div>
  );
}

function Chip({
  children,
  onClear,
}: {
  children: React.ReactNode;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 h-7 pl-3 pr-1 rounded-full bg-primary/15 border border-primary/30 text-xs text-foreground">
      {children}
      <button
        onClick={onClear}
        aria-label="Retirer"
        className="p-0.5 rounded-full hover:bg-primary/30"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function ProductCard({ product }: { product: Product }) {
  const img = product.images[0];
  return (
    <Link
      to="/product/$id"
      params={{ id: product.id }}
      className="group flex flex-col"
    >
      <div className="aspect-square bg-card rounded-lg overflow-hidden border border-border group-hover:border-primary/50 transition-colors">
        {img ? (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            Pas d'image
          </div>
        )}
      </div>
      <div className="mt-3 space-y-1">
        <p className="text-[11px] uppercase tracking-wider text-primary/80">
          {product.category}
        </p>
        <h3 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        {product.price != null && (
          <p className="text-sm font-semibold pt-1 text-primary">
            {Number(product.price).toLocaleString("fr-FR")} د.ت
          </p>
        )}
      </div>
    </Link>
  );
}
