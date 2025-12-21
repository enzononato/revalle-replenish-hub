-- Habilita REPLICA IDENTITY FULL para capturar dados completos nas mudanças
ALTER TABLE public.protocolos REPLICA IDENTITY FULL;

-- Adiciona a tabela protocolos à publicação de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.protocolos;