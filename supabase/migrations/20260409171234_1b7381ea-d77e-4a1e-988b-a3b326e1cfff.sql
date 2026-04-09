
-- 1. importacoes
CREATE TABLE IF NOT EXISTS public.importacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_arquivo text NOT NULL,
  importado_por uuid NOT NULL,
  total_linhas integer NOT NULL DEFAULT 0,
  total_inseridas integer NOT NULL DEFAULT 0,
  total_substituidas integer NOT NULL DEFAULT 0,
  total_erros integer NOT NULL DEFAULT 0,
  data_importacao timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.importacoes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='importacoes' AND policyname='Admins full access importacoes') THEN
    CREATE POLICY "Admins full access importacoes" ON public.importacoes FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='importacoes' AND policyname='Authenticated read importacoes') THEN
    CREATE POLICY "Authenticated read importacoes" ON public.importacoes FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- 2. vendas
CREATE TABLE IF NOT EXISTS public.vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id uuid NOT NULL REFERENCES public.importacoes(id),
  id_venda text NOT NULL,
  proposta text,
  contrato text,
  id_cliente text,
  cliente text,
  tipo_cliente text,
  id_vendedor text,
  vendedor text,
  vendedor_normalizado text,
  valor_total numeric NOT NULL DEFAULT 0,
  tipo_pacote text,
  tipo_venda text,
  data_instalacao date,
  forma_pagamento text,
  com_tv_original text,
  produtos_brutos text,
  supervisor text,
  supervisor_normalizado text,
  quantidade_itens integer NOT NULL DEFAULT 0,
  e_combo boolean NOT NULL DEFAULT false,
  combo_tipo text,
  possui_internet boolean NOT NULL DEFAULT false,
  possui_tv boolean NOT NULL DEFAULT false,
  possui_movel boolean NOT NULL DEFAULT false,
  possui_telefone boolean NOT NULL DEFAULT false,
  possui_mesh boolean NOT NULL DEFAULT false,
  possui_ponto_extra boolean NOT NULL DEFAULT false,
  possui_mudanca_tecnologia boolean NOT NULL DEFAULT false,
  possui_adicionais boolean NOT NULL DEFAULT false,
  chave_deduplicacao text UNIQUE,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vendas' AND policyname='Admins full access vendas') THEN
    CREATE POLICY "Admins full access vendas" ON public.vendas FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vendas' AND policyname='Authenticated read vendas') THEN
    CREATE POLICY "Authenticated read vendas" ON public.vendas FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vendas_data_instalacao ON public.vendas(data_instalacao);
CREATE INDEX IF NOT EXISTS idx_vendas_importacao_id ON public.vendas(importacao_id);

-- 3. itens_venda
CREATE TABLE IF NOT EXISTS public.itens_venda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid NOT NULL REFERENCES public.vendas(id),
  ordem_item integer NOT NULL DEFAULT 0,
  descricao_original text,
  descricao_normalizada text,
  valor_item numeric NOT NULL DEFAULT 0,
  categoria_principal text,
  subcategoria text,
  grupo_combo text,
  flags_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='itens_venda' AND policyname='Admins full access itens_venda') THEN
    CREATE POLICY "Admins full access itens_venda" ON public.itens_venda FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='itens_venda' AND policyname='Authenticated read itens_venda') THEN
    CREATE POLICY "Authenticated read itens_venda" ON public.itens_venda FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON public.itens_venda(venda_id);

-- 4. metas_mensais
CREATE TABLE IF NOT EXISTS public.metas_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_mes integer NOT NULL,
  periodo_ano integer NOT NULL,
  meta_faturamento numeric NOT NULL DEFAULT 0,
  meta_total_vendas integer NOT NULL DEFAULT 0,
  meta_vendas_virtua integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(periodo_mes, periodo_ano)
);
ALTER TABLE public.metas_mensais ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='metas_mensais' AND policyname='Admins full access metas_mensais') THEN
    CREATE POLICY "Admins full access metas_mensais" ON public.metas_mensais FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='metas_mensais' AND policyname='Authenticated read metas_mensais') THEN
    CREATE POLICY "Authenticated read metas_mensais" ON public.metas_mensais FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- 5. has_role function (if not exists)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role::app_role
  )
$$;
