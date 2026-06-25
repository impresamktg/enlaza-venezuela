-- AyudaVenezuela — esquema de base de datos (Supabase / Postgres)
-- Ejecuta esto en el SQL Editor de tu proyecto Supabase.

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
  created_at    timestamptz not null default now()
);

create index if not exists posts_type_idx       on public.posts (type);
create index if not exists posts_city_idx       on public.posts (city);
create index if not exists posts_category_idx   on public.posts (category);
create index if not exists posts_created_at_idx on public.posts (created_at desc);

-- Row Level Security: tablón comunitario abierto (sin login).
alter table public.posts enable row level security;

-- Cualquiera puede leer publicaciones activas.
drop policy if exists "public read" on public.posts;
create policy "public read"
  on public.posts for select
  using (true);

-- Cualquiera puede publicar. (MVP de emergencia: prioriza el acceso.
-- Para reducir abuso más adelante: rate limiting, captcha o moderación.)
drop policy if exists "public insert" on public.posts;
create policy "public insert"
  on public.posts for insert
  with check (
    type in ('need', 'offer')
    and char_length(title) between 5 and 120
    and char_length(contact_name) between 2 and 60
    and char_length(contact_phone) between 7 and 25
    and status = 'active'
  );
