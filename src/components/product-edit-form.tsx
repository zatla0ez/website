import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { CATEGORIES } from "@/lib/categories";
import {
  updateProduct,
  deleteProduct,
  uploadProductImage,
  type Product,
} from "@/lib/products.functions";

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

const inputCls =
  "w-full min-h-10 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export function ProductEditForm({
  product,
  passcode,
  onClose,
}: {
  product: Product;
  passcode: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [description, setDescription] = useState(product.description ?? "");
  const [price, setPrice] = useState(product.price != null ? String(product.price) : "");
  const [images, setImages] = useState<string[]>(product.images);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      setImages((prev) => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} image(s) ajoutée(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'upload");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }
  function moveFirst(idx: number) {
    setImages((prev) => {
      if (idx <= 0 || idx >= prev.length) return prev;
      const list = [...prev];
      const [item] = list.splice(idx, 1);
      list.unshift(item);
      return list;
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProduct({
        data: {
          id: product.id,
          passcode,
          name: name.trim(),
          category,
          description: description.trim() || null,
          price: price ? Number(price) : null,
          images,
        },
      });
      toast.success("Produit mis à jour");
      onClose();
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      await deleteProduct({ data: { passcode, id: product.id } });
      toast.success("Produit supprimé");
      router.navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <form
      onSubmit={save}
      className="mt-6 rounded-lg border border-primary/40 bg-card p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Modifier ce produit</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Fermer
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Nom</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Catégorie</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Prix (د.ت)</span>
          <input type="number" step="any" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Description</span>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
        </label>
      </div>

      <div className="space-y-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Images</span>
        <label className="flex items-center justify-center h-20 rounded-md border-2 border-dashed border-border hover:border-primary/60 cursor-pointer text-xs text-muted-foreground transition-colors">
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
          {uploading ? "Envoi en cours…" : "Ajouter des images"}
        </label>
        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {images.map((url, i) => (
              <div key={url + i} className="relative aspect-square rounded border border-border overflow-hidden group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-semibold">
                    Principal
                  </span>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  {i !== 0 && (
                    <button type="button" onClick={() => moveFirst(i)} className="text-[10px] px-2 py-1 rounded bg-primary text-primary-foreground">
                      Principal
                    </button>
                  )}
                  <button type="button" onClick={() => removeImage(i)} className="text-[10px] px-2 py-1 rounded bg-destructive text-destructive-foreground">
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">La 1ère image est affichée sur la page d'accueil.</p>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
        <button type="submit" disabled={saving} className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:brightness-95 disabled:opacity-50">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" onClick={onClose} className="h-10 px-4 rounded-md border border-border text-sm hover:bg-muted">
          Annuler
        </button>
        <button type="button" onClick={remove} className="h-10 px-4 rounded-md border border-destructive/40 text-destructive text-sm hover:bg-destructive/10 ml-auto">
          Supprimer
        </button>
      </div>
    </form>
  );
}