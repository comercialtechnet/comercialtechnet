ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS nome_supervisor_vinculado text,
ADD COLUMN IF NOT EXISTS nome_vendedor_vinculado text;