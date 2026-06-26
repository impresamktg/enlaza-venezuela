-- 0006_rescued_at.sql — Marca de tiempo de cuándo se reportó "rescatados".
-- Ejecuta TODO este bloque en el SQL Editor de Supabase.

-- 1) Columna con el momento del rescate.
alter table public.posts add column if not exists rescued_at timestamptz;
grant select (rescued_at) on public.posts to anon, authenticated;

-- 2) set_rescue_state ahora sella rescued_at al marcar rescatados (y lo limpia al revertir).
create or replace function public.set_rescue_state(p_id uuid, p_state text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_state is not null and p_state not in ('en_camino', 'rescatados') then
    return false;
  end if;
  update public.posts
     set rescue_state = p_state,
         rescued_at = case when p_state = 'rescatados' then now() else null end
   where id = p_id and status = 'active';
  get diagnostics n = row_count;
  return n > 0;
end; $$;
grant execute on function public.set_rescue_state(uuid, text) to anon, authenticated;

-- 3) Rellenar los ya marcados como rescatados que aún no tienen fecha.
update public.posts
   set rescued_at = now()
 where rescue_state = 'rescatados' and rescued_at is null;
