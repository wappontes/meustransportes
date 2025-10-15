-- Update the handle_new_user function to automatically assign the first plan if no plan is specified

-- Drop the existing function
drop function if exists public.handle_new_user();

-- Create the updated function
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  default_plan_id uuid;
begin
  -- Get the plan_id from metadata or use the first plan as default
  if new.raw_user_meta_data->>'plan_id' is not null then
    default_plan_id := (new.raw_user_meta_data->>'plan_id')::uuid;
  else
    -- Get the first plan ordered by quantity (ascending)
    select id into default_plan_id
    from public.plans
    order by quantity asc
    limit 1;
  end if;

  -- Insert the profile with the plan_id
  insert into public.profiles (id, name, plan_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    default_plan_id
  );
  
  return new;
end;
$$;

-- Recreate the trigger
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
