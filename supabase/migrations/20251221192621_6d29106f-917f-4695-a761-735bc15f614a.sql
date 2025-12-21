-- Create chat_conversations table
CREATE TABLE public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_participants table
CREATE TABLE public.chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_nome TEXT NOT NULL,
    user_nivel TEXT NOT NULL,
    user_unidade TEXT,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_nome TEXT NOT NULL,
    sender_nivel TEXT NOT NULL,
    content TEXT NOT NULL,
    protocolo_id UUID REFERENCES public.protocolos(id) ON DELETE SET NULL,
    protocolo_numero TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_chat_participants_user_id ON public.chat_participants(user_id);
CREATE INDEX idx_chat_participants_conversation_id ON public.chat_participants(conversation_id);
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
CREATE POLICY "Acesso público leitura chat_conversations" 
ON public.chat_conversations FOR SELECT USING (true);

CREATE POLICY "Acesso público inserção chat_conversations" 
ON public.chat_conversations FOR INSERT WITH CHECK (true);

CREATE POLICY "Acesso público atualização chat_conversations" 
ON public.chat_conversations FOR UPDATE USING (true);

-- RLS Policies for chat_participants
CREATE POLICY "Acesso público leitura chat_participants" 
ON public.chat_participants FOR SELECT USING (true);

CREATE POLICY "Acesso público inserção chat_participants" 
ON public.chat_participants FOR INSERT WITH CHECK (true);

CREATE POLICY "Acesso público atualização chat_participants" 
ON public.chat_participants FOR UPDATE USING (true);

CREATE POLICY "Acesso público deleção chat_participants" 
ON public.chat_participants FOR DELETE USING (true);

-- RLS Policies for chat_messages
CREATE POLICY "Acesso público leitura chat_messages" 
ON public.chat_messages FOR SELECT USING (true);

CREATE POLICY "Acesso público inserção chat_messages" 
ON public.chat_messages FOR INSERT WITH CHECK (true);

-- Function to update conversation updated_at
CREATE OR REPLACE FUNCTION public.update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chat_conversations 
    SET updated_at = now() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to update conversation when new message is added
CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_updated_at();

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;