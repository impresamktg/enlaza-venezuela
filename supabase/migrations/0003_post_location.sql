-- 0003_post_location.sql
-- Optional approximate coordinates per post for finer proximity sorting.
-- The app coarsens the captured GPS to ~110 m before storing (block level),
-- and capture is opt-in. Run once in the Supabase SQL editor.

alter table public.posts add column if not exists lat double precision;
alter table public.posts add column if not exists lng double precision;

-- Expose lat/lng in public reads (needed so the board can compute distance).
revoke select on public.posts from anon, authenticated;
grant select (
  id, type, category, title, description, city, zone,
  contact_name, contact_phone, people_count, status, created_at, lat, lng
) on public.posts to anon, authenticated;

-- Recreate create_post with optional lat/lng (defaults keep old 9-arg calls working).
drop function if exists public.create_post(text,text,text,text,text,text,text,text,int);
create or replace function public.create_post(
  p_type text, p_category text, p_title text, p_description text,
  p_city text, p_zone text, p_contact_name text, p_contact_phone text,
  p_people_count int,
  p_lat double precision default null, p_lng double precision default null
) returns table (id uuid, manage_token uuid)
language plpgsql security definer set search_path = public as $$
begin
  return query
  insert into public.posts (
    type, category, title, description, city, zone,
    contact_name, contact_phone, people_count, lat, lng
  ) values (
    p_type, p_category, p_title, nullif(p_description, ''), p_city,
    nullif(p_zone, ''), p_contact_name, p_contact_phone, p_people_count,
    p_lat, p_lng
  )
  returning posts.id, posts.manage_token;
end; $$;

grant execute on function public.create_post(text,text,text,text,text,text,text,text,int,double precision,double precision) to anon, authenticated;
