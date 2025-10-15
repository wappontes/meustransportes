-- Remove the plan_id requirement from profiles table and update trigger

-- Make plan_id nullable in profiles table
ALTER TABLE public.profiles 
ALTER COLUMN plan_id DROP NOT NULL;

-- Drop the existing function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the updated function without automatic plan assignment
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert the profile without plan_id (user can select later)
  INSERT INTO public.profiles (id, name, plan_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    NULL  -- No plan assigned initially
  );
  
  RETURN new;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
