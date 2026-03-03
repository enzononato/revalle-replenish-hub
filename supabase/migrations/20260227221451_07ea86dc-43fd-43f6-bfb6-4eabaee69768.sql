
-- Tabela para registrar tentativas de login de motoristas
CREATE TABLE public.motorista_login_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  identificador text NOT NULL,
  identificador_tipo text NOT NULL DEFAULT 'cpf',
  sucesso boolean NOT NULL DEFAULT false,
  erro text,
  motorista_id uuid,
  motorista_nome text,
  unidade text,
  ip_info text
);

-- RLS
ALTER TABLE public.motorista_login_logs ENABLE ROW LEVEL SECURITY;

-- Leitura apenas para autenticados (admins vão consultar)
CREATE POLICY "Autenticados podem ler logs de login motorista"
  ON public.motorista_login_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Inserção pública (motoristas não são autenticados via Supabase Auth)
CREATE POLICY "Inserção pública de logs de login motorista"
  ON public.motorista_login_logs FOR INSERT
  WITH CHECK (true);

-- Índices para consultas
CREATE INDEX idx_motorista_login_logs_created_at ON public.motorista_login_logs (created_at DESC);
CREATE INDEX idx_motorista_login_logs_identificador ON public.motorista_login_logs (identificador);
CREATE INDEX idx_motorista_login_logs_sucesso ON public.motorista_login_logs (sucesso);
