-- Execute este SQL no Supabase SQL Editor (SQL Editor no painel do Supabase)
-- https://msmlfjwskkabzfwhurzk.supabase.co

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Create vehicles table
create table public.vehicles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  brand text not null,
  model text not null,
  year integer not null,
  plate text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on vehicles
alter table public.vehicles enable row level security;

-- Vehicles policies
create policy "Users can view own vehicles"
  on public.vehicles for select
  using (auth.uid() = user_id);

create policy "Users can insert own vehicles"
  on public.vehicles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own vehicles"
  on public.vehicles for update
  using (auth.uid() = user_id);

create policy "Users can delete own vehicles"
  on public.vehicles for delete
  using (auth.uid() = user_id);

-- Create categories table
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on categories
alter table public.categories enable row level security;

-- Categories policies
create policy "Users can view own categories"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "Users can insert own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own categories"
  on public.categories for update
  using (auth.uid() = user_id);

create policy "Users can delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);

-- Create transactions table
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  vehicle_id uuid references public.vehicles(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(10, 2) not null,
  description text,
  date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on transactions
alter table public.transactions enable row level security;

-- Transactions policies
create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- Create fuelings table
create table public.fuelings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  vehicle_id uuid references public.vehicles(id) on delete cascade not null,
  liters numeric(10, 2) not null,
  fuel_type text not null,
  total_amount numeric(10, 2) not null,
  odometer integer not null,
  date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on fuelings
alter table public.fuelings enable row level security;

-- Fuelings policies
create policy "Users can view own fuelings"
  on public.fuelings for select
  using (auth.uid() = user_id);

create policy "Users can insert own fuelings"
  on public.fuelings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own fuelings"
  on public.fuelings for update
  using (auth.uid() = user_id);

create policy "Users can delete own fuelings"
  on public.fuelings for delete
  using (auth.uid() = user_id);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
