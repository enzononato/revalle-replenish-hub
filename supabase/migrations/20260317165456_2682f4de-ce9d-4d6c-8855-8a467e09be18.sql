DROP POLICY IF EXISTS "Permitir insert publico alteracao_pedidos_log" ON public.alteracao_pedidos_log;

CREATE POLICY "Permitir insert publico alteracao_pedidos_log"
ON public.alteracao_pedidos_log
FOR INSERT
TO public
WITH CHECK (true);