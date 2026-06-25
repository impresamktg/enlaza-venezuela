-- AyudaVenezuela — esquema completo de base de datos (Supabase / Postgres)
-- Para una instalación nueva, ejecuta TODO esto en el SQL Editor.
-- (Si ya creaste la tabla antes, aplica supabase/migrations/0002_post_management.sql.)

create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('need', 'offer')),
  category      text not null,
  title         text not null,
  description   text,
  city          text not null,
  zone          text,
  contact_name  text not null,
  contact_phone text not null,
  people_count  int,
  status        text not null default 'active' check (status in ('active', 'resolved')),
  created_at    timestamptz not null default now(),
  -- Token secreto para que el autor gestione (resuelva/elimine) su publicación.
  manage_token  uuid not null default gen_random_uuid()
);

create index if not exists posts_type_idx       on public.posts (type);
create index if not exists posts_city_idx       on public.posts (city);
create index if not exists posts_category_idx   on public.posts (category);
create index if not exists posts_created_at_idx on public.posts (created_at desc);

-- Row Level Security: tablón comunitario abierto (sin login).
alter table public.posts enable row level security;

-- Lectura pública de publicaciones.
drop policy if exists "public read" on public.posts;
create policy "public read" on public.posts for select using (true);

-- Inserción pública (respaldo; la app usa la función create_post).
drop policy if exists "public insert" on public.posts;
create policy "public insert" on public.posts for insert with check (
  type in ('need', 'offer') and status = 'active'
  and char_length(title) between 5 and 120
);

-- El token NUNCA se expone por la API pública: se otorga SELECT por columna
-- (todas excepto manage_token).
revoke select on public.posts from anon, authenticated;
grant select (
  id, type, category, title, description, city, zone,
  contact_name, contact_phone, people_count, status, created_at
) on public.posts to anon, authenticated;

-- Crear publicación (devuelve el token solo al autor).
create or replace function public.create_post(
  p_type text, p_category text, p_title text, p_description text,
  p_city text, p_zone text, p_contact_name text, p_contact_phone text,
  p_people_count int
) returns table (id uuid, manage_token uuid)
language plpgsql security definer set search_path = public as $$
begin
  return query
  insert into public.posts (
    type, category, title, description, city, zone,
    contact_name, contact_phone, people_count
  ) values (
    p_type, p_category, p_title, nullif(p_description, ''), p_city,
    nullif(p_zone, ''), p_contact_name, p_contact_phone, p_people_count
  )
  returning posts.id, posts.manage_token;
end; $$;

-- Resolver / eliminar, validando el token secreto.
create or replace function public.resolve_post(p_id uuid, p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.posts set status = 'resolved'
   where id = p_id and manage_token = p_token and status = 'active';
  get diagnostics n = row_count;
  return n > 0;
end; $$;

create or replace function public.delete_post(p_id uuid, p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from public.posts where id = p_id and manage_token = p_token;
  get diagnostics n = row_count;
  return n > 0;
end; $$;

grant execute on function public.create_post(text,text,text,text,text,text,text,text,int) to anon, authenticated;
grant execute on function public.resolve_post(uuid, uuid) to anon, authenticated;
grant execute on function public.delete_post(uuid, uuid) to anon, authenticated;
