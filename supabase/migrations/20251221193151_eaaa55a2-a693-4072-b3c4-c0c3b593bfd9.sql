-- Add type and name columns to chat_conversations
ALTER TABLE public.chat_conversations 
ADD COLUMN tipo TEXT NOT NULL DEFAULT 'individual',
ADD COLUMN nome TEXT,
ADD COLUMN unidade TEXT;

-- Create index for unit-based groups
CREATE INDEX idx_chat_conversations_unidade ON public.chat_conversations(unidade);
CREATE INDEX idx_chat_conversations_tipo ON public.chat_conversations(tipo);