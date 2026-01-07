-- Remover a política atual de INSERT que exige autenticação
DROP POLICY IF EXISTS "Usuários autenticados podem inserir protocolos" ON public.protocolos;

-- Criar nova política que permite INSERT para qualquer usuário (anon e authenticated)
CREATE POLICY "Permitir inserção de protocolos"
ON public.protocolos
FOR INSERT
TO anon, authenticated
WITH CHECK (true);