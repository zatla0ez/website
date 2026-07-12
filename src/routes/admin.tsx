import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CATEGORIES } from "@/lib/categories";
import {
  listProducts,
  verifyPasscode,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  type Product,
} from "@/lib/products.functions";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";

const STORAGE_KEY = "ingco.admin.passcode";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const [passcode, setPasscode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) setPasscode(stored);
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Toaster />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        {passcode ? (
          <AdminPanel
            passcode={passcode}
            onLogout={() => {
              sessionStorage.removeItem(STORAGE_KEY);
              setPasscode(null);
            }}
          />
        ) : (
          <PasscodeGate
            onUnlock={(pc) => {
              sessionStorage.setItem(STORAGE_KEY, pc);
              setPasscode(pc);
            }}
          />
        )}
      </div>
    </div>
  );
}

function PasscodeGate({ onUnlock }: { onUnlock: (pc: string) => void }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyPasscode({ data: { passcode: value } });
      onUnlock(value);
    } catch {
      toast.error("Code d'accès incorrect");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto pt-16">
      <h1 className="text-2xl font-semibold tracking-tight">Espace admin</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Entrez le code d'accès pour gérer le catalogue.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Code d'accès"
          className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading || !value}
          className="w-full h-11 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Vérification…" : "Entrer"}
        </button>
      </form>
    </div>
  );
}

type Draft = {
  id?: string;
  name: string;
  category: string;
  description: string;
  price: string;
  images: string; // newline separated
};

const emptyDraft: Draft = {
  name: "",
  category: CATEGORIES[0],
  description: "",
  price: "",
  images: "",
};

function draftFromProduct(p: Product): Draft {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description ?? "",
    price: p.price != null ? String(p.price) : "",
    images: p.images.join("\n"),
  };
}

function AdminPanel({ passcode, onLogout }: { passcode: string; onLogout: () => void }) {
  const qc = useQueryClient();
  const { data: products = [], refetch } = useQuery({
    queryKey: ["products"],
    queryFn: () => listProducts(),
  });
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const editing = Boolean(draft.id);

  function currentImages(): string[] {
    return draft.images.split("\n").map((s) => s.trim()).filter(Boolean);
  }
  function setImages(list: string[]) {
    setDraft((d) => ({ ...d, images: list.join("\n") }));
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const base64 = await fileToBase64(file);
        const { url } = await uploadProductImage({
          data: {
            passcode,
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            base64,
          },
        });
        uploaded.push(url);
      }
      setImages([...currentImages(), ...uploaded]);
      toast.success(`${uploaded.length} image(s) ajoutée(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'upload");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    const list = currentImages();
    list.splice(idx, 1);
    setImages(list);
  }

  function moveFirst(idx: number) {
    const list = currentImages();
    if (idx <= 0 || idx >= list.length) return;
    const [item] = list.splice(idx, 1);
    list.unshift(item);
    setImages(list);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      passcode,
      name: draft.name.trim(),
      category: draft.category,
      description: draft.description.trim() || null,
      price: draft.price ? Number(draft.price) : null,
      images: draft.images
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      if (draft.id) {
        await updateProduct({ data: { ...payload, id: draft.id } });
        toast.success("Produit mis à jour");
      } else {
        await createProduct({ data: payload });
        toast.success("Produit ajouté");
      }
      setDraft(emptyDraft);
      await refetch();
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      await deleteProduct({ data: { passcode, id } });
      toast.success("Produit supprimé");
      if (draft.id === id) setDraft(emptyDraft);
      await refetch();
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin — Catalogue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ajouter, modifier ou supprimer des produits.
          </p>
        </div>
        <button
          onClick={onLogout}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Déconnexion
        </button>
      </div>

      <form
        onSubmit={save}
        className="rounded-lg border border-border bg-card p-6 space-y-4"
      >
        <h2 className="font-semibold">
          {editing ? "Modifier le produit" : "Nouveau produit"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nom">
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Catégorie">
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className={inputCls}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prix (د.ت)">
            <input
              type="number"
              step="any"
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Images">
            <div className="space-y-2">
              <label className="flex items-center justify-center h-24 rounded-md border-2 border-dashed border-border hover:border-primary/60 cursor-pointer text-xs text-muted-foreground transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                {uploading ? "Envoi en cours…" : "Cliquez pour ajouter des images (plusieurs)"}
              </label>
              {currentImages().length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {currentImages().map((url, i) => (
                    <div
                      key={url + i}
                      className="relative aspect-square rounded border border-border overflow-hidden group"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-semibold">
                          Principal
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {i !== 0 && (
                          <button
                            type="button"
                            onClick={() => moveFirst(i)}
                            className="text-[10px] px-2 py-1 rounded bg-primary text-primary-foreground"
                          >
                            Principal
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="text-[10px] px-2 py-1 rounded bg-destructive text-destructive-foreground"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                La 1ère image est affichée sur la page d'accueil.
              </p>
            </div>
          </Field>
        </div>
        <Field label="Description">
          <textarea
            rows={4}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className={inputCls}
          />
        </Field>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-4 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Ajouter"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => setDraft(emptyDraft)}
              className="h-10 px-4 rounded-md border border-border text-sm hover:bg-muted"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      <div>
        <h2 className="font-semibold mb-3">
          Produits <span className="text-muted-foreground">({products.length})</span>
        </h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Produit</th>
                <th className="text-left p-3">Catégorie</th>
                <th className="text-right p-3">Prix</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3 flex items-center gap-3">
                    {p.images[0] && (
                      <img
                        src={p.images[0]}
                        alt=""
                        className="w-10 h-10 rounded object-cover border border-border"
                      />
                    )}
                    <span className="font-medium">{p.name}</span>
                  </td>
                  <td className="p-3 text-muted-foreground">{p.category}</td>
                  <td className="p-3 text-right tabular-nums">
                    {p.price != null ? Number(p.price).toLocaleString("fr-FR") : "—"}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => {
                        setDraft(draftFromProduct(p));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-xs px-2 py-1 rounded hover:bg-muted"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => remove(p.id)}
                      className="text-xs px-2 py-1 rounded text-destructive hover:bg-destructive/10 ml-1"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    Aucun produit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full min-h-10 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}