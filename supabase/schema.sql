-- =========================================================
-- Worldy · Esquema de base de datos para Supabase
-- Pegar completo en: Supabase → SQL Editor → New query → Run
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- Perfiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  avatar_url text,
  equiv_currency text not null default 'UYU',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Viajes ----------
create or replace function public.random_code()
returns text language sql as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1), '')
  from generate_series(1, 6);
$$;

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  origin_city text not null default '',
  invite_code text not null unique default public.random_code(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create or replace function public.is_member(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trip_members where trip_id = t and user_id = auth.uid());
$$;

create or replace function public.shares_trip(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.trip_members a
    join public.trip_members b on a.trip_id = b.trip_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

create or replace function public.handle_new_trip()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.trip_members (trip_id, user_id, role) values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_trip_created on public.trips;
create trigger on_trip_created
  after insert on public.trips
  for each row execute function public.handle_new_trip();

-- Unirse a un viaje con el código de invitación
create or replace function public.join_trip(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  if auth.uid() is null then raise exception 'No has iniciado sesión'; end if;
  select id into t from public.trips where invite_code = upper(replace(replace(trim(code), ' ', ''), '·', ''));
  if t is null then raise exception 'Código no válido'; end if;
  insert into public.trip_members (trip_id, user_id) values (t, auth.uid()) on conflict do nothing;
  return t;
end $$;

-- ---------- Destinos (ruta) ----------
-- owner_id vacío = destino compartido por el grupo; con valor = destino personal
create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  city text not null,
  country text not null default '',
  currency text not null default 'USD',
  start_date date not null,
  end_date date not null,
  position int not null default 0,
  owner_id uuid references auth.users(id) on delete cascade,
  transport_mode text not null default 'vuelo' check (transport_mode in ('vuelo', 'tren', 'bus', 'auto', 'barco', 'otro')),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- ---------- Presupuesto personal en destino ----------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  destination_id uuid not null references public.destinations(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount_usd numeric(12,2) not null default 0 check (amount_usd >= 0),
  unique (destination_id, user_id)
);

create table if not exists public.budget_moves (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  from_destination uuid not null references public.destinations(id) on delete cascade,
  to_destination uuid not null references public.destinations(id) on delete cascade,
  amount_usd numeric(12,2) not null check (amount_usd > 0),
  created_at timestamptz not null default now()
);

-- ---------- Gastos ----------
-- destination_id vacío = gasto general del viaje (ej. pasajes entre países)
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  destination_id uuid references public.destinations(id) on delete set null,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  paid_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null,
  description text not null default '',
  amount numeric(14,2) not null check (amount > 0),
  currency text not null,
  amount_usd numeric(14,2) not null check (amount_usd >= 0),
  method text not null default 'card' check (method in ('cash', 'card')),
  card_debited_usd numeric(14,2),
  spent_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- Parte de cada persona en un gasto (si no se divide, una sola fila con el total)
create table if not exists public.expense_shares (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  share_usd numeric(14,2) not null check (share_usd >= 0),
  primary key (expense_id, user_id)
);

-- ---------- Compras de moneda local (efectivo) ----------
create table if not exists public.currency_purchases (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  paid_amount numeric(14,2) not null check (paid_amount > 0),
  paid_currency text not null default 'USD',
  paid_usd numeric(14,2) not null check (paid_usd > 0),
  received_amount numeric(14,2) not null check (received_amount > 0),
  currency text not null,
  place text not null default '',
  bought_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------- Pagos entre viajeros (saldar deudas) ----------
create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  amount_usd numeric(14,2) not null check (amount_usd > 0),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists destinations_trip_idx on public.destinations(trip_id);
create index if not exists expenses_trip_idx on public.expenses(trip_id);
create index if not exists budgets_trip_idx on public.budgets(trip_id);
create index if not exists purchases_trip_idx on public.currency_purchases(trip_id);

-- =========================================================
-- Seguridad: cada usuario solo ve lo de sus viajes
-- =========================================================
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.destinations enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_moves enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;
alter table public.currency_purchases enable row level security;
alter table public.settlements enable row level security;

drop policy if exists "perfil propio o compañeros" on public.profiles;
create policy "perfil propio o compañeros" on public.profiles for select
  using (id = auth.uid() or public.shares_trip(id));
drop policy if exists "editar perfil propio" on public.profiles;
create policy "editar perfil propio" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "ver mis viajes" on public.trips;
create policy "ver mis viajes" on public.trips for select
  using (public.is_member(id) or created_by = auth.uid());
drop policy if exists "crear viaje" on public.trips;
create policy "crear viaje" on public.trips for insert
  with check (created_by = auth.uid());
drop policy if exists "editar viaje" on public.trips;
create policy "editar viaje" on public.trips for update
  using (created_by = auth.uid());
drop policy if exists "borrar viaje" on public.trips;
create policy "borrar viaje" on public.trips for delete
  using (created_by = auth.uid());

drop policy if exists "ver miembros" on public.trip_members;
create policy "ver miembros" on public.trip_members for select
  using (public.is_member(trip_id));
drop policy if exists "salir del viaje" on public.trip_members;
create policy "salir del viaje" on public.trip_members for delete
  using (user_id = auth.uid());

drop policy if exists "ver destinos" on public.destinations;
create policy "ver destinos" on public.destinations for select
  using (public.is_member(trip_id) and (owner_id is null or owner_id = auth.uid()));
drop policy if exists "crear destinos" on public.destinations;
create policy "crear destinos" on public.destinations for insert
  with check (public.is_member(trip_id) and (owner_id is null or owner_id = auth.uid()));
drop policy if exists "editar destinos" on public.destinations;
create policy "editar destinos" on public.destinations for update
  using (public.is_member(trip_id) and (owner_id is null or owner_id = auth.uid()));
drop policy if exists "borrar destinos" on public.destinations;
create policy "borrar destinos" on public.destinations for delete
  using (public.is_member(trip_id) and (owner_id is null or owner_id = auth.uid()));

drop policy if exists "mi presupuesto" on public.budgets;
create policy "mi presupuesto" on public.budgets for all
  using (user_id = auth.uid() and public.is_member(trip_id))
  with check (user_id = auth.uid() and public.is_member(trip_id));

drop policy if exists "mis movimientos de presupuesto" on public.budget_moves;
create policy "mis movimientos de presupuesto" on public.budget_moves for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_member(trip_id));

drop policy if exists "ver gastos del viaje" on public.expenses;
create policy "ver gastos del viaje" on public.expenses for select
  using (public.is_member(trip_id));
drop policy if exists "crear gasto" on public.expenses;
create policy "crear gasto" on public.expenses for insert
  with check (created_by = auth.uid() and public.is_member(trip_id));
drop policy if exists "editar gasto propio" on public.expenses;
create policy "editar gasto propio" on public.expenses for update
  using (created_by = auth.uid());
drop policy if exists "borrar gasto propio" on public.expenses;
create policy "borrar gasto propio" on public.expenses for delete
  using (created_by = auth.uid());

drop policy if exists "ver partes" on public.expense_shares;
create policy "ver partes" on public.expense_shares for select
  using (exists (select 1 from public.expenses e where e.id = expense_id and public.is_member(e.trip_id)));
drop policy if exists "crear partes" on public.expense_shares;
create policy "crear partes" on public.expense_shares for insert
  with check (exists (select 1 from public.expenses e where e.id = expense_id and e.created_by = auth.uid()));
drop policy if exists "borrar partes" on public.expense_shares;
create policy "borrar partes" on public.expense_shares for delete
  using (exists (select 1 from public.expenses e where e.id = expense_id and e.created_by = auth.uid()));

drop policy if exists "mis compras de moneda" on public.currency_purchases;
create policy "mis compras de moneda" on public.currency_purchases for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_member(trip_id));

drop policy if exists "ver pagos" on public.settlements;
create policy "ver pagos" on public.settlements for select
  using (public.is_member(trip_id));
drop policy if exists "registrar pago" on public.settlements;
create policy "registrar pago" on public.settlements for insert
  with check (created_by = auth.uid() and public.is_member(trip_id) and auth.uid() in (from_user, to_user));
drop policy if exists "borrar pago" on public.settlements;
create policy "borrar pago" on public.settlements for delete
  using (created_by = auth.uid());

grant execute on function public.join_trip(text) to authenticated;
