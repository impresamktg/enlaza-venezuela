# Enlaza Venezuela — Rescue Post Dedup & Prevention — Design

> Spec. Date: 2026-06-27. Status: approved for planning.

## Problem

Different users post the **same trapped building** as separate cards. Live data (174
rescate/maquinaria posts) shows **~30 duplicate clusters / ~90 excess posts**. Worst case:
*Edificio Bellevue* = **7 posts** with different phones — one already `rescatados`, one
`resuelto`, but **5 still active**. Rescue crews are dispatched to a building already cleared.

Two harms: (1) board clutter slows triage; (2) stale active siblings remain after a building
is rescued. In a quake, multiple reports of one building are partly **corroboration** (more
confidence/urgency), so the goal is to **collapse duplicates into one stronger card**, not
silently delete reports.

## Constraints (from codebase reality)

- **Geo-dedup is impossible**: only **1 of 174** posts has `lat`/`lng`. Matching must be
  **text-based** (title + address + zone) and **fuzzy** (accents, typos, name variants:
  "Residencias Bellevue" / "Edif. Bellevue av circunvalación" / "Bellevue Caraballeda").
- **Scope to rescue**: only `category in ('rescate','maquinaria')`. Other categories (food,
  shelter) have weaker building identity and lower dup harm — out of scope.
- **No admin auth exists** (management is per-post via manage-token). Existing-data cleanup
  runs as **vetted SQL pasted into the Supabase SQL Editor**, not a new admin UI.
- **MCP can't touch this Supabase project** (different org). All schema/SQL is handed to the
  user; app writes go through **security-definer RPCs**. Any new column must be added to the
  `grant select(...)` list and to `PUBLIC_COLUMNS` in `lib/db.ts` or the API can't read it.
- **All read paths funnel through `lib/db.ts`**: `Board`/`RescueBoard` refresh via
  `router.refresh()` → server components (`app/page.tsx`, `app/rescate/page.tsx`) →
  `listPosts`/`listRescued`. The map renders from the same array. So one filter in `lib/db.ts`
  covers initial render, realtime, the 30s poll, and the map.
- **Demo mode** (in-memory store, no Supabase) must keep working: every read filter and write
  RPC needs an in-memory equivalent in `lib/db.ts`.

## Decisions (locked by user 2026-06-27)

- **Merge model:** canonical card. Duplicates get a `duplicate_of` pointer, are hidden from
  all boards, and the surviving card shows `🔴 Reportado por N personas`.
- **Prevention UX:** soft, non-blocking submit-time match. Tapping a match **corroborates**
  (captures the new reporter's phone as a hidden child); "No, es otro edificio" publishes new.

---

## Component 1 — Matching engine (Postgres)

One engine serves both prevention (live query) and cleanup (offline clustering).

- Enable extensions `pg_trgm` and `unaccent`.
- **Normalization fn** `rescue_match_key(p_title text, p_address text, p_zone text) returns text`
  (immutable): concatenates the three, lowercases, `unaccent`s, strips non-alphanumerics, and
  removes generic stopwords so the building name dominates. Stopword set (extend as needed):
  `edificio edif edf residencia residencias resid torre torres calle av avenida bloque sector
  urbanizacion urb conjunto piso apto apartamento la el los las de del y con en al`.
  Example: "Residencias Bellevue, Caraballeda" → `bellevue caraballeda`;
  "Edif. Bellevue av circunvalación" → `bellevue circunvalacion`.
- **Partial GIN trigram index** on `rescue_match_key(title,address,zone)` `gin_trgm_ops`,
  `WHERE category IN ('rescate','maquinaria') AND duplicate_of IS NULL AND status = 'active'`.
- **RPC** `find_similar_rescues(p_city text, p_query text, p_limit int default 5)` →
  security-definer, granted to `anon`. Returns rows
  `(id uuid, title text, address text, zone text, corroboration_count int, sim real)` where
  `city = p_city`, `category IN ('rescate','maquinaria')`, `duplicate_of IS NULL`,
  `status='active'`, `similarity(rescue_match_key(...), unaccent(lower(p_query))) >= 0.30`,
  ordered by `sim DESC`, limited. Threshold tunable; bias toward **recall** (a missed match
  just means one more dup, a false match is dismissible).

## Component 2 — Schema (migration `supabase/migrations/0008_dedup.sql`)

User applies via SQL Editor. Backward-compatible (nullable / defaulted columns).

- `ALTER TABLE posts ADD COLUMN duplicate_of uuid REFERENCES posts(id) ON DELETE SET NULL;`
  — non-null on a child = it's a corroboration; hidden from every board/map/registry.
- `ALTER TABLE posts ADD COLUMN corroboration_count int NOT NULL DEFAULT 0;`
  — on the canonical; card shows `Reportado por (corroboration_count + 1) personas`.
- `CREATE INDEX ... ON posts(duplicate_of);`
- Extend the per-column SELECT grant to include `duplicate_of, corroboration_count`
  (mirror in `PUBLIC_COLUMNS`).

## Component 3 — Write RPCs (security-definer)

- **`corroborate_post(p_canonical uuid, p_contact_name text, p_contact_phone text,
  p_note text default '')`** → granted to `anon`. Validates `p_canonical` exists, is a rescue
  category, and is itself not a duplicate (`duplicate_of IS NULL`); inserts a child row copying
  `type, category, city, trapped` from the canonical, with `duplicate_of = p_canonical`,
  `status='active'`, the new reporter's name/phone, optional `description = p_note`; then
  `corroboration_count = corroboration_count + 1` on the canonical. Returns `boolean`. Captures
  the new phone (another way to reach the building) without adding a board card.
- **Existing-data merge uses direct SQL** (service role in SQL Editor), not an RPC.

## Component 4 — Read path (`lib/db.ts`)

- Add `duplicate_of, corroboration_count` to `PUBLIC_COLUMNS` and the `Post` type
  (`lib/types.ts`): `duplicate_of: string | null; corroboration_count: number;`.
- `listPosts`: add `.is("duplicate_of", null)` (+ memory-mode `.filter(p => !p.duplicate_of)`).
- `listRescued`: add `.is("duplicate_of", null)` (+ memory equivalent). Ensures a rescued
  *child* never appears in the registry; the consolidated state lives on the canonical.
- New `getCorroborations(canonicalId): Promise<Array<{contact_name; contact_phone;
  description}>>` for the detail page (+ memory equivalent).
- New `findSimilarRescues(city, query): Promise<SimilarRescue[]>` calling the RPC
  (returns `[]` in demo mode or on error — never blocks the form).
- New `corroboratePost(canonicalId, name, phone, note?)` calling the RPC (+ memory equivalent).
- `getPostById` unchanged (a child stays viewable by direct link; no redirect in MVP).

## Component 5 — Server actions (`app/actions.ts`)

- `findSimilarAction(city, query)` → calls `findSimilarRescues`. Used by the form (debounced).
- `corroboratePostAction(canonicalId, name, phone, note?)` → validates phone via
  `isValidWhatsApp`, name length, calls `corroboratePost`, `revalidatePath('/')` +
  `revalidatePath('/rescate')`. Returns `{ ok }`.

## Component 6 — Prevention UI (`components/RescueForm.tsx` + `/publicar` rescue path)

- After **¿Dónde?** + **Ciudad** are filled, debounce (~400ms) `findSimilarAction(city, donde)`.
- If matches: render "**¿Es uno de estos? (toca para confirmar)**" — a list of cards
  `<building> · N reportes`. Non-blocking, below the location field.
- **Tap a match** → switch the primary CTA to **"Confirmar este reporte"**: on submit, call
  `corroboratePostAction(matchId, name, phone, note=donde)` instead of `createPostAction`.
  Success reuses the existing success state (no manage token for corroborations).
- **"No, es otro edificio"** (always present) → dismisses the list, normal `createPostAction`.
- `/publicar`: same soft-match, gated to `category IN ('rescate','maquinaria')` only.

## Component 7 — Canonical card + detail (`PostCard.tsx`, `app/post/[id]/page.tsx`)

- `PostCard`: when `corroboration_count > 0`, show an N3 line `🔴 Reportado por N personas`
  (`N = corroboration_count + 1`). No new dominant element; WhatsApp stays the one primary CTA.
- Detail page: when `corroboration_count > 0`, fetch `getCorroborations(id)` and list each
  corroborating contact with a WhatsApp button (more ways to reach the building).

## Component 8 — Existing cleanup (~30 clusters, ~90 excess) — human-vetted

No admin UI (no auth). Process:

1. **Refined clustering report**: build candidate clusters using `rescue_match_key`-style
   building-name tokens (proper-noun building names — **not** generic words like "escombros",
   "personas", "familia", which over-merge). Same `city` required. Output a human-readable
   list per cluster (title · phone · rescue_state).
2. **Human vetting**: user eyeballs the report; ambiguous/generic clusters are left untouched.
3. **Generated merge SQL** per confirmed cluster, run in SQL Editor:
   - **Canonical selection** (priority): most-advanced `rescue_state`
     (`rescatados` > `resuelto` > `en_camino` > `null`) → else most-complete (has address, then
     has zone, then has people_count) → else earliest `created_at`.
   - Set `duplicate_of = <canonical>` on the others; set their `status='resolved'` (belt-and-
     suspenders so they leave the active board even via any path that ignores `duplicate_of`).
   - **Consolidate onto canonical**: if any member was `rescatados`/`resuelto`, copy that
     `rescue_state` (and `rescued_at`) to the canonical; set
     `corroboration_count = <number of children>`.
   - This is what fixes the "crew sent to already-rescued Bellevue" case: Bellevue's
     `rescatados` member becomes canonical, the 5 active siblings become hidden children, the
     building leaves the active board and appears once in `/rescatados`.

---

## Build order

1. Schema + matching engine (migration `0008`, RPCs) — user applies SQL.
2. Read-path filter + types (`lib/db.ts`, `lib/types.ts`) — children vanish from board/map/registry.
3. Existing cleanup (report → vetted merge SQL) — immediate operational relief.
4. Canonical card + detail UI.
5. Prevention soft-match (`RescueForm`, `/publicar`).

## Cross-cutting acceptance

- `npm run build` + tsc clean after each phase (only the pre-existing `Board.tsx` lint stays red).
- Demo mode (no Supabase) still works: filters + corroborate have in-memory equivalents.
- Children are absent from `/`, `/rescate`, `/rescatados`, and the map; present only via direct
  `/post/[id]` link and aggregated on the canonical.
- Prevention never blocks a submit; geolocation/empty matches degrade silently.
- Matching is recall-biased and dismissible; no auto-merge of generic-word clusters.
- es-VE copy, "tú", sentence case; tap targets ≥44px; WhatsApp green stays the one primary CTA.

## Explicitly NOT doing

- No geo/reverse-geocoding dedup (data doesn't support it).
- No dedup for non-rescue categories.
- No admin auth / admin merge UI (cleanup is vetted SQL).
- No auto-merge without human vetting; no deletion of reports (corroborations are preserved).
- No redirect of child `/post/[id]` links in MVP.
