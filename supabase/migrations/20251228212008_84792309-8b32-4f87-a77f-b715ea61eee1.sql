-- Create user_profiles table for storing additional user info
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text UNIQUE NOT NULL,
  nome text,
  foto_url text,
  telefone text,
  email_contato text,
  unidade text,
  nivel text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Public read access (users can see profiles)
CREATE POLICY "Acesso público leitura user_profiles"
ON public.user_profiles
FOR SELECT
USING (true);

-- Public insert access
CREATE POLICY "Acesso público inserção user_profiles"
ON public.user_profiles
FOR INSERT
WITH CHECK (true);

-- Public update access (user can update their own profile)
CREATE POLICY "Acesso público atualização user_profiles"
ON public.user_profiles
FOR UPDATE
USING (true);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_user_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_user_profile_updated_at();