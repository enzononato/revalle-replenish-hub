-- Adicionar campos de contato WhatsApp e E-mail ao protocolo
ALTER TABLE public.protocolos ADD COLUMN IF NOT EXISTS contato_whatsapp TEXT;
ALTER TABLE public.protocolos ADD COLUMN IF NOT EXISTS contato_email TEXT;