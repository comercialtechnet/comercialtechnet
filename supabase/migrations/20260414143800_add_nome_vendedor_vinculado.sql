-- Add nome_vendedor_vinculado column to profiles table
-- This links vendedor/consultor users to their sales data name
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS nome_vendedor_vinculado TEXT DEFAULT NULL;
