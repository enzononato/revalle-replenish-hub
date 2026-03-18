-- Alinha as permissões de alteracao_pedidos_log com a lógica usada em protocolos
-- (INSERT/SELECT para anon+authenticated e UPDATE público)

DROP POLICY IF EXISTS "Permitir insert publico alteracao_pedidos_log" ON public.alteracao_pedidos_log;
DROP POLICY IF EXISTS "Autenticados podem ler alteracao_pedidos_log" ON public.alteracao_pedidos_log;
DROP POLICY IF EXISTS "Permitir leitura anon alteracao_pedidos_log" ON public.alteracao_pedidos_log;
DROP POLICY IF EXISTS "Update público alteracao_pedidos_log" ON public.alteracao_pedidos_log;

CREATE POLICY "Acesso público leitura alteracao_pedidos_log"
ON public.alteracao_pedidos_log
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Permitir inserção alteracao_pedidos_log"
ON public.alteracao_pedidos_log
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Update público alteracao_pedidos_log"
ON public.alteracao_pedidos_log
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);