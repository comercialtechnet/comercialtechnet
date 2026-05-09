-- Add empresa + per-supervisor goal columns; drop meta_total_vendas
ALTER TABLE public.metas_mensais
  ADD COLUMN IF NOT EXISTS empresa text NOT NULL DEFAULT 'RDT',
  ADD COLUMN IF NOT EXISTS meta_faturamento_supervisor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_vendas_virtua_supervisor integer NOT NULL DEFAULT 0;

ALTER TABLE public.metas_mensais
  ADD CONSTRAINT metas_mensais_empresa_check CHECK (empresa IN ('RDT', 'VNA'));

ALTER TABLE public.metas_mensais
  DROP COLUMN IF EXISTS meta_total_vendas;

-- Replace uniqueness: now keyed by (ano, mes, empresa)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.metas_mensais'::regclass AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.metas_mensais DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS metas_mensais_ano_mes_empresa_uniq
  ON public.metas_mensais (periodo_ano, periodo_mes, empresa);