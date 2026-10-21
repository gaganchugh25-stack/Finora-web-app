revoke all on table public.finora_user_data from public, anon, authenticated;
grant select, insert, update, delete on table public.finora_user_data to authenticated;
