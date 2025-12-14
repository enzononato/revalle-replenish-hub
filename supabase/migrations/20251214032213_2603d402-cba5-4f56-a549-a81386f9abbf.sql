-- Criar tabela protocolos
CREATE TABLE public.protocolos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT UNIQUE NOT NULL,
  motorista_id TEXT,
  motorista_nome TEXT NOT NULL,
  motorista_codigo TEXT,
  motorista_whatsapp TEXT,
  motorista_email TEXT,
  data TEXT NOT NULL,
  hora TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'encerrado')),
  validacao BOOLEAN DEFAULT false,
  lancado BOOLEAN DEFAULT false,
  enviado_lancar BOOLEAN DEFAULT false,
  enviado_encerrar BOOLEAN DEFAULT false,
  tipo_reposicao TEXT,
  causa TEXT,
  mapa TEXT,
  codigo_pdv TEXT,
  nota_fiscal TEXT,
  produtos JSONB DEFAULT '[]'::jsonb,
  fotos_protocolo JSONB DEFAULT '{}'::jsonb,
  observacao_geral TEXT,
  observacoes_log JSONB DEFAULT '[]'::jsonb,
  mensagem_encerramento TEXT,
  arquivo_encerramento TEXT,
  oculto BOOLEAN DEFAULT false,
  habilitar_reenvio BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.protocolos ENABLE ROW LEVEL SECURITY;

-- Política: Permitir leitura pública
CREATE POLICY "Permitir leitura de protocolos"
ON public.protocolos
FOR SELECT
USING (true);

-- Política: Permitir inserção pública (motoristas podem criar)
CREATE POLICY "Permitir inserção de protocolos"
ON public.protocolos
FOR INSERT
WITH CHECK (true);

-- Política: Permitir atualização pública (temporário para testes)
CREATE POLICY "Permitir atualização de protocolos"
ON public.protocolos
FOR UPDATE
USING (true);

-- Política: Permitir deleção pública (temporário para testes)
CREATE POLICY "Permitir deleção de protocolos"
ON public.protocolos
FOR DELETE
USING (true);

-- Índices para melhor performance
CREATE INDEX idx_protocolos_numero ON public.protocolos(numero);
CREATE INDEX idx_protocolos_status ON public.protocolos(status);
CREATE INDEX idx_protocolos_created_at ON public.protocolos(created_at DESC);