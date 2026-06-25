"use server";

import { revalidatePath } from "next/cache";
import { createPost, resolvePost, deletePost } from "@/lib/db";
import { CATEGORY_MAP, CITY_MAP } from "@/lib/data";
import type { FormState, PostType } from "@/lib/types";

export async function createPostAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const type = String(formData.get("type") ?? "") as PostType;
  const category = String(formData.get("category") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const city = String(formData.get("city") ?? "");
  const zone = String(formData.get("zone") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim();
  const peopleRaw = String(formData.get("people_count") ?? "").trim();

  // Validación
  if (type !== "need" && type !== "offer") {
    return { error: "Indica si necesitas u ofreces ayuda." };
  }
  if (!CATEGORY_MAP[category]) return { error: "Selecciona una categoría válida." };
  if (!CITY_MAP[city]) return { error: "Selecciona una ciudad válida." };
  if (title.length < 5) return { error: "El título debe tener al menos 5 caracteres." };
  if (contactName.length < 2) return { error: "Escribe tu nombre." };

  const phoneDigits = contactPhone.replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    return { error: "Escribe un número de WhatsApp válido (con código de área)." };
  }

  let peopleCount: number | null = null;
  if (peopleRaw) {
    const n = Number.parseInt(peopleRaw, 10);
    if (!Number.isNaN(n) && n > 0 && n < 100000) peopleCount = n;
  }

  // Ubicación aproximada opcional. Se valida (rango de Venezuela) y se redondea
  // a ~110 m (3 decimales) para no exponer la ubicación exacta del autor.
  let lat: number | null = null;
  let lng: number | null = null;
  const latRaw = String(formData.get("lat") ?? "").trim();
  const lngRaw = String(formData.get("lng") ?? "").trim();
  if (latRaw && lngRaw) {
    const la = Number.parseFloat(latRaw);
    const ln = Number.parseFloat(lngRaw);
    if (Number.isFinite(la) && Number.isFinite(ln) && la > 0 && la < 16 && ln > -75 && ln < -58) {
      lat = Math.round(la * 1000) / 1000;
      lng = Math.round(ln * 1000) / 1000;
    }
  }

  let result;
  try {
    result = await createPost({
      type,
      category,
      title,
      description: description || null,
      city,
      zone: zone || null,
      contact_name: contactName,
      contact_phone: contactPhone,
      people_count: peopleCount,
      lat,
      lng,
    });
  } catch {
    return { error: "No se pudo publicar. Revisa tu conexión e intenta de nuevo." };
  }

  revalidatePath("/");
  return { success: { id: result.post.id, type, token: result.manageToken } };
}

export async function resolvePostAction(
  id: string,
  token: string,
): Promise<{ ok: boolean }> {
  if (!id || !token) return { ok: false };
  const ok = await resolvePost(id, token);
  if (ok) revalidatePath("/");
  return { ok };
}

export async function deletePostAction(
  id: string,
  token: string,
): Promise<{ ok: boolean }> {
  if (!id || !token) return { ok: false };
  const ok = await deletePost(id, token);
  if (ok) revalidatePath("/");
  return { ok };
}
