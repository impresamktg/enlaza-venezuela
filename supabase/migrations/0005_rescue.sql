-- 0005_rescue.sql — Rescate: dirección exacta, "personas atrapadas" y estado en vivo.
-- Ejecuta TODO este bloque en el SQL Editor de Supabase.

-- 1) Columnas nuevas (compatibles con filas existentes).
alter table public.posts
  add column if not exists address      text,
  add column if not exists trapped      boolean not null default false,
  add column if not exists rescue_state text;

-- rescue_state: null (reportado) | 'en_camino' | 'rescatados'
alter table public.posts drop constraint if exists posts_rescue_state_chk;
alter table public.posts add constraint posts_rescue_state_chk
  check (rescue_state is null or rescue_state in ('en_camino', 'rescatados'));

-- 2) Exponer las columnas nuevas a la API pública (solo lectura).
grant select (address, trapped, rescue_state) on public.posts to anon, authenticated;

-- 3) create_post: ahora acepta dirección exacta y bandera de personas atrapadas.
drop function if exists public.create_post(
  text, text, text, text, text, text, text, text, int, double precision, double precision
);
create or replace function public.create_post(
  p_type text, p_category text, p_title text, p_description text,
  p_city text, p_zone text, p_contact_name text, p_contact_phone text,
  p_people_count int,
  p_lat double precision default null, p_lng double precision default null,
  p_address text default null, p_trapped boolean default false
) returns table (id uuid, manage_token uuid)
language plpgsql security definer set search_path = public as $$
begin
  return query
  insert into public.posts (
    type, category, title, description, city, zone,
    contact_name, contact_phone, people_count, lat, lng, address, trapped
  ) values (
    p_type, p_category, p_title, nullif(p_description, ''), p_city,
    nullif(p_zone, ''), p_contact_name, p_contact_phone, p_people_count,
    p_lat, p_lng, nullif(p_address, ''), coalesce(p_trapped, false)
  )
  returning posts.id, posts.manage_token;
end; $$;
grant execute on function public.create_post(
  text, text, text, text, text, text, text, text, int, double precision, double precision, text, boolean
) to anon, authenticated;

-- 4) Estado de rescate en vivo: cualquiera puede actualizarlo (sin token).
--    Solo anota el progreso; no borra ni oculta la publicación.
create or replace function public.set_rescue_state(p_id uuid, p_state text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_state is not null and p_state not in ('en_camino', 'rescatados') then
    return false;
  end if;
  update public.posts set rescue_state = p_state
   where id = p_id and status = 'active';
  get diagnostics n = row_count;
  return n > 0;
end; $$;
grant execute on function public.set_rescue_state(uuid, text) to anon, authenticated;
