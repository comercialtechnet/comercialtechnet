-- Allow all authenticated users to INSERT into importacoes
CREATE POLICY "Authenticated insert importacoes"
ON public.importacoes
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow all authenticated users to INSERT into vendas
CREATE POLICY "Authenticated insert vendas"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow all authenticated users to INSERT into itens_venda
CREATE POLICY "Authenticated insert itens_venda"
ON public.itens_venda
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow all authenticated users to UPDATE vendas (for upsert/dedup)
CREATE POLICY "Authenticated update vendas"
ON public.vendas
FOR UPDATE
TO authenticated
USING (true);

-- Allow all authenticated users to DELETE itens_venda (for re-import)
CREATE POLICY "Authenticated delete itens_venda"
ON public.itens_venda
FOR DELETE
TO authenticated
USING (true);