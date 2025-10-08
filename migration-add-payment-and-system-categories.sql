-- Add payment_method to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS payment_method text;

-- Add payment_method and location to fuelings table
ALTER TABLE public.fuelings 
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS location text;

-- Add is_system flag to categories table
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;

-- Function to create system categories for a user
CREATE OR REPLACE FUNCTION public.create_system_categories(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert system expense categories if they don't exist
  INSERT INTO public.categories (user_id, name, type, is_system)
  VALUES 
    (_user_id, 'Combustível', 'expense', true),
    (_user_id, 'Manutenção', 'expense', true),
    (_user_id, 'Pedágio', 'expense', true)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Update handle_new_user to create system categories
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, name, phone)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone'
  );
  
  -- Create system categories
  PERFORM public.create_system_categories(new.id);
  
  RETURN new;
END;
$$;

-- Create system categories for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM public.profiles LOOP
    PERFORM public.create_system_categories(user_record.id);
  END LOOP;
END $$;
