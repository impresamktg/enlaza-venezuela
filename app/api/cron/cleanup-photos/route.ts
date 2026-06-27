import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "post-photos";
// No borrar objetos recién subidos: pueden ser de un formulario en curso (subido
// pero aún sin publicar). Solo se consideran huérfanos los más viejos que esto.
const GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * Recolector de fotos huérfanas: borra del bucket los objetos que ya no referencia
 * ninguna publicación (posts.photos) y que llevan más de GRACE_MS sin usarse.
 * Protegido por CRON_SECRET (Vercel lo inyecta como Bearer en las llamadas de cron).
 * Soporta ?dryRun=1 para listar sin borrar.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json(
      { error: "missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 },
    );
  }

  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1. Nombres de archivo referenciados por alguna publicación.
  const { data: rows, error: rowsErr } = await supabase.from("posts").select("photos");
  if (rowsErr) {
    return Response.json({ error: `read posts: ${rowsErr.message}` }, { status: 500 });
  }
  const referenced = new Set<string>();
  for (const r of rows ?? []) {
    for (const u of (r.photos as string[] | null) ?? []) {
      const name = u.split("/").pop();
      if (name) referenced.add(name);
    }
  }

  // 2. Todos los objetos del bucket (paginado).
  const objects: { name: string; created_at: string | null }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: 1000, offset, sortBy: { column: "created_at", order: "asc" } });
    if (error) {
      return Response.json({ error: `list bucket: ${error.message}` }, { status: 500 });
    }
    for (const o of data ?? []) {
      if (o.id && o.name) objects.push({ name: o.name, created_at: o.created_at });
    }
    if (!data || data.length < 1000) break;
  }

  // 3. Huérfanos: no referenciados y fuera del periodo de gracia.
  const now = Date.now();
  const orphans = objects
    .filter((o) => !referenced.has(o.name))
    .filter((o) => o.created_at !== null && now - new Date(o.created_at).getTime() > GRACE_MS)
    .map((o) => o.name);

  // 4. Borrar en lotes (vía Storage API; el borrado directo en SQL está bloqueado).
  let deleted = 0;
  if (!dryRun) {
    for (let i = 0; i < orphans.length; i += 100) {
      const batch = orphans.slice(i, i + 100);
      const { error } = await supabase.storage.from(BUCKET).remove(batch);
      if (!error) deleted += batch.length;
      else console.error("[cleanup-photos] remove error:", error.message);
    }
  }

  return Response.json({
    dryRun,
    scanned: objects.length,
    referenced: referenced.size,
    orphans: orphans.length,
    deleted,
  });
}
