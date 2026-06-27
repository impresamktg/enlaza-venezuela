// scripts/dedup-report.mjs
// Clusters existing active rescue/maquinaria posts by a DISTINCTIVE building key
// (generic rescue words + location words removed, so only the building name remains).
// High precision over recall: posts with no building name are left as singletons —
// safer to under-merge than to wrongly hide a real trapped-person report.
// Always human-vet the output before applying the merge SQL.
//   node scripts/dedup-report.mjs            # print report
//   node scripts/dedup-report.mjs --sql      # emit merge SQL
//   node scripts/dedup-report.mjs --selftest # run assertions (no network)
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const THRESHOLD = 0.6; // Dice similarity on distinctive keys to link two posts

// Clusters whose canonical distinctive key is here are EXCLUDED from merge SQL:
// human-vetted as wrongly fusing two distinct real buildings (or a typo'd zone, not a
// building). They stay as separate active posts. Re-vet if the data changes.
const SKIP = new Set(["caracalleda", "celtamar", "granamar", "ritamar palace", "portofino"]);

// Structural words (edificio, calle…), generic rescue words (personas, escombros…),
// and La Guaira location words (caraballeda, playa…). Removing all three leaves the
// building name — the only thing that should drive a merge.
const STOP = new Set(
  (
    "edificio edificios edif edf residencia residencias resid torre torres calle avenida avda " +
    "bloque sector urbanizacion urb conjunto piso apto apartamento casa quinta frente " +
    "detras lado entre numero los las del " +
    "caribe corales cocos jose maria espana quince letras hacia " +
    "personas persona atrapada atrapadas atrapado atrapados escombros escombro rescate " +
    "rescatar rescatado rescatada rescatados familia familias familiar necesita necesitan " +
    "necesitamos ayuda ayudando maquinaria pesada bajo debajo vivas vivos viva vivo " +
    "senales vida urgente gritan muchachos muchacho abuelo abuela senora senor mayor joven " +
    "hijo hijos madre padre tias tia companero grupo necesario requiere apoyo mujeres " +
    "hombre nino ninos nadie dos tres cuatro cinco anos sos por para con sin " +
    "caraballeda guaira catia macuto tanaguarena tanaguarenas maiquetia vargas playa grande " +
    "costanera naiguata atlantida atlantica estado venezuela mision vivienda gran principal " +
    "sur norte este oeste"
  ).split(/\s+/),
);

const deaccent = (s) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "");
function distinctiveKey(title, address, zone) {
  const t = deaccent(`${title || ""} ${address || ""} ${zone || ""}`.toLowerCase())
    .replace(/[^a-z0-9 ]/g, " ");
  const toks = t.split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));
  return [...new Set(toks)].join(" ");
}
function bigrams(s) {
  const x = s.replace(/\s+/g, ""), g = new Set();
  for (let i = 0; i < x.length - 1; i++) g.add(x.slice(i, i + 2));
  return g;
}
function dice(a, b) {
  if (!a || !b) return 0;
  const A = bigrams(a), B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return (2 * inter) / (A.size + B.size);
}
function cluster(posts) {
  const byCity = {};
  for (const p of posts) {
    const k = distinctiveKey(p.title, p.address, p.zone);
    if (!k) continue; // no building name -> never auto-merged
    (byCity[p.city] ||= []).push({ ...p, _key: k });
  }
  const clusters = [];
  for (const city of Object.keys(byCity)) {
    const arr = byCity[city];
    const used = new Set();
    for (let i = 0; i < arr.length; i++) {
      if (used.has(i)) continue;
      const group = [arr[i]];
      used.add(i);
      for (let j = i + 1; j < arr.length; j++) {
        if (used.has(j)) continue;
        if (dice(arr[i]._key, arr[j]._key) >= THRESHOLD) {
          group.push(arr[j]);
          used.add(j);
        }
      }
      if (group.length > 1) clusters.push(group);
    }
  }
  return clusters;
}

const STATE_RANK = { rescatados: 3, resuelto: 2, en_camino: 1 };
const rank = (p) => STATE_RANK[p.rescue_state] ?? 0;
const completeness = (p) => (p.address ? 2 : 0) + (p.zone ? 1 : 0) + (p.people_count ? 1 : 0);
function pickCanonical(group) {
  return [...group].sort(
    (a, b) =>
      rank(b) - rank(a) ||
      completeness(b) - completeness(a) ||
      String(a.created_at).localeCompare(String(b.created_at)),
  )[0];
}
const q = (s) => (s === null || s === undefined ? "null" : `'${String(s).replace(/'/g, "''")}'`);
function mergeSql(group) {
  const canon = pickCanonical(group);
  const children = group.filter((p) => p.id !== canon.id);
  const best = [...group].sort((a, b) => rank(b) - rank(a))[0];
  const cid = q(canon.id);
  // Set children FIRST, then derive the count from the DB so re-runs accumulate
  // (a second merge onto an existing canonical must not clobber its prior count).
  const sets = [`corroboration_count = (select count(*) from posts where duplicate_of = ${cid})`];
  if (best.rescue_state && rank(best) > rank(canon)) {
    sets.push(`rescue_state = ${q(best.rescue_state)}`);
    if (best.rescued_at) sets.push(`rescued_at = coalesce(rescued_at, ${q(best.rescued_at)})`);
  }
  return [
    `-- "${canon._key}" (${canon.city}) — ${group.length} posts, canonical=${canon.id}`,
    `update posts set duplicate_of = ${cid}, status = 'resolved' where id in (${children
      .map((c) => q(c.id))
      .join(", ")});`,
    `update posts set ${sets.join(", ")} where id = ${cid};`,
  ].join("\n");
}
function printReport(clusters) {
  clusters.sort((a, b) => b.length - a.length);
  const excess = clusters.reduce((n, g) => n + g.length - 1, 0);
  console.log(`${clusters.length} clusters, ${excess} excess posts\n`);
  for (const g of clusters) {
    const canon = pickCanonical(g);
    console.log(`CLUSTER "${canon._key}" (${canon.city}) — ${g.length}`);
    for (const p of g) {
      const mark = p.id === canon.id ? "★canon" : "  dup ";
      console.log(
        `  ${mark} ${String(p.title).slice(0, 52).padEnd(52)} ${p.contact_phone}  ${p.rescue_state ?? "-"}`,
      );
    }
    console.log("");
  }
}

function loadEnv() {
  const t = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const e = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) e[m[1]] = m[2].trim();
  }
  return e;
}
async function fetchPosts(env) {
  const sel =
    "id,title,address,zone,city,people_count,rescue_state,rescued_at,contact_phone,status,duplicate_of";
  const r = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/posts?select=${sel}&status=eq.active&duplicate_of=is.null&category=in.(rescate,maquinaria)&order=created_at.desc&limit=500`,
    {
      headers: {
        apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
    },
  );
  if (!r.ok) throw new Error(`REST ${r.status}`);
  return r.json();
}

function runSelfTest() {
  // distinctive key: building name survives, generic + location words stripped
  assert.equal(distinctiveKey("Residencias Bellevue Caraballeda", "", ""), "bellevue");
  assert.equal(distinctiveKey("Personas atrapadas bajo escombros en Caraballeda", "", ""), "");
  assert.equal(distinctiveKey("Maquinaria pesada para rescate", "", ""), "");
  // distinct buildings sharing a zone do NOT link; same building (typo) does
  assert.ok(dice(distinctiveKey("Edificio Bellevue", "", ""), distinctiveKey("Golf Mar Caraballeda", "", "")) < THRESHOLD);
  assert.ok(dice("bellevue", "belevue") >= THRESHOLD);
  // canonical selection: rescatados beats completeness and recency
  const g = [
    { id: "a", rescue_state: null, address: "x", zone: "z", people_count: 3, created_at: "2026-01-02" },
    { id: "b", rescue_state: "rescatados", address: null, zone: null, people_count: null, created_at: "2026-01-03" },
  ];
  assert.equal(pickCanonical(g).id, "b");
  // sql value escaping
  assert.equal(q("a'b"), "'a''b'");
  console.log("dedup-report selftest: PASS");
}

const arg = process.argv[2];
if (arg === "--selftest") {
  runSelfTest();
} else {
  const env = loadEnv();
  const posts = await fetchPosts(env);
  const clusters = cluster(posts);
  const merged = clusters.filter((g) => !SKIP.has(pickCanonical(g)._key));
  if (arg === "--sql") {
    console.log("begin;");
    merged.sort((a, b) => b.length - a.length).forEach((g) => console.log("\n" + mergeSql(g)));
    console.log("\ncommit;");
    const skipped = clusters.filter((g) => SKIP.has(pickCanonical(g)._key));
    if (skipped.length) {
      console.log(
        `\n-- skipped (left as separate posts): ${skipped.map((g) => `"${pickCanonical(g)._key}"`).join(", ")}`,
      );
    }
  } else {
    printReport(merged);
  }
}
