# Rescue Post Dedup & Prevention — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse duplicate rescue reports (same building, different reporters) into one
canonical card, and warn at submit time so new duplicates aren't created.

**Architecture:** Text-based fuzzy matching (geo is absent: 1/174 posts have coords) scoped to
`rescate`/`maquinaria`. A `duplicate_of` pointer hides children from every read path (all funnel
through `lib/db.ts`); a `corroboration_count` powers a "Reportado por N" badge. One Postgres
matching engine (`pg_trgm` + a normalized `rescue_match_key`) serves both the live submit-time
query (RPC `find_similar_rescues`) and the offline cleanup script.

**Tech Stack:** Next.js 16 (App Router, RSC, server actions), React 19 (`useActionState`),
Supabase (security-definer RPCs), Postgres `pg_trgm`/`unaccent`, Node ESM script.

---

## Conventions for this repo (read before starting)

- **No test runner exists** (no `test` script, no vitest/jest). Verification = `npm run build`
  (runs tsc + the SW stamp), live REST `curl` against the anon key in `.env.local`, the
  `node:assert` self-test in Task 7, and the dev server in a browser. Do **not** add a test
  framework — it's an unrequested dependency.
- **DB writes go through SQL you hand the user** (MCP can't reach this project — different org).
  SQL tasks deliver a file; the user pastes it into the Supabase SQL Editor; you then verify via
  REST. App writes go through security-definer RPCs.
- **Any new readable column must be in BOTH** the `grant select(...)` list (Task 1) **and**
  `PUBLIC_COLUMNS` in `lib/db.ts` (Task 4), or the API silently can't read it.
- **`cd /Users/davidsemprun/Dev/ayuda-venezuela` first** — the sandbox cwd drifts.
- **Commits are optional** per the user's workflow (commit only when asked). Commit steps below
  are provided for completeness; skip them if not committing. This dir may not be a git repo.
- Read `node_modules/next/dist/docs/` before any Next-specific API you're unsure of (per AGENTS.md).

## File map

- Create: `supabase/migrations/0008_dedup.sql` — extensions, columns, grants, index, RPCs.
- Modify: `lib/types.ts` — add `duplicate_of`/`corroboration_count` to `Post`; add `SimilarRescue`,
  `Corroboration`.
- Modify: `lib/db.ts` — `PUBLIC_COLUMNS`; filter `duplicate_of` in `listPosts`/`listRescued`;
  add `findSimilarRescues`, `corroboratePost`, `getCorroborations` (+ demo-mode equivalents).
- Modify: `app/actions.ts` — add `findSimilarAction`, `corroboratePostAction`.
- Create: `components/SimilarRescues.tsx` — debounced soft-match + inline corroborate (shared by
  both forms).
- Modify: `components/RescueForm.tsx` — render `<SimilarRescues>` after the location field.
- Modify: `components/PostForm.tsx` — add `title` state; render `<SimilarRescues>` for rescue needs.
- Modify: `components/PostCard.tsx` — "🔴 Reportado por N personas" badge.
- Modify: `app/post/[id]/page.tsx` — list corroborating contacts.
- Create: `scripts/dedup-report.mjs` — cluster existing dupes, print report, emit merge SQL,
  `--selftest`.

---

## Phase 1 — Schema + matching engine

### Task 1: Migration `0008_dedup.sql` (columns, grants, engine, RPCs)

**Files:**
- Create: `supabase/migrations/0008_dedup.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 0008_dedup.sql — dedup of rescue posts: canonical pointer + fuzzy matching engine.
-- Apply by pasting into the Supabase SQL Editor (MCP can't reach this project).

create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- 1. Columns ----------------------------------------------------------------
alter table posts add column if not exists duplicate_of uuid references posts(id) on delete set null;
alter table posts add column if not exists corroboration_count int not null default 0;
create index if not exists posts_duplicate_of_idx on posts(duplicate_of);

-- 2. Per-column SELECT grant (must list every column lib/db.ts reads) --------
grant select (
  id, type, category, title, description, city, zone, contact_name, contact_phone,
  people_count, lat, lng, status, created_at, address, trapped, rescue_state, rescued_at,
  duplicate_of, corroboration_count
) on posts to anon;

-- 3. Immutable unaccent wrapper (stock unaccent() is STABLE, unusable in an index) --
create or replace function f_unaccent(text)
returns text language sql immutable strict parallel safe as $$
  select unaccent('unaccent', $1)
$$;

-- 4. Normalized building key: lower, de-accent, drop generic words, keep building name --
create or replace function rescue_match_key(p_title text, p_address text, p_zone text)
returns text language sql immutable as $$
  with cleaned as (
    select regexp_replace(
      f_unaccent(lower(coalesce(p_title,'') || ' ' || coalesce(p_address,'') || ' ' || coalesce(p_zone,''))),
      '[^a-z0-9 ]', ' ', 'g') as t
  ),
  tokens as (
    select unnest(regexp_split_to_array(t, '\s+')) as tok from cleaned
  )
  select coalesce(string_agg(tok, ' '), '')
  from tokens
  where length(tok) > 3
    and tok not in (
      'edificio','edif','residencia','residencias','resid','torre','torres',
      'calle','avenida','bloque','sector','urbanizacion','conjunto','piso','apto',
      'apartamento','casa','quinta','frente','detras','lado','entre','numero')
$$;

-- 5. Trigram index for the live similarity query (partial: active rescue canonicals) --
create index if not exists posts_rescue_key_trgm_idx
on posts using gin (rescue_match_key(title, address, zone) gin_trgm_ops)
where category in ('rescate','maquinaria') and duplicate_of is null and status = 'active';

-- 6. Submit-time similarity RPC (anon-callable) -----------------------------
create or replace function find_similar_rescues(p_city text, p_query text, p_limit int default 5)
returns table(id uuid, title text, address text, zone text, corroboration_count int, sim real)
language sql stable security definer set search_path = public as $$
  select p.id, p.title, p.address, p.zone, p.corroboration_count,
         similarity(rescue_match_key(p.title, p.address, p.zone),
                    rescue_match_key(p_query, '', '')) as sim
  from posts p
  where p.city = p_city
    and p.category in ('rescate','maquinaria')
    and p.duplicate_of is null
    and p.status = 'active'
    and rescue_match_key(p.title, p.address, p.zone) % rescue_match_key(p_query, '', '')
  order by sim desc
  limit greatest(1, least(p_limit, 10));
$$;
grant execute on function find_similar_rescues(text, text, int) to anon;

-- 7. Corroborate RPC: insert a hidden child capturing the new reporter, bump count --
create or replace function corroborate_post(
  p_canonical uuid, p_contact_name text, p_contact_phone text, p_note text default '')
returns boolean language plpgsql security definer set search_path = public as $$
declare canon posts;
begin
  select * into canon from posts where id = p_canonical and duplicate_of is null;
  if not found then return false; end if;
  if canon.category not in ('rescate','maquinaria') then return false; end if;
  if length(coalesce(trim(p_contact_name), '')) < 2 then return false; end if;
  if length(coalesce(trim(p_contact_phone), '')) < 7 then return false; end if;

  insert into posts(
    type, category, title, description, city, zone, contact_name, contact_phone,
    people_count, lat, lng, status, address, trapped, rescue_state, rescued_at,
    duplicate_of, corroboration_count)
  values (
    canon.type, canon.category, 'Corroboración: ' || left(canon.title, 100),
    nullif(left(p_note, 1000), ''), canon.city, canon.zone,
    trim(p_contact_name), trim(p_contact_phone),
    null, null, null, 'active', canon.address, canon.trapped, null, null,
    p_canonical, 0);

  update posts set corroboration_count = corroboration_count + 1 where id = p_canonical;
  return true;
end;
$$;
grant execute on function corroborate_post(uuid, text, text, text) to anon;
```

- [ ] **Step 2: Hand the file to the user to apply**

Tell the user: "Paste `supabase/migrations/0008_dedup.sql` into the Supabase SQL Editor and run it."
Wait for confirmation before verifying.

- [ ] **Step 3: Verify columns are readable via REST**

```bash
cd /Users/davidsemprun/Dev/ayuda-venezuela
set -a; source .env.local; set +a
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/posts?select=id,duplicate_of,corroboration_count&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```
Expected: a JSON array (e.g. `[{"id":"...","duplicate_of":null,"corroboration_count":0}]`), **not**
an error about an unknown column. An error means the grant or `ADD COLUMN` didn't apply.

- [ ] **Step 4: Verify the similarity RPC returns matches**

```bash
cd /Users/davidsemprun/Dev/ayuda-venezuela
set -a; source .env.local; set +a
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/find_similar_rescues" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_city":"la-guaira","p_query":"Edificio Bellevue Caraballeda"}'
```
Expected: a JSON array of Bellevue-ish posts with a `sim` field, ordered by `sim` desc. An empty
array means the threshold is too high or the key normalization dropped the building name — lower
the pg_trgm threshold or revisit Step 1's stopword list.

- [ ] **Step 5: Commit (optional)**

```bash
git add supabase/migrations/0008_dedup.sql && git commit -m "feat(db): dedup schema + fuzzy matching engine"
```

---

## Phase 2 — Read path + types

### Task 2: Types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add the two new `Post` fields**

In `lib/types.ts`, inside `interface Post`, after the `rescued_at` line, add:

```ts
  duplicate_of: string | null; // si está set, es una corroboración (oculta de los tablones)
  corroboration_count: number; // nº de corroboraciones sobre la canónica
```

- [ ] **Step 2: Add the two new exported interfaces**

At the end of `lib/types.ts`, append:

```ts
/** Coincidencia para el aviso anti-duplicados al publicar un rescate. */
export interface SimilarRescue {
  id: string;
  title: string;
  address: string | null;
  zone: string | null;
  corroboration_count: number;
  sim: number;
}

/** Contacto de una corroboración, para listarlo en el detalle de la canónica. */
export interface Corroboration {
  contact_name: string;
  contact_phone: string;
  description: string | null;
}
```

- [ ] **Step 3: Typecheck**

Run: `cd /Users/davidsemprun/Dev/ayuda-venezuela && npm run build`
Expected: build fails ONLY in `lib/db.ts` (memory-mode objects now miss the two new required
fields) — that's fixed in Task 3. If it fails elsewhere, a consumer relied on the old `Post`
shape; note it.

### Task 3: `lib/db.ts` — read filter, demo parity, new functions

**Files:**
- Modify: `lib/db.ts`

- [ ] **Step 1: Add the new columns to `PUBLIC_COLUMNS`**

Replace the `PUBLIC_COLUMNS` constant (line 8-9) with:

```ts
const PUBLIC_COLUMNS =
  "id,type,category,title,description,city,zone,contact_name,contact_phone,people_count,lat,lng,status,created_at,address,trapped,rescue_state,rescued_at,duplicate_of,corroboration_count";
```

- [ ] **Step 2: Add the new fields to the seed posts in `lib/data.ts`**

`SEED_POSTS: Post[]` is built by a `.map` (`lib/data.ts:296-302`) that now omits the two new
required `Post` fields. Add them to that map so the seeds satisfy the type:

```ts
export const SEED_POSTS: Post[] = RAW_SEED_POSTS.map((p) => ({
  ...p,
  address: null,
  trapped: false,
  rescue_state: null,
  rescued_at: null,
  duplicate_of: null,
  corroboration_count: 0,
}));
```

`db.ts` already spreads `SEED_POSTS` into the memory store (lines 19-24), so it inherits the new
fields automatically — no change needed there for the seed.

- [ ] **Step 3: Filter duplicates out of `listPosts`**

In `listPosts`, demo branch: add `.filter((p) => !p.duplicate_of)` to the chain (e.g. right after
the `status === "active"` filter). Supabase branch: add `.is("duplicate_of", null)` to the query
builder (e.g. after `.eq("status", "active")`).

- [ ] **Step 4: Filter duplicates out of `listRescued`**

In `listRescued`, demo branch: add `.filter((p) => !p.duplicate_of)` before the sort. Supabase
branch: add `.is("duplicate_of", null)` after `.eq("rescue_state", "rescatados")`.

- [ ] **Step 5: Set the new fields in `createPost` demo + supabase fallback `base`**

In `createPost`, the `base` object (lines 124-140) is reused for the inserted/returned row. Add to
it:

```ts
    duplicate_of: null,
    corroboration_count: 0,
```
(Place alongside `rescue_state: null, rescued_at: null,`.) This keeps the demo `MemPost` and the
direct-insert fallback type-correct. The `create_post` RPC is unchanged — the columns default.

- [ ] **Step 6: Add `findSimilarRescues`, `corroboratePost`, `getCorroborations`**

Add these exports at the end of `lib/db.ts` (and add `SimilarRescue, Corroboration` to the
`import type { ... } from "./types"` line at the top):

```ts
export async function findSimilarRescues(
  city: string,
  query: string,
): Promise<SimilarRescue[]> {
  const supabase = getSupabase();
  if (!supabase) {
    const q = query.toLowerCase();
    return memoryPosts
      .filter(
        (p) =>
          p.status === "active" &&
          !p.duplicate_of &&
          (p.category === "rescate" || p.category === "maquinaria") &&
          p.city === city &&
          `${p.title} ${p.address ?? ""} ${p.zone ?? ""}`.toLowerCase().includes(q.slice(0, 8)),
      )
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        title: p.title,
        address: p.address,
        zone: p.zone,
        corroboration_count: p.corroboration_count,
        sim: 0.5,
      }));
  }
  const { data, error } = await supabase.rpc("find_similar_rescues", {
    p_city: city,
    p_query: query,
    p_limit: 5,
  });
  if (error) {
    console.error("[db] findSimilarRescues error:", error.message);
    return [];
  }
  return (data ?? []) as unknown as SimilarRescue[];
}

export async function corroboratePost(
  canonicalId: string,
  name: string,
  phone: string,
  note: string | null,
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    const canon = memoryPosts.find((x) => x.id === canonicalId && !x.duplicate_of);
    if (!canon) return false;
    memoryPosts.unshift({
      ...canon,
      id: crypto.randomUUID(),
      title: `Corroboración: ${canon.title.slice(0, 100)}`,
      description: note,
      contact_name: name,
      contact_phone: phone,
      people_count: null,
      lat: null,
      lng: null,
      rescue_state: null,
      rescued_at: null,
      duplicate_of: canon.id,
      corroboration_count: 0,
      created_at: new Date().toISOString(),
      manage_token: crypto.randomUUID(),
    });
    canon.corroboration_count += 1;
    return true;
  }
  const { data, error } = await supabase.rpc("corroborate_post", {
    p_canonical: canonicalId,
    p_contact_name: name,
    p_contact_phone: phone,
    p_note: note ?? "",
  });
  if (error) {
    console.error("[db] corroboratePost error:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function getCorroborations(canonicalId: string): Promise<Corroboration[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return memoryPosts
      .filter((p) => p.duplicate_of === canonicalId)
      .map((p) => ({
        contact_name: p.contact_name,
        contact_phone: p.contact_phone,
        description: p.description,
      }));
  }
  const { data, error } = await supabase
    .from(TABLE)
    .select("contact_name,contact_phone,description")
    .eq("duplicate_of", canonicalId)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) {
    console.error("[db] getCorroborations error:", error.message);
    return [];
  }
  return (data ?? []) as unknown as Corroboration[];
}
```

- [ ] **Step 7: Typecheck**

Run: `cd /Users/davidsemprun/Dev/ayuda-venezuela && npm run build`
Expected: PASS (only the pre-existing `Board.tsx` lint warning remains; build still succeeds).

- [ ] **Step 8: Verify the live read-filter semantics via REST**

This confirms the exact filter `listPosts` now uses returns rows and excludes children:

```bash
cd /Users/davidsemprun/Dev/ayuda-venezuela
set -a; source .env.local; set +a
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/posts?select=id&status=eq.active&duplicate_of=is.null&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```
Expected: a non-empty JSON array (no errors). Children (set in Phase 3) will be absent because
`duplicate_of=is.null`.

- [ ] **Step 9: Commit (optional)**

```bash
git add lib/types.ts lib/db.ts lib/data.ts && git commit -m "feat(db): hide duplicates from read paths; corroborate + similar helpers"
```

---

## Phase 3 — Existing-data cleanup (human-vetted)

### Task 4: `scripts/dedup-report.mjs`

**Files:**
- Create: `scripts/dedup-report.mjs`

- [ ] **Step 1: Write the script**

```js
// scripts/dedup-report.mjs
// Clusters existing active rescue/maquinaria posts by fuzzy building name (same city),
// prints a human-vettable report, and (with --sql) emits merge SQL for the SQL Editor.
//   node scripts/dedup-report.mjs            # print report
//   node scripts/dedup-report.mjs --sql      # emit merge SQL
//   node scripts/dedup-report.mjs --selftest # run assertions (no network)
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const STOP = new Set([
  "edificio","edif","residencia","residencias","resid","torre","torres","calle","avenida",
  "bloque","sector","urbanizacion","conjunto","piso","apto","apartamento","casa","quinta",
  "frente","detras","lado","entre","numero",
]);

const deaccent = (s) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "");
function matchKey(title, address, zone) {
  const t = deaccent(`${title || ""} ${address || ""} ${zone || ""}`.toLowerCase())
    .replace(/[^a-z0-9 ]/g, " ");
  return t.split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)).join(" ");
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
function cluster(posts, threshold = 0.5) {
  const byCity = {};
  for (const p of posts) {
    const k = matchKey(p.title, p.address, p.zone);
    if (!k) continue;
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
        if (dice(arr[i]._key, arr[j]._key) >= threshold) {
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
  const sets = [`corroboration_count = ${children.length}`];
  if (best.rescue_state && rank(best) > rank(canon)) {
    sets.push(`rescue_state = ${q(best.rescue_state)}`);
    if (best.rescued_at) sets.push(`rescued_at = coalesce(rescued_at, ${q(best.rescued_at)})`);
  }
  return [
    `-- "${canon._key}" (${canon.city}) — ${group.length} posts, canonical=${canon.id}`,
    `update posts set ${sets.join(", ")} where id = ${q(canon.id)};`,
    `update posts set duplicate_of = ${q(canon.id)}, status = 'resolved' where id in (${children
      .map((c) => q(c.id))
      .join(", ")});`,
  ].join("\n");
}
function printReport(clusters) {
  const excess = clusters.reduce((n, g) => n + g.length - 1, 0);
  console.log(`${clusters.length} clusters, ${excess} excess posts\n`);
  for (const g of clusters) {
    const canon = pickCanonical(g);
    console.log(`CLUSTER "${canon._key}" (${canon.city}) — ${g.length}`);
    for (const p of g) {
      const mark = p.id === canon.id ? "★canon" : "  dup ";
      console.log(`  ${mark} ${String(p.title).slice(0, 50).padEnd(50)} ${p.contact_phone}  ${p.rescue_state ?? "-"}`);
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
async function fetchPosts() {
  const e = loadEnv();
  const url = e.NEXT_PUBLIC_SUPABASE_URL, key = e.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const sel =
    "id,title,address,zone,city,people_count,rescue_state,rescued_at,contact_phone,status,duplicate_of";
  const r = await fetch(
    `${url}/rest/v1/posts?select=${sel}&status=eq.active&duplicate_of=is.null&category=in.(rescate,maquinaria)&order=created_at.desc&limit=500`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!r.ok) throw new Error(`REST ${r.status}`);
  return r.json();
}
function runSelfTest() {
  assert.equal(matchKey("Residencias Bellevue", "", "Caraballeda"), "bellevue caraballeda");
  assert.equal(matchKey("Edif. Bellevue", "av circunvalación", ""), "bellevue circunvalacion");
  assert.equal(matchKey("Edificio", "", ""), ""); // pure stopwords -> empty -> excluded
  assert.ok(dice("bellevue caraballeda", "bellevue circunvalacion") >= 0.4);
  assert.ok(dice("bellevue", "puerto coral") < 0.3);
  const g = [
    { id: "a", rescue_state: null, address: "x", zone: null, people_count: null, created_at: "2026-01-02" },
    { id: "b", rescue_state: "rescatados", address: null, zone: null, people_count: null, created_at: "2026-01-03" },
  ];
  assert.equal(pickCanonical(g).id, "b"); // rescatados wins regardless of completeness/date
  console.log("dedup-report selftest: PASS");
}

const arg = process.argv[2];
if (arg === "--selftest") {
  runSelfTest();
} else {
  const posts = await fetchPosts();
  const clusters = cluster(posts);
  if (arg === "--sql") clusters.forEach((g) => console.log(mergeSql(g) + "\n"));
  else printReport(clusters);
}
```

- [ ] **Step 2: Run the self-test**

Run: `cd /Users/davidsemprun/Dev/ayuda-venezuela && node scripts/dedup-report.mjs --selftest`
Expected: `dedup-report selftest: PASS` (exit 0). If an assertion throws, fix `matchKey`/`dice`/
`pickCanonical` before touching real data.

- [ ] **Step 3: Generate and human-vet the report**

Run: `cd /Users/davidsemprun/Dev/ayuda-venezuela && node scripts/dedup-report.mjs`
Read the clusters with the user. The threshold (0.5) is recall-biased; **drop any cluster that
merges distinct buildings** (e.g. generic "personas/escombros" keys that slipped through). If
over-merging is common, raise the threshold arg in `cluster()` or add stopwords. Do NOT proceed
until the report is clean.

- [ ] **Step 4: Emit merge SQL and hand it to the user**

Run: `cd /Users/davidsemprun/Dev/ayuda-venezuela && node scripts/dedup-report.mjs --sql > /tmp/merge.sql`
Show `/tmp/merge.sql` to the user (or paste its contents). After they apply it in the SQL Editor,
continue.

- [ ] **Step 5: Verify a known cluster collapsed (Bellevue)**

```bash
cd /Users/davidsemprun/Dev/ayuda-venezuela
set -a; source .env.local; set +a
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/posts?select=id,title,corroboration_count,rescue_state,duplicate_of&status=eq.active&duplicate_of=is.null&city=eq.la-guaira&title=ilike.*bellevue*" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```
Expected: **one** active Bellevue row, `corroboration_count` > 0, and if a member was rescued it
carries `rescue_state:"rescatados"`. Children now have `duplicate_of` set and are excluded.

- [ ] **Step 6: Commit (optional)**

```bash
git add scripts/dedup-report.mjs && git commit -m "feat(scripts): rescue dedup clustering report + merge SQL"
```

---

## Phase 4 — Canonical card + detail UI

### Task 5: "Reportado por N personas" badge in `PostCard`

**Files:**
- Modify: `components/PostCard.tsx`

- [ ] **Step 1: Add the badge to the meta row**

In `components/PostCard.tsx`, inside the meta `<div>` (the `mt-auto flex flex-wrap …` block,
lines 89-108), after the city `<span>` and before the `distanceKm` span, add:

```tsx
        {post.corroboration_count > 0 && (
          <span
            className="inline-flex items-center gap-1 font-semibold"
            style={{ color: "var(--color-need-strong)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-need-strong)" }} />
            Reportado por {post.corroboration_count + 1} personas
          </span>
        )}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/davidsemprun/Dev/ayuda-venezuela && npm run build`
Expected: PASS.

- [ ] **Step 3: Verify in the browser**

Start the dev server (`npm run dev`), open `/` or `/rescate`, find the merged Bellevue card.
Expected: a "🔴 Reportado por N personas" line in the card meta; WhatsApp is still the one
dominant button (no new competing CTA).

### Task 6: Corroborating contacts on the detail page

**Files:**
- Modify: `app/post/[id]/page.tsx`

- [ ] **Step 1: Fetch corroborations and render them under the card**

In `app/post/[id]/page.tsx`: change the import on line 6 to
`import { getPostById, getCorroborations } from "@/lib/db";` and add
`import { whatsappHref } from "@/lib/format";`. Inside `PostPage`, after `const post = await getPostById(id);`
(line 38), add:

```tsx
  const corroborations =
    post && post.corroboration_count > 0 ? await getCorroborations(post.id) : [];
```

Then, in the success branch, immediately after `<PostCard post={post} />` (line 76), add:

```tsx
              {corroborations.length > 0 && (
                <section className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <h2 className="text-sm font-bold text-[var(--color-need-strong)]">
                    🔴 Reportado por {corroborations.length + 1} personas
                  </h2>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5 mb-3">
                    Varias personas reportan este mismo lugar. Más formas de contactar:
                  </p>
                  <ul className="flex flex-col gap-2">
                    {corroborations.map((c, i) => (
                      <li key={i} className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{c.contact_name}</span>
                        <a
                          href={whatsappHref(
                            c.contact_phone,
                            `Hola ${c.contact_name}, vi tu reporte en Enlaza Venezuela y quiero ayudar.`,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] text-white font-semibold text-sm px-3 py-2"
                        >
                          💬 WhatsApp
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/davidsemprun/Dev/ayuda-venezuela && npm run build`
Expected: PASS.

- [ ] **Step 3: Verify in the browser**

Open `/post/<canonical-bellevue-id>`. Expected: the contacts section lists each corroborating
reporter with a working WhatsApp button. A non-duplicated post shows no such section.

- [ ] **Step 4: Commit (optional)**

```bash
git add components/PostCard.tsx app/post/\[id\]/page.tsx && git commit -m "feat(ui): show corroboration count + contacts on canonical posts"
```

---

## Phase 5 — Prevention: submit-time soft match

### Task 7: Server actions `findSimilarAction` + `corroboratePostAction`

**Files:**
- Modify: `app/actions.ts`

- [ ] **Step 1: Add the two actions**

In `app/actions.ts`: update the import on line 4 to
`import { createPost, resolvePost, deletePost, setRescueState, findSimilarRescues, corroboratePost } from "@/lib/db";`
and add `SimilarRescue` to the type import on line 7. Then append:

```ts
export async function findSimilarAction(
  city: string,
  query: string,
): Promise<SimilarRescue[]> {
  if (!city || query.trim().length < 4) return [];
  try {
    return await findSimilarRescues(city, query.trim());
  } catch {
    return [];
  }
}

export async function corroboratePostAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const canonicalId = String(formData.get("canonical_id") ?? "");
  const name = String(formData.get("contact_name") ?? "").trim();
  const phone = String(formData.get("contact_phone") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);

  if (!canonicalId) return { error: "Reporte no válido." };
  if (name.length < 2) return { error: "Escribe tu nombre." };
  if (!isValidWhatsApp(phone)) {
    return { error: "Ese número de WhatsApp no parece válido. Revísalo (ej: 0412 555 1234)." };
  }

  let ok = false;
  try {
    ok = await corroboratePost(canonicalId, name, phone, note || null);
  } catch {
    return { error: "No se pudo confirmar. Revisa tu conexión e intenta de nuevo." };
  }
  if (!ok) return { error: "No se pudo confirmar este reporte." };

  revalidatePath("/");
  revalidatePath("/rescate");
  return { success: { id: canonicalId, type: "need", token: null } };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/davidsemprun/Dev/ayuda-venezuela && npm run build`
Expected: PASS.

### Task 8: `SimilarRescues` component

**Files:**
- Create: `components/SimilarRescues.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { findSimilarAction, corroboratePostAction } from "@/app/actions";
import { isValidWhatsApp } from "@/lib/format";
import type { FormState, SimilarRescue } from "@/lib/types";

const initialState: FormState = {};

/**
 * Aviso anti-duplicados, no bloqueante. Tras escribir la ubicación, busca rescates
 * activos parecidos en la misma ciudad; tocar uno corrobora ese reporte (suma tu
 * contacto) en vez de crear una tarjeta repetida. Se usa en /reportar y /publicar.
 */
export default function SimilarRescues({ city, query }: { city: string; query: string }) {
  const [matches, setMatches] = useState<SimilarRescue[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [picked, setPicked] = useState<SimilarRescue | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, formAction, pending] = useActionState(corroboratePostAction, initialState);

  useEffect(() => {
    if (dismissed || !city || query.trim().length < 4) {
      setMatches([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setMatches(await findSimilarAction(city, query));
      } catch {
        setMatches([]);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [city, query, dismissed]);

  if (state.success) {
    return (
      <div className="rounded-xl border border-[var(--color-offer)] bg-[var(--color-offer-soft)] p-4 text-sm fade-in">
        <p className="font-semibold text-[var(--color-offer)]">✅ Reporte confirmado</p>
        <p className="mt-1 text-[var(--color-ink)]">
          Los rescatistas verán que más personas reportan este lugar y tu WhatsApp quedó añadido.
        </p>
        <Link
          href="/rescate"
          className="mt-2 inline-block font-semibold text-[var(--color-ve-blue)]"
        >
          Ver mapa de rescate →
        </Link>
      </div>
    );
  }

  if (dismissed || matches.length === 0) return null;

  return (
    <div className="rounded-xl border-2 bg-[var(--color-need-soft)] p-3.5 fade-in" style={{ borderColor: "color-mix(in srgb, var(--color-need) 40%, transparent)" }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold" style={{ color: "var(--color-need)" }}>
          ¿Ya está reportado este lugar?
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 text-xs text-[var(--color-muted)] underline"
        >
          No, es otro ✕
        </button>
      </div>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        Toca el tuyo para confirmarlo (ayuda a priorizar) en vez de crear un reporte repetido.
      </p>

      <ul className="mt-2.5 flex flex-col gap-1.5">
        {matches.map((m) => {
          const active = picked?.id === m.id;
          return (
            <li key={m.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setPicked(active ? null : m)}
                className="w-full rounded-lg border bg-[var(--color-surface)] px-3 py-2.5 text-left text-sm transition-colors"
                style={{ borderColor: active ? "var(--color-need)" : "var(--color-border)" }}
              >
                <span className="font-semibold text-[var(--color-ink)]">{m.title}</span>
                {m.corroboration_count > 0 && (
                  <span className="ml-1 text-xs" style={{ color: "var(--color-need)" }}>
                    · {m.corroboration_count + 1} reportes
                  </span>
                )}
                {m.zone && (
                  <span className="block text-xs text-[var(--color-muted)]">{m.zone}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {picked && (
        <form
          action={formAction}
          className="mt-3 flex flex-col gap-2 border-t pt-3"
          style={{ borderColor: "color-mix(in srgb, var(--color-need) 20%, transparent)" }}
        >
          <input type="hidden" name="canonical_id" value={picked.id} />
          <input type="hidden" name="note" value={query} />
          <p className="text-xs font-semibold text-[var(--color-ink)]">
            Confirmar reporte en: {picked.title}
          </p>
          <input
            name="contact_name"
            required
            minLength={2}
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre o brigada"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
          />
          <input
            name="contact_phone"
            type="tel"
            inputMode="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Tu WhatsApp"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-[family-name:var(--font-mono)]"
          />
          {state.error && (
            <p className="text-xs" style={{ color: "var(--color-need)" }}>
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending || name.trim().length < 2 || !isValidWhatsApp(phone)}
            className="min-h-[44px] rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--color-need)" }}
          >
            {pending ? "Confirmando…" : "Confirmar este reporte"}
          </button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/davidsemprun/Dev/ayuda-venezuela && npm run build`
Expected: PASS.

### Task 9: Wire `SimilarRescues` into `RescueForm`

**Files:**
- Modify: `components/RescueForm.tsx`

- [ ] **Step 1: Import and render after the location field**

In `components/RescueForm.tsx`: add `import SimilarRescues from "./SimilarRescues";` near the
other imports. Then, immediately after the closing `</div>` of the "1 · Dónde" block (the `<div>`
that ends at line 152, right before the "2 · Ciudad" comment), insert:

```tsx
      <SimilarRescues city={city} query={where} />
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/davidsemprun/Dev/ayuda-venezuela && npm run build`
Expected: PASS.

- [ ] **Step 3: Verify the full flow in the browser**

`npm run dev`, open `/reportar`. Type `Edificio Bellevue` in ¿Dónde? with city La Guaira.
Expected: after ~400ms the "¿Ya está reportado este lugar?" panel lists Bellevue matches. Tap one
→ inline name + WhatsApp appear → fill valid values → "Confirmar este reporte" → success panel.
Then verify the count rose:

```bash
cd /Users/davidsemprun/Dev/ayuda-venezuela
set -a; source .env.local; set +a
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/posts?select=title,corroboration_count&duplicate_of=is.null&city=eq.la-guaira&title=ilike.*bellevue*" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```
Expected: `corroboration_count` incremented by 1 vs. Task 4 Step 5. Confirm the child does NOT
appear on `/` or `/rescate` (it has `duplicate_of` set). Also confirm "No, es otro ✕" hides the
panel and a normal submit still creates a post.

### Task 10: Wire `SimilarRescues` into `PostForm` (rescue categories only)

**Files:**
- Modify: `components/PostForm.tsx`

- [ ] **Step 1: Add a `title` state (the building text for matching)**

In `components/PostForm.tsx`: add `import SimilarRescues from "./SimilarRescues";` near the
imports. Add a state near the other `useState`s (e.g. after the `titleLen` state on line 29):

```tsx
  const [title, setTitle] = useState<string>("");
```

Update the title `<input>` (lines 202-215) to be controlled and update both states:

```tsx
        <input
          id="title"
          name="title"
          required
          minLength={5}
          maxLength={120}
          className={fieldClass}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleLen(e.target.value.length);
          }}
          placeholder={
            isNeed
              ? "Ej: Familia de 5 necesita refugio en Altamira"
              : "Ej: Camión disponible para traslados en Caracas"
          }
        />
```

- [ ] **Step 2: Render the soft-match for rescue needs**

Immediately after the location grid `</div>` (the `grid grid-cols-1 sm:grid-cols-2` block that
ends at line 284, before the "Ubicación aproximada" block), insert:

```tsx
      {isNeed && (category === "rescate" || category === "maquinaria") && (
        <SimilarRescues city={city} query={title} />
      )}
```

- [ ] **Step 3: Typecheck**

Run: `cd /Users/davidsemprun/Dev/ayuda-venezuela && npm run build`
Expected: PASS.

- [ ] **Step 4: Verify in the browser**

Open `/publicar?tipo=need&categoria=rescate`. Type a known building in Título, pick La Guaira.
Expected: the soft-match panel appears. Switch category to a non-rescue one (e.g. alimentos):
the panel disappears (gating works). Corroborate flow behaves as in Task 9.

- [ ] **Step 5: Commit (optional)**

```bash
git add app/actions.ts components/SimilarRescues.tsx components/RescueForm.tsx components/PostForm.tsx && git commit -m "feat(ui): submit-time duplicate warning + tap-to-corroborate"
```

---

## Final verification

- [ ] `cd /Users/davidsemprun/Dev/ayuda-venezuela && npm run build` — green (only the pre-existing
  `Board.tsx` lint warning).
- [ ] `node scripts/dedup-report.mjs --selftest` — PASS.
- [ ] Browser sweep: `/` and `/rescate` show one Bellevue card with the "Reportado por N" badge;
  `/rescatados` shows it once if rescued; the detail page lists corroborating contacts; `/reportar`
  and `/publicar` (rescate) show the soft-match and corroborate without creating board clutter.
- [ ] REST: children carry `duplicate_of`; `duplicate_of=is.null` queries exclude them everywhere.

## Notes for the executor

- **Threshold tuning is expected.** `find_similar_rescues` relies on pg_trgm's default 0.3
  similarity threshold; the cleanup script uses Dice 0.5. Both are recall-biased and meant to be
  adjusted against the real report output in Task 4 Step 3 before any merge SQL is applied.
- **Never auto-apply merge SQL.** Task 4 is human-vetted by design — generic-word clusters
  ("escombros", "familia", "personas") must be excluded by hand.
- The `rescue_match_key` stopword list (SQL, Task 1) and the JS `STOP` set (Task 7/script) should
  stay roughly aligned so prevention and cleanup agree on what a "building name" is.
