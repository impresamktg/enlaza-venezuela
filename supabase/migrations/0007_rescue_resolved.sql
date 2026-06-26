-- 0007_rescue_resolved.sql — Distingue "rescatados" (personas rescatadas) de
-- "resuelto" (solicitud atendida, sin rescate de personas). Solo "rescatados"
-- cuenta en el registro. Ejecuta TODO este bloque en el SQL Editor de Supabase.
-- Es retrocompatible: los estados existentes siguen siendo válidos.

-- 1) Permitir el nuevo estado terminal 'resuelto' en el CHECK.
alter table public.posts drop constraint if exists posts_rescue_state_chk;
alter table public.posts add constraint posts_rescue_state_chk
  check (rescue_state is null or rescue_state in ('en_camino', 'rescatados', 'resuelto'));

-- 2) set_rescue_state acepta 'resuelto'. Solo 'rescatados' sella rescued_at.
create or replace function public.set_rescue_state(p_id uuid, p_state text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_state is not null and p_state not in ('en_camino', 'rescatados', 'resuelto') then
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
