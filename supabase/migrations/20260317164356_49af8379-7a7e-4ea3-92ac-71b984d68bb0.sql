-- Tabela para controle dos envios de alteração de pedidos atualizados pelo n8n
CREATE TABLE public.alteracao_pedidos_envios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id UUID NULL REFERENCES public.alteracao_pedidos_log(id) ON DELETE SET NULL,
  cod_pdv TEXT NOT NULL,
  nome_pdv TEXT NULL,
  telefone_pdv TEXT NULL,
  status_pedido TEXT NULL,
  mensagem_cliente TEXT NULL,
  payload JSONB NULL DEFAULT '{}'::jsonb,
  envio_ok INTEGER NOT NULL DEFAULT 0,
  erro_mensagem TEXT NULL,
  retorno_n8n JSONB NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.alteracao_pedidos_envios ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_alteracao_pedidos_envios_created_at ON public.alteracao_pedidos_envios(created_at DESC);
CREATE INDEX idx_alteracao_pedidos_envios_cod_pdv ON public.alteracao_pedidos_envios(cod_pdv);
CREATE INDEX idx_alteracao_pedidos_envios_envio_ok ON public.alteracao_pedidos_envios(envio_ok);
CREATE INDEX idx_alteracao_pedidos_envios_log_id ON public.alteracao_pedidos_envios(log_id);

CREATE OR REPLACE FUNCTION public.update_alteracao_pedidos_envios_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_alteracao_pedidos_envios_updated_at
BEFORE UPDATE ON public.alteracao_pedidos_envios
FOR EACH ROW
EXECUTE FUNCTION public.update_alteracao_pedidos_envios_updated_at();

CREATE POLICY "Autenticados podem ler alteracao_pedidos_envios"
ON public.alteracao_pedidos_envios
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir insert publico alteracao_pedidos_envios"
ON public.alteracao_pedidos_envios
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Update publico alteracao_pedidos_envios"
ON public.alteracao_pedidos_envios
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);