-- 0009_post_photos.sql — up to 2 photos per post.
-- Apply by pasting into the Supabase SQL Editor. Idempotent.

-- 1. Column: array of public Storage URLs (max 2 enforced in create_post + client) --
alter table posts add column if not exists photos text[] not null default '{}';

grant select (
  id, type, category, title, description, city, zone, contact_name, contact_phone,
  people_count, lat, lng, status, created_at, address, trapped, rescue_state, rescued_at,
  duplicate_of, corroboration_count, photos
) on posts to anon;

-- 2. create_post gains p_photos (default keeps old calls valid). Drop the prior
--    13-arg signature so a no-photos call can't match two overloads ambiguously. ---
drop function if exists public.create_post(
  text, text, text, text, text, text, text, text, int,
  double precision, double precision, text, boolean);

create or replace function public.create_post(
  p_type text, p_category text, p_title text, p_description text,
  p_city text, p_zone text, p_contact_name text, p_contact_phone text,
  p_people_count int,
  p_lat double precision default null, p_lng double precision default null,
  p_address text default null, p_trapped boolean default false,
  p_photos text[] default '{}'
) returns table (id uuid, manage_token uuid)
language plpgsql security definer set search_path = public as $$
begin
  return query
  insert into public.posts (
    type, category, title, description, city, zone,
    contact_name, contact_phone, people_count, lat, lng, address, trapped, photos
  ) values (
    p_type, p_category, p_title, nullif(p_description, ''), p_city,
    nullif(p_zone, ''), p_contact_name, p_contact_phone, p_people_count,
    p_lat, p_lng, nullif(p_address, ''), coalesce(p_trapped, false),
    (coalesce(p_photos, '{}'))[1:2]
  )
  returning posts.id, posts.manage_token;
end; $$;
grant execute on function public.create_post(
  text, text, text, text, text, text, text, text, int,
  double precision, double precision, text, boolean, text[]) to anon, authenticated;

-- 3. Storage bucket for post photos: public read, anon upload, image-only, 5 MB cap --
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-photos', 'post-photos', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "anon upload post-photos" on storage.objects;
create policy "anon upload post-photos" on storage.objects
  for insert to anon with check (bucket_id = 'post-photos');

drop policy if exists "public read post-photos" on storage.objects;
create policy "public read post-photos" on storage.objects
  for select to anon using (bucket_id = 'post-photos');
