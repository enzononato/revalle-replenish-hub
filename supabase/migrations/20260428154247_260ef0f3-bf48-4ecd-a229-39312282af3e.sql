ALTER TABLE public.protocolos
  ADD COLUMN IF NOT EXISTS protocolo_origem_id uuid,
  ADD COLUMN IF NOT EXISTS confirmacao_conferente jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS conferencia_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS destino_final text,
  ADD COLUMN IF NOT EXISTS observacao_finalizacao text,
  ADD COLUMN IF NOT EXISTS finalizado_por_nome text,
  ADD COLUMN IF NOT EXISTS finalizado_por_id text,
  ADD COLUMN IF NOT EXISTS finalizado_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_protocolos_protocolo_origem_id
  ON public.protocolos(protocolo_origem_id)
  WHERE protocolo_origem_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_protocolos_conferencia_status
  ON public.protocolos(conferencia_status)
  WHERE protocolo_origem_id IS NOT NULL;