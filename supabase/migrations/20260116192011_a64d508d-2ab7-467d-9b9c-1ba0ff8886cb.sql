-- Remove a constraint única atual do codigo (se existir)
ALTER TABLE public.motoristas DROP CONSTRAINT IF EXISTS motoristas_codigo_key;

-- Cria nova constraint única para (codigo, unidade)
ALTER TABLE public.motoristas ADD CONSTRAINT motoristas_codigo_unidade_key UNIQUE (codigo, unidade);