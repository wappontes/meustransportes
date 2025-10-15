-- Create plans table
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  quantity integer not null,
  value decimal(10, 2) not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.plans enable row level security;

-- Create policy to allow all users to read plans
create policy "Anyone can read plans"
  on public.plans
  for select
  to authenticated
  using (true);

-- Insert default plans
insert into public.plans (description, quantity, value) values
  ('Inicial', 1, 39.90),
  ('Intermediário', 3, 69.90),
  ('Avançado', 5, 99.90),
  ('Premium', 10, 199.90);

-- Add plan_id to profiles table (if it doesn't exist)
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'plan_id') then
    alter table public.profiles add column plan_id uuid references public.plans(id);
    
    -- Set default plan (Inicial) for existing users
    update public.profiles 
    set plan_id = (select id from public.plans where description = 'Inicial' limit 1)
    where plan_id is null;
  end if;
end $$;
