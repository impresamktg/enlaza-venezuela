-- 0008_dedup.sql — dedup of rescue posts: canonical pointer + fuzzy matching engine.
-- Apply by pasting into the Supabase SQL Editor (MCP can't reach this project).
-- Idempotent: safe to re-run.

-- pg_trgm/gin_trgm_ops live in the "extensions" schema on Supabase; keep it on the
-- path for index creation and the similarity functions below.
set search_path = public, extensions;

create extension if not exists pg_trgm;

-- 1. Columns ----------------------------------------------------------------
alter table posts add column if not exists duplicate_of uuid references posts(id) on delete set null;
alter table posts add column if not exists corroboration_count int not null default 0;
create index if not exists posts_duplicate_of_idx on posts(duplicate_of);

-- 2. Per-column SELECT grant (must list every column lib/db.ts reads) --------
grant select (
  id, type, category, title, description, city, zone, contact_name, contact_phone,
  people_count, lat, lng, status, created_at, address, trapped, rescue_state, rescued_at,
  duplicate_of, corroboration_count
) on posts to anon;

-- 3. Normalized building key: lower, strip accents (translate, no extension),
--    drop generic words, keep the building name. Immutable -> index-safe. ----
create or replace function rescue_match_key(p_title text, p_address text, p_zone text)
returns text language sql immutable as $$
  with cleaned as (
    select regexp_replace(
      translate(
        lower(coalesce(p_title,'') || ' ' || coalesce(p_address,'') || ' ' || coalesce(p_zone,'')),
        'áéíóúüñàèìòùâêîôûäëïöç',
        'aeiouunaeiouaeiouaeioc'),
      '[^a-z0-9 ]', ' ', 'g') as t
  ),
  tokens as (
    select unnest(regexp_split_to_array(t, '\s+')) as tok from cleaned
  )
  select coalesce(string_agg(tok, ' '), '')
  from tokens
  where length(tok) > 3
    and tok not in (
      'edificio','edif','residencia','residencias','resid','torre','torres',
      'calle','avenida','bloque','sector','urbanizacion','conjunto','piso','apto',
      'apartamento','casa','quinta','frente','detras','lado','entre','numero')
$$;

-- 4. Trigram index for the live similarity query (partial: active rescue canonicals) --
create index if not exists posts_rescue_key_trgm_idx
on posts using gin (rescue_match_key(title, address, zone) gin_trgm_ops)
where category in ('rescate','maquinaria') and duplicate_of is null and status = 'active';

-- 5. Submit-time similarity RPC (anon-callable) -----------------------------
create or replace function find_similar_rescues(p_city text, p_query text, p_limit int default 5)
returns table(id uuid, title text, address text, zone text, corroboration_count int, sim real)
language sql stable security definer set search_path = public, extensions as $$
  select p.id, p.title, p.address, p.zone, p.corroboration_count,
         similarity(rescue_match_key(p.title, p.address, p.zone),
                    rescue_match_key(p_query, '', '')) as sim
  from posts p
  where p.city = p_city
    and p.category in ('rescate','maquinaria')
    and p.duplicate_of is null
    and p.status = 'active'
    and rescue_match_key(p.title, p.address, p.zone) % rescue_match_key(p_query, '', '')
  order by sim desc
  limit greatest(1, least(p_limit, 10));
$$;
grant execute on function find_similar_rescues(text, text, int) to anon;

-- 6. Corroborate RPC: insert a hidden child capturing the new reporter, bump count --
create or replace function corroborate_post(
  p_canonical uuid, p_contact_name text, p_contact_phone text, p_note text default '')
returns boolean language plpgsql security definer set search_path = public as $$
declare canon posts;
begin
  select * into canon from posts where id = p_canonical and duplicate_of is null;
  if not found then return false; end if;
  if canon.category not in ('rescate','maquinaria') then return false; end if;
  if length(coalesce(trim(p_contact_name), '')) < 2 then return false; end if;
  if length(coalesce(trim(p_contact_phone), '')) < 7 then return false; end if;

  insert into posts(
    type, category, title, description, city, zone, contact_name, contact_phone,
    people_count, lat, lng, status, address, trapped, rescue_state, rescued_at,
    duplicate_of, corroboration_count)
  values (
    canon.type, canon.category, 'Corroboración: ' || left(canon.title, 100),
    nullif(left(p_note, 1000), ''), canon.city, canon.zone,
    trim(p_contact_name), trim(p_contact_phone),
    null, null, null, 'active', canon.address, canon.trapped, null, null,
    p_canonical, 0);

  update posts set corroboration_count = corroboration_count + 1 where id = p_canonical;
  return true;
end;
$$;
grant execute on function corroborate_post(uuid, text, text, text) to anon;
