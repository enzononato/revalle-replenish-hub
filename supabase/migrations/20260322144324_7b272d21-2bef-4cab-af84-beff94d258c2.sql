
-- Fix view to use SECURITY INVOKER (default in PG15+, but let's be explicit)
DROP VIEW IF EXISTS public.motoristas_public;
CREATE VIEW public.motoristas_public 
WITH (security_invoker = true)
AS SELECT id, nome, codigo, data_nascimento, unidade, funcao, setor, whatsapp, email, created_at
FROM public.motoristas;

-- Re-add SELECT policy on motoristas for authenticated (needed for the view to work)
CREATE POLICY "Apenas autenticados podem ler motoristas"
  ON public.motoristas FOR SELECT
  TO authenticated
  USING (true);
