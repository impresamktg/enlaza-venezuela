-- 0010_marketplace.sql
-- Reorientación a marketplace de necesidades ↔ ofertas (plan 2026-06-28).
-- ADITIVA y compatible: no rompe columnas ni RPC existentes. Segura de re-ejecutar.
--
-- Nota: el emparejamiento necesidad↔oferta del frontend funciona SIN esta
-- migración (es una consulta directa sobre columnas existentes). Esto añade un
-- índice para acelerarlo, columnas para el directorio de proveedores (fase 2) y
-- la sincronización con IA911 (fase 3), y una RPC estándar de emparejamiento.

-- 1) Columnas nuevas (todas opcionales / con default; lectura pública por-columna).
alter table public.posts
  add column if not exists is_provider boolean not null default false, -- oferta permanente (directorio de proveedores)
  add column if not exists service     text,                            -- oficio: plomero, electricista, medico…
  add column if not exists matched_at  timestamptz,                     -- "alguien está atendiendo esto" (opcional)
  add column if not exists source      text not null default 'enlaza',  -- origen del dato: 'enlaza' | 'ia911'
  add column if not exists external_id text;                            -- id del registro en IA911 (sync / dedup)

grant select (is_provider, service, matched_at, source, external_id)
  on public.posts to anon;

-- 2) Índice de emparejamiento por tipo + categoría + ciudad (solo activos).
create index if not exists posts_match_idx
  on public.posts (type, category, city)
  where status = 'active' and duplicate_of is null;

-- 3) Emparejamiento genérico: dado un post, trae el lado opuesto (need↔offer) en
--    la misma categoría y ciudad. Activos, no duplicados, excluyendo el propio.
create or replace function public.find_matches(
  p_type     text,
  p_category text,
  p_city     text,
  p_exclude  uuid default null,
  p_limit    int  default 8
) returns table (
  id            uuid,
  type          text,
  category      text,
  title         text,
  city          text,
  zone          text,
  contact_name  text,
  contact_phone text,
  created_at    timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select id, type, category, title, city, zone, contact_name, contact_phone, created_at
  from public.posts
  where type = case when p_type = 'need' then 'offer' else 'need' end
    and category = p_category
    and city = p_city
    and status = 'active'
    and duplicate_of is null
    and (p_exclude is null or id <> p_exclude)
  order by created_at desc
  limit greatest(1, least(p_limit, 20));
$$;

grant execute on function public.find_matches(text, text, text, uuid, int) to anon;
