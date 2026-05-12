
-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- New batch table
CREATE TABLE public.alteracao_pedidos_lote (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_arquivo text,
  total integer NOT NULL DEFAULT 0,
  enviados integer NOT NULL DEFAULT 0,
  falhas integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processando',
  enviado_por text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alteracao_pedidos_lote ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler lotes"
  ON public.alteracao_pedidos_lote FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Autenticados podem inserir lotes"
  ON public.alteracao_pedidos_lote FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar lotes"
  ON public.alteracao_pedidos_lote FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_alteracao_pedidos_lote_created_at
  ON public.alteracao_pedidos_lote (created_at DESC);

-- New columns on log table
ALTER TABLE public.alteracao_pedidos_log
  ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES public.alteracao_pedidos_lote(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

-- Index for the worker
CREATE INDEX IF NOT EXISTS idx_alteracao_pedidos_log_pending
  ON public.alteracao_pedidos_log (status, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_alteracao_pedidos_log_lote
  ON public.alteracao_pedidos_log (lote_id);

-- Trigger updated_at on lote
CREATE TRIGGER trg_alteracao_pedidos_lote_updated_at
  BEFORE UPDATE ON public.alteracao_pedidos_lote
  FOR EACH ROW EXECUTE FUNCTION public.update_alteracao_pedidos_envios_updated_at();

-- Realtime
ALTER TABLE public.alteracao_pedidos_log REPLICA IDENTITY FULL;
ALTER TABLE public.alteracao_pedidos_lote REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alteracao_pedidos_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alteracao_pedidos_lote;
