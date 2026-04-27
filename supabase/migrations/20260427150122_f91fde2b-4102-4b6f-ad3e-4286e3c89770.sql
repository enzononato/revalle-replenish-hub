ALTER TABLE public.alteracao_pedidos_log 
ADD COLUMN IF NOT EXISTS oculto boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_alteracao_pedidos_log_oculto 
ON public.alteracao_pedidos_log(oculto);