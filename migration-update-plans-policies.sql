-- Add RLS policies for plans table to allow authenticated users to manage plans

-- Policy to allow authenticated users to insert plans
create policy "Authenticated users can insert plans"
  on public.plans
  for insert
  to authenticated
  with check (true);

-- Policy to allow authenticated users to update plans
create policy "Authenticated users can update plans"
  on public.plans
  for update
  to authenticated
  using (true);

-- Policy to allow authenticated users to delete plans
create policy "Authenticated users can delete plans"
  on public.plans
  for delete
  to authenticated
  using (true);
