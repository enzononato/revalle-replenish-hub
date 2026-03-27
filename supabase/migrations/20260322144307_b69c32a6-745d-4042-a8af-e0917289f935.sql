
-- Create safe view without senha and cpf
CREATE OR REPLACE VIEW public.motoristas_public AS
SELECT id, nome, codigo, data_nascimento, unidade, funcao, setor, whatsapp, email, created_at
FROM public.motoristas;

-- Remove authenticated SELECT on the base table
DROP POLICY IF EXISTS "Apenas autenticados podem ler motoristas" ON public.motoristas;
