
CREATE TYPE public.app_role AS ENUM ('administrador', 'supervisor', 'vendedor', 'consultor');

CREATE TYPE public.approval_status AS ENUM ('pendente', 'aprovado', 'rejeitado');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_vinculado TEXT NOT NULL,
  nome_normalizado TEXT NOT NULL,
  perfil public.app_role NOT NULL DEFAULT 'vendedor',
  status_aprovacao public.approval_status NOT NULL DEFAULT 'pendente',
  ativo BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  aprovado_em TIMESTAMPTZ,
  aprovado_por UUID REFERENCES auth.users(id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Anyone can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_vinculado, nome_normalizado, perfil, status_aprovacao, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_vinculado', NEW.email),
    LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'nome_vinculado', NEW.email))),
    COALESCE((NEW.raw_user_meta_data->>'perfil')::public.app_role, 'vendedor'),
    COALESCE((NEW.raw_user_meta_data->>'status_aprovacao')::public.approval_status, 'pendente'),
    COALESCE((NEW.raw_user_meta_data->>'ativo')::boolean, false)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
