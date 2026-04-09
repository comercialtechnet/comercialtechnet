
CREATE TABLE IF NOT EXISTS public.importacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_arquivo TEXT NOT NULL,
  importado_por UUID NOT NULL,
  data_importacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_linhas INTEGER NOT NULL DEFAULT 0,
  total_inseridas INTEGER NOT NULL DEFAULT 0,
  total_substituidas INTEGER NOT NULL DEFAULT 0,
  total_erros INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.importacoes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='importacoes' AND policyname='Admins full access importacoes') THEN
    CREATE POLICY "Admins full access importacoes" ON public.importacoes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='importacoes' AND policyname='Authenticated read importacoes') THEN
    CREATE POLICY "Authenticated read importacoes" ON public.importacoes FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.vendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  importacao_id UUID NOT NULL REFERENCES public.importacoes(id) ON DELETE CASCADE,
  id_venda TEXT NOT NULL,
  proposta TEXT,
  contrato TEXT,
  id_cliente TEXT,
  cliente TEXT,
  tipo_cliente TEXT,
  id_vendedor TEXT,
  vendedor TEXT,
  vendedor_normalizado TEXT,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  tipo_pacote TEXT,
  tipo_venda TEXT,
  data_instalacao DATE,
  forma_pagamento TEXT,
  com_tv_original TEXT,
  produtos_brutos TEXT,
  supervisor TEXT,
  supervisor_normalizado TEXT,
  quantidade_itens INTEGER NOT NULL DEFAULT 0,
  e_combo BOOLEAN NOT NULL DEFAULT false,
  combo_tipo TEXT,
  possui_internet BOOLEAN NOT NULL DEFAULT false,
  possui_tv BOOLEAN NOT NULL DEFAULT false,
  possui_movel BOOLEAN NOT NULL DEFAULT false,
  possui_telefone BOOLEAN NOT NULL DEFAULT false,
  possui_mesh BOOLEAN NOT NULL DEFAULT false,
  possui_ponto_extra BOOLEAN NOT NULL DEFAULT false,
  possui_mudanca_tecnologia BOOLEAN NOT NULL DEFAULT false,
  possui_adicionais BOOLEAN NOT NULL DEFAULT false,
  chave_deduplicacao TEXT UNIQUE,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vendas' AND policyname='Admins full access vendas') THEN
    CREATE POLICY "Admins full access vendas" ON public.vendas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vendas' AND policyname='Authenticated read vendas') THEN
    CREATE POLICY "Authenticated read vendas" ON public.vendas FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_vendas_importacao ON public.vendas(importacao_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON public.vendas(data_instalacao);
CREATE INDEX IF NOT EXISTS idx_vendas_vendedor ON public.vendas(vendedor_normalizado);
CREATE INDEX IF NOT EXISTS idx_vendas_supervisor ON public.vendas(supervisor_normalizado);

CREATE TABLE IF NOT EXISTS public.itens_venda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  ordem_item INTEGER NOT NULL DEFAULT 0,
  descricao_original TEXT,
  descricao_normalizada TEXT,
  valor_item NUMERIC NOT NULL DEFAULT 0,
  categoria_principal TEXT,
  subcategoria TEXT,
  grupo_combo TEXT,
  flags_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='itens_venda' AND policyname='Admins full access itens_venda') THEN
    CREATE POLICY "Admins full access itens_venda" ON public.itens_venda FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='itens_venda' AND policyname='Authenticated read itens_venda') THEN
    CREATE POLICY "Authenticated read itens_venda" ON public.itens_venda FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda ON public.itens_venda(venda_id);

-- Ensure metas_mensais policies exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='metas_mensais' AND policyname='Admins full access metas_mensais') THEN
    CREATE POLICY "Admins full access metas_mensais" ON public.metas_mensais FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='metas_mensais' AND policyname='Authenticated read metas_mensais') THEN
    CREATE POLICY "Authenticated read metas_mensais" ON public.metas_mensais FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
