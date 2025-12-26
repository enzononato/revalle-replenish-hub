-- Adicionar colunas de status de mensagem
ALTER TABLE public.protocolos 
ADD COLUMN status_envio text DEFAULT 'pendente',
ADD COLUMN status_encerramento text DEFAULT 'pendente';

-- Adicionar constraint para valores válidos
ALTER TABLE public.protocolos 
ADD CONSTRAINT check_status_envio CHECK (status_envio IN ('pendente', 'sucesso', 'erro')),
ADD CONSTRAINT check_status_encerramento CHECK (status_encerramento IN ('pendente', 'sucesso', 'erro'));