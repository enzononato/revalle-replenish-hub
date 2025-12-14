-- Adicionar coluna para unidade do motorista
ALTER TABLE public.protocolos ADD COLUMN IF NOT EXISTS motorista_unidade TEXT;