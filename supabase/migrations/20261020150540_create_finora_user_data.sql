create table if not exists public.finora_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  finance_state jsonb not null default '{"version":1,"accounts":[],"transactions":[],"budgets":[],"savingsGoals":[],"savingsActivities":[],"bills":[],"recurringTransactions":[]}'::jsonb,
  preferences jsonb not null default '{"version":1,"displayName":"","defaultTransactionType":"expense","defaultAccountId":""}'::jsonb,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_state_is_object check (jsonb_typeof(finance_state) = 'object'),
  constraint preferences_is_object check (jsonb_typeof(preferences) = 'object')
);

comment on table public.finora_user_data is 'One private Finora application-state document per authenticated user.';

alter table public.finora_user_data enable row level security;
alter table public.finora_user_data force row level security;

revoke all on table public.finora_user_data from anon;
grant select, insert, update, delete on table public.finora_user_data to authenticated;

create policy "Users can read their own Finora data"
on public.finora_user_data for select to authenticated
using ((select auth.uid()) = user_id and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

create policy "Users can create their own Finora data"
on public.finora_user_data for insert to authenticated
with check ((select auth.uid()) = user_id and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

create policy "Users can update their own Finora data"
on public.finora_user_data for update to authenticated
using ((select auth.uid()) = user_id and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
with check ((select auth.uid()) = user_id and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

create policy "Users can delete their own Finora data"
on public.finora_user_data for delete to authenticated
using ((select auth.uid()) = user_id and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

