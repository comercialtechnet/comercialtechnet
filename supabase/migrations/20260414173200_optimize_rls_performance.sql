-- =====================================================
-- OTIMIZAÇÃO CRÍTICA DE PERFORMANCE: RLS Policies
-- =====================================================
-- PROBLEMA: A função has_role() é executada POR LINHA em cada SELECT.
-- Com 5000 vendas + 15000 itens, isso gera 20000+ subconsultas
-- na tabela user_roles, travando o carregamento por minutos.
--
-- SOLUÇÃO: Separar as policies de leitura (SELECT) das de escrita (INSERT/UPDATE/DELETE).
-- A leitura já era permitida para todos os autenticados via "Authenticated read",
-- mas o Postgres avaliava TODAS as policies com OR, executando has_role() desnecessariamente.
-- Removemos as policies "full access" que misturam SELECT com has_role()
-- e recriamos policies de escrita específicas (sem SELECT) para admins.
-- =====================================================

-- ─── VENDAS ───

-- Remove a policy pesada que usa has_role() para ALL (incluindo SELECT)
DROP POLICY IF EXISTS "Admins full access vendas" ON public.vendas;

-- Recria apenas para operações de ESCRITA (INSERT, UPDATE, DELETE) que admins precisam
CREATE POLICY "Admins write vendas" ON public.vendas
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins update vendas" ON public.vendas
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins delete vendas" ON public.vendas
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- ─── ITENS_VENDA ───

DROP POLICY IF EXISTS "Admins full access itens_venda" ON public.itens_venda;

CREATE POLICY "Admins write itens_venda" ON public.itens_venda
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins update itens_venda" ON public.itens_venda
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins delete itens_venda" ON public.itens_venda
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- ─── IMPORTACOES ───

DROP POLICY IF EXISTS "Admins full access importacoes" ON public.importacoes;

CREATE POLICY "Admins write importacoes" ON public.importacoes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins update importacoes" ON public.importacoes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins delete importacoes" ON public.importacoes
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- ─── METAS_MENSAIS ───

DROP POLICY IF EXISTS "Admins full access metas_mensais" ON public.metas_mensais;

CREATE POLICY "Admins write metas_mensais" ON public.metas_mensais
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins update metas_mensais" ON public.metas_mensais
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins delete metas_mensais" ON public.metas_mensais
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- ─── ÍNDICE na user_roles para acelerar has_role() nas escritas ───
CREATE INDEX IF NOT EXISTS idx_user_roles_lookup ON public.user_roles(user_id, role);
