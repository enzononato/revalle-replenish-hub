-- Adicionar coluna para rastrear o último alerta de SLA enviado (em dias)
ALTER TABLE public.protocolos ADD COLUMN IF NOT EXISTS ultimo_alerta_sla integer DEFAULT NULL;