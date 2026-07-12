import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Product = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number | null;
  images: string[];
  created_at: string;
  updated_at: string;
};

function checkPasscode(passcode: string) {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) throw new Error("Server not configured");
  if (passcode !== expected) throw new Error("Invalid passcode");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const listProducts = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data, error } = await db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
});

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row, error } = await db
      .from("products")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row ?? null) as Product | null;
  });

export const verifyPasscode = createServerFn({ method: "POST" })
  .inputValidator((data: { passcode: string }) =>
    z.object({ passcode: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    return { ok: true as const };
  });

const productInput = z.object({
  passcode: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional().nullable(),
  price: z.number().nonnegative().nullable().optional(),
  images: z.array(z.string().url()).default([]),
});

export const createProduct = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => productInput.parse(data))
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    const db = await admin();
    const { data: row, error } = await db
      .from("products")
      .insert({
        name: data.name,
        category: data.category,
        description: data.description ?? null,
        price: data.price ?? null,
        images: data.images ?? [],
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as Product;
  });

export const updateProduct = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    productInput.extend({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    const db = await admin();
    const { data: row, error } = await db
      .from("products")
      .update({
        name: data.name,
        category: data.category,
        description: data.description ?? null,
        price: data.price ?? null,
        images: data.images ?? [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as Product;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator((data: { passcode: string; id: string }) =>
    z.object({ passcode: z.string().min(1), id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    const db = await admin();
    const { error } = await db.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const BUCKET = "product-images";
// 100 years — effectively permanent signed URL for a private bucket.
const SIGN_EXPIRY = 60 * 60 * 24 * 365 * 100;

export const uploadProductImage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string().min(1),
        filename: z.string().min(1),
        contentType: z.string().min(1),
        // base64-encoded file bytes (no data: prefix)
        base64: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    const db = await admin();
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${crypto.randomUUID()}-${safe}`;
    const { error: upErr } = await db.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: signed, error: signErr } = await db.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGN_EXPIRY);
    if (signErr || !signed) throw new Error(signErr?.message ?? "Sign failed");
    return { url: signed.signedUrl };
  });