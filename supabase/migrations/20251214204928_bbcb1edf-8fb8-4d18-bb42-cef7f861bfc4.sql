-- Criar tabela de motoristas
CREATE TABLE public.motoristas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  codigo text NOT NULL UNIQUE,
  data_nascimento text,
  unidade text NOT NULL,
  funcao text NOT NULL DEFAULT 'motorista',
  setor text NOT NULL DEFAULT 'sede',
  whatsapp text,
  email text,
  senha text,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (públicas por enquanto - ajustar quando autenticação for implementada)
CREATE POLICY "Permitir leitura de motoristas" ON public.motoristas
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de motoristas" ON public.motoristas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de motoristas" ON public.motoristas
  FOR UPDATE USING (true);

CREATE POLICY "Permitir deleção de motoristas" ON public.motoristas
  FOR DELETE USING (true);