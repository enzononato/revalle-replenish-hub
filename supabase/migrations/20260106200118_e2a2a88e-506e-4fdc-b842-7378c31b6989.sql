-- Remove a política atual de UPDATE restrita a autenticados
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar protocolos" ON public.protocolos;

-- Cria nova política permitindo UPDATE público
CREATE POLICY "Protocolos UPDATE público"
ON public.protocolos
FOR UPDATE
USING (true)
WITH CHECK (true);