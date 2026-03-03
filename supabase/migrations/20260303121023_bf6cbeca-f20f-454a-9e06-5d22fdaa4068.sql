
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Autenticados podem ler logs de login motorista" ON public.motorista_login_logs;
DROP POLICY IF EXISTS "Inserção pública de logs de login motorista" ON public.motorista_login_logs;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Autenticados podem ler logs de login motorista"
ON public.motorista_login_logs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Inserção pública de logs de login motorista"
ON public.motorista_login_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
