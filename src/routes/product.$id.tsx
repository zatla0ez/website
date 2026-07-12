import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Phone, MessageCircle, Truck } from "lucide-react";
import { getProduct } from "@/lib/products.functions";
import { SiteHeader } from "@/components/site-header";
import { CONTACT } from "@/lib/contact";
import { ProductEditForm } from "@/components/product-edit-form";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => {
    const product = await getProduct({ data: { id: params.id } });
    if (!product) throw notFound();
    return product;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — INGCO` },
          {
            name: "description",
            content: loaderData.description ?? `${loaderData.name} — ${loaderData.category}`,
          },
          { property: "og:title", content: `${loaderData.name} — INGCO` },
          {
            property: "og:description",
            content: loaderData.description ?? loaderData.category,
          },
          ...(loaderData.images[0]
            ? [{ property: "og:image", content: loaderData.images[0] }]
            : []),
        ]
      : [{ title: "Produit — INGCO" }],
  }),
  component: ProductPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="p-16 text-center">
        <h1 className="text-xl font-semibold">Produit introuvable</h1>
        <Link to="/" className="text-sm text-accent hover:underline mt-4 inline-block">
          Retour au catalogue
        </Link>
      </div>
    </div>
  ),
});

function ProductPage() {
  const product = Route.useLoaderData();
  const [activeIdx, setActiveIdx] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [passcode, setPasscode] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const pc = sessionStorage.getItem("ingco.admin.passcode");
    setPasscode(pc);
    setIsAdmin(Boolean(pc));
  }, []);
  const images: (string | null)[] =
    product.images.length > 0 ? product.images : [null];
  const active = images[activeIdx];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Toaster />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <nav className="text-xs text-muted-foreground mb-6 flex gap-2">
          <Link to="/" className="hover:text-foreground">Catalogue</Link>
          <span>/</span>
          <span>{product.category}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-3">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden border border-border">
              {active ? (
                <img
                  src={active}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                  Pas d'image
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.map((img, i) =>
                  img ? (
                    <button
                      key={i}
                      onClick={() => setActiveIdx(i)}
                      className={`aspect-square rounded-md overflow-hidden border transition-colors ${
                        i === activeIdx ? "border-accent" : "border-border"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ) : null,
                )}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {product.category}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight mt-2">{product.name}</h1>
            {isAdmin && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 mt-3 text-xs px-2.5 py-1 rounded border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
              >
                Modifier ce produit
              </button>
            )}
            {product.price != null && (
              <p className="text-2xl font-semibold mt-4">
                {Number(product.price).toLocaleString("fr-FR")} د.ت
              </p>
            )}
            {product.description && (
              <div className="mt-6 pt-6 border-t border-border">
                <h2 className="text-sm font-semibold mb-2">Description</h2>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-border">
              <button
                onClick={() => setContactOpen((v) => !v)}
                className="w-full sm:w-auto inline-flex items-center gap-2 h-12 px-6 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:brightness-95 transition"
              >
                <Truck className="w-5 h-5" />
                Livraison & Contact
              </button>

              {contactOpen && (
                <div className="mt-4 rounded-lg border border-border bg-card p-4 space-y-3">
                  <a
                    href={CONTACT.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors"
                  >
                    <span className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Notre localisation</p>
                      <p className="text-xs text-muted-foreground">Voir sur Google Maps</p>
                    </div>
                  </a>
                  <a
                    href={`tel:${CONTACT.phoneIntl}`}
                    className="flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors"
                  >
                    <span className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                      <Phone className="w-4 h-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Téléphone</p>
                      <p className="text-xs text-muted-foreground">{CONTACT.phone}</p>
                    </div>
                  </a>
                  <a
                    href={`https://wa.me/${CONTACT.whatsappIntl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors"
                  >
                    <span className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                      <MessageCircle className="w-4 h-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">WhatsApp</p>
                      <p className="text-xs text-muted-foreground">{CONTACT.whatsapp}</p>
                    </div>
                  </a>
                </div>
              )}
            </div>

            <div className="mt-8">
              <Link
                to="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Retour au catalogue
              </Link>
            </div>
          </div>
        </div>

        {isAdmin && editing && passcode && (
          <ProductEditForm
            product={product}
            passcode={passcode}
            onClose={() => setEditing(false)}
          />
        )}
      </div>
    </div>
  );
}