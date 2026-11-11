-- =========================================================
-- Worldy · Actualización 2: tarjetas, fondo común y señas
-- Pegar en: Supabase → SQL Editor → New query → Run
-- Se puede correr más de una vez sin problema.
-- =========================================================

-- Tarjetas: personales (de cada uno) o grupales (del viaje, ej. fondo común)
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'personal' check (kind in ('personal', 'group')),
  created_at timestamptz not null default now(),
  check ((kind = 'group') = (trip_id is not null))
);

-- Aportes al fondo común
create table if not exists public.fund_deposits (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'USD',
  amount_usd numeric(14,2) not null check (amount_usd > 0),
  deposited_on date not null default current_date,
  note text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Gastos: pago con fondo, tarjeta usada, señas (pagos parciales), a quién y hasta cuándo
alter table public.expenses add column if not exists paid_from_fund boolean not null default false;
alter table public.expenses add column if not exists card_id uuid references public.cards(id) on delete set null;
alter table public.expenses add column if not exists payments jsonb;
alter table public.expenses add column if not exists payee text;
alter table public.expenses add column if not exists due_date date;

create index if not exists cards_trip_idx on public.cards(trip_id);
create index if not exists deposits_trip_idx on public.fund_deposits(trip_id);

alter table public.cards enable row level security;
alter table public.fund_deposits enable row level security;

drop policy if exists "ver tarjetas" on public.cards;
create policy "ver tarjetas" on public.cards for select
  using (owner_id = auth.uid() or (trip_id is not null and public.is_member(trip_id)));
drop policy if exists "crear tarjeta" on public.cards;
create policy "crear tarjeta" on public.cards for insert
  with check (owner_id = auth.uid() and (trip_id is null or public.is_member(trip_id)));
drop policy if exists "editar tarjeta" on public.cards;
create policy "editar tarjeta" on public.cards for update
  using (owner_id = auth.uid());
drop policy if exists "borrar tarjeta" on public.cards;
create policy "borrar tarjeta" on public.cards for delete
  using (owner_id = auth.uid());

drop policy if exists "ver aportes" on public.fund_deposits;
create policy "ver aportes" on public.fund_deposits for select
  using (public.is_member(trip_id));
drop policy if exists "registrar aporte" on public.fund_deposits;
create policy "registrar aporte" on public.fund_deposits for insert
  with check (created_by = auth.uid() and public.is_member(trip_id));
drop policy if exists "borrar aporte" on public.fund_deposits;
create policy "borrar aporte" on public.fund_deposits for delete
  using (created_by = auth.uid());
