#!/usr/bin/env node
// Reinserta publicaciones de Enlaza en el pool común IA911 (tuia911.com).
// Espeja el mapeo de lib/ia911.ts. Idempotente por (fuente, id).
// Uso: node scripts/ia911-sync.mjs [limit] [need|offer]
//   sin args  → todas las publicaciones activas (BACKFILL)
//   1 need    → solo la necesidad activa más reciente (validación)
import { readFileSync } from "node:fs";

const IA911 = "https://gkpivfmnclcahppkrfzl.supabase.co/functions/v1/api";
const FUENTE = "enlaza";
const LIMIT = process.argv[2] && /^\d+$/.test(process.argv[2]) ? parseInt(process.argv[2], 10) : null;
const TYPE = ["need", "offer"].includes(process.argv[3]) ? process.argv[3] : null;

// --- env desde .env.local ---
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Mapeo (espejo de lib/ia911.ts)
const CITY_NAME = { caracas: "Caracas", "la-guaira": "La Guaira (Vargas)", "san-felipe": "San Felipe (Yaracuy)", moron: "Morón / Puerto Cabello", valencia: "Valencia (Carabobo)", maracay: "Maracay (Aragua)", maracaibo: "Maracaibo (Zulia)", barquisimeto: "Barquisimeto (Lara)", otra: "Otra ciudad" };
const CITY_ESTADO = { caracas: "Distrito Capital", "la-guaira": "La Guaira", "san-felipe": "Yaracuy", moron: "Carabobo", valencia: "Carabobo", maracay: "Aragua", maracaibo: "Zulia", barquisimeto: "Lara" };
const CATEGORY_ALIAS = { salud: "medicina", alimentos: "alimento" };
const estadoGeo = (p) => (p.city === "otra" ? null : CITY_ESTADO[p.city] ?? CITY_NAME[p.city] ?? p.city);
const categoria = (p) => CATEGORY_ALIAS[p.category] ?? p.category;

function build(p) {
  const url = `https://enlazavenezuela.com/post/${p.id}`;
  const descripcion = `${[p.title, p.description].filter(Boolean).join(" — ")} · Ficha: ${url}`;
  if (p.type === "need")
    return { endpoint: "necesidades", body: { fuente: FUENTE, id: p.id, categoria: categoria(p), urgencia: p.trapped ? "critica" : (p.category === "rescate" || p.category === "maquinaria" ? "alta" : "media"), descripcion, contacto: p.contact_phone, num_personas: p.people_count ?? null, estado_geo: estadoGeo(p), municipio: p.zone ?? null, referencia: p.address ?? null } };
  return { endpoint: "recursos", body: { fuente: FUENTE, id: p.id, nombre: p.title, categoria: categoria(p), descripcion: `${p.description ?? p.title} · Ficha: ${url}`, contacto: p.contact_phone, url, lat: p.lat, lng: p.lng, estado_geo: estadoGeo(p), municipio: p.zone ?? null } };
}

const cols = "id,type,category,title,description,city,zone,contact_name,contact_phone,people_count,lat,lng,status,created_at,address,trapped,rescue_state,rescued_at,duplicate_of,corroboration_count,photos";
let url = `${SB}/rest/v1/posts?select=${cols}&status=eq.active&duplicate_of=is.null&order=created_at.desc`;
if (TYPE) url += `&type=eq.${TYPE}`;
if (LIMIT) url += `&limit=${LIMIT}`;
const posts = await fetch(url, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }).then((r) => r.json());
console.log(`Fetched ${posts.length} active post(s)${TYPE ? ` type=${TYPE}` : ""}${LIMIT ? ` limit=${LIMIT}` : " (ALL — backfill)"}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DELAY = parseInt(process.env.DELAY_MS || "700", 10); // entre peticiones (ritmo base)
const RETRY_WAIT = parseInt(process.env.RETRY_WAIT_MS || "65000", 10); // espera tras un 429

let ok = 0, fail = 0, done = 0;
for (const p of posts) {
  const { endpoint, body } = build(p);
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${IA911}/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.status === 429 && attempt <= 6) {
        console.log(`… límite de peticiones, espero ${Math.round(RETRY_WAIT / 1000)}s (intento ${attempt})`);
        await sleep(RETRY_WAIT);
        continue;
      }
      const txt = await res.text();
      if (res.ok) { ok++; if (posts.length <= 4) console.log(`✓ ${endpoint} ${p.id}\n   resp: ${txt.slice(0, 300)}`); }
      else { fail++; console.error(`✗ ${endpoint} ${p.id} [${res.status}] ${txt.slice(0, 160)}`); }
    } catch (e) { fail++; console.error(`✗ ${endpoint} ${p.id} ERROR ${e.message}`); }
    break;
  }
  if (++done % 25 === 0) console.log(`… ${done}/${posts.length} (${ok} ok, ${fail} fail)`);
  await sleep(DELAY);
}
console.log(`\nDone: ${ok} ok, ${fail} failed, of ${posts.length}.`);
