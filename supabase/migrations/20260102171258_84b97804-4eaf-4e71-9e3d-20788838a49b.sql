-- Adicionar campo para rastrear se o alerta SLA 16 dias foi enviado
ALTER TABLE public.protocolos 
ADD COLUMN IF NOT EXISTS sla_16_enviado boolean DEFAULT false;

-- Adicionar coluna para registrar quando o alerta foi enviado
ALTER TABLE public.protocolos 
ADD COLUMN IF NOT EXISTS sla_16_enviado_at timestamp with time zone DEFAULT null;