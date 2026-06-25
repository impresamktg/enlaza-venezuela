-- 0002_post_management.sql
-- Adds the ability to mark a post as resolved or delete it, without login.
-- Security model: each post gets a secret `manage_token`. It is generated
-- server-side, returned ONLY to the creator, never exposed in public reads,
-- and required to resolve/delete. Run this once in the Supabase SQL editor.

-- 1. Secret management token per post.
alter table public.posts
  add column if not exists manage_token uuid not null default gen_random_uuid();

-- 2. Never expose manage_token via the public API.
--    Replace the table-wide SELECT grant with explicit per-column grants
--    (every column EXCEPT manage_token).
revoke select on public.posts from anon, authenticated;
grant select (
  id, type, category, title, description, city, zone,
  contact_name, contact_phone, people_count, status, created_at
) on public.posts to anon, authenticated;

-- 3. Create posts via an RPC (security definer) so the token is generated
--    server-side and returned only to the creator of that post.
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

-- 4. Resolve / delete, gated by the secret token. Return true if a row matched.
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

-- 5. Allow the public (anon) key to call these functions.
grant execute on function public.create_post(text,text,text,text,text,text,text,text,int) to anon, authenticated;
grant execute on function public.resolve_post(uuid, uuid) to anon, authenticated;
grant execute on function public.delete_post(uuid, uuid) to anon, authenticated;
