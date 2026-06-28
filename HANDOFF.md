# Enlaza Venezuela — Session Handoff

> Paste this into a fresh Claude Code session to continue. Last updated: 2026-06-27.

You're continuing work on **Enlaza Venezuela** (a.k.a. AyudaVenezuela), a community
earthquake-relief board connecting people who need help with people who offer it,
via WhatsApp. Live: https://www.enlazavenezuela.com

## Stack & conventions
- Next.js 16.2.9 (App Router, RSC), React 19.2.4, Tailwind v4, TypeScript, Supabase, Leaflet.
- AGENTS.md warns "this is NOT the Next.js you know" — READ `node_modules/next/dist/docs/`
  before writing Next-specific code.
- Design tokens live in `app/globals.css` `@theme`. Emoji are the icon system. Flat
  surfaces (no gradients/photos). Flag tricolor only as a 4px stripe. Spanish (es-VE, "tú"),
  sentence case; ALL-CAPS only for "🆘 PERSONAS ATRAPADAS".
- 3-level emphasis system: N1 critical = need-strong `#be123c` (trapped/rescue, only element
  allowed motion: the pulse dot), N2 = solid need `#e11d48` / offer `#059669` / WhatsApp green,
  N3 = outline/ghost/muted. need/offer never swap meaning; WhatsApp green only on the contact button.
- Repo: github.com/impresamktg/enlaza-venezuela, branch `main`. Deploy: `vercel --prod --yes`
  (CLI authed as impresamktg; Vercel project "enlaza-venezuela"). Public domain enlazavenezuela.com.
  *.vercel.app slugs regenerate to enlaza-venezuela-* on the next deploy. Prebuild stamps the SW version.

## Data model (posts table)
- `status`: 'active' | 'resolved' (author closes via manage-token RPC `resolve_post`).
- `rescue_state`: null | 'en_camino' | 'rescatados' | 'resuelto'. Terminal = rescatados/resuelto
  (helper `isRescueClosed` in `lib/types.ts`). ONLY 'rescatados' counts in the registry + stamps
  `rescued_at`. 'resuelto' = request fulfilled, no person rescued.
- `trapped`: boolean → red "PERSONAS ATRAPADAS" banner + triage priority.
- `listPosts()` returns `status='active'` only; `listRescued()` returns `rescue_state='rescatados'`
  regardless of status (permanent registry). `isUrgent` (`lib/board-page.ts`) = trapped OR
  category rescate/maquinaria.

## What shipped (all live on `main`)
1. **Redesign v2** (commit `355a047`): need-strong token + reduced-motion `.pulse-dot`; `/reportar`
   panic form (one-tap count, supplemental GPS, details in `<details>`, 56px submit);
   PostCard vertical color rail + full-width ATRAPADAS banner + address hero block + one
   dominant WhatsApp; home hero now 2-column desktop (text+stats left, N1 rescue block right);
   Board switched from pagination to inline "Ver más" load-more (9 at a time, urgent-first) +
   "Ver rescatados" link; PostCard `compact` variant for `/rescate`.
2. **Service-worker cache fix** (in `355a047`): `scripts/stamp-sw.mjs` stamps a unique VERSION each
   build (via `prebuild`); `next.config.ts` serves `/sw.js` no-cache; `ServiceWorkerRegister` uses
   `updateViaCache:'none'`, reload-on-update, and is DISABLED in dev; `public/sw.js` self-destructs
   on localhost, cache-first for hashed `/_next/static`.
3. **Rescued registry split** (commit `01cecf2`): `listRescued()` status-independent; `RescueStatus`
   now offers two closes — ✅ Rescatados (people → counts) vs ✓ Resuelto (request done → doesn't
   count); migration `supabase/migrations/0007_rescue_resolved.sql` (APPLIED) widened the CHECK
   constraint + `set_rescue_state` RPC to allow 'resuelto'.
4. **Data cleanup** (ad-hoc SQL, APPLIED): set `trapped=true` on 34 posts that had explicit
   trapped/buried-people language but `trapped=false` (they'd been posted via `/publicar`, which
   couldn't set the flag). Reusable keyword UPDATE — re-run periodically to catch stragglers.
5. **/publicar checkbox** (commit `3164888`): "🆘 Hay personas atrapadas" toggle that appears only
   for need + rescate/maquinaria categories and submits `trapped=on`, category-gated so it never
   leaks onto non-rescue posts. Closes the mis-tagging at the source.

## Operational facts / gotchas
- The app's Supabase project (ref `lrdkhesudjpbczdxnawh`) is NOT in the org connected to the
  Supabase MCP — MCP can't touch it. INSPECT live data via REST + the anon key in `.env.local`
  (e.g. `curl "$URL/rest/v1/posts?..."`). RLS on posts is permissive (`using(true)`): anon reads
  ALL rows regardless of status; access is gated by per-column SELECT grants, not row filtering.
- DB WRITES: hand the user SQL to paste into the Supabase SQL Editor. App writes go through
  security-definer RPCs (`create_post`, `resolve_post`, `delete_post`, `set_rescue_state`).
  Migrations in `supabase/migrations/` (latest 0007). Any new column needs adding to the
  `grant select(...)` list or the API silently can't read it.
- Pre-existing lint error at `components/Board.tsx` (the getTokens `useEffect`, set-state-in-effect)
  — predates this work, intentionally left alone. `npm run lint` is red only because of it.
- When running bash, use absolute paths / `cd /Users/davidsemprun/Dev/ayuda-venezuela` first —
  the sandbox cwd can drift and break relative paths.
- Verify changes in-browser via the running dev server (SW is off in dev, so edits hot-reload
  cleanly). `npm run build` runs tsc + the SW stamp.

## Known data-quality note
Categories and the `trapped` flag are inconsistent in real data (people mis-categorize on
`/publicar`). The checkbox fixes new posts; the keyword cleanup SQL fixes existing ones.

## Possible next enhancements (open — user will direct)
- `/rescate` currently polls every 30s and has NO Supabase realtime (only the home Board does).
- A scheduled job to re-run the trapped keyword cleanup.
- Inverse cleanup: posts wrongly flagged `trapped=true` that aren't about people.
- More screens from the original Claude Design handoff (scope doc:
  `docs/superpowers/plans/2026-06-26-enlaza-redesign-scope.md`, untracked).

Confirm you can build (`npm run build`) and reach the dev server before starting. Ask me what
enhancement to tackle first.
