# Enlaza Venezuela — Marketplace Reorganization Plan

**Date:** 2026-06-28
**Author:** planning session
**Status:** DRAFT — awaiting decisions (see §11)

## 1. Context & problem

Enlaza emerged as a Venezuela earthquake "help board." Over time, **rescue / trapped-person
reporting was promoted to the centerpiece** (hero copy "La prioridad es el rescate", the
`🆘 PERSONAS ATRAPADAS` banner, the `/reportar` panic form, the `/rescate` map, `rescue_state`
tracking with `🚑 en camino`).

Three problems with that surface:

1. **False hope / safety.** The report→`en_camino`→`rescatados` UX *implies Enlaza dispatches or
   coordinates rescue.* It does not. A confused or panicking person may believe help is coming
   *because they posted here* and not call the people who can actually respond.
2. **Unverifiable.** `rescue_state` is editable by anyone with no token; we cannot confirm a rescue
   happened, who is en route, or whether anyone saw the post.
3. **Wrong framing, not wrong niche.** Per the 2026-06-28 inter-team coordination meeting, Enlaza's
   niche is the **needs↔offers matching/directory layer** (a "Fiverr for relief resources": someone
   needs a truck → finds who offers one → contacts by WhatsApp). What's off-niche is *pretending to
   dispatch rescue* — not rescue itself. Rescue resource-matching (need: brigada/maquinaria ↔ offer:
   voluntarios/máquinas) is squarely within our niche; we just have to do it honestly. And since VE's
   official emergency channels are largely non-functional, "redirect to 911" is not a real option.

**The good news:** the data model is already a two-sided marketplace. `type ∈ {need, offer}`,
`category` (11 values), `city`/`zone`, WhatsApp `contact_phone`, `status ∈ {active, resolved}`.
The reorg leverages this; it does not throw it away.

## 2. The decision

- **Reposition the product** around matching: *"¿Qué necesitas? ¿Qué ofreces? Te conectamos."*
- **Make rescue honest, not central.** We don't dispatch rescue; we connect trapped-person reports
  to real available resources (volunteers, machinery, brigades) and feed them to the shared pool.
  Kill any "official help is coming" implication. (A 911-style redirect is NOT viable in VE.)
- **Build the matching value** that makes us a marketplace, not just a board (auto-surface the
  opposite side of every post; a standing provider directory; honest status; trust signals).
- **Align to IA911 centralization** (single source of truth, reinsert all data, no parallel DB) as
  a parallel track once the API doc arrives.

## 3. Rescue handling (REVISED — official channels are NOT a real option in VE)

Reality check: in Venezuela today the official lines (911, Protección Civil, Bomberos) are largely
non-functional or overwhelmed. "Redirect to 911" is hollow — there is nothing reliable to redirect
to. So we do **not** remove rescue; we make it **honest** and keep it **on-niche**.

**Key insight: a trapped-person situation IS a need↔offer match.** It generates a high-priority
**need** for rescue resources — brigada con experiencia, maquinaria pesada, manos — and Enlaza
already has those categories (`rescate`, `maquinaria`, `voluntarios`). The matching engine is the
right tool to connect it to people who can actually go.

### Recommended approach: rescue is a flagged NEED, inside the two-button flow
- People do **not** register a trapped/injured person. Through **NECESITO AYUDA** they request
  what's needed *at that location* (maquinaria, herramientas, brigada, manos) and tick a simple flag
  **"🆘 En este lugar hay personas atrapadas."** The flag is a marker on the request — not a separate
  entity, form, or section. Everything stays within the two main buttons.
- That high-priority need is **matched** to real offers (voluntarios, dueños de maquinaria, brigadas
  con experiencia).
- The report is **pushed into the shared pool (IA911)** so rescue-presencial teams and other apps
  see it too — more eyes, centralized data.
- **Kill the false "official dispatch" framing.** Replace `🚑 en camino` (implies an official team)
  with honest, community-updated signals: "N voluntarios/brigadas contactados", "marcado como
  atendido por quien fue al sitio". Anyone on-site can update; we never claim a team is guaranteed.
- **Radical honesty disclaimer** (CrisisCleanup is upfront that ~35% of requests never get help):
  *"Enlaza no tiene equipos de rescate. Publicar conecta tu reporte con voluntarios, brigadas y
  maquinaria disponibles, y lo comparte con la red de apps de emergencia. No garantiza respuesta."*
- Official numbers (911/166/167) stay only as a small secondary ("por si están operativos en tu
  zona"), never the headline.

What actually changes vs. today: the harm was never *hosting* rescue — it was *implying an official,
guaranteed response is coming.* We remove that implication, connect reports to real available
resources, and share them to the network. Rescue becomes the top-priority **category inside** the
matching marketplace, not a separate fake-dispatch surface.

### Coordination check (team)
Does another team own "rescate presencial" (e.g. rescate-ve from the 14-site list)? If yes → Enlaza
feeds the shared pool and links to them. If no → Enlaza owns rescue-resource matching, since it is
literally our niche. Confirm in the central board.

## 4. Target model — two doors, nothing else

The home has exactly **two buttons**: **NECESITO AYUDA** (need) and **PUEDO AYUDAR** (offer).
Everything a user can do funnels through one of these two. This *is* the product's clarity: no
third path, no separate "rescue" entrance, no confusing menu.

A **NEED** and an **OFFER** in the same category + area get connected; contact by WhatsApp.

| Side | Entry | Example |
|------|-------|---------|
| Need | NECESITO AYUDA | "Necesito una excavadora y manos en [lugar] · 🆘 hay personas atrapadas" |
| Offer | PUEDO AYUDAR | "Tengo agua para repartir en Maracay" / "Plomero disponible en La Guaira" |

Standing offers (the meeting's **"red de proveedores por zona"**: plomero, electricista, médico…)
are just offers that persist — entered through PUEDO AYUDAR with a "disponible permanente" toggle,
browsable as a directory. They are **not** a third home button.

## 5. Data model changes (all additive, backward-compatible)

Per the DB-change workflow: Supabase MCP is read-only → these are migration files the user runs in
the SQL Editor; writes go through `SECURITY DEFINER` RPCs; add per-column grants; never break
existing columns.

### 5.1 New migration `0010_marketplace.sql` (sketch)
```sql
-- Listing kind: distinguish standing provider listings from one-time posts
alter table public.posts
  add column if not exists is_provider boolean not null default false,
  add column if not exists service text,            -- oficio: plomero, electricista, medico…
  add column if not exists matched_at timestamptz,  -- light "someone is on it" signal
  add column if not exists source text,             -- 'enlaza' | 'ia911' (centralization)
  add column if not exists external_id text;        -- IA911 record id for sync/dedup

-- Generic match index (rescue-only trigram already exists; add need/offer matching support)
create index if not exists posts_match_idx
  on public.posts (type, category, city, status);

-- Extend per-column grants for the new readable columns
grant select (is_provider, service, matched_at, source, external_id)
  on public.posts to anon;
```

### 5.2 Generalize matching (new RPC) `find_matches`
Today matching is rescue-only (`find_similar_rescues`, trigram on title/address/zone for
`rescate`/`maquinaria`). Add a generic counterpart:
```sql
create or replace function public.find_matches(
  p_type text, p_category text, p_city text, p_query text default '', p_limit int default 8
) returns table(id uuid, title text, city text, zone text, contact_name text, created_at timestamptz)
language sql stable as $$
  select id, title, city, zone, contact_name, created_at
  from public.posts
  where type = case when p_type = 'need' then 'offer' else 'need' end  -- opposite side
    and category = p_category
    and city = p_city
    and status = 'active'
    and duplicate_of is null
  order by (p_query <> '' and similarity(title, p_query) > 0.1) desc, created_at desc
  limit p_limit;
$$;
grant execute on function public.find_matches to anon;
```
This is the "Fiverr match": post a need for a truck → instantly see nearby truck offers + WhatsApp.

### 5.3 Generalize corroboration
`corroborate_post` / `duplicate_of` / `corroboration_count` already exist; they're only *UI-gated*
to rescue. Reuse for "yo también necesito/ofrezco esto" across all categories (dedup + demand
signal) — no schema change, just surface it generally.

### 5.4 Status lifecycle (light, no-auth)
Keep `active`/`resolved`; add an honest intermediate via `matched_at` ("alguien está atendiendo
esto"), togglable with `manage_token`. Borrow CrisisCleanup's *claim → accountability* idea without
requiring accounts. (Do **not** revive `rescue_state` semantics in new UX.)

### 5.5 Decouple rescue (keep columns, stop using them)
Keep `trapped`, `rescue_state`, `rescued_at` for backward compatibility and history; **stop
creating new trapped posts**. Existing data handled in §8.

## 6. UX / information-architecture changes (route + component)

### Home `/` (`app/page.tsx`)
- Replace the rescue hero ("La prioridad es el rescate" / `🆘 PERSONAS ATRAPADAS`) with **exactly two
  buttons**: **NECESITO AYUDA** and **PUEDO AYUDAR**. Nothing else competes for attention.
- Button destinations:
  - **NECESITO AYUDA** → the need form (post a request); after posting, show matching offers.
  - **PUEDO AYUDAR** → the **needs list** (browse who needs help, contact por WhatsApp) + a secondary
    "Ofrecer algo" CTA to post an offer/provider.
- **Existing trapped/rescue posts live here, under PUEDO AYUDAR**, pinned to the top as a
  "🆘 Personas atrapadas (N)" group, rendered as need cards. `isUrgent` already pins them; the red
  banner already exists — minimal change.
- Optional below the buttons: a single search box *"¿Qué buscas? ej. camión, generador, plomero."*
- No separate "rescate" entrance. Keep stats minimal if kept at all.

### Board (`components/Board.tsx`)
- Keep need/offer tabs + city/category filters + search.
- Per card: **match teaser** — "3 ofertas cerca para esto" (calls `find_matches`).
- New **Directorio** tab/view for `is_provider` listings, browsable by service + zone.
- Drop `isUrgent`/trapped-banner prominence; remove the rescue-only sort coupling.

### Post detail (`app/post/[id]`, `components/PostCard.tsx`)
- Show **matches** (opposite side, same category/city) with WhatsApp buttons — the core value.
- Replace `RescueStatus` with a **generic honest status**: "¿Resuelto? / ¿Alguien lo está
  atendiendo?" via `manage_token` + the generalized corroboration.

### Composer (`components/PostForm.tsx`, `app/publicar`)
- Reached from one of the two buttons; the form already collects need/offer + category + city +
  WhatsApp.
- **Rescue is NOT a separate form.** On a **need**, a simple flag/checkbox
  **"🆘 En este lugar hay personas atrapadas"** marks the request (drives urgency + visibility). The
  user requests what's needed at that location (maquinaria, herramientas, brigada, manos) — never
  registers a person. (`trapped` column already exists.)
- Standing offers (provider) are entered under PUEDO AYUDAR via a "disponible permanente" toggle —
  not a separate path. Optional `service`/oficio field for trades.
- Keep dedup/match warning (now `find_matches`-powered, all categories).

### Rescue routes — folded into the two-button flow
- **Remove the separate `/reportar` panic form.** Rescue requests are normal **needs** with the
  "🆘 personas atrapadas" flag. (`/reportar` can deep-link to the need form with the flag pre-checked,
  so old links/QRs still work.)
- `/rescate` → optional **filtered view** of needs flagged "atrapados" (most urgent first), reached
  from the board filters — not a separate product surface.
- `/rescatados` → keep as the read-only "ya encontrado / atendido" registry.

### New routes
- `/directorio` (or `/proveedores`) — the standing provider directory by zone + service.

### Copy (`Spanish, hardcoded — no i18n framework`)
- Strip rescue-centric ALL-CAPS framing; reframe to matching.
- Add honesty/expectation copy on home, composer, `/aviso-legal`, footer.

## 7. Honesty & safety

- **Disclaimers** (CrisisCleanup-style, explicit): Enlaza is a contact directory; we don't verify
  every post; we don't have or coordinate rescue teams. Place on composer, post detail, footer,
  `/aviso-legal` (route exists).
- **No implied dispatch** anywhere in the new UX.
- No "verified" badge / verification feature (dropped — not needed).

## 8. Existing-data migration (SQL to hand off)

- **Trapped / rescue posts:** KEEP them visible (people rely on them) — do not archive. Only fix the
  framing/status in the UI and backfill `source='enlaza'` for the IA911 push.
- **Mislabeled resource offers in `rescate`** (e.g., "ofrezco excavadora"): reclassify
  `category='maquinaria'`, `trapped=false`.
- **Resource need/offer posts:** keep — they seed the marketplace.

## 9. IA911 / centralization alignment (parallel track, BLOCKED on the API doc)

Per the meeting: IA911 is the single source of truth; reinsert all new data; no parallel DB.

- Enlaza posts (need/offer/provider) **sync into IA911**; Supabase becomes a cache/read-model.
- **Open gap to raise with the team:** does IA911 model the **offer/provider** side, or only
  needs/desaparecidos? Enlaza's entire niche needs the offer side in the common schema.
- Trapped reports are stored as high-priority Enlaza needs **and** pushed into the IA911 pool so
  rescue-presencial teams and other apps see them too.
- OCR via the IA911 API for submitted photos.
- `source` / `external_id` columns (§5.1) carry the mapping; dedup deferred per meeting.

## 10. Phased rollout

- **Phase 0 — Two doors + honest reframe (ship now, no DB change, pure frontend/copy):**
  Home = **NECESITO AYUDA / PUEDO AYUDAR** only; fold rescue into a flagged need (drop the panic
  form as a separate path, add the "🆘 personas atrapadas" checkbox to the need form); replace
  `🚑 en camino` with honest no-guarantee status + disclaimer. Stops the false-hope harm and
  clarifies the product immediately.
- **Phase 1 — Marketplace core (additive migration `0010`):**
  `find_matches` RPC + match surfacing on board & detail; category cleanup; generic corroboration;
  light status (`matched_at`); remove rescue coupling from sort.
- **Phase 2 — Provider directory:**
  `is_provider` listings + `/directorio`; oficios/`service`; apadrinamiento stub.
- **Phase 3 — IA911 integration:** consume + reinsert; Supabase as cache; OCR via API; dedup.

Each phase implementation must first read the relevant guide in `node_modules/next/dist/docs/`
(Next.js 16.2.9, App Router — per AGENTS.md, conventions differ from training data).

### Implementation status (2026-06-28)

- **Phase 0 — ✅ DONE & build-verified.** Home rebuilt to two buttons (NECESITO AYUDA / PUEDO
  AYUDAR); rescue dispatch framing removed (`RescueStatus` no longer shows "🚑 en camino" / sets
  rescatados — just an honest "resuelto / ya no aplica" + disclaimer); card banner softened to
  "🆘 Hay personas atrapadas en este lugar"; `/reportar`, `/rescate`, forms, footer, and stray copy
  reframed honestly ("Enlaza no envía equipos de rescate"); the bogus 171/"rescatistas" dispatch
  language removed from the flow.
- **Phase 1 — ✅ DONE & build-verified.** `findMatches()` (lib/db.ts) + match surfacing on
  `/post/[id]` ("Ofertas que pueden ayudarte" / "Quién necesita lo que ofreces"). Works with NO DB
  change (direct query on existing columns; also works in demo mode). Migration `0010_marketplace.sql`
  written — adds a perf index + a standard `find_matches` RPC; **optional to apply now.**
- **Phase 2 — ✅ DONE (MVP) & build-verified.** `/directorio` lists offers grouped by category (the
  provider directory), linked from header + footer. No DB change. The persistent-`is_provider` /
  `service` (oficio) enrichment lives in migration `0010` and is deferred until applied.
- **Phase 3 — ⛔ BLOCKED on the IA911 API doc.** Groundwork only: `source` / `external_id` columns
  are in migration `0010` for the future sync. Consume + reinsert + OCR cannot be built until the
  IA911 spec arrives.

**To apply the DB groundwork (optional now; needed for Phase 2 enrichment + Phase 3):** run
`supabase/migrations/0010_marketplace.sql` in the Supabase SQL Editor (MCP can't write to this
project's org). The app already builds and runs correctly without it.

## 11. Open decisions

1. **Rescue ownership:** does another team own "rescate presencial"? → Enlaza feeds the pool + links
   to them, or Enlaza owns rescue-resource matching itself (it's on-niche either way).
2. **`/rescatados` registry:** keep read-only as history, or remove from nav entirely?
3. **Auth/trust:** stay anonymous + `manage_token` + volunteer verification (recommended now), or
   introduce lightweight accounts for trust later?
4. **Start Phase 0 immediately?** (It's the safety fix and needs no backend.)
