-- 0004_realtime.sql
-- Habilita Supabase Realtime para la tabla posts, así el tablón se actualiza
-- al instante (sin esperar el sondeo de 30 s). Run once in the SQL editor.
-- (Si ya está añadida, este comando da error inofensivo "already member".)

alter publication supabase_realtime add table public.posts;
